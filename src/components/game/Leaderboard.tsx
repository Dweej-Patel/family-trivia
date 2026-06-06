import { motion } from 'framer-motion'
import type { Player } from '../../types'
import { rankPlayers } from '../../lib/ranking'

const RANK_MEDALS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }

export function Leaderboard({
  players,
  highlightId,
}: {
  players: Player[]
  /** Force-highlight a specific player; otherwise the leader(s) are highlighted. */
  highlightId?: string
}) {
  // Competition ranking: tied players share a place (e.g. 1, 1, 3).
  const ranked = rankPlayers(players)
  const maxScore = ranked.reduce((m, p) => Math.max(m, p.score), 0)

  if (ranked.length === 0) {
    return (
      <div className="rounded-3xl border border-white/15 bg-white/5 p-8 text-center font-body text-lg font-semibold text-white/70">
        No players yet — add some to start the fun! 🎈
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {ranked.map((player) => {
        // When every score is zero, render bars at a small minimum so the row
        // still reads as a bar instead of an empty sliver.
        const pct = maxScore > 0 ? (player.score / maxScore) * 100 : 0
        const barWidth = Math.max(pct, 6)
        // Highlight an explicit player if given; otherwise spotlight the
        // leader(s) — but only once someone has actually scored.
        const isHighlighted = highlightId
          ? highlightId === player.id
          : player.place === 1 && maxScore > 0
        const medal = RANK_MEDALS[player.place]

        return (
          <motion.div
            key={player.id}
            layout
            transition={{ type: 'spring', stiffness: 500, damping: 38 }}
            className={[
              'flex items-center gap-3 rounded-2xl border bg-white/10 p-3 backdrop-blur-md sm:gap-4 sm:p-4',
              isHighlighted
                ? 'border-sunny/70 ring-4 ring-sunny/60'
                : 'border-white/15',
            ].join(' ')}
          >
            {/* Rank */}
            <div className="flex w-10 shrink-0 items-center justify-center">
              {medal ? (
                <span className="text-2xl sm:text-3xl" aria-hidden>
                  {medal}
                </span>
              ) : (
                <span className="font-display text-lg font-bold text-white/60">
                  {player.place}
                </span>
              )}
            </div>

            {/* Emoji avatar */}
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-2xl shadow-playful-sm sm:h-12 sm:w-12"
              style={{ backgroundColor: player.color }}
              aria-hidden
            >
              {player.emoji}
            </div>

            {/* Name + animated score bar */}
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-baseline justify-between gap-2">
                <span className="truncate font-display text-base font-bold text-white sm:text-lg">
                  {player.name}
                </span>
                <motion.span
                  key={player.score}
                  initial={{ scale: 1.4, color: '#fbbf24' }}
                  animate={{ scale: 1, color: '#ffffff' }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  className="shrink-0 font-display text-base font-bold tabular-nums sm:text-lg"
                >
                  {player.score}
                </motion.span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-white/10">
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    background: 'linear-gradient(90deg, #38bdf8, #ec4899, #fbbf24)',
                  }}
                  initial={false}
                  animate={{ width: `${barWidth}%` }}
                  transition={{ type: 'spring', stiffness: 200, damping: 28 }}
                />
              </div>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
