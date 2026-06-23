import { useEffect } from 'react'
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'framer-motion'

interface RollingNumberProps {
  value: number
  /** Seconds to count up. */
  duration?: number
  className?: string
}

/**
 * A slot-machine score that counts up to `value` (from 0 on first mount, then
 * from wherever it was on later changes). Drives a framer MotionValue straight
 * into the DOM text — no React re-render per frame — and snaps instantly under
 * reduced motion.
 */
export function RollingNumber({ value, duration = 0.9, className }: RollingNumberProps) {
  const reduce = useReducedMotion()
  const mv = useMotionValue(reduce ? value : 0)
  const text = useTransform(mv, (v) => Math.round(v).toLocaleString())

  useEffect(() => {
    if (reduce) {
      mv.set(value)
      return
    }
    const controls = animate(mv, value, { duration, ease: 'easeOut' })
    return () => controls.stop()
  }, [value, duration, reduce, mv])

  return <motion.span className={className}>{text}</motion.span>
}
