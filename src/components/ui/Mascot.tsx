import { useEffect, useState } from 'react'
import { motion, useReducedMotion, type Transition } from 'framer-motion'
import { onBeat } from '../../lib/beat'

export type MascotMood = 'idle' | 'thinking' | 'happy' | 'sad' | 'timeout'

interface MascotProps {
  mood?: MascotMood
  /** Rendered pixel width (height matches — the art is square). */
  size?: number
  /** How many of the status LEDs glow (e.g. a correct-answer streak). */
  charge?: number
  className?: string
}

const MAX_CHARGE = 6

// A status-light bar along the bottom of the bot's head; lights up with `charge`.
const LEDS: Array<{ x: number; y: number }> = [
  { x: 40, y: 80 },
  { x: 48, y: 80 },
  { x: 56, y: 80 },
  { x: 64, y: 80 },
  { x: 72, y: 80 },
  { x: 80, y: 80 },
]

const SCREEN = '#67e8f9' // glowing cyan for the bot's face

// Bright, high-contrast colors the idle "scanner" light cycles through as it
// sweeps (chosen to pop against the light-blue head — no blue/cyan).
const SCAN_COLORS = ['#fb923c', '#e879f9', '#a3e635', '#fb7185', '#facc15', '#c084fc']

/** Per-mood whole-body motion. Loops are gentle + compositor-only (transform),
 *  and collapse to a single static pose when the user prefers reduced motion. */
function bodyMotion(mood: MascotMood, reduce: boolean): {
  animate: Record<string, number | number[]>
  transition: Transition
} {
  if (reduce) {
    const pose: Record<MascotMood, Record<string, number>> = {
      idle: { y: 0, rotate: 0 },
      thinking: { y: 0, rotate: -4 },
      happy: { y: -4, rotate: 0 },
      sad: { y: 4, rotate: 0 },
      timeout: { y: 0, rotate: 0 },
    }
    return { animate: pose[mood], transition: { duration: 0.3 } }
  }
  switch (mood) {
    case 'thinking':
      return {
        animate: { y: [0, -3, 0], rotate: [-4, -1, -4] },
        transition: { duration: 2.4, repeat: Infinity, ease: 'easeInOut' },
      }
    case 'happy':
      return {
        animate: { y: [0, -14, 0, -6, 0], rotate: [0, -6, 6, 0, 0] },
        transition: { duration: 1.1, repeat: Infinity, ease: 'easeInOut' },
      }
    case 'sad':
      return {
        animate: { y: [0, 5, 3, 5, 3], rotate: [0, -2, 2, -1, 0] },
        transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
      }
    case 'timeout':
      return {
        animate: { rotate: [0, -10, 10, -7, 7, 0], y: [0, 2, 0] },
        transition: { duration: 1.8, repeat: Infinity, ease: 'easeInOut' },
      }
    case 'idle':
    default:
      return {
        animate: { y: [0, -6, 0], rotate: [-2, 2, -2] },
        transition: { duration: 4, repeat: Infinity, ease: 'easeInOut' },
      }
  }
}

/** The eyes drawn on the bot's screen-face. */
function Eyes({ mood, blink }: { mood: MascotMood; blink: boolean }) {
  if (mood === 'happy') {
    return (
      <g stroke={SCREEN} strokeWidth={3.2} strokeLinecap="round" fill="none">
        <path d="M45 55 Q50 48 55 55" />
        <path d="M65 55 Q70 48 75 55" />
      </g>
    )
  }
  if (mood === 'timeout') {
    return (
      <g stroke={SCREEN} strokeWidth={2.8} strokeLinecap="round">
        <path d="M46 50 L54 58 M54 50 L46 58" />
        <path d="M66 50 L74 58 M74 50 L66 58" />
      </g>
    )
  }
  // Default glowing oval eyes; look up while thinking, down + brows while sad.
  // Blink by squishing each eye's height (ry) — an attribute animation, so there
  // is no transform-origin to get wrong.
  const dy = mood === 'thinking' ? -1.5 : mood === 'sad' ? 1.5 : 0
  const blinkAnim = blink ? { ry: [6, 6, 0.6, 6, 0.6, 6] } : { ry: 6 }
  const blinkTrans: Transition = blink
    ? { duration: 3, times: [0, 0.78, 0.84, 0.9, 0.96, 1], repeat: Infinity, ease: 'linear' }
    : { duration: 0.2 }
  return (
    <g fill={SCREEN}>
      <motion.ellipse cx={50} cy={53 + dy} rx={4.6} initial={{ ry: 6 }} animate={blinkAnim} transition={blinkTrans} />
      <motion.ellipse cx={70} cy={53 + dy} rx={4.6} initial={{ ry: 6 }} animate={blinkAnim} transition={blinkTrans} />
      <circle cx={51.6} cy={50.6 + dy} r={1.3} fill="#ffffff" />
      <circle cx={71.6} cy={50.6 + dy} r={1.3} fill="#ffffff" />
      {mood === 'sad' && (
        <g stroke={SCREEN} strokeWidth={2.2} strokeLinecap="round" fill="none">
          <path d="M44 46 Q50 44 55 47" />
          <path d="M65 47 Q70 44 76 46" />
        </g>
      )}
    </g>
  )
}

