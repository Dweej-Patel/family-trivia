import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { QRCodeSVG } from 'qrcode.react'
import { useMpStore } from '../../multiplayer/mpStore'
import { useHostGame } from '../../multiplayer/useHostGame'
import { disconnectDb } from '../../lib/firebase'
import { useGame, selectQuestions } from '../../store/gameStore'
import { useAudio } from '../../hooks/useAudio'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { fireWinner } from '../ui/ConfettiBurst'
import { Leaderboard } from '../game/Leaderboard'
import { Podium } from '../game/Podium'
import type { Difficulty } from '../../types'

const difficultyStyles: Record<Difficulty, { label: string; className: string }> = {
  easy: { label: 'Easy', className: 'bg-mint/20 text-mint border-mint/50' },
  medium: { label: 'Medium', className: 'bg-sunny/20 text-sunny border-sunny/50' },
  hard: { label: 'Hard', className: 'bg-red-500/20 text-red-400 border-red-500/50' },
}

// A/B/C/D tile colors (brand palette).
const TILE_COLORS = ['#ec4899', '#38bdf8', '#fbbf24', '#34d399']
const TILE_LETTERS = ['A', 'B', 'C', 'D']

export function MpHostScreen() {
  const deck = useMpStore((s) => s.hostDeck)
  const pacing = useMpStore((s) => s.hostPacing)
  const timerSeconds = useMpStore((s) => s.hostTimerSeconds)
  const setScreen = useGame((s) => s.setScreen)
  const questions = useGame((s) => s.questions)
  const config = useGame((s) => s.config)
  const { play } = useAudio()

  const game = useHostGame(deck, { pacing, timerSeconds })
  const {
    code,
    status,
    error,
    currentIndex,
    currentQuestion,
    totalQuestions,
    players,
    answeredCount,
    connectedCount,
    isLast,
    start,
    reveal,
    next,
    end,
    restart,
    close,
  } = game

  // Cancel mid-game: jump straight to the podium with the scores as they
  // stand. The room stays alive, so "Play Again" still works from there.
  const endNow = () => {
    if (window.confirm('End the game now and show the final scores?')) end()
  }

  // Replay in the SAME room with fresh questions — keeps everyone connected.
  // Uses the CURRENT config (not the session's original pacing/timer) so any
  // settings the host edited along the way carry into the next game.
  const playAgain = () => {
    const newDeck = selectQuestions(questions, config)
    useMpStore.getState().setHostSession(newDeck, config.pacing, config.timerSeconds)
    restart(newDeck.length)
  }

  // ── Per-status one-time effects (guarded by refs) ──────────────────────────

  // Whoosh whenever a new question goes live.
  const lastQuestionIndexRef = useRef(-1)
  useEffect(() => {
    if (status !== 'question') return
    if (lastQuestionIndexRef.current === currentIndex) return
    lastQuestionIndexRef.current = currentIndex
    play('whoosh')
  }, [status, currentIndex, play])

  // Play 'correct' once per reveal.
  const revealPlayedForRef = useRef(-1)
  useEffect(() => {
    if (status !== 'reveal') return
    if (revealPlayedForRef.current === currentIndex) return
    revealPlayedForRef.current = currentIndex
    play('correct')
  }, [status, currentIndex, play])

  // Fire the winner celebration once on finish.
  const finishedFiredRef = useRef(false)
  useEffect(() => {
    if (status !== 'finished') {
      finishedFiredRef.current = false
      return
    }
    if (finishedFiredRef.current) return
    finishedFiredRef.current = true
    fireWinner()
    play('victory')
  }, [status, play])

  // ── Timed-mode visual countdown (the hook handles the real auto-reveal) ────
  const [remaining, setRemaining] = useState(timerSeconds)
  useEffect(() => {
    if (status !== 'question' || pacing !== 'timed') return
    setRemaining(timerSeconds)
    const startedAt = Date.now()
    const id = window.setInterval(() => {
      const elapsed = (Date.now() - startedAt) / 1000
      setRemaining(Math.max(0, timerSeconds - elapsed))
    }, 100)
    return () => window.clearInterval(id)
  }, [status, pacing, currentIndex, timerSeconds])

  // ── Copy the invite link to the clipboard (with a brief "copied" state) ────
  const [copied, setCopied] = useState(false)
  const copyLink = async (url: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url)
      } else {
        const ta = document.createElement('textarea')
        ta.value = url
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.focus()
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      /* clipboard blocked — ignore */
    }
  }

  // ── Navigation helpers (delete the room, then drop the connection) ─────────
  const leaveTo = (screen: 'mode' | 'home') => {
    close()
    setScreen(screen)
    // Closing the socket also fires the onDisconnect that removes the room, so
    // players are kicked even if the explicit delete above doesn't flush.
    disconnectDb()
  }

  // ── Edge case: no game set up (session lost) ───────────────────────────────
  if (deck.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-6 py-12 text-center">
        <div className="text-6xl">🤔</div>
        <h2 className="font-display text-3xl font-bold text-white">
          No game set up
        </h2>
        <p className="font-body text-lg text-white/70">
          Looks like the game session was lost. Let's set up a new one!
        </p>
        <Button size="lg" onClick={() => leaveTo('mode')}>
          ← Back to Start
        </Button>
      </div>
    )
  }

  // ── 'creating' ─────────────────────────────────────────────────────────────
  if (status === 'creating') {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-6 py-12 text-center">
        {error ? (
          <>
            <div className="text-6xl">😵</div>
            <h2 className="font-display text-3xl font-bold text-white">
              Couldn't create the room
            </h2>
            <p className="font-body text-lg text-red-300">{error}</p>
            <Button size="lg" variant="ghost" onClick={() => leaveTo('mode')}>
              ← Back
            </Button>
          </>
        ) : (
          <motion.div
            animate={{ scale: [1, 1.08, 1], opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
            className="font-display text-4xl font-bold text-white"
          >
            Creating room…
          </motion.div>
        )}
      </div>
    )
  }

  // ── 'lobby' ────────────────────────────────────────────────────────────────
  if (status === 'lobby') {
    const joinUrl = `${window.location.origin}${window.location.pathname}?room=${code}`
    const siteUrl = `${window.location.origin}${window.location.pathname}`.replace(
      /\/$/,
      '',
    )

    return (
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 py-6">
        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-2">
          {/* Join info + QR */}
          <Card className="flex flex-col items-center gap-5 text-center">
            <div>
              <p className="font-body text-xl font-semibold text-white/70">
                Join at
              </p>
              <p className="font-display text-2xl font-bold text-sky sm:text-3xl">
                {siteUrl.replace(/^https?:\/\//, '')}
              </p>
            </div>

            <div className="flex flex-col items-center gap-1">
              <p className="font-body text-lg font-semibold text-white/70">
                Room code
              </p>
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 18 }}
                className="font-display text-6xl font-black tracking-widest text-white sm:text-7xl"
              >
                {code}
              </motion.div>
            </div>

            <div className="rounded-2xl bg-white p-3 shadow-playful">
              <QRCodeSVG value={joinUrl} size={200} level="M" />
            </div>

            <div className="flex w-full flex-col items-center gap-2">
              <p className="break-all font-body text-sm text-white/50">{joinUrl}</p>
              <motion.button
                onClick={() => copyLink(joinUrl)}
                whileTap={{ scale: 0.95 }}
                className={[
                  'inline-flex items-center gap-2 rounded-2xl border px-4 py-2 font-display text-sm font-bold transition-colors',
                  copied
                    ? 'border-mint/50 bg-mint/20 text-mint'
                    : 'border-white/25 bg-white/10 text-white hover:bg-white/20',
                ].join(' ')}
              >
                {copied ? '✓ Link copied!' : '📋 Copy invite link'}
              </motion.button>
            </div>
          </Card>

          {/* Player roster */}
          <div className="flex flex-col gap-4">
            <div className="flex items-baseline justify-between">
              <h2 className="font-display text-2xl font-bold text-white">
                Players
              </h2>
              <span className="font-display text-2xl font-bold text-sunny tabular-nums">
                {players.length}
              </span>
            </div>

            {players.length === 0 ? (
              <Card className="flex items-center justify-center py-10 text-center">
                <motion.p
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.6, repeat: Infinity }}
                  className="font-body text-lg font-semibold text-white/70"
                >
                  Waiting for players to join…
                </motion.p>
              </Card>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <AnimatePresence>
                  {players.map((p) => {
                    const offline = p.connected === false
                    return (
                      <motion.div
                        key={p.id}
                        layout
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: offline ? 0.45 : 1 }}
                        exit={{ scale: 0.5, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                        className="flex flex-col items-center gap-2 rounded-2xl border border-white/15 bg-white/10 p-3"
                      >
                        <div
                          className="flex h-12 w-12 items-center justify-center rounded-full text-2xl shadow-playful-sm"
                          style={{ backgroundColor: p.color }}
                          aria-hidden
                        >
                          {p.emoji}
                        </div>
                        <span className="max-w-full truncate font-display text-sm font-bold text-white">
                          {p.name}
                        </span>
                        {offline && (
                          <span className="font-body text-[0.65rem] font-bold uppercase tracking-wide text-white/60">
                            ⚠ reconnecting…
                          </span>
                        )}
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

        <div className="mt-auto flex flex-col items-center gap-3 pt-2">
          <p className="font-body text-sm font-semibold text-white/60">
            🎯 {totalQuestions} questions ·{' '}
            {pacing === 'timed' ? `⏱️ Timed · ${timerSeconds}s` : '✋ Host controls'}
          </p>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Button
              size="lg"
              disabled={players.length < 1}
              onClick={start}
            >
              Start Game ▶
            </Button>
            {/* Plain navigation — the room stays alive, and the setup screen
                saves changes back into it. */}
            <Button size="lg" variant="ghost" onClick={() => setScreen('mpHostSetup')}>
              ⚙️ Edit Settings
            </Button>
            <Button size="lg" variant="ghost" onClick={() => leaveTo('mode')}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // ── 'question' / 'reveal' both render the options grid ─────────────────────
  if ((status === 'question' || status === 'reveal') && currentQuestion) {
    const diff = difficultyStyles[currentQuestion.difficulty]
    const isReveal = status === 'reveal'

    return (
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 py-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="font-display text-xl font-bold text-white/80 sm:text-2xl">
            Question {currentIndex + 1} of {totalQuestions}
          </span>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-sky/50 bg-sky/15 px-3 py-1 font-body text-sm font-bold text-sky sm:text-base">
              {currentQuestion.category}
            </span>
            <span
              className={[
                'rounded-full border px-3 py-1 font-body text-sm font-bold sm:text-base',
                diff.className,
              ].join(' ')}
            >
              {diff.label}
            </span>
            <button
              onClick={endNow}
              className="rounded-full border border-white/20 bg-white/5 px-3 py-1 font-body text-sm font-bold text-white/60 transition-colors hover:bg-white/15 hover:text-white sm:text-base"
            >
              🏁 End game
            </button>
          </div>
        </div>

        {/* Timed countdown bar */}
        {pacing === 'timed' && !isReveal && (
          <div className="flex flex-col items-center gap-2">
            <div className="font-display text-4xl font-black tabular-nums text-white">
              {Math.ceil(remaining)}
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-white/10">
              <motion.div
                className="h-full rounded-full"
                style={{
                  background: 'linear-gradient(90deg, #34d399, #fbbf24, #f97316)',
                }}
                animate={{ width: `${(remaining / timerSeconds) * 100}%` }}
                transition={{ ease: 'linear', duration: 0.1 }}
              />
            </div>
          </div>
        )}

        {/* Prompt */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -30, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          >
            <Card className="text-center">
              <h2 className="font-display text-3xl font-bold leading-snug text-white sm:text-5xl">
                {currentQuestion.prompt}
              </h2>
            </Card>
          </motion.div>
        </AnimatePresence>

        {/* Options grid (non-interactive host view) */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {currentQuestion.options.map((opt, i) => {
            const isCorrect = i === currentQuestion.correctIndex
            const dim = isReveal && !isCorrect
            const tileColor = TILE_COLORS[i % TILE_COLORS.length]
            return (
              <motion.div
                key={`${currentIndex}-${i}`}
                animate={{
                  opacity: dim ? 0.35 : 1,
                  scale: isReveal && isCorrect ? 1.03 : 1,
                }}
                transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                className={[
                  'flex items-center gap-4 rounded-2xl border-2 p-5 sm:p-6',
                  isReveal && isCorrect
                    ? 'border-mint bg-mint/25 ring-4 ring-mint/50'
                    : 'border-white/15',
                ].join(' ')}
                style={
                  isReveal && isCorrect ? undefined : { backgroundColor: `${tileColor}22` }
                }
              >
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl font-display text-2xl font-black text-white shadow-playful-sm sm:h-14 sm:w-14"
                  style={{ backgroundColor: tileColor }}
                  aria-hidden
                >
                  {TILE_LETTERS[i]}
                </div>
                <span className="flex-1 font-display text-xl font-bold text-white sm:text-2xl">
                  {opt}
                </span>
                {isReveal && isCorrect && (
                  <span className="text-3xl text-mint sm:text-4xl" aria-hidden>
                    ✓
                  </span>
                )}
              </motion.div>
            )
          })}
        </div>

        {/* Question phase: answered count + reveal control */}
        {!isReveal && (
          <div className="mt-auto flex flex-col items-center gap-3 pt-2">
            <span className="font-display text-2xl font-bold text-white/80 tabular-nums">
              {answeredCount} / {connectedCount} answered
            </span>
            {players.length - connectedCount > 0 && (
              <span className="font-body text-sm font-bold text-sunny">
                ⚠ {players.length - connectedCount} reconnecting…
              </span>
            )}
            {pacing === 'manual' && (
              <Button size="lg" onClick={reveal}>
                Reveal Answer 👀
              </Button>
            )}
          </div>
        )}

        {/* Reveal phase: leaderboard + next control */}
        {isReveal && (
          <div className="mt-auto flex flex-col gap-5 pt-2">
            <Leaderboard players={players} />
            {pacing === 'manual' ? (
              <div className="flex justify-center">
                <Button size="lg" onClick={next}>
                  {isLast ? 'See Results 🏁' : 'Next →'}
                </Button>
              </div>
            ) : (
              <motion.p
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.4, repeat: Infinity }}
                className="text-center font-body text-lg font-semibold text-white/70"
              >
                Next question coming up…
              </motion.p>
            )}
          </div>
        )}
      </div>
    )
  }

  // ── 'finished' ─────────────────────────────────────────────────────────────
  if (status === 'finished') {
    const winner = players[0]
    const isTie =
      players.length > 1 &&
      players[0] !== undefined &&
      players[1] !== undefined &&
      players[0].score === players[1].score

    return (
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center gap-8 py-6 text-center">
        <motion.h1
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 16 }}
          className="font-display text-4xl font-black text-white sm:text-6xl"
        >
          🎉 {isTie ? "It's a tie!" : `Winner: ${winner?.name ?? '—'}`} 🎉
        </motion.h1>

        <div className="w-full">
          <Podium players={players} />
        </div>

        <div className="w-full">
          <Leaderboard players={players} />
        </div>

        <div className="mt-auto flex flex-col items-center gap-3 pt-2 sm:flex-row sm:justify-center">
          <Button size="lg" onClick={playAgain}>
            🔁 Play Again
          </Button>
          <Button size="lg" variant="ghost" onClick={() => leaveTo('home')}>
            🏠 Home
          </Button>
        </div>
      </div>
    )
  }

  // Fallback (shouldn't normally render).
  return null
}
