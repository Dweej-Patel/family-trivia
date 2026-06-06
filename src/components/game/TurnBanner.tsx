import { AnimatePresence, motion } from 'framer-motion'

interface TurnBannerProps {
  player: { name: string; emoji: string; color: string }
}

/** Announces whose turn it is, springing in fresh whenever the player changes. */
export function TurnBanner({ player }: TurnBannerProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={player.name + player.emoji}
        initial={{ x: -40, opacity: 0, scale: 0.9 }}
        animate={{ x: 0, opacity: 1, scale: 1 }}
        exit={{ x: 40, opacity: 0, scale: 0.9 }}
        transition={{ type: 'spring', stiffness: 400, damping: 24 }}
        className="inline-flex items-center gap-3 rounded-full border-2 px-5 py-2"
        style={{
          borderColor: player.color,
          backgroundColor: `${player.color}22`,
        }}
      >
        <motion.span
          className="text-2xl"
          animate={{ rotate: [-8, 8, -8] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
        >
          {player.emoji}
        </motion.span>
        <span
          className="font-display text-lg font-bold sm:text-xl"
          style={{ color: player.color }}
        >
          {player.name}'s Turn
        </span>
      </motion.div>
    </AnimatePresence>
  )
}
