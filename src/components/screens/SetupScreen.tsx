import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGame } from '../../store/gameStore'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { EmojiPicker } from '../ui/EmojiPicker'

const MAX_PLAYERS = 8

const SWATCHES = [
  '#7c3aed', // grape
  '#ec4899', // bubble
  '#f97316', // tangerine
  '#fbbf24', // sunny
  '#34d399', // mint
  '#38bdf8', // sky
  '#ef4444', // red
  '#a3e635', // lime
]

const EMOJI_CHOICES = ['🦄', '🐶', '🦊', '🐼', '🦁', '🐸', '🚀', '🌟']

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function SetupScreen() {
  const setScreen = useGame((s) => s.setScreen)
  const players = useGame((s) => s.players)
  const addPlayer = useGame((s) => s.addPlayer)
  const removePlayer = useGame((s) => s.removePlayer)

  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState(() => randomFrom(EMOJI_CHOICES))
  const [color, setColor] = useState(() => randomFrom(SWATCHES))

  const atMax = players.length >= MAX_PLAYERS
  const canAdd = name.trim().length > 0 && !atMax

  const handleAdd = () => {
    if (!canAdd) return
    addPlayer(name.trim(), emoji, color)
    setName('')
    setEmoji(randomFrom(EMOJI_CHOICES))
    setColor(randomFrom(SWATCHES))
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <motion.h1
        className="text-center font-display text-4xl font-bold sm:text-5xl"
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      >
        Who's Playing? 🎮
      </motion.h1>

      <Card className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label className="font-body text-sm font-bold text-white/80">
            Player name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd()
            }}
            placeholder="Enter a name…"
            maxLength={20}
            className="w-full rounded-2xl border-2 border-white/25 bg-white/10 px-4 py-3 font-body text-lg font-semibold text-white placeholder-white/40 outline-none backdrop-blur-sm transition-colors focus:border-white/60"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <span className="font-body text-sm font-bold text-white/80">
              Pick an emoji
            </span>
            <EmojiPicker value={emoji} onChange={setEmoji} />
          </div>

          <div className="flex flex-col gap-2">
            <span className="font-body text-sm font-bold text-white/80">
              Pick a color
            </span>
            <div className="flex flex-wrap gap-3">
              {SWATCHES.map((sw) => {
                const selected = sw === color
                return (
                  <motion.button
                    key={sw}
                    type="button"
                    onClick={() => setColor(sw)}
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.9 }}
                    animate={{ scale: selected ? 1.12 : 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 22 }}
                    aria-label={`Choose color ${sw}`}
                    aria-pressed={selected}
                    className={[
                      'h-10 w-10 rounded-full outline-none transition-shadow',
                      selected
                        ? 'ring-4 ring-white shadow-glow'
                        : 'ring-2 ring-white/30',
                    ].join(' ')}
                    style={{ backgroundColor: sw }}
                  />
                )
              })}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-start gap-2">
          <Button onClick={handleAdd} disabled={!canAdd} variant="secondary">
            ➕ Add Player
          </Button>
          {atMax && (
            <span className="font-body text-sm font-semibold text-sunny">
              That's the max of {MAX_PLAYERS} players!
            </span>
          )}
        </div>
      </Card>

      <div className="flex-1">
        {players.length === 0 ? (
          <motion.p
            className="py-8 text-center font-body text-lg font-semibold text-white/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            No players yet — add at least one to get started. 👆
          </motion.p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            <AnimatePresence mode="popLayout">
              {players.map((p) => (
                <motion.div
                  key={p.id}
                  layout
                  initial={{ opacity: 0, scale: 0.6, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 26 }}
                  className="relative flex flex-col items-center gap-2 rounded-3xl border border-white/20 bg-white/10 p-4 backdrop-blur-md"
                  style={{ boxShadow: `0 6px 0 0 ${p.color}66` }}
                >
                  <button
                    type="button"
                    onClick={() => removePlayer(p.id)}
                    aria-label={`Remove ${p.name}`}
                    className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-white/15 text-sm font-bold text-white/80 outline-none transition-colors hover:bg-red-500 hover:text-white"
                  >
                    ✕
                  </button>
                  <span className="text-4xl">{p.emoji}</span>
                  <span
                    className="font-display text-lg font-bold leading-tight"
                    style={{ color: p.color }}
                  >
                    {p.name}
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-4">
        <Button variant="ghost" onClick={() => setScreen('home')}>
          ← Back
        </Button>
        <Button
          onClick={() => setScreen('config')}
          disabled={players.length === 0}
        >
          Next →
        </Button>
      </div>
    </div>
  )
}
