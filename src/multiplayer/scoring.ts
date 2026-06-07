import type { Difficulty } from '../types'
import type { Pacing } from './types'

const DIFF_BONUS: Record<Difficulty, number> = { easy: 0, medium: 20, hard: 50 }
const BASE = 100

/** In host-controlled (manual) mode there's no countdown, but we still reward
 *  quick answers: the speed bonus decays over this many seconds, then is zero. */
export const MANUAL_BONUS_WINDOW = 30

/**
 * Points for one answer. Wrong answers score 0. Correct answers earn a base +
 * a difficulty bonus + a speed bonus of up to +100 that decays as time passes
 * since the question appeared. The decay window is the question timer in timed
 * mode, or a fixed 30s in host-controlled mode (no bonus after that).
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
  const windowSec = opts.pacing === 'timed' ? opts.timerSeconds : MANUAL_BONUS_WINDOW
  if (windowSec > 0 && opts.startedAt > 0) {
    const elapsed = Math.max(0, opts.answeredAt - opts.startedAt)
    const frac = Math.max(0, Math.min(1, 1 - elapsed / (windowSec * 1000)))
    pts += Math.round(100 * frac)
  }
  return pts
}
