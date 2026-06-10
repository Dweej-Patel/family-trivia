import type { Question } from '../types'

// The default question bank is stored as data in `starterQuestions.json`
// (~966 fact-checked questions across 12 categories, calibrated easy/medium/hard,
// one entry per line for clean diffs). At ~210 kB it's the heaviest module in the
// app, so it's loaded with a dynamic import — Vite splits it into its own cached
// chunk and the main bundle (which every player downloads just to tap answers)
// stays small.
let cache: Question[] | null = null

export async function loadStarterQuestions(): Promise<Question[]> {
  if (!cache) {
    const m = await import('./starterQuestions.json')
    cache = m.default as unknown as Question[]
  }
  return cache
}
