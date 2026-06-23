import { useEffect, useState } from 'react'

/** True on phone-sized screens (≤768px). Used to dial back expensive animated
 *  layers (blurred blobs, neural pulses, sound-reactive motion) that force the
 *  GPU to re-rasterize every frame — we keep the same look, rendered statically.
 *  Centralized so every "is this a phone?" decision uses one breakpoint. */
export function useIsSmallScreen(): boolean {
  const [small, setSmall] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(max-width: 768px)')
    const update = () => setSmall(mq.matches)
    update()
    mq.addEventListener?.('change', update)
    return () => mq.removeEventListener?.('change', update)
  }, [])
  return small
}
