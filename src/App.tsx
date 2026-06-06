import { AnimatePresence, motion } from 'framer-motion'
import { useGame } from './store/gameStore'
import { AudioProvider } from './hooks/useAudio'
import { AnimatedBackground } from './components/ui/AnimatedBackground'
import { MuteButton } from './components/ui/MuteButton'
import { HomeScreen } from './components/screens/HomeScreen'
import { SetupScreen } from './components/screens/SetupScreen'
import { ConfigScreen } from './components/screens/ConfigScreen'
import { PlayScreen } from './components/screens/PlayScreen'
import { RoundScoreScreen } from './components/screens/RoundScoreScreen'
import { ResultsScreen } from './components/screens/ResultsScreen'
import { LibraryScreen } from './components/screens/LibraryScreen'
import type { Screen } from './types'

const screens: Record<Screen, React.ComponentType> = {
  home: HomeScreen,
  setup: SetupScreen,
  config: ConfigScreen,
  playing: PlayScreen,
  roundScore: RoundScoreScreen,
  results: ResultsScreen,
  library: LibraryScreen,
}

const pageVariants = {
  initial: { opacity: 0, scale: 0.96, y: 16 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 1.02, y: -16 },
}

export default function App() {
  const screen = useGame((s) => s.screen)
  const Current = screens[screen]

  return (
    <AudioProvider>
      <div className="relative min-h-full w-full overflow-hidden text-white">
        <AnimatedBackground />
        <MuteButton />
        <AnimatePresence mode="wait">
          <motion.div
            key={screen}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-6 sm:px-6"
          >
            <Current />
          </motion.div>
        </AnimatePresence>
      </div>
    </AudioProvider>
  )
}
