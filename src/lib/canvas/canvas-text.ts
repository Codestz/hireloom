import { isBox } from './model'
import type { CanvasBox, CanvasElement, CanvasNode } from './model'

/** Flatten a canvas node to plain text (headings/text + list items), newline-joined. */
export function canvasText(node: CanvasNode): string {
  const parts: Array<string> = []
  const walk = (n: CanvasNode) => {
    if (isBox(n)) {
      for (const c of n.children) walk(c)
    } else if (n.kind === 'heading' || n.kind === 'text') {
      const t = String(n.data.text ?? '').trim()
      if (t) parts.push(t)
    } else if (n.kind === 'list') {
      for (const i of Array.isArray(n.data.items) ? n.data.items : []) {
        const t = String(i).trim()
        if (t) parts.push(t)
      }
    }
  }
  walk(node)
  return parts.join('\n')
}

/** The header section's summary paragraph (its direct text child), if any. */
export function findSummaryNode(root: CanvasBox): CanvasElement | null {
  const header = root.children.find((c) => isBox(c) && c.role === 'header')
  if (!header || !isBox(header)) return null
  for (const c of header.children) {
    if (!isBox(c) && c.kind === 'text') return c
  }
  return null
}
