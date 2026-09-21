import { useEffect, useRef, useState } from 'react'

// Animate a number from 0 up to `target` over `duration` ms using
// requestAnimationFrame + an ease-out curve. Zero dependencies. Re-runs
// whenever the target changes (so live-updating stats re-animate to the new
// value). Respects prefers-reduced-motion by jumping straight to the target.
export function useCountUp(target, duration = 900) {
  const [value, setValue] = useState(0)
  const rafRef = useRef(null)
  const fromRef = useRef(0)

  useEffect(() => {
    const to = Number(target) || 0

    // Reduced-motion: no animation, land on the value immediately.
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce) {
      setValue(to)
      return
    }

    const from = fromRef.current
    const start = performance.now()
    const easeOut = (t) => 1 - Math.pow(1 - t, 3)

    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1)
      const current = from + (to - from) * easeOut(p)
      setValue(current)
      if (p < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        fromRef.current = to
      }
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      fromRef.current = to // next run starts from where we landed
    }
  }, [target, duration])

  return value
}
