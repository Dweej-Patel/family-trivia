import type { Player } from '../types'

export interface RankedPlayer extends Player {
  /** Standard competition rank (a.k.a. "1224"): ties share a place, and the
   *  next distinct score skips ahead. Scores 200,200,100 → places 1,1,3. */
  place: number
}

/** Sort players by score (desc) and assign competition ranks with tie support. */
export function rankPlayers(players: Player[]): RankedPlayer[] {
  const sorted = [...players].sort((a, b) => b.score - a.score)
  let place = 0
  let prevScore = Number.POSITIVE_INFINITY
  return sorted.map((p, i) => {
    if (p.score < prevScore) {
      place = i + 1 // first player at a new (lower) score takes its index-based place
      prevScore = p.score
    }
    return { ...p, place }
  })
}

/** Players sharing 1st place. Empty if there are no players. */
export function getWinners(players: Player[]): RankedPlayer[] {
  return rankPlayers(players).filter((p) => p.place === 1)
}

/** Group ranked players by their place, preserving rank order. */
export function groupByPlace(ranked: RankedPlayer[]): Map<number, RankedPlayer[]> {
  const map = new Map<number, RankedPlayer[]>()
  for (const p of ranked) {
    const bucket = map.get(p.place)
    if (bucket) bucket.push(p)
    else map.set(p.place, [p])
  }
  return map
}

/** Human-readable join: ["A"] → "A", ["A","B"] → "A & B", ["A","B","C"] → "A, B & C". */
export function joinNames(names: string[]): string {
  if (names.length === 0) return ''
  if (names.length === 1) return names[0]
  if (names.length === 2) return `${names[0]} & ${names[1]}`
  return `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}`
}
