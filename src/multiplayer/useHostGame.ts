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
  roomExists,
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
import { useMpStore } from './mpStore'
import { saveHostSession, clearHostSession } from './session'

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
  connectedCount: number // players currently online
  isLast: boolean
  start: () => void
  reveal: () => void
  next: () => void
  end: () => void
  /** Replay in the same room: keep players, reset scores, back to lobby.
   *  Pass the new deck length (the caller swaps in a fresh deck); the latest
   *  pacing/timer settings are re-applied to the room at the same time. */
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
  // Answers are tagged with the question index they belong to, so a lagging
  // subscription from the previous question can never be mistaken for the
  // current one (which would auto-reveal the new question instantly).
  const [curAnswers, setCurAnswers] = useState<{
    qi: number
    answers: Record<string, PlayerAnswer>
  }>({ qi: -1, answers: {} })

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
  const curAnswersRef = useRef<{
    qi: number
    answers: Record<string, PlayerAnswer>
  }>({ qi: -1, answers: {} })
  curAnswersRef.current = curAnswers

  // Attach to the room once, then subscribe to its slices. If this device is
  // already hosting a room (e.g. the host went back to edit settings and
  // returned), re-attach to THAT room so the players stay in their lobby;
  // otherwise create a fresh one.
  const createdRef = useRef(false)
  useEffect(() => {
    if (createdRef.current) return
    createdRef.current = true
    const unsubs: Array<() => void> = []
    const subscribe = (code: string) => {
      setCode(code)
      unsubs.push(subscribeMeta(code, setMeta))
      unsubs.push(subscribePlayers(code, setPlayersMap))
      unsubs.push(subscribeQuestion(code, setQuestion))
    }
    const attach = async () => {
      const existing = useMpStore.getState().hostRoomCode
      if (existing && (await roomExists(existing).catch(() => false))) {
        subscribe(existing)
        return
      }
      const { code } = await createRoom({
        pacing: optsRef.current.pacing,
        timerSeconds: optsRef.current.timerSeconds,
        totalQuestions: deckRef.current.length,
      })
      useMpStore.getState().setHostRoomCode(code)
      subscribe(code)
    }
    attach().catch((e: unknown) =>
      setError(e instanceof Error ? e.message : 'Could not create the room.'),
    )
    return () => unsubs.forEach((u) => u())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Keep the per-tab host session current (room + deck + settings) so a reload
  // resumes hosting this room — mirroring how a player's session survives.
  useEffect(() => {
    if (!code) return
    saveHostSession({
      code,
      deck,
      pacing: opts.pacing,
      timerSeconds: opts.timerSeconds,
    })
  }, [code, deck, opts.pacing, opts.timerSeconds])

  const status: RoomStatus | 'creating' = meta?.status ?? 'creating'
  const currentIndex = meta?.questionIndex ?? -1
  const currentQuestion = currentIndex >= 0 ? deck[currentIndex] : undefined
  const totalQuestions = deck.length
  const isLast = currentIndex >= 0 && currentIndex + 1 >= totalQuestions

  // Only the current question's answers (re-subscribes as the question advances).
  useEffect(() => {
    if (!code || currentIndex < 0) {
      setCurAnswers({ qi: currentIndex, answers: {} })
      return
    }
    const qi = currentIndex
    return subscribeQuestionAnswers(code, qi, (answers) =>
      setCurAnswers({ qi, answers }),
    )
  }, [code, currentIndex])

  const players = useMemo<HostPlayer[]>(
    () =>
      Object.entries(playersMap)
        .map(([id, p]) => ({ id, ...p }))
        .sort((a, b) => b.score - a.score),
    [playersMap],
  )

  const answeredCount =
    curAnswers.qi === currentIndex ? Object.keys(curAnswers.answers).length : 0
  const connectedCount = players.filter((p) => p.connected !== false).length

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
    // Only use answers that belong to THIS question (never a stale prior set).
    const answers =
      curAnswersRef.current.qi === idx ? curAnswersRef.current.answers : {}
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
      // Read straight from the store: the caller swaps in the new session right
      // before calling restart, and (unlike props/refs) the store is already
      // up to date within the same event handler.
      const { hostPacing, hostTimerSeconds } = useMpStore.getState()
      void restartRoom(code, ids, {
        totalQuestions: newTotalQuestions,
        pacing: hostPacing,
        timerSeconds: hostTimerSeconds,
      })
    },
    [code],
  )

  const close = useCallback(() => {
    if (!code) return
    useMpStore.getState().setHostRoomCode(null)
    clearHostSession()
    void closeRoom(code)
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
      // Only count answers that belong to the CURRENT question.
      const numAnswers =
        curAnswers.qi === meta.questionIndex
          ? Object.keys(curAnswers.answers).length
          : 0
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
    connectedCount,
    isLast,
    start,
    reveal,
    next,
    end,
    restart,
    close,
  }
}
