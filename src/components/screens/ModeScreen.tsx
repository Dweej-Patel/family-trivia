import { motion } from 'framer-motion'
import { useGame } from '../../store/gameStore'
import { Button } from '../ui/Button'

const cardVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.95 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 260, damping: 22, delay: i * 0.12 },
  }),
}

export function ModeScreen() {
  const setScreen = useGame((s) => s.setScreen)

  const options = [
    {
      key: 'single',
      emoji: '🛋️',
      title: 'One Device',
      blurb: 'Pass-and-play on this screen. Take turns answering together.',
      action: () => setScreen('setup'),
      gradient: 'from-grape to-sky',
    },
    {
      key: 'multi',
      emoji: '📱',
      title: "Everyone's Phones",
      blurb: 'Host on this screen; everyone joins a room and answers on their own phone.',
      action: () => setScreen('mpHostSetup'),
      gradient: 'from-bubble to-tangerine',
    },
  ]

  return (
    <div className="flex flex-1 flex-col">
      <motion.h1
        className="text-center font-display text-4xl font-bold sm:text-5xl"
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      >
        How do you want to play?
      </motion.h1>

      <div className="mt-10 grid flex-1 content-center gap-5 sm:grid-cols-2">
        {options.map((o, i) => (
          <motion.button
            key={o.key}
            custom={i}
            variants={cardVariants}
            initial="hidden"
            animate="show"
            whileHover={{ scale: 1.03, y: -4 }}
            whileTap={{ scale: 0.97 }}
            onClick={o.action}
            className={`flex flex-col items-center gap-3 rounded-3xl border border-white/20 bg-gradient-to-br ${o.gradient} p-8 text-center shadow-playful`}
          >
            <span className="text-6xl">{o.emoji}</span>
            <span className="font-display text-2xl font-bold text-white">{o.title}</span>
            <span className="font-body text-sm font-semibold text-white/90">{o.blurb}</span>
          </motion.button>
        ))}
      </div>

      <div className="mt-8 flex items-center justify-between gap-4">
        <Button variant="ghost" onClick={() => setScreen('home')}>
          ← Back
        </Button>
        <Button variant="secondary" onClick={() => setScreen('mpJoin')}>
          📱 Join someone's game
        </Button>
      </div>
    </div>
  )
}
