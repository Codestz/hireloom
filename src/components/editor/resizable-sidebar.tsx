import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

const KEY = 'hireloom.sidebar.w'
const MIN = 300
const MAX = 640
const DEFAULT = 400

function loadWidth(): number {
  if (typeof window === 'undefined') return DEFAULT
  const v = Number(localStorage.getItem(KEY))
  return Number.isFinite(v) && v >= MIN && v <= MAX ? v : DEFAULT
}

/**
 * The left editor sidebar, resizable by dragging its right edge. Width persists across sessions
 * (localStorage) and is clamped to [MIN, MAX] — so the CV chat gets as much room as you want
 * while the navigator can stay slim.
 */
export function ResizableSidebar({ children }: { children: ReactNode }) {
  const [width, setWidth] = useState(loadWidth)
  const drag = useRef<{ x: number; w: number } | null>(null)

  useEffect(() => {
    try {
      localStorage.setItem(KEY, String(width))
    } catch {
      /* private mode — width just won't persist */
    }
  }, [width])

  return (
    <aside
      className="relative hidden shrink-0 border-r border-border md:block print:hidden"
      style={{ width }}
    >
      {children}
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize sidebar"
        className="absolute top-0 -right-0.5 z-20 h-full w-1.5 cursor-col-resize transition-colors hover:bg-primary/30 active:bg-primary/50"
        style={{ touchAction: 'none' }}
        onPointerDown={(e) => {
          drag.current = { x: e.clientX, w: width }
          e.currentTarget.setPointerCapture(e.pointerId)
        }}
        onPointerMove={(e) => {
          if (!drag.current) return
          const next = drag.current.w + (e.clientX - drag.current.x)
          setWidth(Math.max(MIN, Math.min(MAX, next)))
        }}
        onPointerUp={(e) => {
          drag.current = null
          e.currentTarget.releasePointerCapture(e.pointerId)
        }}
        onDoubleClick={() => setWidth(DEFAULT)}
      />
    </aside>
  )
}
