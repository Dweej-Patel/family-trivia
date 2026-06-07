import { ref, get } from 'firebase/database'
import { db, ensureSignedIn, connectDb } from '../lib/firebase'
import { establishPresence } from './room'
import {
  loadSession,
  clearSession,
  loadHostSession,
  clearHostSession,
} from './session'
import { useMpStore } from './mpStore'
import { useGame } from '../store/gameStore'
import type { RoomMeta } from './types'

/**
 * Re-join a saved player session after a reload / tab restore. Restores the
 * player's identity and score in-place (establishPresence keeps the score if
 * the node still exists), then jumps back into the player screen. Falls back to
 * home — clearing the stale session — if the room is gone or the game is over.
 */
export async function resumePlayerSession(): Promise<void> {
  const s = loadSession()
  if (!s) return
  try {
    connectDb()
    const uid = await ensureSignedIn()
    const snap = await get(ref(db, `rooms/${s.code}/meta`))
    if (!snap.exists()) {
      clearSession() // room no longer exists
      return
    }
    const meta = snap.val() as RoomMeta
    if (meta.status === 'finished') {
      clearSession() // game already ended
      return
    }
    await establishPresence(s.code, uid, s.identity)
    useMpStore.getState().setPlayerSession(s.code, uid, s.identity)
    useGame.getState().setScreen('mpPlayer')
  } catch {
    /* any failure → just leave them on the home screen */
  }
}

/**
 * Resume hosting after a reload. The saved session carries everything the host
 * held in memory (deck, pacing, timer), and the room itself never died — so we
 * restore the in-memory session, point the host screen at the existing room
 * (it re-attaches instead of creating), and jump back in mid-game if need be.
 */
export async function resumeHostSession(): Promise<void> {
  const s = loadHostSession()
  if (!s) return
  try {
    connectDb()
    const uid = await ensureSignedIn()
    const snap = await get(ref(db, `rooms/${s.code}/meta`))
    if (!snap.exists()) {
      clearHostSession() // room no longer exists
      return
    }
    const meta = snap.val() as RoomMeta
    if (meta.hostId !== uid) {
      clearHostSession() // somehow not our room anymore — don't hijack it
      return
    }
    const mp = useMpStore.getState()
    mp.setHostSession(s.deck, s.pacing, s.timerSeconds)
    mp.setHostRoomCode(s.code)
    useGame.getState().setScreen('mpHost')
  } catch {
    /* any failure → just leave them on the home screen */
  }
}
