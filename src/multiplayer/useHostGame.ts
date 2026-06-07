import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Question } from '../types'
import type {
  Pacing,
  PlayerAnswer,
  RoomMeta,
  RoomPlayer,
  RoomQuestion,
  RoomStatus,
} from './types'
import {
  createRoom,
  pushQuestion,
  revealQuestion,
  finishGame,
  restartRoom,
  closeRoom,
  removePlayer,
  subscribeMeta,
  subscribePlayers,
  subscribeQuestion,
  subscribeQuestionAnswers,
} from './room'
import { scoreAnswer } from './scoring'

export interface HostPlayer extends RoomPlayer {
  id: string
}

export interface HostGame {
  code: string | null
  status: RoomStatus | 'creating'
  error: string | null
  currentIndex: number
  currentQuestion: Question | undefined
  totalQuestions: number
  players: HostPlayer[] // sorted by score desc
  answeredCount: number
  isLast: boolean
  start: () => void
  reveal: () => void
  next: () => void
  end: () => void
  /** Replay in the same room: keep players, reset scores, back to lobby.
   *  Pass the new deck length (the caller swaps in a fresh deck). */
  restart: (newTotalQuestions: number) => void
  close: () => void
}

const REVEAL_AUTO_NEXT_MS = 4500
// Remove a player who has been offline this long (closed tab / really left). A
// blip reconnects within a second or two, so it comfortably survives this.
const DISCONNECT_GRACE_MS = 45000

/**
 * Host-authoritative game controller. The host holds the full deck (with the
 * correct answers), pushes the public question into the room, scores incoming
 * answers, and — in timed mode — auto-reveals and auto-advances. It listens only
 * to meta, players, the current question, and the CURRENT question's answers.
 */
