import type { PlayerIdentity } from './types'

// A player's room session, saved in sessionStorage so it survives a reload (or
// an iOS background-tab reload) WITHOUT leaking across tabs — sessionStorage is
// per-tab, so a host tab and a player tab in the same browser stay independent.
const KEY = 'ft.mpSession.v1'

export interface SavedSession {
  code: string
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
