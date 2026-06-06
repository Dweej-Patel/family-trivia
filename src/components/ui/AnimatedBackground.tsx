import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

interface Blob {
  className: string
  color: string
  duration: number
  x: number[]
  y: number[]
  scale: number[]
}

const BLOBS: Blob[] = [
  {
    className: 'top-[-10%] left-[-5%] h-80 w-80',
    color: '#ec4899',
    duration: 18,
    x: [0, 40, -20, 0],
    y: [0, 60, 30, 0],
    scale: [1, 1.2, 0.9, 1],
  },
  {
    className: 'top-[20%] right-[-8%] h-96 w-96',
    color: '#38bdf8',
    duration: 22,
    x: [0, -50, 20, 0],
    y: [0, 40, -30, 0],
    scale: [1, 0.85, 1.15, 1],
  },
  {
    className: 'bottom-[-12%] left-[20%] h-[28rem] w-[28rem]',
    color: '#f97316',
    duration: 26,
    x: [0, 60, -30, 0],
    y: [0, -40, 20, 0],
    scale: [1, 1.1, 0.95, 1],
  },
  {
    className: 'bottom-[10%] right-[15%] h-72 w-72',
    color: '#fbbf24',
    duration: 20,
    x: [0, -30, 40, 0],
    y: [0, 50, -20, 0],
    scale: [1, 1.25, 0.9, 1],
  },
]

interface Sparkle {
  emoji: string
  className: string
  duration: number
}

const SPARKLES: Sparkle[] = [
  { emoji: '✨', className: 'top-[15%] left-[12%] text-3xl', duration: 7 },
  { emoji: '⭐', className: 'top-[60%] left-[8%] text-2xl', duration: 9 },
  { emoji: '🌟', className: 'top-[30%] right-[10%] text-3xl', duration: 8 },
  { emoji: '✨', className: 'bottom-[18%] right-[22%] text-2xl', duration: 10 },
]

/** True on phone-sized screens, where animating large blurred layers is too
 *  expensive (it forces the GPU to re-rasterize the blur every frame). */
function useIsSmallScreen(): boolean {
  const [small, setSmall] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(max-width: 768px)')
    const update = () => setSmall(mq.matches)
    update()
    mq.addEventListener?.('change', update)
    return () => mq.removeEventListener?.('change', update)
  }, [])
  return small
}

export function AnimatedBackground() {
  const reduceMotion = useReducedMotion()
  const small = useIsSmallScreen()
  // Animate the heavy blurred layers only where it's cheap: larger screens with
  // motion allowed. On phones we keep the same look but render it statically.
  const animate = !reduceMotion && !small

  // Fewer blurred layers on phones (each blurred layer is a compositing cost).
  const blobs = small ? BLOBS.slice(0, 2) : BLOBS

  return (
    <div className="pointer-events-none fixed inset-0 -z-0 overflow-hidden">
      {/* Static gradient base — animating background-position repaints the whole
          screen every frame, which is the biggest mobile cost, so we don't. */}
      <div className="absolute inset-0 bg-gradient-to-br from-grape via-bubble to-tangerine opacity-90" />
      <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-ink/40" />

      {/* Floating blurred blobs */}
      {blobs.map((blob, i) => (
        <motion.div
          key={i}
          className={`absolute rounded-full opacity-40 ${small ? 'blur-2xl' : 'blur-3xl'} ${blob.className}`}
          style={{ backgroundColor: blob.color, willChange: animate ? 'transform' : undefined }}
          animate={animate ? { x: blob.x, y: blob.y, scale: blob.scale } : undefined}
          transition={
            animate
              ? { duration: blob.duration, repeat: Infinity, ease: 'easeInOut' }
              : undefined
          }
        />
      ))}

      {/* Drifting sparkles — animation only; skip entirely on phones / reduced motion */}
      {animate &&
        SPARKLES.map((sparkle, i) => (
          <motion.div
            key={`s-${i}`}
            className={`absolute select-none opacity-70 ${sparkle.className}`}
            animate={{ y: [0, -18, 0], rotate: [0, 12, -12, 0], opacity: [0.4, 0.9, 0.4] }}
            transition={{
              duration: sparkle.duration,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            {sparkle.emoji}
          </motion.div>
        ))}
    </div>
  )
}
