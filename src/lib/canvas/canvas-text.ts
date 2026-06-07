import { isBox, isHorizontal } from './model'
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

const oneLine = (s: string, n = 220): string => {
  const t = s.replace(/\s+/g, ' ').trim()
  return t.length > n ? `${t.slice(0, n)}…` : t
}

/**
 * Outline of the tree for the model — each line carries the node id to reference AND the actual
 * content (full-ish text + list items) so the AI can rewrite/edit without asking for it.
 */
export function canvasOutline(root: CanvasBox): string {
  const lines: Array<string> = []
  const walk = (n: CanvasNode, depth: number) => {
    const pad = '  '.repeat(depth)
    if (isBox(n)) {
      const tag = n.role ? `box role=${n.role}` : `box ${isHorizontal(n) ? 'row' : 'col'}`
      lines.push(`${pad}- ${tag} (${n.id})`)
      for (const c of n.children) walk(c, depth + 1)
    } else if (n.kind === 'heading' || n.kind === 'text') {
      lines.push(`${pad}- ${n.kind} (${n.id}): ${oneLine(String(n.data.text ?? ''))}`)
    } else if (n.kind === 'list') {
      const items = Array.isArray(n.data.items) ? n.data.items : []
      lines.push(`${pad}- list (${n.id}):`)
      items.forEach((it, idx) => lines.push(`${pad}    ${idx + 1}. ${oneLine(String(it))}`))
    } else {
      lines.push(`${pad}- ${n.kind} (${n.id})`)
    }
  }
  walk(root, 0)
  return lines.slice(0, 500).join('\n')
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
