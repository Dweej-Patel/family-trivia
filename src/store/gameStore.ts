import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'
import type { GameState, GameConfig, Question } from '../types'
import { starterQuestions } from '../data/starterQuestions'
import { shuffle, uid } from '../lib/shuffle'
import { storage } from '../lib/storage'

const DEFAULT_CONFIG: GameConfig = {
  categories: [],
  difficulties: [],
  questionCount: 10,
  timerEnabled: true,
  timerSeconds: 20,
  pacing: 'timed',
}

// Seed from localStorage when present, otherwise fall back to defaults.
const initialQuestions = storage.loadQuestions() ?? starterQuestions
const initialPlayers = storage.loadPlayers() ?? []
const initialConfig = { ...DEFAULT_CONFIG, ...(storage.loadConfig() ?? {}) }

/** Apply the category/difficulty filters, never returning an empty pool. */
function filterPool(questions: Question[], config: GameConfig): Question[] {
  let pool = questions
  if (config.categories.length > 0) {
    pool = pool.filter((q) => config.categories.includes(q.category))
  }
  if (config.difficulties.length > 0) {
    pool = pool.filter((q) => config.difficulties.includes(q.difficulty))
  }
  return pool.length === 0 ? questions : pool
}

/** How many questions the current category/difficulty filters can supply —
 *  the ceiling for a custom question count. */
export function filteredPoolSize(questions: Question[], config: GameConfig): number {
  return filterPool(questions, config).length
}

/**
 * Work out a *fair* game size: every player answers the same number of
 * questions. We snap the requested total to the nearest multiple of the player
 * count, then cap it at the largest multiple the available pool can fill.
 *
 * Returns the actual `total` questions, the `perPlayer` count, and `poolSize`.
 */
export function planQuestions(
  questions: Question[],
  config: GameConfig,
  playerCount: number,
): { total: number; perPlayer: number; poolSize: number } {
  const pool = filterPool(questions, config)
  const pc = Math.max(1, playerCount) // solo play counts as 1
  const target = Math.max(1, config.questionCount)
  const perPlayerReq = Math.max(1, Math.round(target / pc))
  const desired = perPlayerReq * pc
  // Largest multiple of `pc` the pool can actually fill.
  const maxByPool = Math.floor(pool.length / pc) * pc
  // If the pool can't even give everyone one question, fall back to its size.
  const total = maxByPool >= pc ? Math.min(desired, maxByPool) : pool.length
  return { total, perPlayer: Math.floor(total / pc), poolSize: pool.length }
}

/** Pick the actual question objects for a game (filtered, shuffled, sliced to
 *  questionCount). Used by multiplayer, which is simultaneous — every player
 *  answers every question — so no per-player division is needed. */
export function selectQuestions(questions: Question[], config: GameConfig): Question[] {
  const pool = filterPool(questions, config)
  return shuffle(pool).slice(0, Math.max(1, config.questionCount))
}

/** Build the play deck — length is divisible by the player count so the turn
 *  rotation gives every player an equal number of questions. */
function buildDeck(
  questions: Question[],
  config: GameConfig,
  playerCount: number,
): string[] {
  const pool = filterPool(questions, config)
  const { total } = planQuestions(questions, config, playerCount)
  return shuffle(pool)
    .slice(0, total)
    .map((q) => q.id)
}

