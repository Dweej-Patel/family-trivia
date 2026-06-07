import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  PlayerAnswer,
  Pacing,
  PlayerIdentity,
  RoomMeta,
  RoomPlayer,
  RoomQuestion,
  RoomStatus,
} from './types'
import {
  subscribeMeta,
  subscribeQuestion,
  subscribePlayers,
  subscribePlayerAnswer,
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

/**
 * Player-side view of a room. Listens only to the slices a player needs — meta,
 * the current question, the players list, and their OWN answer — so they never
 * download other players' answers or the whole room on every change. Also keeps
 * presence alive across momentary network drops.
 */
export function usePlayerGame(
  code: string,
  uid: string,
  identity?: PlayerIdentity | null,
): PlayerGame {
  const [meta, setMeta] = useState<RoomMeta | null>(null)
  const [question, setQuestion] = useState<RoomQuestion | null>(null)
  const [playersMap, setPlayersMap] = useState<Record<string, RoomPlayer>>({})
  const [myAnswer, setMyAnswer] = useState<PlayerAnswer | undefined>(undefined)
  const [closed, setClosed] = useState(false)
  const hadMeta = useRef(false)

  // Meta drives status + question index. Meta going null *after* it existed
  // means the host deleted the room → we're closed.
  useEffect(() => {
    return subscribeMeta(code, (m) => {
      if (m) hadMeta.current = true
      else if (hadMeta.current) setClosed(true)
      setMeta(m)
    })
  }, [code])

  useEffect(() => subscribeQuestion(code, setQuestion), [code])
  useEffect(() => subscribePlayers(code, setPlayersMap), [code])

  const questionIndex = meta?.questionIndex ?? -1

  // Only our own answer for the current question.
  useEffect(() => {
    if (questionIndex < 0) {
      setMyAnswer(undefined)
      return
    }
    return subscribePlayerAnswer(code, questionIndex, uid, (a) =>
      setMyAnswer(a ?? undefined),
    )
  }, [code, uid, questionIndex])

  // Robustness: re-assert presence whenever Firebase (re)connects — restores
  // our identity if the node was lost and re-arms the offline flag.
  const identityRef = useRef(identity)
  identityRef.current = identity
  useEffect(() => {
    return onConnectionChange((connected) => {
      if (connected && identityRef.current) {
        void establishPresence(code, uid, identityRef.current)
      }
    })
  }, [code, uid])

  const status: RoomStatus | 'connecting' | 'closed' = closed
    ? 'closed'
    : (meta?.status ?? 'connecting')

  const players = useMemo<PlayerEntry[]>(
    () =>
      Object.entries(playersMap)
        .map(([id, p]) => ({ id, ...p }))
        .sort((a, b) => b.score - a.score),
    [playersMap],
  )

  const meIndex = players.findIndex((p) => p.id === uid)
  const me = meIndex >= 0 ? players[meIndex] : undefined
  const myRank = meIndex >= 0 ? meIndex + 1 : 0

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