/** The mouth drawn on the bot's screen-face. */
function Mouth({ mood }: { mood: MascotMood }) {
  switch (mood) {
    case 'happy':
      return <path d="M50 62 Q60 73 70 62 Q60 67 50 62 Z" fill={SCREEN} />
    case 'sad':
      return (
        <path d="M51 68 Q60 61 69 68" fill="none" stroke={SCREEN} strokeWidth={3} strokeLinecap="round" />
      )
    case 'thinking':
      return (
        <g fill={SCREEN}>
          <circle cx={53} cy={65} r={1.6} />
          <circle cx={60} cy={65} r={1.6} />
          <circle cx={67} cy={65} r={1.6} />
        </g>
      )
    case 'timeout':
      return (
        <path
          d="M50 65 q5 -4 10 0 q5 4 10 0"
          fill="none"
          stroke={SCREEN}
          strokeWidth={3}
          strokeLinecap="round"
        />
      )
    case 'idle':
    default:
      return (
        <path d="M51 64 Q60 70 69 64" fill="none" stroke={SCREEN} strokeWidth={3} strokeLinecap="round" />
      )
  }
}

/**
 * The app mascot — a friendly little game-show-host robot. It bobs while idle,
 * leans in while thinking, beams on a right answer, droops on a wrong one, and
 * short-circuits (X eyes) on a timeout. Pure animated SVG; every animation is a
 * compositor-only transform/opacity, so it's cheap even on phones, and loops
 * collapse to a static pose under reduced motion.
 */
