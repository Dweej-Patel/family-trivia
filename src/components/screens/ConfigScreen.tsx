import { motion } from 'framer-motion'
import { useGame, useCategories, planQuestions } from '../../store/gameStore'
import { useAudio } from '../../hooks/useAudio'
import type { Difficulty } from '../../types'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Chip } from '../ui/Chip'
import { Toggle } from '../ui/Toggle'

const DIFFICULTIES: { value: Difficulty; label: string; emoji: string }[] = [
  { value: 'easy', label: 'Easy', emoji: '🟢' },
  { value: 'medium', label: 'Medium', emoji: '🟡' },
  { value: 'hard', label: 'Hard', emoji: '🔴' },
]

const COUNT_OPTIONS = [5, 10, 15, 20]
const TIMER_OPTIONS = [10, 20, 30]

const sectionVariants = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 260, damping: 24, delay: i * 0.1 },
  }),
}

export function ConfigScreen() {
  const setScreen = useGame((s) => s.setScreen)
  const config = useGame((s) => s.config)
  const setConfig = useGame((s) => s.setConfig)
  const startGame = useGame((s) => s.startGame)
  const questions = useGame((s) => s.questions)
  const players = useGame((s) => s.players)
  const categories = useCategories()
  const { play } = useAudio()

  // Fair split: deck size snaps to a multiple of the player count so everyone
  // answers the same number of questions.
  const playerCount = Math.max(1, players.length)
  const plan = planQuestions(questions, config, playerCount)

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

  const handleStart = () => {
    play('whoosh')
    startGame()
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <motion.h1
        className="text-center font-display text-4xl font-bold sm:text-5xl"
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      >
        Game Setup 🛠️
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
            {playerCount === 1
              ? `🎯 ${plan.total} questions`
              : `🎯 ${plan.total} questions • ${plan.perPlayer} each for ${playerCount} players`}
          </p>
        </Card>
      </motion.div>

      <motion.div custom={3} variants={sectionVariants} initial="hidden" animate="show">
        <Card className="flex flex-col gap-3">
          <h2 className="font-display text-2xl font-bold">Timer</h2>
          <Toggle
            checked={config.timerEnabled}
            onChange={(v) => setConfig({ timerEnabled: v })}
            label={config.timerEnabled ? 'Timer on' : 'Timer off'}
          />
          {config.timerEnabled && (
            <div className="flex flex-col gap-2">
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
            </div>
          )}
        </Card>
      </motion.div>

      <div className="flex items-center justify-between gap-4 pt-2">
        <Button variant="ghost" onClick={() => setScreen('setup')}>
          ← Back
        </Button>
        <Button size="lg" onClick={handleStart}>
          🚀 Start Game!
        </Button>
      </div>
    </div>
  )
}
