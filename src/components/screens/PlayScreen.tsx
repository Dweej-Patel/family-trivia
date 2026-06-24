import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useGame, useCurrentQuestion } from '../../store/gameStore'
import { useAudio } from '../../hooks/useAudio'
import { useCountdown } from '../../hooks/useCountdown'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { fireConfetti } from '../ui/ConfettiBurst'
import { AnswerOption, type AnswerState } from '../game/AnswerOption'
import { CountdownRing } from '../game/CountdownRing'
import { TurnBanner } from '../game/TurnBanner'
import { ScoreHUD } from '../game/ScoreHUD'
import { Mascot, type MascotMood } from '../ui/Mascot'
import { StreakFlair, StreakEdgeGlow, ON_FIRE } from '../game/StreakFlair'
import { RoundIntro } from '../game/RoundIntro'
import { buzz } from '../../lib/haptics'
import type { Difficulty } from '../../types'

const difficultyStyles: Record<Difficulty, { label: string; className: string }> = {
  easy: { label: 'Easy', className: 'bg-mint/20 text-mint border-mint/50' },
  medium: { label: 'Medium', className: 'bg-sunny/20 text-sunny border-sunny/50' },
  hard: { label: 'Hard', className: 'bg-red-500/20 text-red-400 border-red-500/50' },
}

