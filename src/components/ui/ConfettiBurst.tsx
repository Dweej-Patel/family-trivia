import confetti from 'canvas-confetti'

const BRAND_COLORS = ['#7c3aed', '#ec4899', '#f97316', '#fbbf24', '#34d399', '#38bdf8']

/** A quick celebratory burst from the center and both sides. */
export function fireConfetti() {
  const base: confetti.Options = {
    colors: BRAND_COLORS,
    zIndex: 9999,
    disableForReducedMotion: true,
  }

  // Center pop
  confetti({ ...base, particleCount: 80, spread: 90, startVelocity: 45, origin: { x: 0.5, y: 0.6 } })

  // Left cannon
  confetti({ ...base, particleCount: 50, angle: 60, spread: 65, origin: { x: 0, y: 0.7 } })

  // Right cannon
  confetti({ ...base, particleCount: 50, angle: 120, spread: 65, origin: { x: 1, y: 0.7 } })
}

/** A bigger, sustained ~1.5s confetti shower to crown the winner. */
export function fireWinner() {
  const duration = 1500
  const end = Date.now() + duration

  const base: confetti.Options = {
    colors: BRAND_COLORS,
    zIndex: 9999,
    disableForReducedMotion: true,
  }

  // Big opening blast
  confetti({ ...base, particleCount: 160, spread: 120, startVelocity: 55, origin: { x: 0.5, y: 0.5 } })

  // Sustained side cannons raining down
  const interval = window.setInterval(() => {
    if (Date.now() > end) {
      window.clearInterval(interval)
      return
    }
    confetti({ ...base, particleCount: 40, angle: 60, spread: 70, startVelocity: 50, origin: { x: 0, y: 0.6 } })
    confetti({ ...base, particleCount: 40, angle: 120, spread: 70, startVelocity: 50, origin: { x: 1, y: 0.6 } })
    confetti({ ...base, particleCount: 30, spread: 100, startVelocity: 35, origin: { x: Math.random(), y: -0.1 } })
  }, 220)
}
