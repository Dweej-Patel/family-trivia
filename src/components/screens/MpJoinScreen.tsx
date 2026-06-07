import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGame } from '../../store/gameStore'
import { useMpStore } from '../../multiplayer/mpStore'
import { joinRoom } from '../../multiplayer/room'
import { useAudio } from '../../hooks/useAudio'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { EmojiPicker } from '../ui/EmojiPicker'

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

const CODE_MAX = 8
const NAME_MAX = 16

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

/** Keep only A–Z / 0–9, uppercase, and clamp to the code length. */
function sanitizeCode(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, CODE_MAX)
}

export function MpJoinScreen() {
  const setScreen = useGame((s) => s.setScreen)
  const { play } = useAudio()

  const [code, setCode] = useState(() =>
    sanitizeCode(useMpStore.getState().joinCodePrefill),
  )
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState(() => randomFrom(EMOJI_CHOICES))
  const [color, setColor] = useState(() => randomFrom(SWATCHES))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const trimmedCode = code.trim()
  const trimmedName = name.trim()
  const canJoin = trimmedCode.length > 0 && trimmedName.length > 0 && !submitting

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCode(sanitizeCode(e.target.value))
  }

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value)
  }

  const handleJoin = async () => {
    if (!canJoin) return
    setSubmitting(true)
    setError(null)
    try {
      const uid = await joinRoom(trimmedCode, {
        name: trimmedName,
        emoji,
        color,
      })
      useMpStore.getState().setPlayerSession(trimmedCode, uid)
      play('whoosh')
      setScreen('mpPlayer')
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Something went wrong — please try again.'
      setError(message)
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6">
      <motion.h1
        className="text-center font-display text-4xl font-bold sm:text-5xl"
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      >
        Join a Game 📱
      </motion.h1>

      <Card className="flex flex-col gap-5">
        {/* ── Room code ── */}
        <div className="flex flex-col gap-2">
          <label className="font-body text-sm font-bold text-white/80">
            Room code
          </label>
          <input
            type="text"
            value={code}
            onChange={handleCodeChange}
            placeholder="ABCD"
            maxLength={CODE_MAX}
            autoCapitalize="characters"
            autoCorrect="off"
            autoComplete="off"
            spellCheck={false}
            inputMode="text"
            aria-label="Room code"
            className="w-full rounded-2xl border-2 border-white/25 bg-white/10 px-4 py-4 text-center font-mono text-3xl font-bold uppercase tracking-widest text-white placeholder-white/30 outline-none backdrop-blur-sm transition-colors focus:border-white/60"
          />
        </div>

        {/* ── Name ── */}
        <div className="flex flex-col gap-2">
          <label className="font-body text-sm font-bold text-white/80">
            Your name
          </label>
          <input
            type="text"
            value={name}
            onChange={handleNameChange}
            placeholder="Enter a name…"
            maxLength={NAME_MAX}
            aria-label="Your name"
            className="w-full rounded-2xl border-2 border-white/25 bg-white/10 px-4 py-3 font-body text-lg font-semibold text-white placeholder-white/40 outline-none backdrop-blur-sm transition-colors focus:border-white/60"
          />
        </div>

        {/* ── Avatar emoji ── */}
        <div className="flex flex-col gap-2">
          <span className="font-body text-sm font-bold text-white/80">
            Pick an avatar
          </span>
          <EmojiPicker value={emoji} onChange={setEmoji} />
        </div>

        {/* ── Color ── */}
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
                    'h-11 w-11 rounded-full outline-none transition-shadow',
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

        {/* ── Error banner ── */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -6, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -6, height: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              role="alert"
              className="rounded-2xl border-2 border-red-400/60 bg-red-500/20 px-4 py-3 font-body text-sm font-semibold text-red-100"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <Button
          onClick={handleJoin}
          disabled={!canJoin}
          size="lg"
          fullWidth
        >
          {submitting ? 'Joining…' : 'Join 🎉'}
        </Button>
      </Card>

      <div className="flex items-center justify-start">
        <Button variant="ghost" onClick={() => setScreen('home')}>
          ← Back
        </Button>
      </div>
    </div>
  )
}
