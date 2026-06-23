import { useRef, useState } from 'react'
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
 *  with dramatic per-state feedback — a touch ripple on tap, a glow-sweep that
 *  spotlights the correct answer (so you always learn it), and a red flash on a
 *  wrong pick. Every effect is a one-shot transform/opacity animation. */
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

  // Touch ripple from the tap point (one transient element, cleared on finish).
  const [ripple, setRipple] = useState<{ x: number; y: number; id: number } | null>(null)
  const rippleId = useRef(0)
  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (disabled) return
    const rect = e.currentTarget.getBoundingClientRect()
    setRipple({ x: e.clientX - rect.left, y: e.clientY - rect.top, id: ++rippleId.current })
  }

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
      onPointerDown={handlePointerDown}
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
        'group relative flex w-full items-center gap-4 overflow-hidden rounded-2xl p-4 sm:p-5',
        'text-left font-display text-lg font-bold text-white sm:text-xl',
        'shadow-playful outline-none transition-colors duration-200',
        'focus-visible:ring-4 focus-visible:ring-white/60',
        interactive ? 'cursor-pointer' : 'cursor-default',
        stateClasses[state],
      ].join(' ')}
      style={{ backgroundColor: color }}
    >
      {/* Tap ripple */}
      {ripple && (
        <motion.span
          key={ripple.id}
          className="pointer-events-none absolute rounded-full bg-white/40"
          style={{ left: ripple.x, top: ripple.y, width: 18, height: 18, marginLeft: -9, marginTop: -9 }}
          initial={{ scale: 0, opacity: 0.5 }}
          animate={{ scale: 16, opacity: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          onAnimationComplete={() => setRipple((r) => (r?.id === ripple.id ? null : r))}
        />
      )}

      {/* Correct answer: a one-time light sweep so the right answer always pops */}
      {state === 'correct' && (
        <motion.span
          className="pointer-events-none absolute inset-y-0 w-1/3"
          style={{
            background:
              'linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent)',
          }}
          initial={{ x: '-160%' }}
          animate={{ x: '360%' }}
          transition={{ duration: 0.7, ease: 'easeInOut', delay: 0.1 }}
        />
      )}

      {/* Wrong pick: quick red flash */}
      {state === 'wrong' && (
        <motion.span
          className="pointer-events-none absolute inset-0 bg-red-700/40"
          initial={{ opacity: 0.65 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        />
      )}

      <span
        className="relative flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-black/25 text-xl text-white"
        aria-hidden
      >
        {shape}
      </span>

      <span className="relative flex-1 drop-shadow-sm">{label}</span>

      {state === 'correct' && (
        <motion.span
          initial={{ scale: 0, rotate: -30 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 18 }}
          className="relative flex-none text-3xl text-white drop-shadow"
        >
          ✓
        </motion.span>
      )}
      {state === 'wrong' && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 18 }}
          className="relative flex-none text-3xl text-white drop-shadow"
        >
          ✗
        </motion.span>
      )}
    </motion.button>
  )
}
