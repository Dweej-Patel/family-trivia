import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

/** Cycles through playful one-liners so waiting screens feel alive instead of
 *  stuck. Starts at a random line so two phones aren't perfectly in sync. */
export function RotatingTagline({
  lines,
  intervalMs = 3500,
  className = '',
}: {
  lines: string[]
  intervalMs?: number
  className?: string
}) {
  const [i, setI] = useState(() => Math.floor(Math.random() * lines.length))
  useEffect(() => {
    const id = window.setInterval(() => setI((x) => x + 1), intervalMs)
    return () => window.clearInterval(id)
  }, [intervalMs])

  const line = lines[i % lines.length]
  return (
    <div className={['relative', className].join(' ')}>
      <AnimatePresence mode="wait">
        <motion.p
          key={line}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ type: 'spring', stiffness: 300, damping: 24 }}
        >
          {line}
        </motion.p>
      </AnimatePresence>
    </div>
  )
}