export function PlayScreen() {
  const question = useCurrentQuestion()

  const players = useGame((s) => s.players)
  const activePlayerIndex = useGame((s) => s.activePlayerIndex)
  const currentIndex = useGame((s) => s.currentIndex)
  const deck = useGame((s) => s.deck)
  const selectedAnswer = useGame((s) => s.selectedAnswer)
  const revealed = useGame((s) => s.revealed)
  const timerEnabled = useGame((s) => s.config.timerEnabled)
  const timerSeconds = useGame((s) => s.config.timerSeconds)

  const selectAnswer = useGame((s) => s.selectAnswer)
  const reveal = useGame((s) => s.reveal)
  const breakStreak = useGame((s) => s.breakStreak)
  const nextQuestion = useGame((s) => s.nextQuestion)

  const { play } = useAudio()

  // Local "time ran out with no answer" state: we just show the correct answer
  // (no points awarded) since the store's reveal() ignores a null selection.
  const [timeUp, setTimeUp] = useState(false)

  // Game-show "get ready" overlay — the category reveal + 3·2·1·GO opener. Only
  // at the true game start (currentIndex 0); halftime returns re-mount PlayScreen
  // too (every player cycle), and replaying the countdown there would nag.
  const [showIntro, setShowIntro] = useState(() => currentIndex === 0)
  const introCategory = useMemo(() => {
    const cats = Array.from(new Set(deck.map((q) => q.category)))
    return cats.length === 1 ? cats[0] : 'Mixed Trivia'
  }, [deck])

  const totalQuestions = deck.length
  const hasPlayers = players.length > 0
  const activePlayer = hasPlayers ? players[activePlayerIndex] : undefined

  // A reveal has effectively happened if the store revealed OR the timer forced it.
  const showResults = revealed || timeUp

  // ── Whoosh + reset local state on each new question ────────────────────────
  useEffect(() => {
    play('whoosh')
    setTimeUp(false)
  }, [currentIndex, play])

  // ── Timer ──────────────────────────────────────────────────────────────────
  // Hold the clock until the round-intro countdown finishes — no fair starting
  // the timer behind the "3·2·1·GO" curtain.
  const timerActive = timerEnabled && !showResults && !!question && !showIntro

  const handleTick = (remaining: number) => {
    if (remaining <= 0) return
    play(remaining <= 5 ? 'countdown' : 'tick')
  }

  const handleExpire = () => {
    // Lock in. If an answer is selected, do a real reveal (store awards points).
    // Otherwise just show the correct answer with no points.
    if (selectedAnswerRef.current !== null) {
      reveal()
    } else {
      setTimeUp(true)
    }
  }

  // Keep a ref so the countdown's onExpire reads the latest selection.
  const selectedAnswerRef = useRef(selectedAnswer)
  selectedAnswerRef.current = selectedAnswer

  const { remaining } = useCountdown({
    seconds: timerSeconds,
    active: timerActive,
    onTick: handleTick,
    onExpire: handleExpire,
    key: currentIndex,
  })

  // ── Reveal feedback (confetti / sfx) ────────────────────────────────────────
  const feedbackFiredRef = useRef(false)
  useEffect(() => {
    if (!revealed) {
      feedbackFiredRef.current = false
      return
    }
    if (feedbackFiredRef.current || !question) return
    feedbackFiredRef.current = true
    const correct = selectedAnswer === question.correctIndex
    if (correct) {
      fireConfetti(activePlayer?.color)
      play('correct')
      buzz([30, 40, 30])
    } else {
      play('wrong')
      buzz(80)
    }
  }, [revealed, selectedAnswer, question, play, activePlayer?.color])

  // When the timer forces a no-answer reveal, play the wrong cue once.
  const timeUpFiredRef = useRef(false)
  useEffect(() => {
    if (!timeUp) {
      timeUpFiredRef.current = false
      return
    }
    if (timeUpFiredRef.current) return
    timeUpFiredRef.current = true
    play('wrong')
    buzz(80)
    // No answer locked in — the active player's streak ends here.
    breakStreak()
  }, [timeUp, play, breakStreak])

  // Graceful fallback while the deck/question hydrates.
  if (!question) return null

  const handleSelect = (index: number) => {
    if (showResults) return
    selectAnswer(index)
    play('select')
  }

  const handleReveal = () => {
    if (selectedAnswer === null) return
    reveal()
  }

  const handleNext = () => {
    play('whoosh')
    nextQuestion()
  }

  const optionState = (index: number): AnswerState => {
    if (!showResults) {
      return selectedAnswer === index ? 'selected' : 'idle'
    }
    if (index === question.correctIndex) return 'correct'
    if (index === selectedAnswer) return 'wrong'
    return 'dimmed'
  }

  const diff = difficultyStyles[question.difficulty]
  const isLastQuestion = currentIndex + 1 >= totalQuestions

  // The mascot reacts to where we are: leaning in while you decide, then
  // celebrating, sympathizing, or short-circuiting on a timeout when it lands.
  const wasCorrect = selectedAnswer === question.correctIndex
  const mascotMood: MascotMood = !showResults
    ? 'thinking'
    : timeUp
      ? 'timeout'
      : wasCorrect
        ? 'happy'
        : 'sad'
  // The active player's running streak lights the mascot's status LEDs.
  const activeStreak = activePlayer?.streak ?? 0

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 py-4">
      <StreakEdgeGlow active={showResults && wasCorrect && activeStreak >= ON_FIRE} />

      <AnimatePresence>
        {showIntro && (
          <RoundIntro category={introCategory} onDone={() => setShowIntro(false)} />
        )}
      </AnimatePresence>

      {/* ── Header: counter + meta ─────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="font-display text-lg font-bold text-white/80">
          Question {currentIndex + 1} of {totalQuestions}
        </span>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-sky/50 bg-sky/15 px-3 py-1 font-body text-sm font-bold text-sky">
            {question.category}
          </span>
          <span
            className={[
              'rounded-full border px-3 py-1 font-body text-sm font-bold',
              diff.className,
            ].join(' ')}
          >
            {diff.label}
          </span>
        </div>
      </div>

      {/* ── Score HUD + turn banner ────────────────────────────────────────── */}
      {hasPlayers && (
        <div className="flex flex-col items-center gap-3">
          <ScoreHUD players={players} activeId={activePlayer?.id} />
          {activePlayer && (
            <TurnBanner
              player={{
                name: activePlayer.name,
                emoji: activePlayer.emoji,
                color: activePlayer.color,
              }}
            />
          )}
        </div>
      )}

      {/* ── Brainy + timer ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-center gap-4">
        <Mascot mood={mascotMood} size={timerEnabled ? 84 : 96} charge={activeStreak} />
        {timerEnabled && (
          <CountdownRing
            remaining={showResults ? 0 : remaining}
            total={timerSeconds}
          />
        )}
      </div>

      {/* ── Question prompt ────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ x: 60, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -60, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        >
          <Card className="text-center">
            <h2 className="font-display text-2xl font-bold leading-snug text-white sm:text-4xl">
              {question.prompt}
            </h2>
          </Card>
        </motion.div>
      </AnimatePresence>

      {/* ── Answer options ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {question.options.map((opt, i) => (
          <AnswerOption
            key={`${currentIndex}-${i}`}
            label={opt}
            index={i}
            state={optionState(i)}
            disabled={showResults}
            onClick={() => handleSelect(i)}
          />
        ))}
      </div>

      {/* ── Primary action ─────────────────────────────────────────────────── */}
      <div className="mt-auto flex flex-col items-center gap-2 pt-2">
        {timeUp && (
          <span className="font-display text-lg font-bold text-red-400">
            ⏰ Time's up!
          </span>
        )}
        {showResults && wasCorrect && hasPlayers && activeStreak >= 2 && (
          <StreakFlair streak={activeStreak} color={activePlayer?.color} />
        )}
        {!showResults ? (
          <Button
            size="lg"
            fullWidth
            disabled={selectedAnswer === null}
            onClick={handleReveal}
          >
            🔒 Lock In
          </Button>
        ) : (
          <Button size="lg" fullWidth variant="primary" onClick={handleNext}>
            {isLastQuestion ? '🏁 Finish' : 'Next →'}
          </Button>
        )}
      </div>
    </div>
  )
}
