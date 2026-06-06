import { useEffect, useRef, useState } from 'react'

interface UseCountdownArgs {
  /** Total seconds to count down from. */
  seconds: number
  /** While true, the timer ticks once per second. */
  active: boolean
  /** Fired each second with the new remaining value (after decrement). */
  onTick?: (remaining: number) => void
  /** Fired exactly once when the timer hits 0. */
  onExpire?: () => void
  /** Change this (e.g. per question) to restart the countdown from `seconds`. */
  key?: string | number
}

interface UseCountdownResult {
  remaining: number
  reset: () => void
}

/**
 * A reusable, drift-free-ish countdown timer.
 *
 * - Counts down once per second while `active`.
 * - Calls `onTick(remaining)` after each decrement and `onExpire()` at 0.
 * - Resets to `seconds` whenever `key` changes.
 * - Never fires `onExpire` more than once per run.
 * - Uses refs for callbacks to avoid stale closures and interval churn.
 */
export function useCountdown({
  seconds,
  active,
  onTick,
  onExpire,
  key,
}: UseCountdownArgs): UseCountdownResult {
  const [remaining, setRemaining] = useState<number>(seconds)

  // Mirror `remaining` in a ref so the interval can read it without being a
  // dependency (which would reset the interval every tick).
  const remainingRef = useRef(seconds)

  // Keep the latest callbacks in refs so the ticking effect doesn't need to
  // re-subscribe (and thus reset its interval) when callers pass new closures.
  const onTickRef = useRef(onTick)
  const onExpireRef = useRef(onExpire)
  onTickRef.current = onTick
  onExpireRef.current = onExpire

  // Guards against firing onExpire repeatedly within a single run.
  const expiredRef = useRef(false)

  // Restart whenever the key (or the configured duration) changes.
  useEffect(() => {
    expiredRef.current = false
    remainingRef.current = seconds
    setRemaining(seconds)
  }, [key, seconds])

  useEffect(() => {
    if (!active) return

    const id = window.setInterval(() => {
      const next = Math.max(0, remainingRef.current - 1)
      remainingRef.current = next
      // Update state directly (not via an updater) so the callbacks below run
      // in the timer-event context — never inside React's render phase.
      setRemaining(next)
      onTickRef.current?.(next)
      if (next <= 0 && !expiredRef.current) {
        expiredRef.current = true
        onExpireRef.current?.()
      }
    }, 1000)

    return () => window.clearInterval(id)
    // The interval is keyed on `active` and the key/duration only; `remaining`
    // is read via `remainingRef` to avoid resetting the interval every tick.
  }, [active, key, seconds])

  const reset = () => {
    expiredRef.current = false
    remainingRef.current = seconds
    setRemaining(seconds)
  }

  return { remaining, reset }
}
