import { motion } from 'framer-motion'

interface CountdownRingProps {
  remaining: number
  total: number
}

const SIZE = 120
const STROKE = 12
const RADIUS = (SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

/** Pick a color that warms from mint → sunny → red as time depletes. */
function ringColor(fraction: number): string {
  if (fraction > 0.5) return '#34d399' // mint
  if (fraction > 0.25) return '#fbbf24' // sunny
  return '#ef4444' // red
}

/**
 * Animated circular timer. The ring depletes (strokeDashoffset) as the seconds
 * run down, shifts color when low, and pulses in the final ~5 seconds.
 */
export function CountdownRing({ remaining, total }: CountdownRingProps) {
  const safeTotal = Math.max(1, total)
  const fraction = Math.max(0, Math.min(1, remaining / safeTotal))
  const offset = CIRCUMFERENCE * (1 - fraction)
  const color = ringColor(fraction)
  const urgent = remaining <= 5 && remaining > 0

  return (
    <motion.div
      className="relative inline-flex items-center justify-center"
      style={{ width: SIZE, height: SIZE }}
      animate={
        urgent
          ? { scale: [1, 1.12, 1] }
          : { scale: 1 }
      }
      transition={
        urgent
          ? { duration: 1, repeat: Infinity, ease: 'easeInOut' }
          : { type: 'spring', stiffness: 300, damping: 20 }
      }
    >
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="-rotate-90"
      >
        {/* Track */}
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="rgba(255,255,255,0.15)"
          strokeWidth={STROKE}
        />
        {/* Depleting progress arc */}
        <motion.circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke={color}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          animate={{ strokeDashoffset: offset, stroke: color }}
          transition={{
            strokeDashoffset: { duration: 0.9, ease: 'linear' },
            stroke: { duration: 0.4 },
          }}
          style={{
            filter: urgent ? `drop-shadow(0 0 8px ${color})` : 'none',
          }}
        />
      </svg>

      {/* Center seconds readout */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.span
          key={remaining}
          initial={{ scale: 1.4, opacity: 0.4 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 24 }}
          className="font-display text-4xl font-bold tabular-nums"
          style={{ color }}
        >
          {Math.max(0, remaining)}
        </motion.span>
      </div>
    </motion.div>
  )
}
