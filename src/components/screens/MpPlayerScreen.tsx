import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGame } from '../../store/gameStore'
import { useMpStore } from '../../multiplayer/mpStore'
import { usePlayerGame } from '../../multiplayer/usePlayerGame'
import { leaveRoom } from '../../multiplayer/room'
import { clearSession } from '../../multiplayer/session'
import type { PlayerIdentity } from '../../multiplayer/types'
import { disconnectDb } from '../../lib/firebase'
import { MANUAL_BONUS_WINDOW } from '../../multiplayer/scoring'
import { useAudio } from '../../hooks/useAudio'
import { fireConfetti } from '../ui/ConfettiBurst'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'

// Bright answer-tile palette (cycled if there are >4 options).
const ANSWER_COLORS = ['#ef4444', '#38bdf8', '#fbbf24', '#34d399', '#7c3aed', '#ec4899']
const ANSWER_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F']

const spring = { type: 'spring', stiffness: 320, damping: 24 } as const

/** Shared page shell: centered, mobile-first, max-w-md. */
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-6 py-6 text-center">
      {children}
    </div>
  )
}

/** Shown when the player has no active session. */
function NotInGame() {
  const setScreen = useGame((s) => s.setScreen)
  const goHome = () => {
    clearSession()
    disconnectDb()
    useMpStore.getState().reset()
    setScreen('home')
  }
  return (
    <Shell>
      <div className="text-6xl">🤔</div>
      <h1 className="font-display text-4xl font-bold">You&apos;re not in a game</h1>
      <p className="font-body text-lg text-white/70">
        Join a room to start playing along.
      </p>
      <Button onClick={goHome} size="lg">
        🏠 Home
      </Button>
    </Shell>
  )
}

export function MpPlayerScreen() {
  const code = useMpStore((s) => s.code)
  const uid = useMpStore((s) => s.uid)
  const identity = useMpStore((s) => s.identity)

  if (!code || !uid) return <NotInGame />
  return <ActivePlayer code={code} uid={uid} identity={identity} />
}

interface ActivePlayerProps {
  code: string
  uid: string
  identity: PlayerIdentity | null
}

