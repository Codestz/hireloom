import { createContext, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

/**
 * Canvas selection — which node is currently selected. UI-only (not persisted). Shared by
 * the canvas (click to select + outline), the right inspector (edits the selected node),
 * and the left navigator (selection sync) — so the provider is mounted high enough to wrap
 * all three.
 */
interface CanvasSelectionValue {
  selectedId: string | null
  select: (id: string | null) => void
}

const CanvasSelectionContext = createContext<CanvasSelectionValue>({
  selectedId: null,
  select: () => {},
})

export function CanvasSelectionProvider({ children }: { children: ReactNode }) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const value = useMemo(
    () => ({ selectedId, select: setSelectedId }),
    [selectedId],
  )
  return (
    <CanvasSelectionContext.Provider value={value}>
      {children}
    </CanvasSelectionContext.Provider>
  )
}

export function useCanvasSelection(): CanvasSelectionValue {
  return useContext(CanvasSelectionContext)
}

/** Node-kind → selection outline colour (teal = container, indigo = leaf element). */
export const SELECT_COLOR = { box: '#0d9488', element: '#6366f1' } as const
