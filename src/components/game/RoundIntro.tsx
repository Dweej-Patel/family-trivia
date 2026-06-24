import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useAudio } from '../../hooks/useAudio'
import { Mascot } from '../ui/Mascot'

interface Frame {
  kind: 'category' | 'count' | 'go'
  value?: string
  ms: number
}

// A quick game-show open: announce the category, then 3·2·1·GO. ~2.6s total,
// and tappable to skip.
const FRAMES: Frame[] = [
  { kind: 'category', ms: 1050 },
  { kind: 'count', value: '3', ms: 480 },
  { kind: 'count', value: '2', ms: 480 },
  { kind: 'count', value: '1', ms: 480 },
  { kind: 'go', ms: 650 },
]

const COUNT_COLORS: Record<string, string> = { '3': '#38bdf8', '2': '#fbbf24', '1': '#f97316' }

/**
 * The "get ready" overlay shown at the start of a game (and after halftime): a
 * category card flips in, then a springy 3·2·1·GO. Entirely one-shot
 * transform/opacity animations; under reduced motion it skips straight to play.
 */
export function RoundIntro({ category, onDone }: { category: string; onDone: () => void }) {
  const reduce = useReducedMotion()
  const { play } = useAudio()
  const [i, setI] = useState(0)

  useEffect(() => {
    if (reduce) {
      onDone()
      return
    }
    let idx = 0
    let timer = 0
    const tick = () => {
      const f = FRAMES[idx]
      if (f.kind === 'count') play('countdown')
      else if (f.kind === 'go') play('whoosh')
      timer = window.setTimeout(() => {
        idx += 1
        if (idx >= FRAMES.length) {
          onDone()
          return
        }
        setI(idx)
        tick()
      }, f.ms)
    }
    tick()
    return () => window.clearTimeout(timer)
    // Run the sequence once; onDone is stable enough for this lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (reduce || typeof document === 'undefined') return null
  const f = FRAMES[i]

  return createPortal(
    <motion.div
      className="fixed inset-0 z-[70] flex flex-col items-center justify-center gap-6 bg-ink/75"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onDone}
    >
      <AnimatePresence mode="wait">
        {f.kind === 'category' && (
          <motion.div
            key="cat"
            className="flex flex-col items-center gap-4"
            initial={{ rotateX: -90, opacity: 0, y: 20 }}
            animate={{ rotateX: 0, opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 220, damping: 18 }}
            style={{ transformPerspective: 800 }}
          >
            <Mascot mood="happy" size={96} />
            <span className="font-display text-xl font-bold uppercase tracking-widest text-white/70">
              Category
            </span>
            <span className="max-w-[90vw] text-center font-display text-4xl font-bold text-white drop-shadow-lg sm:text-6xl">
              {category}
            </span>
          </motion.div>
        )}

        {f.kind === 'count' && (
          <motion.span
            key={`c-${f.value}`}
            className="font-display text-[8rem] font-black leading-none tabular-nums drop-shadow-2xl sm:text-[12rem]"
            style={{ color: COUNT_COLORS[f.value ?? '1'] ?? '#fff' }}
            initial={{ scale: 2.2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.4, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 360, damping: 18 }}
          >
            {f.value}
          </motion.span>
        )}

        {f.kind === 'go' && (
          <motion.span
            key="go"
            className="bg-gradient-to-br from-mint via-sunny to-tangerine bg-clip-text font-display text-[7rem] font-black leading-none text-transparent drop-shadow-2xl sm:text-[11rem]"
            initial={{ scale: 0.3, opacity: 0, rotate: -8 }}
            animate={{ scale: [0.3, 1.15, 1], opacity: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 14 }}
          >
            GO!
          </motion.span>
        )}
      </AnimatePresence>
    </motion.div>,
    document.body,
  )
}
