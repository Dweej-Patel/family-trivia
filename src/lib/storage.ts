// Tiny typed localStorage helpers with safe fallbacks.
import type { Player, Question, GameConfig } from '../types'

const KEYS = {
  questions: 'ft.questions.v1',
  players: 'ft.players.v1',
  config: 'ft.config.v1',
  muted: 'ft.muted.v1',
  myRooms: 'ft.myRooms.v1',
} as const

/** Rooms this device has hosted, so we can clean up stale ones we left behind. */
export interface HostedRoom {
  code: string
  ts: number
}

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* ignore quota / private-mode errors */
  }
}

export const storage = {
  loadQuestions: () => read<Question[]>(KEYS.questions),
  saveQuestions: (q: Question[]) => write(KEYS.questions, q),

  loadPlayers: () => read<Player[]>(KEYS.players),
  savePlayers: (p: Player[]) => write(KEYS.players, p),

  loadConfig: () => read<GameConfig>(KEYS.config),
  saveConfig: (c: GameConfig) => write(KEYS.config, c),

  loadMuted: () => read<boolean>(KEYS.muted) ?? false,
  saveMuted: (m: boolean) => write(KEYS.muted, m),

  loadMyRooms: () => read<HostedRoom[]>(KEYS.myRooms) ?? [],
  saveMyRooms: (rooms: HostedRoom[]) => write(KEYS.myRooms, rooms),
}
