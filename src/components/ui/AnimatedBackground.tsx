import { useEffect } from 'react'
import { motion, useAnimationControls, useReducedMotion } from 'framer-motion'
import { useGame } from '../../store/gameStore'
import { useIsSmallScreen } from '../../hooks/useIsSmallScreen'
import { onBeat } from '../../lib/beat'
import type { Screen } from '../../types'

// ── Neural network graph (in a 0–100 user space, scaled to "cover") ──────────
type Pt = { x: number; y: number }
const NODES: Pt[] = [
  { x: 12, y: 22 }, // 0
  { x: 30, y: 12 }, // 1
  { x: 50, y: 26 }, // 2
  { x: 72, y: 14 }, // 3
  { x: 88, y: 28 }, // 4
  { x: 20, y: 50 }, // 5
  { x: 44, y: 56 }, // 6
  { x: 68, y: 48 }, // 7
  { x: 84, y: 60 }, // 8
  { x: 14, y: 80 }, // 9
  { x: 38, y: 86 }, // 10
  { x: 60, y: 74 }, // 11
  { x: 82, y: 88 }, // 12
]

const EDGES: Array<[number, number]> = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [2, 6], [3, 7], [4, 8],
  [5, 6], [6, 7], [7, 8],
  [5, 9], [6, 10], [7, 11], [8, 12],
  [9, 10], [10, 11], [11, 12],
  [1, 6], [2, 7],
]

// Synapse pulses travel a subset of edges; varied colors/timing keeps it alive.
const PULSES: Array<{ edge: [number, number]; dur: number; delay: number; color: string }> = [
  { edge: [0, 1], dur: 2.6, delay: 0, color: '#38bdf8' },
  { edge: [2, 3], dur: 2.2, delay: 0.6, color: '#fbbf24' },
  { edge: [5, 6], dur: 3.0, delay: 0.3, color: '#ec4899' },
  { edge: [6, 7], dur: 2.4, delay: 1.1, color: '#34d399' },
  { edge: [7, 8], dur: 2.8, delay: 0.9, color: '#a78bfa' },
  { edge: [10, 11], dur: 3.2, delay: 1.5, color: '#38bdf8' },
]

// Per-screen "mood": opacity targets for the warm / cool overlays and the neural
// net. All applied via CSS opacity transitions — composited, no per-frame JS.
type Mood = 'chill' | 'focus' | 'celebrate'
const MOOD: Record<Mood, { warm: number; cool: number; net: number }> = {
  chill: { warm: 0, cool: 0, net: 0.5 },
  focus: { warm: 0, cool: 0.32, net: 0.72 }, // calmer + brainier while answering
  celebrate: { warm: 0.34, cool: 0, net: 0.32 }, // warm + bright on results
}

function screenToMood(screen: Screen): Mood {
  if (screen === 'playing' || screen === 'mpPlayer' || screen === 'mpHost') return 'focus'
  if (screen === 'results' || screen === 'roundScore') return 'celebrate'
  return 'chill'
}

export function AnimatedBackground() {
  const reduceMotion = useReducedMotion()
  const small = useIsSmallScreen()
  const screen = useGame((s) => s.screen)
  const mood = MOOD[screenToMood(screen)]

  // Animate the lightweight synapse pulses + beat glow only where it's cheap:
  // larger screens with motion allowed. Phones get the identical static net.
  const animate = !reduceMotion && !small

  // Sound-reactive center glow: the music's beat bus nudges one gradient layer's
  // transform/opacity (no blur, no React re-render) — so it pulses to the music.
  const beat = useAnimationControls()
  useEffect(() => {
    if (!animate) return
    const off = onBeat((strength) => {
      beat.start({
        scale: [1 + 0.06 * strength, 1],
        opacity: [0.2 + 0.22 * strength, 0.2],
      }, { duration: 0.5, ease: 'easeOut' })
    })
    return off
  }, [animate, beat])

  return (
    <div className="pointer-events-none fixed inset-0 -z-0 overflow-hidden">
      {/* Static gradient base */}
      <div className="absolute inset-0 bg-gradient-to-br from-grape via-bubble to-tangerine opacity-90" />
      <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-ink/40" />

      {/* Soft color glows — gradient-soft (no blur filter), so they're free */}
      <div
        className="absolute -left-[10%] -top-[12%] h-[62vmin] w-[62vmin] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(236,72,153,0.5), transparent 70%)' }}
      />
      <div
        className="absolute -right-[12%] bottom-[-12%] h-[68vmin] w-[68vmin] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(249,115,22,0.45), transparent 70%)' }}
      />

      {/* Beat-reactive center glow (transform/opacity only) */}
      <motion.div
        className="absolute inset-0 m-auto h-[82vmin] w-[82vmin] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.5), transparent 64%)' }}
        initial={{ scale: 1, opacity: 0.2 }}
        animate={beat}
      />

      {/* Neural network — the brain theme made ambient. Lines + nodes are static;
          only a few synapse pulses animate (desktop / motion-on). */}
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
        style={{ opacity: mood.net, transition: 'opacity 800ms ease' }}
        aria-hidden
      >
        {EDGES.map(([a, b], i) => (
          <line
            key={i}
            x1={NODES[a].x}
            y1={NODES[a].y}
            x2={NODES[b].x}
            y2={NODES[b].y}
            stroke="rgba(255,255,255,0.13)"
            strokeWidth={0.18}
          />
        ))}
        {NODES.map((n, i) => (
          <g key={i}>
            <circle cx={n.x} cy={n.y} r={1.3} fill="rgba(255,255,255,0.22)" />
            <circle cx={n.x} cy={n.y} r={0.6} fill="rgba(255,255,255,0.7)" />
          </g>
        ))}
        {animate &&
          PULSES.map((p, i) => {
            const a = NODES[p.edge[0]]
            const b = NODES[p.edge[1]]
            return (
              <motion.circle
                key={`p-${i}`}
                cx={a.x}
                cy={a.y}
                r={0.9}
                fill={p.color}
                initial={{ opacity: 0 }}
                animate={{ x: [0, b.x - a.x], y: [0, b.y - a.y], opacity: [0, 1, 1, 0] }}
                transition={{
                  duration: p.dur,
                  delay: p.delay,
                  repeat: Infinity,
                  repeatDelay: 0.6,
                  ease: 'easeInOut',
                }}
              />
            )
          })}
      </svg>

      {/* Mood overlays — cool/dim while focused, warm while celebrating */}
      <div
        className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/10 to-transparent"
        style={{ opacity: mood.cool, transition: 'opacity 800ms ease' }}
      />
      <div
        className="absolute inset-0 bg-gradient-to-tr from-tangerine/40 via-bubble/20 to-sunny/30"
        style={{ opacity: mood.warm, transition: 'opacity 800ms ease' }}
      />
    </div>
  )
}
