import { AnimatePresence, motion } from 'framer-motion'

interface HUDPlayer {
  id: string
  name: string
  emoji: string
  color: string
  score: number
}

interface ScoreHUDProps {
  players: HUDPlayer[]
  activeId?: string
}

/** A compact strip of player chips with animated, layout-aware scores. */
export function ScoreHUD({ players, activeId }: ScoreHUDProps) {
  if (players.length === 0) return null

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
      {players.map((p) => {
        const active = p.id === activeId
        return (
          <motion.div
            layout
            key={p.id}
            initial={{ opacity: 0, y: -8 }}
            animate={{
              opacity: 1,
              y: 0,
              scale: active ? 1.08 : 1,
            }}
            transition={{ type: 'spring', stiffness: 400, damping: 26 }}
            className={[
              'flex items-center gap-2 rounded-full border-2 px-3 py-1.5',
              'font-body font-bold',
              active ? 'shadow-glow' : '',
            ].join(' ')}
            style={{
              borderColor: active ? p.color : 'rgba(255,255,255,0.2)',
              backgroundColor: active ? `${p.color}22` : 'rgba(255,255,255,0.08)',
            }}
          >
            <span className="text-lg">{p.emoji}</span>
            <span
              className="max-w-[7rem] truncate text-sm sm:text-base"
              style={{ color: active ? p.color : 'rgba(255,255,255,0.85)' }}
            >
              {p.name}
            </span>
            <span className="relative inline-flex min-w-[2ch] justify-end font-display tabular-nums text-white">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={p.score}
                  initial={{ y: 12, opacity: 0, scale: 0.6 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  exit={{ y: -12, opacity: 0, scale: 0.6 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 26 }}
                >
                  {p.score}
                </motion.span>
              </AnimatePresence>
            </span>
          </motion.div>
        )
      })}
    </div>
  )
}