function ActivePlayer({ code, uid, identity }: ActivePlayerProps) {
  const setScreen = useGame((s) => s.setScreen)
  const { play } = useAudio()
  const game = usePlayerGame(code, uid, identity)
  const {
    status,
    pacing,
    questionIndex,
    totalQuestions,
    question,
    players,
    me,
    myRank,
    myAnswer,
    answer,
  } = game

  const setNotice = useGame((s) => s.setNotice)

  // Leave the room for good (removes you from the lobby), drop the connection,
  // and go home.
  const leave = () => {
    clearSession()
    useMpStore.getState().reset()
    setScreen('home')
    leaveRoom(code, uid)
      .catch(() => {})
      .finally(() => disconnectDb())
  }

  // If the host ends/stops the game (the room is deleted), bounce every player
  // back home with a notification — no dead-end "closed" screen to tap through.
  const closedHandledRef = useRef(false)
  useEffect(() => {
    if (status !== 'closed' || closedHandledRef.current) return
    closedHandledRef.current = true
    setNotice('The host ended the game 👋')
    clearSession()
    disconnectDb()
    useMpStore.getState().reset()
    setScreen('home')
  }, [status, setNotice, setScreen])

  // ── One-time guards keyed by question / finish so sounds fire once ──
  const revealSoundFor = useRef<number | null>(null)
  const finishFired = useRef(false)

  useEffect(() => {
    if (status !== 'reveal' || !question) return
    if (revealSoundFor.current === question.index) return
    revealSoundFor.current = question.index
    if (myAnswer?.correct) {
      fireConfetti()
      play('correct')
    } else if (myAnswer) {
      play('wrong')
    }
  }, [status, question, myAnswer, play])

  useEffect(() => {
    // Reset the guard when a new game starts (host hit "Play Again") so the
    // celebration can fire again next time we finish.
    if (status !== 'finished') {
      finishFired.current = false
      return
    }
    if (finishFired.current) return
    finishFired.current = true
    if (myRank === 1) {
      fireConfetti()
      play('victory')
    }
  }, [status, myRank, play])

  // ── Live countdown: the question timer (timed) or the speed-bonus window
  //    (manual mode still rewards quick answers for ~30s). ──
  const [remaining, setRemaining] = useState<number | null>(null)
  useEffect(() => {
    if (status !== 'question' || !question) {
      setRemaining(null)
      return
    }
    const windowSec = pacing === 'timed' ? question.timerSeconds : MANUAL_BONUS_WINDOW
    const compute = () =>
      Math.max(0, windowSec - (Date.now() - question.startedAt) / 1000)
    setRemaining(compute())
    const id = window.setInterval(() => setRemaining(compute()), 200)
    return () => window.clearInterval(id)
  }, [status, pacing, question])

  // ── Render per status ──

  if (status === 'connecting') {
    return (
      <Shell>
        <motion.div
          className="text-6xl"
          animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 1.2, repeat: Infinity }}
        >
          📡
        </motion.div>
        <h1 className="font-display text-4xl font-bold">Joining…</h1>
      </Shell>
    )
  }

  if (status === 'closed') {
    // The effect above navigates home with a notice; this is just a brief frame.
    return (
      <Shell>
        <div className="text-6xl">👋</div>
        <h1 className="font-display text-2xl font-bold">Leaving…</h1>
      </Shell>
    )
  }

  if (status === 'lobby') {
    return (
      <Shell>
        <motion.div
          className="text-7xl"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={spring}
        >
          {me?.emoji ?? '🎮'}
        </motion.div>
        <h1
          className="font-display text-4xl font-bold"
          style={{ color: me?.color }}
        >
          {me?.name ?? 'You'}
        </h1>
        <p className="font-display text-2xl font-bold">You&apos;re in! 🎉</p>
        <p className="font-body text-lg text-white/70">
          Waiting for the host to start…
        </p>
        <Card className="flex w-full flex-col gap-3">
          <p className="font-display text-lg font-bold text-white/70">
            {players.length} in the room
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <AnimatePresence>
              {players.map((p) => {
                const offline = p.connected === false
                const isMe = p.id === uid
                return (
                  <motion.div
                    key={p.id}
                    layout
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: offline ? 0.45 : 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    transition={spring}
                    className={[
                      'flex items-center gap-2 rounded-full border py-1.5 pl-1.5 pr-3',
                      isMe
                        ? 'border-white/60 bg-white/15'
                        : 'border-white/15 bg-white/5',
                    ].join(' ')}
                  >
                    <span
                      className="flex h-8 w-8 items-center justify-center rounded-full text-lg"
                      style={{ backgroundColor: p.color }}
                      aria-hidden
                    >
                      {p.emoji}
                    </span>
                    <span className="max-w-[8rem] truncate font-display text-sm font-bold text-white">
                      {p.name}
                      {isMe && <span className="text-white/60"> (you)</span>}
                    </span>
                    {offline && (
                      <span className="text-xs" title="reconnecting" aria-label="reconnecting">
                        ⚠
                      </span>
                    )}
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        </Card>
        <Button variant="ghost" onClick={leave}>
          🚪 Leave Room
        </Button>
      </Shell>
    )
  }

  if (status === 'finished') {
    const top3 = players.slice(0, 3)
    const medals = ['🥇', '🥈', '🥉']
    return (
      <Shell>
        <motion.div
          className="text-7xl"
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={spring}
        >
          {me?.emoji ?? '🎉'}
        </motion.div>
        <h1 className="font-display text-5xl font-bold">
          You finished #{myRank}!
        </h1>
        <p className="font-display text-2xl font-bold" style={{ color: me?.color }}>
          {me?.score ?? 0} pts
        </p>
        <Card className="flex w-full flex-col gap-3">
          <p className="font-display text-lg font-bold text-white/70">Podium</p>
          {top3.map((p, i) => (
            <div
              key={p.id}
              className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3"
            >
              <span className="flex items-center gap-3">
                <span className="text-2xl">{medals[i]}</span>
                <span className="text-2xl">{p.emoji}</span>
                <span
                  className="font-display text-lg font-bold"
                  style={{ color: p.color }}
                >
                  {p.name}
                </span>
              </span>
              <span className="font-display text-lg font-bold">{p.score}</span>
            </div>
          ))}
        </Card>
        {/* Players used to bail here, not realizing the host can rematch in
            this same room — make "stick around" the default. */}
        <motion.p
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 1.8, repeat: Infinity }}
          className="max-w-xs font-body text-base font-semibold text-white/70"
        >
          🔁 Stick around — if the host starts another round, you&apos;ll jump
          back in automatically.
        </motion.p>
        <Button variant="ghost" onClick={leave}>
          🚪 Done playing? Leave room
        </Button>
      </Shell>
    )
  }

  // ── 'question' and 'reveal' both need the question ──
  if (!question) {
    return (
      <Shell>
        <motion.div
          className="text-6xl"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.2, repeat: Infinity }}
        >
          ⏳
        </motion.div>
        <h1 className="font-display text-3xl font-bold">Get ready…</h1>
      </Shell>
    )
  }

  const isReveal = status === 'reveal'
  const locked = myAnswer !== undefined

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 py-4">
      {/* ── Header: progress + timer ── */}
      <div className="flex items-center justify-between font-display text-sm font-bold text-white/70">
        <span>
          Question {questionIndex + 1}
          {totalQuestions > 0 ? ` of ${totalQuestions}` : ''}
        </span>
        {pacing === 'timed' && remaining !== null && status === 'question' && (
          <motion.span
            key={Math.ceil(remaining)}
            initial={{ scale: 1.3 }}
            animate={{ scale: 1 }}
            className={[
              'rounded-full px-3 py-1 font-display text-base tabular-nums',
              remaining <= 5
                ? 'bg-red-500/30 text-red-200'
                : 'bg-white/10 text-white',
            ].join(' ')}
          >
            {Math.ceil(remaining)}s
          </motion.span>
        )}
        {pacing === 'manual' &&
          remaining !== null &&
          remaining > 0 &&
          status === 'question' &&
          !locked && (
            <motion.span
              initial={{ scale: 1.2 }}
              animate={{ scale: 1 }}
              className="rounded-full bg-sunny/25 px-3 py-1 font-display text-base tabular-nums text-sunny"
              title="Answer quickly for bonus points"
            >
              ⚡ +{Math.round((remaining / MANUAL_BONUS_WINDOW) * 100)}
            </motion.span>
          )}
      </div>

      {/* ── Prompt ── */}
      <Card>
        <p className="font-display text-2xl font-bold leading-snug">
          {question.prompt}
        </p>
      </Card>

      {/* ── Answer tiles ── */}
      <div className="flex flex-col gap-3">
        {question.options.map((opt, i) => {
          const color = ANSWER_COLORS[i % ANSWER_COLORS.length]
          const picked = myAnswer?.optionIndex === i
          const isCorrectOption =
            isReveal && question.correctIndex === i
          const dim =
            (locked && !picked && !isReveal) ||
            (isReveal && !isCorrectOption && !picked)

          const handleTap = () => {
            if (locked || isReveal || status !== 'question') return
            play('select')
            answer(i)
          }

          return (
            <motion.button
              key={i}
              type="button"
              onClick={handleTap}
              disabled={locked || isReveal || status !== 'question'}
              whileTap={
                locked || isReveal ? undefined : { scale: 0.96, y: 3 }
              }
              animate={{
                opacity: dim ? 0.4 : 1,
                scale: picked && !isReveal ? 1.03 : 1,
              }}
              transition={spring}
              className={[
                'flex w-full items-center gap-4 rounded-2xl px-5 py-5 text-left',
                'font-display text-lg font-bold text-white shadow-playful',
                'outline-none focus-visible:ring-4 focus-visible:ring-white/50',
                picked && !isReveal ? 'ring-4 ring-white' : '',
                isCorrectOption ? 'ring-4 ring-white' : '',
              ].join(' ')}
              style={{ backgroundColor: color }}
            >
              <span className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-black/25 text-xl">
                {ANSWER_LETTERS[i] ?? i + 1}
              </span>
              <span className="flex-1">{opt}</span>
              {isCorrectOption && <span className="text-2xl">✓</span>}
              {isReveal && picked && !isCorrectOption && (
                <span className="text-2xl">✗</span>
              )}
            </motion.button>
          )
        })}
      </div>

      {/* ── Feedback banner ── */}
      <AnimatePresence mode="wait">
        {status === 'question' && locked && (
          <motion.div
            key="locked"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={spring}
            className="rounded-2xl bg-white/10 px-4 py-3 text-center font-display text-lg font-bold"
          >
            Locked in! ✓ — waiting for others…
          </motion.div>
        )}

        {isReveal && (
          <motion.div
            key="reveal"
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={spring}
            className="flex flex-col items-center gap-2"
          >
            {!myAnswer ? (
              <p className="font-display text-3xl font-bold text-white/80">
                Time&apos;s up! ⏰
              </p>
            ) : myAnswer.correct ? (
              <p className="font-display text-4xl font-bold text-mint">
                Correct! ✓ +{myAnswer.awarded ?? 0}
              </p>
            ) : (
              <>
                <p className="font-display text-4xl font-bold text-red-400">
                  Not quite 😅
                </p>
                {question.correctIndex !== null && (
                  <p className="font-body text-base text-white/70">
                    Answer:{' '}
                    <span className="font-bold text-white">
                      {question.options[question.correctIndex]}
                    </span>
                  </p>
                )}
              </>
            )}
            <div className="mt-1 flex flex-col items-center gap-1 font-display text-lg font-bold">
              <span>Your score: {me?.score ?? 0}</span>
              <span className="text-white/70">
                Rank: #{myRank} of {players.length}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
