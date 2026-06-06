import type { Question } from '../types'
import starterData from './starterQuestions.json'

// The default question bank is stored as data in `starterQuestions.json`
// (~895 fact-checked questions across 12 categories, calibrated easy/medium/hard,
// one entry per line for clean diffs). It's loaded and typed here so the rest of
// the app keeps importing `starterQuestions` unchanged.
export const starterQuestions = starterData as unknown as Question[]
