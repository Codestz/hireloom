import { isBox, isHorizontal } from './model'
import type { CanvasBox, CanvasNode } from './model'
import { addChild, findNode, findParent, removeNode, updateElementData } from './tree-ops'
import { sanitizeAiNode } from './ai-compose'

/**
 * Applies the structured ops the CV chat (A3) returns, onto the canvas tree. Pure — returns a
 * NEW root + a human summary of what changed. `add` runs the raw node through sanitizeAiNode
 * (the security boundary); refs resolve by node id, then by box role, else the page root.
 */

export interface ChatOp {
  op: 'add' | 'edit_text' | 'remove' | 'answer'
  /** add: a box role ("skills"…), a node id, or "page". */
  target?: string
  /** edit_text / remove: a node id from the outline. */
  id?: string
  /** edit_text: the new text. */
  text?: string
  /** add: a raw primitive subtree (sanitized here). */
  node?: unknown
}

const snippet = (s: string, n = 30) => (s.length > n ? `${s.slice(0, n)}…` : s)

function nodeLabel(n: CanvasNode): string {
  if (isBox(n)) return n.role ? `box(${n.role})` : `box`
  if (n.kind === 'heading' || n.kind === 'text') return `${n.kind} "${snippet(String(n.data.text ?? ''))}"`
  if (n.kind === 'list') return `list(${Array.isArray(n.data.items) ? n.data.items.length : 0})`
  return n.kind
}

/** Compact outline of the tree for the model — each line carries the node id to reference. */
export function canvasOutline(root: CanvasBox): string {
  const lines: Array<string> = []
  const walk = (n: CanvasNode, depth: number) => {
    const pad = '  '.repeat(depth)
    if (isBox(n)) {
      const tag = n.role ? `box role=${n.role}` : `box ${isHorizontal(n) ? 'row' : 'col'}`
      lines.push(`${pad}- ${tag} (${n.id})`)
      for (const c of n.children) walk(c, depth + 1)
    } else if (n.kind === 'heading' || n.kind === 'text') {
      lines.push(`${pad}- ${n.kind} "${snippet(String(n.data.text ?? ''))}" (${n.id})`)
    } else if (n.kind === 'list') {
      lines.push(`${pad}- list ${Array.isArray(n.data.items) ? n.data.items.length : 0} items (${n.id})`)
    } else {
      lines.push(`${pad}- ${n.kind} (${n.id})`)
    }
  }
  walk(root, 0)
  return lines.slice(0, 250).join('\n')
}

function findBoxByRole(root: CanvasBox, role: string): CanvasBox | null {
  if (root.role === role) return root
  for (const c of root.children) {
    if (isBox(c)) {
      const hit = findBoxByRole(c, role)
      if (hit) return hit
    }
  }
  return null
}

/** Resolve an "add" target → the container id to insert into. */
function resolveContainer(root: CanvasBox, target: string | undefined): string {
  if (!target || target === 'page' || target === 'root') return root.id
  const byId = findNode(root, target)
  if (byId) return isBox(byId) ? byId.id : (findParent(root, target)?.id ?? root.id)
  const byRole = findBoxByRole(root, target)
  return byRole ? byRole.id : root.id
}

export function applyChatOps(
  root: CanvasBox,
  ops: ReadonlyArray<ChatOp>,
): { root: CanvasBox; summary: Array<string> } {
  let r = root
  const summary: Array<string> = []
  for (const op of ops) {
    if (op.op === 'add') {
      const node = sanitizeAiNode(op.node)
      if (!node) continue
      const container = resolveContainer(r, op.target)
      r = addChild(r, container, node)
      summary.push(`Add ${nodeLabel(node)} → ${op.target ?? 'page'}`)
    } else if (op.op === 'edit_text' && op.id) {
      const target = findNode(r, op.id)
      if (target && !isBox(target)) {
        r = updateElementData(r, op.id, { text: String(op.text ?? '') })
        summary.push(`Edit ${nodeLabel(target)}`)
      }
    } else if (op.op === 'remove' && op.id && op.id !== r.id) {
      const target = findNode(r, op.id)
      if (target) {
        r = removeNode(r, op.id)
        summary.push(`Remove ${nodeLabel(target)}`)
      }
    }
  }
  return { root: r, summary }
}
