import { motion } from 'framer-motion'
import type { Player } from '../../types'
import { rankPlayers, groupByPlace, type RankedPlayer } from '../../lib/ranking'

// Visual styling per place. Layout order keeps the classic 2nd | 1st | 3rd shape.
const SLOT_STYLE: Record<
  number,
  { order: number; height: string; color: string; glow: boolean }
> = {
  1: { order: 2, height: 'h-40 sm:h-48', color: '#fbbf24', glow: true },
  2: { order: 1, height: 'h-28 sm:h-32', color: '#cbd5e1', glow: false },
  3: { order: 3, height: 'h-20 sm:h-24', color: '#f97316', glow: false },
}

const RANK_MEDALS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }

export function Podium({ players }: { players: Player[] }) {
  const ranked = rankPlayers(players)
  if (ranked.length === 0) return null

  // Group tied players together, then take the top three *places* (1, 2, 3).
  // With ties a place may hold several players, and some places may be skipped
  // (e.g. two players tie for 1st → places present are 1 and 3, no 2nd).
  const byPlace = groupByPlace(ranked)
  const places = [...byPlace.keys()].filter((p) => p <= 3).sort((a, b) => a - b)

  return (
    <div className="flex w-full items-end justify-center gap-3 sm:gap-5">
      {places.map((place) => {
        const slot = SLOT_STYLE[place]
        const group = byPlace.get(place) as RankedPlayer[]
        const isWinner = place === 1
        // 1st place lands last & most dramatic.
        const delay = isWinner ? 0.45 : 0.15 + place * 0.12
        // Shrink avatars a touch when several players share a pillar.
        const many = group.length > 1

        return (
          <div
            key={place}
            className="flex flex-col items-center"
            style={{ order: slot.order }}
          >
            {/* Tied players share the pillar — their avatars sit side by side. */}
            <motion.div
              className="relative flex flex-col items-center"
              initial={{ y: 120, opacity: 0, scale: 0.6 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              transition={{
                type: 'spring',
                stiffness: isWinner ? 260 : 320,
                damping: isWinner ? 14 : 20,
                delay,
              }}
            >
              {isWinner && (
                <motion.div
                  className="text-3xl sm:text-4xl"
                  animate={{ y: [0, -8, 0], rotate: [-6, 6, -6] }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: delay + 0.3,
                  }}
                  aria-hidden
                >
                  👑
                </motion.div>
              )}

              <div className="flex flex-wrap items-end justify-center gap-1 sm:gap-2">
                {group.map((player) => (
                  <div key={player.id} className="flex flex-col items-center">
                    <div
                      className={[
                        'flex items-center justify-center rounded-full shadow-playful',
                        isWinner && !many
                          ? 'h-16 w-16 text-3xl sm:h-20 sm:w-20 sm:text-4xl'
                          : many
                            ? 'h-11 w-11 text-xl sm:h-12 sm:w-12 sm:text-2xl'
                            : 'h-12 w-12 text-2xl sm:h-14 sm:w-14',
                      ].join(' ')}
                      style={{
                        backgroundColor: player.color,
                        boxShadow: isWinner
                          ? '0 0 36px 0 rgba(251,191,36,0.7)'
                          : undefined,
                      }}
                      aria-hidden
                    >
                      {player.emoji}
                    </div>
                    <div className="mt-1 max-w-[5rem] truncate text-center font-display text-xs font-bold text-white sm:max-w-[7rem] sm:text-sm">
                      {player.name}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-1 font-display text-xs font-bold text-white/70 sm:text-sm tabular-nums">
                {group[0].score}
                {many && ' • tie'}
              </div>
            </motion.div>

            {/* The pillar springs up from the floor */}
            <motion.div
              className={[
                'mt-2 flex w-20 origin-bottom items-start justify-center rounded-t-2xl border-t-2 border-white/40 sm:w-28',
                slot.height,
              ].join(' ')}
              style={{
                background: `linear-gradient(180deg, ${slot.color}, ${slot.color}99)`,
                boxShadow: slot.glow ? '0 0 40px 0 rgba(251,191,36,0.55)' : undefined,
              }}
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ type: 'spring', stiffness: 220, damping: 22, delay }}
            >
              <span
                className="mt-2 font-display text-2xl font-black text-ink/70 sm:text-3xl"
                aria-hidden
              >
                {RANK_MEDALS[place]}
              </span>
            </motion.div>
          </div>
        )
      })}
    </div>
  )
}
