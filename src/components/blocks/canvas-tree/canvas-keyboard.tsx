import { useEffect } from 'react'
import type { useBlockDoc } from '#/components/blocks'
import { findParent } from '#/lib/canvas/tree-ops'
import { useCanvasSelection } from './selection'

type Controller = ReturnType<typeof useBlockDoc>

/** True when focus is in an editable field — there Delete/Backspace must edit text, not nodes. */
function isEditingText(): boolean {
  const el = document.activeElement as HTMLElement | null
  if (!el) return false
  return (
    el.isContentEditable ||
    el.tagName === 'INPUT' ||
    el.tagName === 'TEXTAREA' ||
    el.tagName === 'SELECT'
  )
}

/**
 * Canvas keyboard shortcuts (mounted inside the selection provider):
 * - Delete / Backspace → remove the selected node (never the root; never while editing text).
 * - Alt + ↑ / ↓ → reorder the selected node within its parent (keyboard a11y for drag/drop).
 * - Escape → clear the selection.
 */
export function CanvasKeyboard({ controller }: { controller: Controller }) {
  const { selectedId, select } = useCanvasSelection()
  const remove = controller.onCanvasRemoveNode
  const move = controller.onCanvasMoveNode
  const root = controller.doc.canvas
  const rootId = root?.id

  useEffect(() => {
    if (!selectedId) return
    const onKey = (e: KeyboardEvent) => {
      if (isEditingText()) return
      if (e.key === 'Escape') {
        select(null)
        return
      }
      if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        if (!root || selectedId === rootId) return
        const parent = findParent(root, selectedId)
        if (!parent) return
        const idx = parent.children.findIndex((c) => c.id === selectedId)
        const to = e.key === 'ArrowUp' ? idx - 1 : idx + 1
        if (to < 0 || to > parent.children.length - 1) return
        e.preventDefault()
        move(selectedId, parent.id, to)
        return
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedId === rootId) return
        e.preventDefault()
        remove(selectedId)
        select(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedId, select, remove, move, root, rootId])

  return null
}
