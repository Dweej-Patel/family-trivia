import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  PlayerAnswer,
  Pacing,
  PlayerIdentity,
  RoomPlayer,
  RoomQuestion,
  RoomSnapshot,
  RoomStatus,
} from './types'
import {
  subscribeRoom,
  submitAnswer,
  establishPresence,
  onConnectionChange,
} from './room'

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

/** Player-side view of a room: subscribe to state, submit answers, and keep the
 *  player's presence alive across momentary network drops. */
export function usePlayerGame(
  code: string,
  uid: string,
  identity?: PlayerIdentity | null,
): PlayerGame {
  const [snapshot, setSnapshot] = useState<RoomSnapshot | null>(null)
  const [closed, setClosed] = useState(false)

  useEffect(() => {
    const unsub = subscribeRoom(code, (s) => {
      if (s === null) setClosed(true)
      setSnapshot(s)
    })
    return () => unsub()
  }, [code])

  // Robustness: whenever Firebase (re)connects, re-assert our presence — mark
  // ourselves online, restore identity if the node was lost, and re-arm the
  // offline-on-disconnect flag. This survives blips without losing name/score.
  const identityRef = useRef(identity)
  identityRef.current = identity
  useEffect(() => {
    const unsub = onConnectionChange((connected) => {
      if (connected && identityRef.current) {
        void establishPresence(code, uid, identityRef.current)
      }
    })
    return () => unsub()
  }, [code, uid])

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