export function useHostGame(
  deck: Question[],
  opts: { pacing: Pacing; timerSeconds: number },
): HostGame {
  const [code, setCode] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [meta, setMeta] = useState<RoomMeta | null>(null)
  const [playersMap, setPlayersMap] = useState<Record<string, RoomPlayer>>({})
  const [question, setQuestion] = useState<RoomQuestion | null>(null)
  const [curAnswers, setCurAnswers] = useState<Record<string, PlayerAnswer>>({})

  const deckRef = useRef(deck)
  deckRef.current = deck
  const optsRef = useRef(opts)
  optsRef.current = opts

  // Latest live state in refs so the action callbacks stay stable.
  const metaRef = useRef<RoomMeta | null>(null)
  metaRef.current = meta
  const playersMapRef = useRef<Record<string, RoomPlayer>>({})
  playersMapRef.current = playersMap
  const questionRef = useRef<RoomQuestion | null>(null)
  questionRef.current = question
  const curAnswersRef = useRef<Record<string, PlayerAnswer>>({})
  curAnswersRef.current = curAnswers

  // Create the room once, then subscribe to its slices.
  const createdRef = useRef(false)
  useEffect(() => {
    if (createdRef.current) return
    createdRef.current = true
    const unsubs: Array<() => void> = []
    createRoom({
      pacing: opts.pacing,
      timerSeconds: opts.timerSeconds,
      totalQuestions: deck.length,
    })
      .then(({ code }) => {
        setCode(code)
        unsubs.push(subscribeMeta(code, setMeta))
        unsubs.push(subscribePlayers(code, setPlayersMap))
        unsubs.push(subscribeQuestion(code, setQuestion))
      })
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : 'Could not create the room.'),
      )
    return () => unsubs.forEach((u) => u())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const status: RoomStatus | 'creating' = meta?.status ?? 'creating'
  const currentIndex = meta?.questionIndex ?? -1
  const currentQuestion = currentIndex >= 0 ? deck[currentIndex] : undefined
  const totalQuestions = deck.length
  const isLast = currentIndex >= 0 && currentIndex + 1 >= totalQuestions

  // Only the current question's answers (re-subscribes as the question advances).
  useEffect(() => {
    if (!code || currentIndex < 0) {
      setCurAnswers({})
      return
    }
    return subscribeQuestionAnswers(code, currentIndex, setCurAnswers)
  }, [code, currentIndex])

  const players = useMemo<HostPlayer[]>(
    () =>
      Object.entries(playersMap)
        .map(([id, p]) => ({ id, ...p }))
        .sort((a, b) => b.score - a.score),
    [playersMap],
  )

  const answeredCount = currentIndex < 0 ? 0 : Object.keys(curAnswers).length

  const pushIndex = useCallback(
    (index: number) => {
      if (!code) return
      const q = deckRef.current[index]
      if (!q) return
      void pushQuestion(code, {
        index,
        prompt: q.prompt,
        options: q.options,
        category: q.category,
        difficulty: q.difficulty,
        type: q.type,
        timerSeconds: optsRef.current.timerSeconds,
      })
    },
    [code],
  )

  const start = useCallback(() => pushIndex(0), [pushIndex])

  // Guards so the timed automation never reveals/advances the same phase twice.
  const revealedForRef = useRef(-1)
  const advancedFromRef = useRef(-1)

  const reveal = useCallback(() => {
    if (!code) return
    const m = metaRef.current
    if (!m || m.status !== 'question') return
    const idx = m.questionIndex
    if (revealedForRef.current === idx) return
    revealedForRef.current = idx
    const q = deckRef.current[idx]
    if (!q) return
    const answers = curAnswersRef.current
    const playerMap = playersMapRef.current
    const startedAt = questionRef.current?.startedAt ?? 0
    const newScores: Record<string, number> = {}
    const results: Record<string, { correct: boolean; awarded: number }> = {}
    for (const [uid, ans] of Object.entries(answers)) {
      // Only score players still present — never resurrect a deleted player as
      // a nameless "ghost" by writing a score for an unknown id.
      if (!playerMap[uid]) continue
      const correct = ans.optionIndex === q.correctIndex
      const awarded = scoreAnswer({
        correct,
        difficulty: q.difficulty,
        pacing: m.pacing,
        timerSeconds: m.timerSeconds,
        startedAt,
        answeredAt: ans.answeredAt,
      })
      results[uid] = { correct, awarded }
      newScores[uid] = (playerMap[uid]?.score ?? 0) + awarded
    }
    void revealQuestion(code, idx, q.correctIndex, newScores, results)
  }, [code])

  const next = useCallback(() => {
    if (!code) return
    const m = metaRef.current
    if (!m) return
    if (advancedFromRef.current === m.questionIndex) return
    advancedFromRef.current = m.questionIndex
    const ni = m.questionIndex + 1
    if (ni >= deckRef.current.length) void finishGame(code)
    else pushIndex(ni)
  }, [code, pushIndex])

  const end = useCallback(() => {
    if (code) void finishGame(code)
  }, [code])

  const restart = useCallback(
    (newTotalQuestions: number) => {
      if (!code) return
      revealedForRef.current = -1
      advancedFromRef.current = -1
      const ids = Object.keys(playersMapRef.current)
      void restartRoom(code, ids, newTotalQuestions)
    },
    [code],
  )

  const close = useCallback(() => {
    if (code) void closeRoom(code)
  }, [code])

  // Drop players who have been offline past the grace period (left for good),
  // while still surviving brief blips. Runs only while we have a room.
  useEffect(() => {
    if (!code) return
    const sweep = () => {
      const now = Date.now()
      for (const [uid, p] of Object.entries(playersMapRef.current)) {
        if (
          p.connected === false &&
          typeof p.disconnectedAt === 'number' &&
          now - p.disconnectedAt > DISCONNECT_GRACE_MS
        ) {
          void removePlayer(code, uid)
        }
      }
    }
    const id = window.setInterval(sweep, 10000)
    return () => window.clearInterval(id)
  }, [code])

  // ── Timed-mode automation ──────────────────────────────────────────────────
  useEffect(() => {
    if (!meta || meta.pacing !== 'timed') return

    if (meta.status === 'question') {
      const startedAt = question?.startedAt
      // Count only connected players — a dropped player shouldn't block reveal.
      const activeCount = Object.values(playersMap).filter(
        (p) => p.connected !== false,
      ).length
      const numAnswers = Object.keys(curAnswers).length
      if (activeCount > 0 && numAnswers >= activeCount) {
        reveal()
        return
      }
      if (startedAt) {
        const msLeft = meta.timerSeconds * 1000 - (Date.now() - startedAt)
        const t = window.setTimeout(reveal, Math.max(0, msLeft) + 250)
        return () => window.clearTimeout(t)
      }
    }

    if (meta.status === 'reveal') {
      const t = window.setTimeout(next, REVEAL_AUTO_NEXT_MS)
      return () => window.clearTimeout(t)
    }
  }, [meta, question, playersMap, curAnswers, reveal, next])

  return {
    code,
    status,
    error,
    currentIndex,
    currentQuestion,
    totalQuestions,
    players,
    answeredCount,
    isLast,
    start,
    reveal,
    next,
    end,
    restart,
    close,
  }
}
