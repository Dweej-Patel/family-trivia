import {
  ref,
  set,
  get,
  update,
  onValue,
  remove,
  onDisconnect,
  serverTimestamp,
  type Unsubscribe,
} from 'firebase/database'
import { db, ensureSignedIn, connectDb } from '../lib/firebase'
import { storage } from '../lib/storage'
import type {
  Pacing,
  PlayerAnswer,
  PlayerIdentity,
  RoomMeta,
  RoomPlayer,
  RoomQuestion,
} from './types'

// Room-code alphabet with ambiguous characters (O/0, I/1) removed.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function generateRoomCode(len = 4): string {
  let s = ''
  for (let i = 0; i < len; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
  return s
}

export function roomExists(code: string): Promise<boolean> {
  return get(ref(db, `rooms/${code}/meta`)).then((s) => s.exists())
}

// ─── Orphaned-room cleanup ─────────────────────────────────────────────────
// We can't list all rooms (the rules forbid it, by design), so each device
// remembers the rooms IT created and deletes its own stale ones the next time
// it hosts. This cleans up rooms left behind when a host hard-closes their tab.
const ROOM_TTL_MS = 2 * 60 * 60 * 1000 // 2 hours

function recordMyRoom(code: string): void {
  const rooms = storage.loadMyRooms().filter((r) => r.code !== code)
  rooms.push({ code, ts: Date.now() })
  storage.saveMyRooms(rooms)
}

function forgetMyRoom(code: string): void {
  storage.saveMyRooms(storage.loadMyRooms().filter((r) => r.code !== code))
}

/** Delete this device's own rooms that are older than the TTL (orphans from a
 *  crashed/closed session). Only touches rooms we created — never enumerates. */
async function sweepStaleRooms(): Promise<void> {
  const now = Date.now()
  const rooms = storage.loadMyRooms()
  const stale = rooms.filter((r) => now - r.ts > ROOM_TTL_MS)
  if (stale.length === 0) return
  await Promise.all(
    stale.map((r) => remove(ref(db, `rooms/${r.code}`)).catch(() => {})),
  )
  storage.saveMyRooms(rooms.filter((r) => now - r.ts <= ROOM_TTL_MS))
}

export interface CreateRoomOpts {
  pacing: Pacing
  timerSeconds: number
  totalQuestions: number
}

/** Host: allocate a unique room, write its lobby meta, return the code + host id. */
export async function createRoom(
  opts: CreateRoomOpts,
): Promise<{ code: string; hostId: string }> {
  connectDb() // re-open the connection in case a previous session closed it
  const hostId = await ensureSignedIn()
  await sweepStaleRooms() // clean up any orphans we left behind before
  for (let attempt = 0; attempt < 6; attempt++) {
    const code = generateRoomCode()
    if (await roomExists(code)) continue
    await set(ref(db, `rooms/${code}/meta`), {
      status: 'lobby',
      hostId,
      pacing: opts.pacing,
      timerSeconds: opts.timerSeconds,
      questionIndex: -1,
      totalQuestions: opts.totalQuestions,
      createdAt: serverTimestamp(),
    })
    recordMyRoom(code) // remember it so we can clean it up later if abandoned
    // NOTE: we deliberately do NOT auto-delete the room when the host's
    // connection drops — a momentary blip must never end everyone's game. The
    // host's listeners auto-recover on reconnect; the room is removed when the
    // host explicitly leaves/ends (closeRoom), and any orphan from a hard tab
    // close is swept by sweepStaleRooms() next time this device hosts.
    return { code, hostId }
  }
  throw new Error('Could not allocate a room code — please try again.')
}