export function Mascot({ mood = 'idle', size = 120, charge = 0, className }: MascotProps) {
  const reduce = useReducedMotion() ?? false
  const { animate, transition } = bodyMotion(mood, reduce)
  const canBlink = !reduce && (mood === 'idle' || mood === 'thinking' || mood === 'sad')
  const canGlance = !reduce && mood === 'idle'
  const lit = Math.max(0, Math.min(MAX_CHARGE, charge))

  // When idle with no streak, the status bar lights one socket at a time: on each
  // music beat it jumps to a random *different* socket and a new color — so it
  // pulses in time with the background music. During a streak the bar instead
  // shows the streak count (green).
  const ambient = !reduce && mood === 'idle' && lit === 0
  const [scanIndex, setScanIndex] = useState(0)
  const [scanColor, setScanColor] = useState(SCAN_COLORS[0])
  useEffect(() => {
    if (!ambient) return
    return onBeat(() => {
      setScanIndex((prev) => {
        let next = prev
        while (next === prev) next = Math.floor(Math.random() * LEDS.length)
        return next
      })
      setScanColor((prev) => {
        let next = prev
        while (next === prev) next = SCAN_COLORS[Math.floor(Math.random() * SCAN_COLORS.length)]
        return next
      })
    })
  }, [ambient])

  return (
    <motion.div
      className={className}
      style={{ width: size, height: size }}
      animate={animate}
      transition={transition}
    >
      <svg viewBox="0 0 120 120" width="100%" height="100%" aria-hidden>
        <defs>
          <linearGradient id="bot-head" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f0f9ff" />
            <stop offset="55%" stopColor="#bae6fd" />
            <stop offset="100%" stopColor="#7dd3fc" />
          </linearGradient>
          <linearGradient id="bot-screen" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#312e81" />
            <stop offset="100%" stopColor="#1e1b4b" />
          </linearGradient>
        </defs>

        {/* Soft drop shadow */}
        <ellipse cx={60} cy={98} rx={26} ry={5} fill="rgba(0,0,0,0.18)" />

        {/* Antenna — the tip sways side to side by animating its geometry (x2 of the
            stalk + cx of the ball). No CSS transform-origin, which is unreliable on
            SVG groups across browsers — this always animates. */}
        <motion.line
          x1={60}
          y1={26}
          stroke="#94a3b8"
          strokeWidth={2.6}
          strokeLinecap="round"
          initial={{ x2: 60, y2: 12 }}
          animate={reduce ? { x2: 60 } : { x2: [56, 64, 56] }}
          transition={reduce ? undefined : { duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.circle
          cy={9}
          fill="#fde68a"
          initial={{ cx: 60, r: 4.8 }}
          animate={reduce ? { cx: 60 } : { cx: [56, 64, 56], r: [4.6, 5.5, 4.6] }}
          transition={
            reduce
              ? undefined
              : {
                  cx: { duration: 5.5, repeat: Infinity, ease: 'easeInOut' },
                  r: { duration: 1.8, repeat: Infinity, ease: 'easeInOut' },
                }
          }
          style={{ filter: 'drop-shadow(0 0 5px #fde68a)' }}
        />

        {/* Side "ears" / speakers */}
        <rect x={19} y={48} width={9} height={20} rx={4} fill="#38bdf8" />
        <rect x={92} y={48} width={9} height={20} rx={4} fill="#38bdf8" />

        {/* Head */}
        <rect x={26} y={26} width={68} height={60} rx={18} fill="url(#bot-head)" />

        {/* Status LED bar — lights up with the streak */}
        {LEDS.map((p, i) => {
          const on = ambient ? i === scanIndex : i < lit
          const color = ambient ? scanColor : '#34d399'
          return (
            <motion.circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={2.6}
              fill={on ? color : '#152033'}
              animate={{ scale: on ? 1.3 : 0.75, opacity: on ? 1 : 0.5 }}
              transition={{ type: 'spring', stiffness: 380, damping: 18 }}
              style={{
                transformOrigin: 'center',
                transformBox: 'fill-box',
                filter: on ? `drop-shadow(0 0 5px ${color})` : undefined,
              }}
            />
          )
        })}

        {/* Screen face */}
        <rect x={35} y={40} width={50} height={33} rx={11} fill="url(#bot-screen)" />
        <rect x={38} y={43} width={44} height={2.5} rx={1.25} fill="#ffffff" opacity={0.12} />

        {/* Face glances side to side while idle (a group translate needs no
            transform-origin, so it's safe); the eyes blink via their own height. */}
        <motion.g
          animate={{ x: canGlance ? [0, 3, -3, 0] : 0 }}
          transition={
            canGlance ? { duration: 5, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.2 }
          }
        >
          <Eyes mood={mood} blink={canBlink} />
        </motion.g>
        <Mouth mood={mood} />

        {/* Happy sparks */}
        {mood === 'happy' && !reduce && (
          <g fill="#fde68a">
            {[
              { x: 22, y: 34 },
              { x: 98, y: 36 },
              { x: 96, y: 74 },
            ].map((s, i) => (
              <motion.path
                key={i}
                d={`M${s.x} ${s.y - 5} L${s.x + 1.5} ${s.y - 1.5} L${s.x + 5} ${s.y} L${s.x + 1.5} ${s.y + 1.5} L${s.x} ${s.y + 5} L${s.x - 1.5} ${s.y + 1.5} L${s.x - 5} ${s.y} L${s.x - 1.5} ${s.y - 1.5} Z`}
                animate={{ scale: [0, 1, 0], opacity: [0, 1, 0], rotate: [0, 45, 90] }}
                transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.25, ease: 'easeInOut' }}
                style={{ transformOrigin: 'center', transformBox: 'fill-box' }}
              />
            ))}
          </g>
        )}
      </svg>
    </motion.div>
  )
}
