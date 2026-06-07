import { motion } from 'framer-motion'
import { useGame, useCategories, selectQuestions } from '../../store/gameStore'
import { useMpStore } from '../../multiplayer/mpStore'
import { updateRoomSettings } from '../../multiplayer/room'
import { useAudio } from '../../hooks/useAudio'
import type { Difficulty } from '../../types'
import type { Pacing } from '../../multiplayer/types'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Chip } from '../ui/Chip'

const DIFFICULTIES: { value: Difficulty; label: string; emoji: string }[] = [
  { value: 'easy', label: 'Easy', emoji: '🟢' },
  { value: 'medium', label: 'Medium', emoji: '🟡' },
  { value: 'hard', label: 'Hard', emoji: '🔴' },
]

const COUNT_OPTIONS = [5, 10, 15, 20]
const TIMER_OPTIONS = [10, 20, 30]

const PACING_OPTIONS: {
  value: Pacing
  label: string
  desc: string
  color: string
}[] = [
  {
    value: 'timed',
    label: '⏱️ Timed',
    desc: 'Auto-advances; faster answers score more.',
    color: '#f97316',
  },
  {
    value: 'manual',
    label: '✋ Host controls',
    desc: 'You tap to reveal & move on.',
    color: '#38bdf8',
  },
]

const sectionVariants = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 260, damping: 24, delay: i * 0.1 },
  }),
}

export function MpHostSetupScreen() {
  const setScreen = useGame((s) => s.setScreen)
  const config = useGame((s) => s.config)
  const setConfig = useGame((s) => s.setConfig)
  const questions = useGame((s) => s.questions)
  const categories = useCategories()
  const { play } = useAudio()
  // When a room is already live (the host came back from the lobby to tweak
  // settings), this screen EDITS that room instead of creating a new one.
  const editingCode = useMpStore((s) => s.hostRoomCode)

  const toggleCategory = (cat: string) => {
    const has = config.categories.includes(cat)
    const next = has
      ? config.categories.filter((c) => c !== cat)
      : [...config.categories, cat]
    setConfig({ categories: next })
  }

  const toggleDifficulty = (d: Difficulty) => {
    const has = config.difficulties.includes(d)
    const next = has
      ? config.difficulties.filter((x) => x !== d)
      : [...config.difficulties, d]
    setConfig({ difficulties: next })
  }

  const handleCreate = () => {
    play('whoosh')
    const deck = selectQuestions(questions, config)
    useMpStore.getState().setHostSession(deck, config.pacing, config.timerSeconds)
    // Editing a live room: push the new settings to its meta so players (and the
    // re-attaching host screen) see them. Creation is handled by the host screen.
    if (editingCode) {
      void updateRoomSettings(editingCode, {
        pacing: config.pacing,
        timerSeconds: config.timerSeconds,
        totalQuestions: deck.length,
      })
    }
    setScreen('mpHost')
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <motion.h1
        className="text-center font-display text-4xl font-bold sm:text-5xl"
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      >
        {editingCode ? 'Game Settings ⚙️' : 'Host a Game 📡'}
      </motion.h1>

      <motion.div custom={0} variants={sectionVariants} initial="hidden" animate="show">
        <Card className="flex flex-col gap-3">
          <h2 className="font-display text-2xl font-bold">Categories</h2>
          <p className="font-body text-sm font-semibold text-white/70">
            Choose some, or pick All for everything.
          </p>
          <div className="flex flex-wrap gap-2">
            <Chip
              label="All"
              emoji="✨"
              selected={config.categories.length === 0}
              onClick={() => setConfig({ categories: [] })}
            />
            {categories.map((cat) => (
              <Chip
                key={cat}
                label={cat}
                selected={config.categories.includes(cat)}
                onClick={() => toggleCategory(cat)}
              />
            ))}
          </div>
        </Card>
      </motion.div>

      <motion.div custom={1} variants={sectionVariants} initial="hidden" animate="show">
        <Card className="flex flex-col gap-3">
          <h2 className="font-display text-2xl font-bold">Difficulty</h2>
          <p className="font-body text-sm font-semibold text-white/70">
            Leave all off for a mix of everything.
          </p>
          <div className="flex flex-wrap gap-2">
            {DIFFICULTIES.map((d) => (
              <Chip
                key={d.value}
                label={d.label}
                emoji={d.emoji}
                selected={config.difficulties.includes(d.value)}
                onClick={() => toggleDifficulty(d.value)}
              />
            ))}
          </div>
        </Card>
      </motion.div>

      <motion.div custom={2} variants={sectionVariants} initial="hidden" animate="show">
        <Card className="flex flex-col gap-3">
          <h2 className="font-display text-2xl font-bold">Number of Questions</h2>
          <div className="flex flex-wrap gap-2">
            {COUNT_OPTIONS.map((n) => (
              <Chip
                key={n}
                label={String(n)}
                selected={config.questionCount === n}
                onClick={() => setConfig({ questionCount: n })}
              />
            ))}
          </div>
          <p className="font-body text-sm font-semibold text-sunny">
            🎯 {config.questionCount} questions
          </p>
        </Card>
      </motion.div>

      <motion.div custom={3} variants={sectionVariants} initial="hidden" animate="show">
        <Card className="flex flex-col gap-3">
          <h2 className="font-display text-2xl font-bold">Pacing</h2>
          <p className="font-body text-sm font-semibold text-white/70">
            How does the game move from question to question?
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {PACING_OPTIONS.map((p) => {
              const selected = config.pacing === p.value
              return (
                <motion.button
                  key={p.value}
                  type="button"
                  onClick={() => setConfig({ pacing: p.value })}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.96 }}
                  animate={{ scale: selected ? 1.02 : 1 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 24 }}
                  style={
                    selected ? { borderColor: p.color, backgroundColor: `${p.color}26` } : undefined
                  }
                  className={[
                    'flex flex-col gap-1 rounded-2xl border-2 p-4 text-left',
                    'select-none cursor-pointer outline-none transition-colors duration-150',
                    'focus-visible:ring-4 focus-visible:ring-white/40',
                    selected
                      ? 'text-white shadow-glow'
                      : 'border-white/20 bg-white/5 text-white/90 hover:bg-white/10',
                  ].join(' ')}
                >
                  <span className="font-display text-lg font-bold">{p.label}</span>
                  <span className="font-body text-sm font-semibold text-white/70">{p.desc}</span>
                </motion.button>
              )
            })}
          </div>
        </Card>
      </motion.div>

      {config.pacing === 'timed' && (
        <motion.div custom={4} variants={sectionVariants} initial="hidden" animate="show">
          <Card className="flex flex-col gap-3">
            <h2 className="font-display text-2xl font-bold">Timer</h2>
            <span className="font-body text-sm font-semibold text-white/70">
              Seconds per question
            </span>
            <div className="flex flex-wrap gap-2">
              {TIMER_OPTIONS.map((s) => (
                <Chip
                  key={s}
                  label={`${s}s`}
                  emoji="⏱️"
                  selected={config.timerSeconds === s}
                  onClick={() => setConfig({ timerSeconds: s })}
                />
              ))}
            </div>
          </Card>
        </motion.div>
      )}

      <div className="flex items-center justify-between gap-4 pt-2">
        <Button
          variant="ghost"
          onClick={() => setScreen(editingCode ? 'mpHost' : 'mode')}
        >
          ← Back
        </Button>
        <Button size="lg" onClick={handleCreate}>
          {editingCode ? 'Save Settings 💾' : 'Create Room 🚀'}
        </Button>
      </div>
    </div>
  )
}