/** Player: join an existing lobby. Returns the player's id in the room. */
export async function joinRoom(
  code: string,
  player: { name: string; emoji: string; color: string },
): Promise<string> {
  connectDb() // re-open the connection in case a previous session closed it
  const uid = await ensureSignedIn()
  // Per-TAB player id. The anonymous auth uid is shared by every tab in a
  // browser, so keying players by the raw uid would make two tabs (e.g. a
  // family sharing one device, or local testing) overwrite each other. The
  // uid prefix keeps ids tied to the signed-in user; the suffix splits tabs.
  const playerId = `${uid}-${Math.random().toString(36).slice(2, 8)}`
  const metaSnap = await get(ref(db, `rooms/${code}/meta`))
  if (!metaSnap.exists()) throw new Error('Room not found — double-check the code.')
  const meta = metaSnap.val() as RoomMeta
  if (meta.status !== 'lobby') throw new Error('That game has already started.')
  const pRef = ref(db, `rooms/${code}/players/${playerId}`)
  await set(pRef, {
    ...player,
    score: 0,
    joinedAt: serverTimestamp(),
    connected: true,
  })
  // On a connection drop, mark them offline (with a timestamp) — DON'T delete
  // them. A blip must never cost a player their name, emoji, or score; the host
  // removes them only if they stay offline past a grace period.
  onDisconnect(pRef).update({ connected: false, disconnectedAt: serverTimestamp() })
  return playerId
}

/**
 * Re-assert a player's presence: mark them connected, restore their identity if
 * the node somehow went missing, and (re-)arm the on-disconnect flag. Called on
 * every (re)connection so the player survives momentary network drops.
 */
export async function establishPresence(
  code: string,
  playerId: string,
  identity: PlayerIdentity,
): Promise<void> {
  const pRef = ref(db, `rooms/${code}/players/${playerId}`)
  const snap = await get(pRef)
  if (snap.exists()) {
    // Keep their score; restore identity + mark online + clear the offline mark.
    await update(pRef, { ...identity, connected: true, disconnectedAt: null })
  } else {
    // Node was lost — recreate from what the device remembers.
    await set(pRef, {
      ...identity,
      score: 0,
      joinedAt: serverTimestamp(),
      connected: true,
    })
  }
  onDisconnect(pRef).update({ connected: false, disconnectedAt: serverTimestamp() })
}

/** Host: remove a player from the room (used to drop players who stayed offline
 *  past the grace period). */
export function removePlayer(code: string, uid: string): Promise<void> {
  return remove(ref(db, `rooms/${code}/players/${uid}`))
}

/** Subscribe to Firebase's own connection state (true once reconnected). */
export function onConnectionChange(cb: (connected: boolean) => void): Unsubscribe {
  return onValue(ref(db, '.info/connected'), (s) => cb(s.val() === true))
}

// ─── Narrow subscriptions ──────────────────────────────────────────────────
// Both sides listen only to the slices they need (all multiplexed over the one
// connection), so a single answer no longer re-downloads the whole room to
// everyone. Players never receive other players' raw answers.

export function subscribeMeta(
  code: string,
  cb: (meta: RoomMeta | null) => void,
): Unsubscribe {
  return onValue(ref(db, `rooms/${code}/meta`), (s) =>
    cb(s.exists() ? (s.val() as RoomMeta) : null),
  )
}

export function subscribeQuestion(
  code: string,
  cb: (q: RoomQuestion | null) => void,
): Unsubscribe {
  return onValue(ref(db, `rooms/${code}/question`), (s) =>
    cb(s.exists() ? (s.val() as RoomQuestion) : null),
  )
}

export function subscribePlayers(
  code: string,
  cb: (players: Record<string, RoomPlayer>) => void,
): Unsubscribe {
  return onValue(ref(db, `rooms/${code}/players`), (s) =>
    cb(s.exists() ? (s.val() as Record<string, RoomPlayer>) : {}),
  )
}

/** A single player's answer for one question (the player's own answer). */
export function subscribePlayerAnswer(
  code: string,
  qIndex: number,
  uid: string,
  cb: (a: PlayerAnswer | null) => void,
): Unsubscribe {
  return onValue(ref(db, `rooms/${code}/answers/${qIndex}/${uid}`), (s) =>
    cb(s.exists() ? (s.val() as PlayerAnswer) : null),
  )
}

