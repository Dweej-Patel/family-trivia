import type { Difficulty, QuestionType } from '../types'

// ─── Real-time room model (mirrors /rooms/{code} in Firebase RTDB) ───────────

export type RoomStatus = 'lobby' | 'question' | 'reveal' | 'finished'
export type Pacing = 'timed' | 'manual'

export interface RoomMeta {
  status: RoomStatus
  hostId: string
  pacing: Pacing
  timerSeconds: number
  questionIndex: number // 0-based index of the current question
  totalQuestions: number
  createdAt: number
}

/**
 * The public view of the current question that players receive. Crucially,
 * `correctIndex` is NOT sent during the 'question' phase (so a player can't peek
 * at the answer in the database) — the host writes it only at 'reveal'.
 */
export interface RoomQuestion {
  index: number
  prompt: string
  options: string[]
  category: string
  difficulty: Difficulty
  type: QuestionType
  startedAt: number // server time the question went live (drives the countdown)
  timerSeconds: number
  correctIndex: number | null // null until reveal
}

export interface RoomPlayer {
  name: string
  emoji: string
  color: string
  score: number
  joinedAt: number
}

export interface PlayerAnswer {
  optionIndex: number
  answeredAt: number
  correct?: boolean // filled in by the host at reveal
  awarded?: number // points awarded at reveal
}

/** A full snapshot of /rooms/{code} as read from RTDB. */
export interface RoomSnapshot {
  meta: RoomMeta
  question?: RoomQuestion | null
  players?: Record<string, RoomPlayer>
  answers?: Record<string, Record<string, PlayerAnswer>> // [questionIndex][playerId]
}
