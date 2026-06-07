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
  /** Whether the player's device is currently connected. A momentary drop sets
   *  this false (instead of deleting the player) so nobody loses their seat. */
  connected?: boolean
}

/** What a player chose at join time — kept on their own device so we can
 *  re-assert it if the connection drops and comes back. */
export interface PlayerIdentity {
  name: string
  emoji: string
  color: string
}

export interface PlayerAnswer {
  optionIndex: number
  answeredAt: number
  correct?: boolean // filled in by the host at reveal
  awarded?: number // points awarded at reveal
}

// The room is stored under /rooms/{code} as:
//   meta: RoomMeta
//   question: RoomQuestion           (the current public question)
//   players: { [playerId]: RoomPlayer }
//   answers: { [questionIndex]: { [playerId]: PlayerAnswer } }
// Clients subscribe to these slices individually (see room.ts) rather than the
// whole room, so a single change never re-downloads everything to everyone.
