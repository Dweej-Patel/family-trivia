import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'

/** Streak threshold at which the celebration escalates to "ON FIRE". */
export const ON_FIRE = 5

interface StreakFlairProps {
  streak: number
  /** Player color to tint the badge toward. */
  color?: string
}

/**
 * An escalating streak badge. 2–4 in a row gets a "🔥 N in a row!" chip; from 5
 * it ignites into "ON FIRE!" with more flames, and 8+ goes "UNSTOPPABLE!". The
 * badge re-pops on every increment (keyed by `streak`). Pair with
 * <StreakEdgeGlow active={streak >= ON_FIRE}/> for the screen-edge blaze.
 */
export function StreakFlair({ streak, color = '#f97316' }: StreakFlairProps) {
  if (streak < 2) return null
  const blazing = streak >= 8
  const onFire = streak >= ON_FIRE
  const flames = blazing ? '🔥🔥🔥' : onFire ? '🔥🔥' : '🔥'
  const label = blazing ? 'UNSTOPPABLE!' : onFire ? 'ON FIRE!' : `${streak} in a row!`

  return (
    <motion.div
      key={streak}
      initial={{ scale: 0, rotate: -10 }}
      animate={
        onFire
          ? { scale: [0, 1.18, 1], rotate: [-10, 4, 0], x: [0, -3, 3, -2, 2, 0] }
          : { scale: [0, 1.1, 1], rotate: [-10, 0] }
      }
      transition={{ type: 'spring', stiffness: 420, damping: 14 }}
      className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 font-display text-lg font-bold sm:text-xl"
      style={{
        color: '#fff7ed',
        borderColor: onFire ? 'rgba(249,115,22,0.9)' : `${color}cc`,
        background: onFire
          ? 'linear-gradient(90deg, rgba(249,115,22,0.4), rgba(239,68,68,0.4))'
          : `${color}33`,
        boxShadow: onFire ? '0 0 24px 0 rgba(249,115,22,0.6)' : undefined,
      }}
    >
      <motion.span
        animate={onFire ? { scale: [1, 1.2, 1], rotate: [0, -8, 8, 0] } : undefined}
        transition={onFire ? { duration: 0.9, repeat: Infinity, ease: 'easeInOut' } : undefined}
        aria-hidden
      >
        {flames}
      </motion.span>
      <span>{label}</span>
      {onFire && <span className="tabular-nums opacity-90">{streak}</span>}
    </motion.div>
  )
}

/** Screen-edge fire glow for a hot streak. Pulses opacity only (a static inset
 *  shadow on a composited layer), so it costs nothing per frame. Portaled to
 *  <body> so a transformed screen wrapper can't shrink it to the content column. */
export function StreakEdgeGlow({ active }: { active: boolean }) {
  if (typeof document === 'undefined') return null
  return createPortal(
    <AnimatePresence>
      {active && (
        <motion.div
          className="pointer-events-none fixed inset-0 z-[55]"
          style={{ boxShadow: 'inset 0 0 110px 18px rgba(249,115,22,0.55)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.35, 0.7, 0.35] }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
    </AnimatePresence>,
    document.body,
  )
}