export const useGame = create<GameState>((set) => ({
  // ── Navigation ──
  screen: 'home',
  setScreen: (screen) => set({ screen }),

  notice: null,
  setNotice: (notice) => set({ notice }),

  // ── Players ──
  players: initialPlayers,
  addPlayer: (name, emoji, color) =>
    set((s) => {
      const players = [...s.players, { id: uid('p'), name, emoji, color, score: 0 }]
      storage.savePlayers(players)
      return { players }
    }),
  updatePlayer: (id, patch) =>
    set((s) => {
      const players = s.players.map((p) => (p.id === id ? { ...p, ...patch } : p))
      storage.savePlayers(players)
      return { players }
    }),
  removePlayer: (id) =>
    set((s) => {
      const players = s.players.filter((p) => p.id !== id)
      storage.savePlayers(players)
      return { players }
    }),
  reorderPlayers: (from, to) =>
    set((s) => {
      const players = s.players.slice()
      const [moved] = players.splice(from, 1)
      players.splice(to, 0, moved)
      storage.savePlayers(players)
      return { players }
    }),

  // ── Question library ──
  questions: initialQuestions,
  addQuestion: (q) =>
    set((s) => {
      const questions = [...s.questions, { ...q, id: uid('q') }]
      storage.saveQuestions(questions)
      return { questions }
    }),
  updateQuestion: (id, patch) =>
    set((s) => {
      const questions = s.questions.map((q) => (q.id === id ? { ...q, ...patch } : q))
      storage.saveQuestions(questions)
      return { questions }
    }),
  removeQuestion: (id) =>
    set((s) => {
      const questions = s.questions.filter((q) => q.id !== id)
      storage.saveQuestions(questions)
      return { questions }
    }),
  importQuestions: (qs, replace) =>
    set((s) => {
      // Ensure every imported question has an id.
      const withIds = qs.map((q) => ({ ...q, id: q.id || uid('q') }))
      const questions = replace ? withIds : [...s.questions, ...withIds]
      storage.saveQuestions(questions)
      return { questions }
    }),
  resetQuestionsToStarter: () =>
    set(() => {
      storage.saveQuestions(starterQuestions)
      return { questions: starterQuestions }
    }),

  // ── Config ──
  config: initialConfig,
  setConfig: (patch) =>
    set((s) => {
      const config = { ...s.config, ...patch }
      storage.saveConfig(config)
      return { config }
    }),

  // ── Active game ──
  deck: [],
  currentIndex: 0,
  activePlayerIndex: 0,
  selectedAnswer: null,
  revealed: false,

  startGame: () =>
    set((s) => {
      const deck = buildDeck(s.questions, s.config, s.players.length)
      const players = s.players.map((p) => ({ ...p, score: 0 }))
      storage.savePlayers(players)
      return {
        deck,
        players,
        currentIndex: 0,
        activePlayerIndex: 0,
        selectedAnswer: null,
        revealed: false,
        screen: 'playing',
      }
    }),

  selectAnswer: (optionIndex) =>
    set((s) => (s.revealed ? s : { selectedAnswer: optionIndex })),

  reveal: () =>
    set((s) => {
      if (s.revealed || s.selectedAnswer === null) return s
      const q = s.questions.find((x) => x.id === s.deck[s.currentIndex])
      const correct = q ? s.selectedAnswer === q.correctIndex : false
      let players = s.players
      if (correct && players.length > 0) {
        const diffBonus = q?.difficulty === 'hard' ? 150 : q?.difficulty === 'medium' ? 120 : 100
        players = players.map((p, i) =>
          i === s.activePlayerIndex ? { ...p, score: p.score + diffBonus } : p,
        )
        storage.savePlayers(players)
      }
      return { revealed: true, players }
    }),

  nextQuestion: () =>
    set((s) => {
      const nextIndex = s.currentIndex + 1
      const hasPlayers = s.players.length > 0
      const nextPlayer = hasPlayers ? (s.activePlayerIndex + 1) % s.players.length : 0
      if (nextIndex >= s.deck.length) {
        return { screen: 'results' as const }
      }
      // Show the running leaderboard ("halftime") when a full turn cycle completes
      // and we wrap back to the first player — but only with 2+ players.
      const showHalftime = hasPlayers && s.players.length > 1 && nextPlayer === 0
      return {
        currentIndex: nextIndex,
        activePlayerIndex: nextPlayer,
        selectedAnswer: null,
        revealed: false,
        screen: showHalftime ? ('roundScore' as const) : ('playing' as const),
      }
    }),

  playAgain: () =>
    set((s) => {
      const players = s.players.map((p) => ({ ...p, score: 0 }))
      storage.savePlayers(players)
      return {
        players,
        deck: [],
        currentIndex: 0,
        activePlayerIndex: 0,
        selectedAnswer: null,
        revealed: false,
        screen: 'config',
      }
    }),

  resetGame: () =>
    set({
      deck: [],
      currentIndex: 0,
      activePlayerIndex: 0,
      selectedAnswer: null,
      revealed: false,
    }),
}))

/** Selector helper: the current question object (or undefined). */
export function useCurrentQuestion(): Question | undefined {
  return useGame((s) => s.questions.find((q) => q.id === s.deck[s.currentIndex]))
}

/** Derive the sorted unique category list from the current library.
 *  Wrapped in `useShallow` so a new-but-equal array doesn't trigger an
 *  infinite render loop (Zustand v5 uses Object.is by default). */
export function useCategories(): string[] {
  return useGame(
    useShallow((s) => Array.from(new Set(s.questions.map((q) => q.category))).sort()),
  )
}
