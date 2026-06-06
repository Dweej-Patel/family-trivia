import { motion } from 'framer-motion'
import { useGame } from '../../store/gameStore'
import { useAudio } from '../../hooks/useAudio'
import { Button } from '../ui/Button'
import { Leaderboard } from '../game/Leaderboard'

export function RoundScoreScreen() {
  const players = useGame((s) => s.players)
  const currentIndex = useGame((s) => s.currentIndex)
  const deck = useGame((s) => s.deck)
  const setScreen = useGame((s) => s.setScreen)
  const { play } = useAudio()

  const keepPlaying = () => {
    play('whoosh')
    setScreen('playing')
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center py-4">
      <motion.div
        className="mb-2 text-5xl sm:text-6xl"
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 14 }}
        aria-hidden
      >
        ⏱️
      </motion.div>

      <motion.h1
        className="font-display text-5xl font-bold sm:text-6xl"
        initial={{ y: 40, opacity: 0, scale: 0.7 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 360, damping: 18, delay: 0.05 }}
      >
        <span className="bg-gradient-to-br from-sunny via-bubble to-sky bg-clip-text text-transparent drop-shadow-lg">
          Halftime!
        </span>
      </motion.h1>

      <motion.p
        className="mt-3 font-body text-lg font-semibold text-white/80"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, type: 'spring', stiffness: 200, damping: 20 }}
      >
        {currentIndex} of {deck.length} questions played
      </motion.p>

      <motion.div
        className="mt-8 w-full max-w-lg"
        initial={{ opacity: 0, y: 28, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.35, type: 'spring', stiffness: 220, damping: 24 }}
      >
        <Leaderboard players={players} />
      </motion.div>

      <motion.div
        className="mt-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, type: 'spring', stiffness: 220, damping: 22 }}
      >
        <Button size="lg" onClick={keepPlaying}>
          Keep Playing →
        </Button>
      </motion.div>
    </div>
  )
}
