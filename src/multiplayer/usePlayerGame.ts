import { useCallback, useEffect, useMemo, useState } from 'react'
import type {
  PlayerAnswer,
  Pacing,
  RoomPlayer,
  RoomQuestion,
  RoomSnapshot,
  RoomStatus,
} from './types'
import { subscribeRoom, submitAnswer } from './room'

export interface PlayerEntry extends RoomPlayer {
  id: string
}

export interface PlayerGame {
  status: RoomStatus | 'connecting' | 'closed'
  pacing: Pacing | null
  timerSeconds: number
  questionIndex: number
  totalQuestions: number
  question: RoomQuestion | null
  players: PlayerEntry[] // sorted by score desc
  me: PlayerEntry | undefined
  myRank: number // 1-based position on the leaderboard
  myAnswer: PlayerAnswer | undefined
  answer: (optionIndex: number) => void
}

/** Player-side view of a room: subscribe to state, submit answers. */
export function usePlayerGame(code: string, uid: string): PlayerGame {
  const [snapshot, setSnapshot] = useState<RoomSnapshot | null>(null)
  const [closed, setClosed] = useState(false)

  useEffect(() => {
    const unsub = subscribeRoom(code, (s) => {
      if (s === null) setClosed(true)
      setSnapshot(s)
    })
    return () => unsub()
  }, [code])

  const meta = snapshot?.meta
  const status: RoomStatus | 'connecting' | 'closed' = closed
    ? 'closed'
    : (meta?.status ?? 'connecting')
  const questionIndex = meta?.questionIndex ?? -1
  const question = snapshot?.question ?? null

  const players = useMemo<PlayerEntry[]>(() => {
    const raw = snapshot?.players ?? {}
    return Object.entries(raw)
      .map(([id, p]) => ({ id, ...p }))
      .sort((a, b) => b.score - a.score)
  }, [snapshot])

  const meIndex = players.findIndex((p) => p.id === uid)
  const me = meIndex >= 0 ? players[meIndex] : undefined
  const myRank = meIndex >= 0 ? meIndex + 1 : 0
  const myAnswer =
    questionIndex >= 0 ? snapshot?.answers?.[questionIndex]?.[uid] : undefined

  const answer = useCallback(
    (optionIndex: number) => {
      if (questionIndex < 0) return
      void submitAnswer(code, questionIndex, uid, optionIndex)
    },
    [code, uid, questionIndex],
  )

  return {
    status,
    pacing: meta?.pacing ?? null,
    timerSeconds: meta?.timerSeconds ?? 0,
    questionIndex,
    totalQuestions: meta?.totalQuestions ?? 0,
    question,
    players,
    me,
    myRank,
    myAnswer,
    answer,
  }
}
