import { motion } from 'framer-motion'
import { ANSWER_COLORS, ANSWER_SHAPES } from '../../lib/answerStyle'
import { buzz } from '../../lib/haptics'

export type AnswerState = 'idle' | 'selected' | 'correct' | 'wrong' | 'dimmed'

interface AnswerOptionProps {
  label: string
  index: number
  state: AnswerState
  onClick: () => void
  disabled?: boolean
}

// Ring/emphasis per state; the tile keeps its slot color throughout so the
// shape+color language never changes mid-question.
const stateClasses: Record<AnswerState, string> = {
  idle: 'ring-0',
  selected: 'ring-4 ring-white shadow-glow',
  correct: 'ring-4 ring-white shadow-glow',
  wrong: 'ring-4 ring-ink/60',
  dimmed: 'ring-0',
}

/** A big tactile answer tile: solid slot color + shape badge (game-show style),
 *  with dramatic per-state feedback. */
export function AnswerOption({
  label,
  index,
  state,
  onClick,
  disabled = false,
}: AnswerOptionProps) {
  const interactive = !disabled
  const color = ANSWER_COLORS[index % ANSWER_COLORS.length]
  const shape = ANSWER_SHAPES[index % ANSWER_SHAPES.length]

  // Per-state entrance / emphasis animation.
  const animate =
    state === 'correct'
      ? { scale: [1, 1.06, 1], opacity: 1, transition: { duration: 0.45 } }
      : state === 'wrong'
        ? { x: [0, -10, 10, -7, 7, 0], opacity: 1, transition: { duration: 0.45 } }
        : {
            scale: state === 'selected' ? 1.02 : 1,
            x: 0,
            opacity: state === 'dimmed' ? 0.35 : 1,
          }

  return (
    <motion.button
      type="button"
      disabled={disabled}
      onClick={() => {
        if (!disabled) {
          buzz(12)
          onClick()
        }
      }}
      animate={animate}
      whileHover={interactive ? { scale: 1.03, y: -2 } : undefined}
      whileTap={interactive ? { scale: 0.96 } : undefined}
      transition={{ type: 'spring', stiffness: 400, damping: 24 }}
      className={[
        'group relative flex w-full items-center gap-4 rounded-2xl p-4 sm:p-5',
        'text-left font-display text-lg font-bold text-white sm:text-xl',
        'shadow-playful outline-none transition-colors duration-200',
        'focus-visible:ring-4 focus-visible:ring-white/60',
        interactive ? 'cursor-pointer' : 'cursor-default',
        stateClasses[state],
      ].join(' ')}
      style={{ backgroundColor: color }}
    >
      <span
        className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-black/25 text-xl text-white"
        aria-hidden
      >
        {shape}
      </span>

      <span className="flex-1 drop-shadow-sm">{label}</span>

      {state === 'correct' && (
        <motion.span
          initial={{ scale: 0, rotate: -30 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 18 }}
          className="flex-none text-3xl text-white drop-shadow"
        >
          ✓
        </motion.span>
      )}
      {state === 'wrong' && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 18 }}
          className="flex-none text-3xl text-white drop-shadow"
        >
          ✗
        </motion.span>
      )}
    </motion.button>
  )
}
