import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { useGame } from '../../store/gameStore'
import { useAudio } from '../../hooks/useAudio'
import { fireWinner } from '../ui/ConfettiBurst'
import { Button } from '../ui/Button'
import { Podium } from '../game/Podium'
import { Leaderboard } from '../game/Leaderboard'
import { getWinners, joinNames } from '../../lib/ranking'

export function ResultsScreen() {
  const players = useGame((s) => s.players)
  const playAgain = useGame((s) => s.playAgain)
  const setScreen = useGame((s) => s.setScreen)
  const { play, stopMusic, startMusic } = useAudio()

  // Grand-finale fanfare: kill the background music, blast confetti, play victory.
  useEffect(() => {
    stopMusic()
    fireWinner()
    play('victory')
  }, [play, stopMusic])

  const winners = getWinners(players)
  // A "tie" only counts when 2+ players share 1st place.
  const isTie = winners.length > 1
  const everyoneTied = winners.length === players.length && players.length > 1
  const top = winners[0]
  const winnerNames = joinNames(winners.map((w) => w.name))

  let title = '🎉 Game Over 🎉'
  if (top) {
    title = isTie ? "🤝 It's a tie! 🤝" : `🎉 ${top.name} wins! 🎉`
  }

  const goHome = () => {
    startMusic()
    setScreen('home')
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center py-6">
      <motion.h1
        className="text-center font-display text-4xl font-bold leading-tight sm:text-6xl"
        initial={{ scale: 0.3, opacity: 0, y: -40 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 14, delay: 0.1 }}
      >
        <span className="bg-gradient-to-br from-sunny via-bubble to-sky bg-clip-text text-transparent drop-shadow-lg">
          {title}
        </span>
      </motion.h1>

      {top && (
        <motion.p
          className="mt-3 font-body text-lg font-semibold text-white/80"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, type: 'spring', stiffness: 200, damping: 20 }}
        >
          {isTie
            ? everyoneTied
              ? `Everyone ties at ${top.score} points! 🤝`
              : `${winnerNames} tie for the win at ${top.score} points! 🤝`
            : players.length === 1
              ? 'A flawless solo performance! ⭐'
              : `${top.score} points of pure brilliance ✨`}
        </motion.p>
      )}

      {players.length > 0 && (
        <div className="mt-10 w-full max-w-2xl">
          <Podium players={players} />
        </div>
      )}

      <motion.div
        className="mt-10 w-full max-w-lg"
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, type: 'spring', stiffness: 220, damping: 24 }}
      >
        <Leaderboard players={players} />
      </motion.div>

      <motion.div
        className="mt-10 flex flex-col items-stretch gap-4 sm:flex-row"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9, type: 'spring', stiffness: 220, damping: 22 }}
      >
        <Button size="lg" onClick={playAgain}>
          🔁 Play Again
        </Button>
        <Button variant="ghost" size="lg" onClick={goHome}>
          🏠 Home
        </Button>
      </motion.div>
    </div>
  )
}
