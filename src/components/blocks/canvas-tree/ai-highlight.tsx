import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

/**
 * AI-driven canvas highlights, shared between the CV chat and the canvas:
 * - `focusedIds`  — sections the chat is @-focused on (persistent, green ring).
 * - `affectedIds` — nodes a *pending* (un-applied) proposal will touch (amber ring) so you can
 *   see the blast radius before you Apply.
 * The chat writes these; Selectable reads them.
 */
interface AiHighlight {
  focusedIds: ReadonlySet<string>
  affectedIds: ReadonlySet<string>
  setFocusedIds: (ids: Iterable<string>) => void
  setAffectedIds: (ids: Iterable<string>) => void
}

const noop = () => {}
const AiHighlightContext = createContext<AiHighlight>({
  focusedIds: new Set(),
  affectedIds: new Set(),
  setFocusedIds: noop,
  setAffectedIds: noop,
})

export function AiHighlightProvider({ children }: { children: ReactNode }) {
  const [focusedIds, setF] = useState<Set<string>>(() => new Set())
  const [affectedIds, setA] = useState<Set<string>>(() => new Set())
  const setFocusedIds = useCallback((ids: Iterable<string>) => setF(new Set(ids)), [])
  const setAffectedIds = useCallback((ids: Iterable<string>) => setA(new Set(ids)), [])
  const value = useMemo(
    () => ({ focusedIds, affectedIds, setFocusedIds, setAffectedIds }),
    [focusedIds, affectedIds, setFocusedIds, setAffectedIds],
  )
  return <AiHighlightContext.Provider value={value}>{children}</AiHighlightContext.Provider>
}

export function useAiHighlight(): AiHighlight {
  return useContext(AiHighlightContext)
}

export const AI_FOCUS_COLOR = '#2f6b4f' // app green — a focused section
export const AI_AFFECT_COLOR = '#d97706' // amber — a node a pending proposal will change
