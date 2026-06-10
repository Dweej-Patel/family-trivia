/** Tiny vibration cue on devices that support it (Android Chrome; iOS Safari
 *  silently ignores). Failure is always fine — it's pure garnish. */
export function buzz(pattern: number | number[]): void {
  try {
    navigator.vibrate?.(pattern)
  } catch {
    /* unsupported — ignore */
  }
}
