// ─── Shared type contracts for the whole app ───────────────────────────────

export type Screen =
  | 'home'
  | 'mode' // pick single-device vs multiplayer
  | 'setup'
  | 'config'
  | 'playing'
  | 'roundScore'
  | 'results'
  | 'library'
  // ── Multiplayer (host + players on their phones) ──
  | 'mpHostSetup' // host configures the game
  | 'mpHost' // host screen: lobby → questions → results
  | 'mpJoin' // player enters room code + name
  | 'mpPlayer' // player screen: lobby → answer → results

export type Difficulty = 'easy' | 'medium' | 'hard'
export type QuestionType = 'mc' | 'tf'

export interface Question {
  id: string
  category: string
  difficulty: Difficulty
  type: QuestionType
  prompt: string
  /** Answer options. For 'tf' this is ['True', 'False']. For 'mc', 2–4 options. */
  options: string[]
  /** Index into `options` of the correct answer. */
  correctIndex: number
}

export interface Player {
  id: string
  name: string
  emoji: string
  color: string // hex
  score: number
}

export interface GameConfig {
  categories: string[] // selected category names; empty = all
  difficulties: Difficulty[] // selected difficulties; empty = all
  questionCount: number // total questions in the game
  timerEnabled: boolean
  timerSeconds: number
  pacing: 'timed' | 'manual' // multiplayer: auto-advance on a timer vs host taps next
}

export interface GameState {
  // ── Navigation ──
  screen: Screen
  setScreen: (s: Screen) => void

  // ── Transient global notice (e.g. "the host ended the game") ──
  notice: string | null
  setNotice: (n: string | null) => void

  // ── Players ──
  players: Player[]
  addPlayer: (name: string, emoji: string, color: string) => void
  updatePlayer: (id: string, patch: Partial<Omit<Player, 'id'>>) => void
  removePlayer: (id: string) => void
  reorderPlayers: (from: number, to: number) => void

  // ── Question library ──
  questions: Question[]
  addQuestion: (q: Omit<Question, 'id'>) => void
  updateQuestion: (id: string, patch: Partial<Omit<Question, 'id'>>) => void
  removeQuestion: (id: string) => void
  importQuestions: (qs: Question[], replace: boolean) => void
  resetQuestionsToStarter: () => void

  // ── Config ──
  config: GameConfig
  setConfig: (patch: Partial<GameConfig>) => void

  // ── Active game ──
  /** Question snapshots for the current game, in play order (options
   *  pre-shuffled per game, correctIndex remapped to match). */
  deck: Question[]
  currentIndex: number
  /** Index of the player whose turn it is. */
  activePlayerIndex: number
  /** The locked-in answer option index for the current question (null = unanswered). */
  selectedAnswer: number | null
  revealed: boolean

  startGame: () => void
  selectAnswer: (optionIndex: number) => void
  reveal: () => void
  nextQuestion: () => void
  playAgain: () => void
  resetGame: () => void
}

// Helper: the full category list derived from a question set.
export const ALL_CATEGORIES_KEY = '__all__'
