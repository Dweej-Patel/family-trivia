import { motion, useReducedMotion, type Transition } from 'framer-motion'

export type BrainyMood = 'idle' | 'thinking' | 'happy' | 'sad' | 'timeout'

interface BrainyProps {
  mood?: BrainyMood
  /** Rendered pixel width (height matches — the art is square). */
  size?: number
  /** How many of the 6 "neuron charge" dots glow (e.g. a correct-answer streak). */
  charge?: number
  className?: string
}

const MAX_CHARGE = 6

// Six neuron dots arranged around the brain; they light up with `charge`.
const NEURONS: Array<{ x: number; y: number }> = [
  { x: 22, y: 38 },
  { x: 98, y: 40 },
  { x: 16, y: 66 },
  { x: 104, y: 64 },
  { x: 40, y: 22 },
  { x: 82, y: 20 },
]

/** Per-mood whole-body motion. Loops are gentle + compositor-only (transform),
 *  and collapse to a single static pose when the user prefers reduced motion. */
function bodyMotion(mood: BrainyMood, reduce: boolean): {
  animate: Record<string, number | number[]>
  transition: Transition
} {
  if (reduce) {
    const pose: Record<BrainyMood, Record<string, number>> = {
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

/** Eyes for the current mood (drawn in viewBox coords). */
function Eyes({ mood }: { mood: BrainyMood }) {
  const white = '#fff'
  const pupil = '#3b0764'
  if (mood === 'happy') {
    // Joyful upward arcs ‿ flipped → ^ ^
    return (
      <g stroke={pupil} strokeWidth={3.4} strokeLinecap="round" fill="none">
        <path d="M44 54 Q50 46 56 54" />
        <path d="M64 54 Q70 46 76 54" />
      </g>
    )
  }
  if (mood === 'timeout') {
    // Dizzy X eyes
    return (
      <g stroke={pupil} strokeWidth={3} strokeLinecap="round">
        <path d="M46 49 L54 57 M54 49 L46 57" />
        <path d="M66 49 L74 57 M74 49 L66 57" />
      </g>
    )
  }
  // Default big round eyes; pupils look up while thinking, down while sad.
  const dy = mood === 'thinking' ? -2 : mood === 'sad' ? 2 : 0
  return (
    <g>
      <ellipse cx={49} cy={53} rx={8} ry={9.5} fill={white} />
      <ellipse cx={71} cy={53} rx={8} ry={9.5} fill={white} />
      <circle cx={49} cy={53 + dy} r={4.4} fill={pupil} />
      <circle cx={71} cy={53 + dy} r={4.4} fill={pupil} />
      {/* big highlight + small twinkle = friendly, alive eyes */}
      <circle cx={50.8} cy={50.8 + dy} r={1.9} fill={white} />
      <circle cx={72.8} cy={50.8 + dy} r={1.9} fill={white} />
      <circle cx={47.4} cy={54.8 + dy} r={1} fill={white} opacity={0.8} />
      <circle cx={69.4} cy={54.8 + dy} r={1} fill={white} opacity={0.8} />
      {mood === 'sad' && (
        <g stroke={pupil} strokeWidth={2.4} strokeLinecap="round" fill="none">
          <path d="M43 45 Q49 43 55 46" />
          <path d="M65 46 Q71 43 77 45" />
        </g>
      )}
    </g>
  )
}

/** Mouth for the current mood. */
function Mouth({ mood }: { mood: BrainyMood }) {
  const line = '#3b0764'
  switch (mood) {
    case 'happy':
      // A modest open smile (not a tall dark void) with a little tongue.
      return (
        <g>
          <path d="M52 66 Q60 75 68 66 Q60 70 52 66 Z" fill={line} />
          <path d="M57 70.5 Q60 73.5 63 70.5 Z" fill="#fb7185" />
        </g>
      )
    case 'sad':
      return (
        <path
          d="M50 73 Q60 65 70 73"
          fill="none"
          stroke={line}
          strokeWidth={3}
          strokeLinecap="round"
        />
      )
    case 'thinking':
      return <circle cx={60} cy={70} r={3.4} fill={line} />
    case 'timeout':
      return (
        <path
          d="M50 70 q5 -5 10 0 q5 5 10 0"
          fill="none"
          stroke={line}
          strokeWidth={3}
          strokeLinecap="round"
        />
      )
    case 'idle':
    default:
      return (
        <path
          d="M51 68 Q60 75 69 68"
          fill="none"
          stroke={line}
          strokeWidth={3}
          strokeLinecap="round"
        />
      )
  }
}

/**
 * "Brainy" — the app mascot. A friendly cartoon brain that reacts to the game:
 * bobs while idle, leans in while thinking, celebrates on a right answer, droops
 * on a wrong one, and goes dizzy on a timeout. Pure animated SVG (scales to any
 * size, themeable) and every animation is a compositor-only transform/opacity,
 * so it's cheap even on phones — loops collapse to a static pose under reduced
 * motion.
 */
export function Brainy({ mood = 'idle', size = 120, charge = 0, className }: BrainyProps) {
  const reduce = useReducedMotion() ?? false
  const { animate, transition } = bodyMotion(mood, reduce)
  // Blink only in calm moods (looks wrong layered over a celebration / X eyes).
  const canBlink = !reduce && (mood === 'idle' || mood === 'thinking')
  const lit = Math.max(0, Math.min(MAX_CHARGE, charge))

  return (
    <motion.div
      className={className}
      style={{ width: size, height: size }}
      animate={animate}
      transition={transition}
    >
      <svg viewBox="0 0 120 120" width="100%" height="100%" aria-hidden>
        <defs>
          <radialGradient id="brainy-fill" cx="42%" cy="32%" r="78%">
            <stop offset="0%" stopColor="#fff1f7" />
            <stop offset="55%" stopColor="#fbcfe8" />
            <stop offset="100%" stopColor="#f9a8d4" />
          </radialGradient>
        </defs>

        {/* Neuron charge dots — glow as a streak builds */}
        {NEURONS.map((n, i) => {
          const on = i < lit
          return (
            <motion.circle
              key={i}
              cx={n.x}
              cy={n.y}
              r={3.2}
              fill={on ? '#fde68a' : '#ffffff'}
              animate={{ scale: on ? 1 : 0.6, opacity: on ? 1 : 0.18 }}
              transition={{ type: 'spring', stiffness: 360, damping: 16 }}
              style={{
                transformOrigin: 'center',
                transformBox: 'fill-box',
                filter: on ? 'drop-shadow(0 0 4px #fde68a)' : undefined,
              }}
            />
          )
        })}

        {/* Soft drop shadow under the brain */}
        <ellipse cx={60} cy={100} rx={26} ry={5} fill="rgba(0,0,0,0.18)" />

        {/* Brain mass: two overlapping hemispheres read as a brain */}
        <g>
          <circle cx={45} cy={56} r={27} fill="url(#brainy-fill)" />
          <circle cx={75} cy={56} r={27} fill="url(#brainy-fill)" />
          <rect x={45} y={30} width={30} height={52} rx={14} fill="url(#brainy-fill)" />
        </g>

        {/* A few soft swirls hint at "brain" without the anatomical (creepy) look */}
        <g
          stroke="#f472b6"
          strokeOpacity={0.5}
          strokeWidth={1.6}
          strokeLinecap="round"
          fill="none"
        >
          <path d="M60 33 Q57 45 60 57 Q63 70 60 80" />
          <path d="M36 47 q5 4 2 9" />
          <path d="M84 47 q-5 4 -2 9" />
          <path d="M45 71 q6 4 13 2" />
          <path d="M75 71 q-6 4 -13 2" />
        </g>

        {/* Rosy blush cheeks for cuteness */}
        <g fill="#fb7185" opacity={0.45}>
          <ellipse cx={40} cy={63} rx={5.5} ry={3.8} />
          <ellipse cx={80} cy={63} rx={5.5} ry={3.8} />
        </g>

        {/* Face — blinks in calm moods via a quick scaleY pinch */}
        <motion.g
          style={{ transformOrigin: '60px 53px', transformBox: 'view-box' }}
          animate={canBlink ? { scaleY: [1, 1, 0.1, 1] } : { scaleY: 1 }}
          transition={
            canBlink
              ? { duration: 4.5, times: [0, 0.93, 0.965, 1], repeat: Infinity, ease: 'linear' }
              : { duration: 0.2 }
          }
        >
          <Eyes mood={mood} />
        </motion.g>
        <Mouth mood={mood} />

        {/* Mood garnish: sweat while thinking/timeout, sparkles while happy */}
        {(mood === 'thinking' || mood === 'timeout') && (
          <motion.path
            d="M92 30 q4 6 0 9 q-4 -3 0 -9 Z"
            fill="#7dd3fc"
            initial={{ opacity: 0, y: -2 }}
            animate={{ opacity: [0, 1, 1, 0], y: [-2, 0, 6, 10] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeIn' }}
          />
        )}
        {mood === 'happy' && !reduce && (
          <g fill="#fde68a">
            {[
              { x: 20, y: 30 },
              { x: 100, y: 34 },
              { x: 96, y: 78 },
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
