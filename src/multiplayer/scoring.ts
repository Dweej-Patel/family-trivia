import type { Difficulty } from '../types'
import type { Pacing } from './types'

const DIFF_BONUS: Record<Difficulty, number> = { easy: 0, medium: 20, hard: 50 }
const BASE = 100

/**
 * Points for one answer. Wrong answers score 0. Correct answers earn a base +
 * a difficulty bonus, plus (in timed mode) a speed bonus of up to +100 that
 * decays as the clock runs down — so quicker correct answers score more.
 */
export function scoreAnswer(opts: {
  correct: boolean
  difficulty: Difficulty
  pacing: Pacing
  timerSeconds: number
  startedAt: number
  answeredAt: number
}): number {
  if (!opts.correct) return 0
  let pts = BASE + DIFF_BONUS[opts.difficulty]
  if (opts.pacing === 'timed' && opts.timerSeconds > 0 && opts.startedAt > 0) {
    const elapsed = Math.max(0, opts.answeredAt - opts.startedAt)
    const frac = Math.max(0, Math.min(1, 1 - elapsed / (opts.timerSeconds * 1000)))
    pts += Math.round(100 * frac)
  }
  return pts
}
