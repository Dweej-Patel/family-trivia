// A featherweight pub/sub for the music's beat, decoupled from React. The audio
// engine calls `emitBeat()` on each kick drum; visual layers (the animated
// background) subscribe with `onBeat()` and drive a single element's transform
// directly — never React state — so a beat pulse costs nothing but one
// compositor-only animation. Listeners are wrapped in try/catch so a buggy
// subscriber can never tear down the audio scheduler.

type BeatListener = (strength: number) => void

const listeners = new Set<BeatListener>()

/** Subscribe to beats. Returns an unsubscribe function. */
export function onBeat(listener: BeatListener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Fire a beat. `strength` (0–1) lets downbeats pulse harder than offbeats. */
export function emitBeat(strength = 1): void {
  for (const listener of listeners) {
    try {
      listener(strength)
    } catch {
      /* a subscriber threw — ignore so the audio loop stays alive */
    }
  }
}
