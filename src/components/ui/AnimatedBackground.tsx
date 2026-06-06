import { motion } from 'framer-motion'

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

export function AnimatedBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-0 overflow-hidden">
      {/* Panning gradient base */}
      <div className="animate-gradient-pan absolute inset-0 bg-[length:400%_400%] bg-gradient-to-br from-grape via-bubble to-tangerine opacity-90" />
      <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-ink/40" />

      {/* Floating blurred blobs */}
      {BLOBS.map((blob, i) => (
        <motion.div
          key={i}
          className={`absolute rounded-full blur-3xl opacity-40 ${blob.className}`}
          style={{ backgroundColor: blob.color }}
          animate={{ x: blob.x, y: blob.y, scale: blob.scale }}
          transition={{
            duration: blob.duration,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}

      {/* Drifting sparkles */}
      {SPARKLES.map((sparkle, i) => (
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
