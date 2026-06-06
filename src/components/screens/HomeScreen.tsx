import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { useGame } from '../../store/gameStore'
import { useAudio } from '../../hooks/useAudio'
import { Button } from '../ui/Button'

const TITLE_WORDS = ['Family', 'Trivia']

export function HomeScreen() {
  const setScreen = useGame((s) => s.setScreen)
  const { startMusic } = useAudio()

  useEffect(() => {
    // Music may need a user gesture; the audio hook resumes its context on the
    // first interaction, so kicking it off here is safe & tasteful.
    startMusic()
  }, [startMusic])

  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <motion.div
        className="mb-4 text-7xl sm:text-8xl"
        animate={{ y: [0, -16, 0], rotate: [-4, 4, -4] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      >
        🧠
      </motion.div>

      <h1 className="font-display text-6xl font-bold leading-none sm:text-8xl">
        <span className="flex flex-wrap items-center justify-center gap-x-4">
          {TITLE_WORDS.map((word, wi) => (
            <span key={word} className="inline-flex">
              {word.split('').map((letter, li) => (
                <motion.span
                  key={`${word}-${li}`}
                  className="inline-block bg-gradient-to-br from-sunny via-bubble to-sky bg-clip-text text-transparent drop-shadow-lg"
                  initial={{ y: 60, opacity: 0, scale: 0.4 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  transition={{
                    type: 'spring',
                    stiffness: 420,
                    damping: 18,
                    delay: (wi * 6 + li) * 0.05,
                  }}
                >
                  {letter}
                </motion.span>
              ))}
            </span>
          ))}
        </span>
      </h1>

      <motion.p
        className="mt-5 max-w-md font-body text-lg font-semibold text-white/85 sm:text-xl"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, type: 'spring', stiffness: 200, damping: 20 }}
      >
        Pass the screen, beat your family, and find out who really knows it all. 🎉
      </motion.p>

      <motion.div
        className="mt-10 flex w-full max-w-xs flex-col items-stretch gap-4"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9, type: 'spring', stiffness: 220, damping: 22 }}
      >
        <Button size="lg" fullWidth onClick={() => setScreen('setup')}>
          ▶ Play
        </Button>
        <Button
          variant="ghost"
          size="md"
          fullWidth
          onClick={() => setScreen('library')}
        >
          ✏️ Manage Questions
        </Button>
      </motion.div>
    </div>
  )
}
