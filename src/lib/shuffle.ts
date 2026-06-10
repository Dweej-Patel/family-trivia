/** Fisher–Yates shuffle — returns a new array, does not mutate the input. */
export function shuffle<T>(arr: readonly T[]): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * Return a copy of a question with its answer options in random order (and
 * `correctIndex` remapped to follow the right answer), so correct answers
 * aren't clustered on whatever slot the pack author favored. True/False
 * questions keep their fixed True-then-False order.
 */
export function shuffleQuestionOptions<
  T extends { type: string; options: string[]; correctIndex: number },
>(q: T): T {
  if (q.type === 'tf') return q
  const order = shuffle(q.options.map((_, i) => i))
  return {
    ...q,
    options: order.map((i) => q.options[i]),
    correctIndex: order.indexOf(q.correctIndex),
  }
}

/** Simple unique id generator (no deps). */
export function uid(prefix = 'id'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`
}
