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
import type {
  Pacing,
  PlayerIdentity,
  RoomMeta,
  RoomQuestion,
  RoomSnapshot,
} from './types'

// Room-code alphabet with ambiguous characters (O/0, I/1) removed.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function generateRoomCode(len = 4): string {
  let s = ''
  for (let i = 0; i < len; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
  return s
}

function roomExists(code: string): Promise<boolean> {
  return get(ref(db, `rooms/${code}/meta`)).then((s) => s.exists())
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
    // Auto-clean the whole room if the host closes the tab / disconnects.
    onDisconnect(ref(db, `rooms/${code}`)).remove()
    return { code, hostId }
  }
  throw new Error('Could not allocate a room code — please try again.')
}

/** Player: join an existing lobby. Returns the player's uid. */
export async function joinRoom(
  code: string,
  player: { name: string; emoji: string; color: string },
): Promise<string> {
  connectDb() // re-open the connection in case a previous session closed it
  const uid = await ensureSignedIn()
  const metaSnap = await get(ref(db, `rooms/${code}/meta`))
  if (!metaSnap.exists()) throw new Error('Room not found — double-check the code.')
  const meta = metaSnap.val() as RoomMeta
  if (meta.status !== 'lobby') throw new Error('That game has already started.')
  const pRef = ref(db, `rooms/${code}/players/${uid}`)
  await set(pRef, {
    ...player,
    score: 0,
    joinedAt: serverTimestamp(),
    connected: true,
  })
  // On a connection drop, just mark them offline — DON'T delete them. A blip
  // must never cost a player their name, emoji, or score.
  onDisconnect(pRef).update({ connected: false })
  return uid
}

/**
 * Re-assert a player's presence: mark them connected, restore their identity if
 * the node somehow went missing, and (re-)arm the on-disconnect flag. Called on
 * every (re)connection so the player survives momentary network drops.
 */
export async function establishPresence(
  code: string,
  uid: string,
  identity: PlayerIdentity,
): Promise<void> {
  const pRef = ref(db, `rooms/${code}/players/${uid}`)
  const snap = await get(pRef)
  if (snap.exists()) {
    // Keep their score; just restore identity fields + mark online.
    await update(pRef, { ...identity, connected: true })
  } else {
    // Node was lost — recreate from what the device remembers.
    await set(pRef, {
      ...identity,
      score: 0,
      joinedAt: serverTimestamp(),
      connected: true,
    })
  }
  onDisconnect(pRef).update({ connected: false })
}

/** Subscribe to Firebase's own connection state (true once reconnected). */
export function onConnectionChange(cb: (connected: boolean) => void): Unsubscribe {
  return onValue(ref(db, '.info/connected'), (s) => cb(s.val() === true))
}

export function subscribeRoom(
  code: string,
  cb: (snap: RoomSnapshot | null) => void,
): Unsubscribe {
  return onValue(ref(db, `rooms/${code}`), (s) =>
    cb(s.exists() ? (s.val() as RoomSnapshot) : null),
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

/** Host: replay in the SAME room — keep the players, zero their scores, clear
 *  the question/answers, and drop back to the lobby for a fresh game. */
export function restartRoom(
  code: string,
  playerIds: string[],
  totalQuestions: number,
): Promise<void> {
  const updates: Record<string, unknown> = {
    'meta/status': 'lobby',
    'meta/questionIndex': -1,
    'meta/totalQuestions': totalQuestions,
    question: null, // RTDB removes null keys
    answers: null,
  }
  for (const id of playerIds) updates[`players/${id}/score`] = 0
  return update(ref(db, `rooms/${code}`), updates)
}

export function closeRoom(code: string): Promise<void> {
  return remove(ref(db, `rooms/${code}`))
}

/** Player: remove yourself from a room (used when leaving after the game). */
export function leaveRoom(code: string, uid: string): Promise<void> {
  return remove(ref(db, `rooms/${code}/players/${uid}`))
}
