import { useEffect } from 'react'
import type { useBlockDoc } from '#/components/blocks'
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
 * - Escape → clear the selection.
 */
export function CanvasKeyboard({ controller }: { controller: Controller }) {
  const { selectedId, select } = useCanvasSelection()
  const remove = controller.onCanvasRemoveNode
  const rootId = controller.doc.canvas?.id

  useEffect(() => {
    if (!selectedId) return
    const onKey = (e: KeyboardEvent) => {
      if (isEditingText()) return
      if (e.key === 'Escape') {
        select(null)
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
  }, [selectedId, select, remove, rootId])

  return null
}
