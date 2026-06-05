import { useEffect, useLayoutEffect, useState } from 'react'
import type { RefObject } from 'react'

/** Client-only gate: false during SSR/first paint, true after mount. */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  return mounted
}

/** Scale factor that fits a fixed-width page into the panel, tracked via ResizeObserver. */
export function useFitToWidth(
  ref: RefObject<HTMLElement | null>,
  pageWidth: number,
): number {
  const [fit, setFit] = useState(1.2)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const recompute = () =>
      setFit(Math.min(1.7, Math.max(0.6, (el.clientWidth - 128) / pageWidth)))
    recompute()
    const ro = new ResizeObserver(recompute)
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref, pageWidth])
  return fit
}
