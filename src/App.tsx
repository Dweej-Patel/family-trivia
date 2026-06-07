import { lazy, Suspense, useEffect, useState } from 'react'
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

/** Polls version.json and offers a one-tap refresh when a newer build is live,
 *  so users on GitHub Pages aren't stuck on a stale cached bundle. */
function UpdateBanner() {
  const [latest, setLatest] = useState<string | null>(null)
  useEffect(() => {
    let active = true
    const check = async () => {
      try {
        // Unique query bypasses both the browser and the CDN cache, so we always
        // see the freshly-deployed version.json.
        const res = await fetch(`${import.meta.env.BASE_URL}version.json?t=${Date.now()}`, {
          cache: 'no-store',
        })
        if (!res.ok) return
        const data = (await res.json()) as { id?: string }
        if (active && data.id && data.id !== __BUILD_ID__) setLatest(data.id)
      } catch {
        /* offline or dev (no version.json) — ignore */
      }
    }
    check()
    const id = window.setInterval(check, 60000)
    const onVis = () => {
      if (document.visibilityState === 'visible') check()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      active = false
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [])

  if (!latest) return null
  const update = () => {
    // Cache-bust the document URL so the reload fetches the newest index.html.
    const url = new URL(window.location.href)
    url.searchParams.set('v', latest)
    window.location.replace(url.toString())
  }
  return (
    <motion.button
      onClick={update}
      initial={{ y: 70, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed bottom-4 left-1/2 z-[60] -translate-x-1/2 rounded-2xl border border-white/25 bg-gradient-to-br from-grape to-bubble px-5 py-3 font-display text-sm font-bold text-white shadow-playful"
    >
      ✨ New version available — tap to update
    </motion.button>
  )
}

/** Transient banner for app-wide notices (e.g. "the host ended the game"). */
function NoticeToast() {
  const notice = useGame((s) => s.notice)
  const setNotice = useGame((s) => s.setNotice)
  useEffect(() => {
    if (!notice) return
    const t = window.setTimeout(() => setNotice(null), 4500)
    return () => window.clearTimeout(t)
  }, [notice, setNotice])
  return (
    <AnimatePresence>
      {notice && (
        <motion.div
          key={notice}
          initial={{ opacity: 0, y: -24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -24 }}
          onClick={() => setNotice(null)}
          className="fixed left-1/2 top-4 z-[60] -translate-x-1/2 cursor-pointer rounded-2xl border border-white/25 bg-ink/90 px-5 py-3 font-display text-base font-bold text-white shadow-playful backdrop-blur-md"
        >
          {notice}
        </motion.div>
      )}
    </AnimatePresence>
  )
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
        <NoticeToast />
        <UpdateBanner />
        {/* Each screen mounts fresh (keyed) and springs in. We deliberately do
            NOT use AnimatePresence exit animations here: a lazy screen exiting
            while it re-renders (e.g. its room is deleted on the way out) hung the
            transition on a blank screen. An enter-only animation is bug-free. */}
        <Suspense
          fallback={
            <div className="relative z-10 flex min-h-screen items-center justify-center font-display text-xl font-bold text-white/80">
              Loading…
            </div>
          }
        >
          <motion.div
            key={screen}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-6 sm:px-6"
          >
            <Current />
          </motion.div>
        </Suspense>
      </div>
    </AudioProvider>
  )
}
