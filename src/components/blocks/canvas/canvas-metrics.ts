import { useEffect, useLayoutEffect, useState } from 'react'
import type { RefObject } from 'react'
import type { LayoutKind } from '#/lib/templates'
import { computePageBreaks } from '#/components/blocks/canvas/page-breaks'

const PAGE_CONTENT_OVERFLOW = 746 // page height minus vertical margins (pt)

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

export interface PageBreakGuides {
  /** Y offsets (px) where a page break falls — single/band layouts only. */
  breaks: Array<number>
  /** Two-column layout spilled past one page (the side rail can't repeat). */
  sidebarOverflow: boolean
}

/**
 * Content-aware page-break guides: measures real block heights and places a line before
 * any block that would overflow the page. A ResizeObserver catches contentEditable height
 * changes (which don't bump `rev`). For the two-column layout the single-axis guide doesn't
 * apply, so it only flags overflow.
 */
export function usePageBreakGuides(
  ref: RefObject<HTMLElement | null>,
  layout: LayoutKind | undefined,
  enabled: boolean,
): PageBreakGuides {
  const [breaks, setBreaks] = useState<Array<number>>([])
  const [sidebarOverflow, setSidebarOverflow] = useState(false)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el || !enabled) return
    const measure = () => {
      if (layout === 'sidebar') {
        setBreaks([])
        setSidebarOverflow(el.offsetHeight - 96 > PAGE_CONTENT_OVERFLOW)
      } else {
        setBreaks(computePageBreaks(el).tops)
        setSidebarOverflow(false)
      }
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref, layout, enabled])

  return { breaks, sidebarOverflow }
}