/** All answers for ONE question (the host needs these to count + score). */
export function subscribeQuestionAnswers(
  code: string,
  qIndex: number,
  cb: (answers: Record<string, PlayerAnswer>) => void,
): Unsubscribe {
  return onValue(ref(db, `rooms/${code}/answers/${qIndex}`), (s) =>
    cb(s.exists() ? (s.val() as Record<string, PlayerAnswer>) : {}),
  )
}

export function submitAnswer(
  code: string,
  qIndex: number,
  uid: string,
  optionIndex: number,
): Promise<void> {
  return set(ref(db, `rooms/${code}/answers/${qIndex}/${uid}`), {
    optionIndex,
    answeredAt: serverTimestamp(),
  })
}

/** Host: push the public question (no correctIndex) and flip status to 'question'. */
export function pushQuestion(
  code: string,
  q: Omit<RoomQuestion, 'startedAt' | 'correctIndex'>,
): Promise<void> {
  return update(ref(db, `rooms/${code}`), {
    question: { ...q, startedAt: serverTimestamp(), correctIndex: null },
    'meta/status': 'question',
    'meta/questionIndex': q.index,
  })
}

/** Host: reveal the answer and apply scoring in one atomic update. */
export function revealQuestion(
  code: string,
  qIndex: number,
  correctIndex: number,
  newScores: Record<string, number>,
  answerResults: Record<string, { correct: boolean; awarded: number }>,
): Promise<void> {
  const updates: Record<string, unknown> = {
    'meta/status': 'reveal',
    'question/correctIndex': correctIndex,
  }
  for (const [uid, score] of Object.entries(newScores)) {
    updates[`players/${uid}/score`] = score
  }
  for (const [uid, r] of Object.entries(answerResults)) {
    updates[`answers/${qIndex}/${uid}/correct`] = r.correct
    updates[`answers/${qIndex}/${uid}/awarded`] = r.awarded
  }
  return update(ref(db, `rooms/${code}`), updates)
}

export function finishGame(code: string): Promise<void> {
  return update(ref(db, `rooms/${code}/meta`), { status: 'finished' })
}

export interface RoomSettings {
  pacing: Pacing
  timerSeconds: number
  totalQuestions: number
}

/** Host: apply edited game settings to a room that's back in the lobby. */
export function updateRoomSettings(code: string, s: RoomSettings): Promise<void> {
  return update(ref(db, `rooms/${code}/meta`), {
    pacing: s.pacing,
    timerSeconds: s.timerSeconds,
    totalQuestions: s.totalQuestions,
  })
}

/** Host: replay in the SAME room — keep the players, zero their scores, clear
 *  the question/answers, and drop back to the lobby for a fresh game (applying
 *  the latest settings, in case the host edited them). */
export function restartRoom(
  code: string,
  playerIds: string[],
  settings: RoomSettings,
): Promise<void> {
  const updates: Record<string, unknown> = {
    'meta/status': 'lobby',
    'meta/questionIndex': -1,
    'meta/totalQuestions': settings.totalQuestions,
    'meta/pacing': settings.pacing,
    'meta/timerSeconds': settings.timerSeconds,
    question: null, // RTDB removes null keys
    answers: null,
  }
  for (const id of playerIds) updates[`players/${id}/score`] = 0
  return update(ref(db, `rooms/${code}`), updates)
}

export function closeRoom(code: string): Promise<void> {
  forgetMyRoom(code) // cleanly closed — no need to track it for sweeping
  return remove(ref(db, `rooms/${code}`))
}

/** Player: remove yourself from a room (leaving the lobby or after the game).
 *  Disarms the on-disconnect "mark me offline" handler FIRST — otherwise the
 *  disconnect that follows would re-create the deleted node as a nameless
 *  ghost ("connected: false" and nothing else). */
export async function leaveRoom(code: string, uid: string): Promise<void> {
  const pRef = ref(db, `rooms/${code}/players/${uid}`)
  await onDisconnect(pRef).cancel()
  await remove(pRef)
}
