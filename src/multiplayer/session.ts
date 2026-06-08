import type { Question } from '../types'
import type { Pacing, PlayerIdentity } from './types'

// A player's room session, saved in sessionStorage so it survives a reload (or
// an iOS background-tab reload) WITHOUT leaking across tabs — sessionStorage is
// per-tab, so a host tab and a player tab in the same browser stay independent.
const KEY = 'ft.mpSession.v1'
// The host's session for the same purpose: the room code plus everything the
// host holds in memory (the full deck with answers, pacing, timer) so a reload
// can resume hosting the SAME room instead of stranding the players.
const HOST_KEY = 'ft.mpHostSession.v1'

export interface SavedSession {
  code: string
  /** The player's id in the room (per-tab — NOT the shared auth uid, so two
   *  tabs in one browser stay separate players). Absent in legacy sessions. */
  playerId?: string
  identity: PlayerIdentity
}

export function saveSession(s: SavedSession): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    /* ignore private-mode / quota errors */
  }
}

export function loadSession(): SavedSession | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as SavedSession) : null
  } catch {
    return null
  }
}

export function clearSession(): void {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}

// The room code from a ?room= deep link, stashed for the brief window between
// detecting the link and the (lazy-loaded) join screen mounting. If a stale
// cached bundle fails to load that chunk, the error boundary's cache-busting
// reload re-reads this so the room code survives the reload. See [[ChunkErrorBoundary]].
const PENDING_ROOM_KEY = 'ft.pendingRoom.v1'

export function savePendingRoom(code: string): void {
  try {
    sessionStorage.setItem(PENDING_ROOM_KEY, code)
  } catch {
    /* ignore */
  }
}

export function loadPendingRoom(): string | null {
  try {
    return sessionStorage.getItem(PENDING_ROOM_KEY)
  } catch {
    return null
  }
}

export function clearPendingRoom(): void {
  try {
    sessionStorage.removeItem(PENDING_ROOM_KEY)
  } catch {
    /* ignore */
  }
}

export interface SavedHostSession {
  code: string
  deck: Question[]
  pacing: Pacing
  timerSeconds: number
}

export function saveHostSession(s: SavedHostSession): void {
  try {
    sessionStorage.setItem(HOST_KEY, JSON.stringify(s))
  } catch {
    /* ignore private-mode / quota errors */
  }
}

export function loadHostSession(): SavedHostSession | null {
  try {
    const raw = sessionStorage.getItem(HOST_KEY)
    return raw ? (JSON.parse(raw) as SavedHostSession) : null
  } catch {
    return null
  }
}

export function clearHostSession(): void {
  try {
    sessionStorage.removeItem(HOST_KEY)
  } catch {
    /* ignore */
  }
}
