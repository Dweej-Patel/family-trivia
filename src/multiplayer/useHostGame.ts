import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Question } from '../types'
import type { Pacing, RoomPlayer, RoomSnapshot, RoomStatus } from './types'
import {
  createRoom,
  pushQuestion,
  revealQuestion,
  finishGame,
  closeRoom,
  subscribeRoom,
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
  close: () => void
}

const REVEAL_AUTO_NEXT_MS = 4500

/**
 * Host-authoritative game controller. The host holds the full deck (with the
 * correct answers), pushes the public question into the room, scores incoming
 * answers, and — in timed mode — auto-reveals and auto-advances.
 */
export function useHostGame(
  deck: Question[],
  opts: { pacing: Pacing; timerSeconds: number },
): HostGame {
  const [code, setCode] = useState<string | null>(null)
  const [snapshot, setSnapshot] = useState<RoomSnapshot | null>(null)
  const [error, setError] = useState<string | null>(null)

  const deckRef = useRef(deck)
  deckRef.current = deck
  const optsRef = useRef(opts)
  optsRef.current = opts

  // Create the room exactly once, then subscribe to it.
  const createdRef = useRef(false)
  useEffect(() => {
    if (createdRef.current) return
    createdRef.current = true
    let unsub: (() => void) | undefined
    createRoom({
      pacing: opts.pacing,
      timerSeconds: opts.timerSeconds,
      totalQuestions: deck.length,
    })
      .then(({ code }) => {
        setCode(code)
        unsub = subscribeRoom(code, setSnapshot)
      })
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : 'Could not create the room.'),
      )
    return () => unsub?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const meta = snapshot?.meta
  const status: RoomStatus | 'creating' = meta?.status ?? 'creating'
  const currentIndex = meta?.questionIndex ?? -1
  const currentQuestion = currentIndex >= 0 ? deck[currentIndex] : undefined
  const totalQuestions = deck.length
  const isLast = currentIndex >= 0 && currentIndex + 1 >= totalQuestions

  const players = useMemo<HostPlayer[]>(() => {
    const raw = snapshot?.players ?? {}
    return Object.entries(raw)
      .map(([id, p]) => ({ id, ...p }))
      .sort((a, b) => b.score - a.score)
  }, [snapshot])

  const answeredCount = useMemo(() => {
    if (currentIndex < 0) return 0
    return Object.keys(snapshot?.answers?.[currentIndex] ?? {}).length
  }, [snapshot, currentIndex])

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
    if (!code || !snapshot || !meta || meta.status !== 'question') return
    const idx = meta.questionIndex
    if (revealedForRef.current === idx) return
    revealedForRef.current = idx
    const q = deckRef.current[idx]
    if (!q) return
    const answers = snapshot.answers?.[idx] ?? {}
    const playersMap = snapshot.players ?? {}
    const startedAt = snapshot.question?.startedAt ?? 0
    const newScores: Record<string, number> = {}
    const results: Record<string, { correct: boolean; awarded: number }> = {}
    for (const [uid, ans] of Object.entries(answers)) {
      const correct = ans.optionIndex === q.correctIndex
      const awarded = scoreAnswer({
        correct,
        difficulty: q.difficulty,
        pacing: meta.pacing,
        timerSeconds: meta.timerSeconds,
        startedAt,
        answeredAt: ans.answeredAt,
      })
      results[uid] = { correct, awarded }
      newScores[uid] = (playersMap[uid]?.score ?? 0) + awarded
    }
    void revealQuestion(code, idx, q.correctIndex, newScores, results)
  }, [code, snapshot, meta])

  const next = useCallback(() => {
    if (!code || !meta) return
    const ni = meta.questionIndex + 1
    if (advancedFromRef.current === meta.questionIndex) return
    advancedFromRef.current = meta.questionIndex
    if (ni >= deckRef.current.length) void finishGame(code)
    else pushIndex(ni)
  }, [code, meta, pushIndex])

  const end = useCallback(() => {
    if (code) void finishGame(code)
  }, [code])

  const close = useCallback(() => {
    if (code) void closeRoom(code)
  }, [code])

  // ── Timed-mode automation ──────────────────────────────────────────────────
  useEffect(() => {
    if (!meta || meta.pacing !== 'timed') return

    if (meta.status === 'question') {
      const startedAt = snapshot?.question?.startedAt
      const numPlayers = Object.keys(snapshot?.players ?? {}).length
      const numAnswers = Object.keys(snapshot?.answers?.[meta.questionIndex] ?? {}).length
      // Everyone's in → reveal immediately.
      if (numPlayers > 0 && numAnswers >= numPlayers) {
        reveal()
        return
      }
      // Otherwise reveal when the clock runs out.
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
  }, [meta, snapshot, reveal, next])

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
    close,
  }
}
