import { lazy, Suspense, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useGame } from './store/gameStore'
import { useMpStore } from './multiplayer/mpStore'
import { AudioProvider } from './hooks/useAudio'
import { AnimatedBackground } from './components/ui/AnimatedBackground'
import { MuteButton } from './components/ui/MuteButton'
import { HomeScreen } from './components/screens/HomeScreen'
import { ModeScreen } from './components/screens/ModeScreen'
import { SetupScreen } from './components/screens/SetupScreen'
import { ConfigScreen } from './components/screens/ConfigScreen'
import { PlayScreen } from './components/screens/PlayScreen'
import { RoundScoreScreen } from './components/screens/RoundScoreScreen'
import { ResultsScreen } from './components/screens/ResultsScreen'
import { LibraryScreen } from './components/screens/LibraryScreen'
import type { Screen } from './types'

// Multiplayer screens pull in the Firebase SDK — lazy-load them so that weight
// is only downloaded when someone actually hosts or joins a game.
const MpHostSetupScreen = lazy(() =>
  import('./components/screens/MpHostSetupScreen').then((m) => ({ default: m.MpHostSetupScreen })),
)
const MpHostScreen = lazy(() =>
  import('./components/screens/MpHostScreen').then((m) => ({ default: m.MpHostScreen })),
)
const MpJoinScreen = lazy(() =>
  import('./components/screens/MpJoinScreen').then((m) => ({ default: m.MpJoinScreen })),
)
const MpPlayerScreen = lazy(() =>
  import('./components/screens/MpPlayerScreen').then((m) => ({ default: m.MpPlayerScreen })),
)

const screens: Record<Screen, React.ComponentType> = {
  home: HomeScreen,
  mode: ModeScreen,
  setup: SetupScreen,
  config: ConfigScreen,
  playing: PlayScreen,
  roundScore: RoundScoreScreen,
  results: ResultsScreen,
  library: LibraryScreen,
  mpHostSetup: MpHostSetupScreen,
  mpHost: MpHostScreen,
  mpJoin: MpJoinScreen,
  mpPlayer: MpPlayerScreen,
}

const pageVariants = {
  initial: { opacity: 0, scale: 0.96, y: 16 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 1.02, y: -16 },
}

export default function App() {
  const screen = useGame((s) => s.screen)
  const setScreen = useGame((s) => s.setScreen)
  const setJoinCodePrefill = useMpStore((s) => s.setJoinCodePrefill)
  const Current = screens[screen]

  // Deep link: scanning the host's QR opens .../?room=CODE — jump straight to join.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const room = params.get('room')
    if (room) {
      setJoinCodePrefill(room.toUpperCase().slice(0, 8))
      setScreen('mpJoin')
      // Clean the URL so a refresh doesn't keep forcing the join screen.
      window.history.replaceState({}, '', window.location.pathname)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
            <Suspense
              fallback={
                <div className="flex flex-1 items-center justify-center font-display text-xl font-bold text-white/80">
                  Loading…
                </div>
              }
            >
              <Current />
            </Suspense>
          </motion.div>
        </AnimatePresence>
      </div>
    </AudioProvider>
  )
}
