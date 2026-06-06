import { motion } from 'framer-motion'

export type AnswerState = 'idle' | 'selected' | 'correct' | 'wrong' | 'dimmed'

interface AnswerOptionProps {
  label: string
  index: number
  state: AnswerState
  onClick: () => void
  disabled?: boolean
}

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F']

const stateClasses: Record<AnswerState, string> = {
  idle: 'bg-white/10 border-white/20 text-white hover:bg-white/20',
  selected:
    'bg-grape/30 border-grape text-white ring-4 ring-grape/60 shadow-glow',
  correct:
    'bg-mint/25 border-mint text-white ring-4 ring-mint/70 shadow-glow',
  wrong: 'bg-red-500/25 border-red-500 text-white ring-4 ring-red-500/60',
  dimmed: 'bg-white/5 border-white/10 text-white/40 opacity-60',
}

const badgeClasses: Record<AnswerState, string> = {
  idle: 'bg-white/15 text-white',
  selected: 'bg-grape text-white',
  correct: 'bg-mint text-ink',
  wrong: 'bg-red-500 text-white',
  dimmed: 'bg-white/10 text-white/50',
}

/** A big tactile answer button with dramatic per-state feedback. */
export function AnswerOption({
  label,
  index,
  state,
  onClick,
  disabled = false,
}: AnswerOptionProps) {
  const interactive = !disabled
  const letter = LETTERS[index] ?? String(index + 1)

  // Per-state entrance / emphasis animation.
  const animate =
    state === 'correct'
      ? { scale: [1, 1.06, 1], transition: { duration: 0.45 } }
      : state === 'wrong'
        ? { x: [0, -10, 10, -7, 7, 0], transition: { duration: 0.45 } }
        : { scale: 1, x: 0 }

  return (
    <motion.button
      type="button"
      disabled={disabled}
      onClick={() => {
        if (!disabled) onClick()
      }}
      animate={animate}
      whileHover={interactive ? { scale: 1.03, y: -2 } : undefined}
      whileTap={interactive ? { scale: 0.96 } : undefined}
      transition={{ type: 'spring', stiffness: 400, damping: 24 }}
      className={[
        'group relative flex w-full items-center gap-4 rounded-2xl border-2 p-4 sm:p-5',
        'text-left font-body text-lg font-bold sm:text-xl',
        'outline-none transition-colors duration-200',
        'focus-visible:ring-4 focus-visible:ring-white/40',
        interactive ? 'cursor-pointer' : 'cursor-default',
        stateClasses[state],
      ].join(' ')}
    >
      <span
        className={[
          'flex h-10 w-10 flex-none items-center justify-center rounded-xl',
          'font-display text-xl font-bold',
          badgeClasses[state],
        ].join(' ')}
      >
        {letter}
      </span>

      <span className="flex-1">{label}</span>

      {state === 'correct' && (
        <motion.span
          initial={{ scale: 0, rotate: -30 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 18 }}
          className="flex-none text-2xl text-mint drop-shadow"
        >
          ✓
        </motion.span>
      )}
      {state === 'wrong' && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 18 }}
          className="flex-none text-2xl text-red-400 drop-shadow"
        >
          ✗
        </motion.span>
      )}
    </motion.button>
  )
}
