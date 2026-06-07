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
  op: 'add' | 'edit_text' | 'edit_list' | 'remove' | 'answer'
  /** add: a box role ("skills"…), a node id, or "page". */
  target?: string
  /** edit_text / edit_list / remove: a node id from the outline. */
  id?: string
  /** edit_text: the new text. */
  text?: string
  /** edit_list: the rewritten bullet/skill items. */
  items?: Array<string>
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

/** Serialize a node to the primitive JSON shape (no ids) — used as a "mirror this" template. */
function serializeNode(n: CanvasNode, depth: number): Record<string, unknown> | undefined {
  if (depth > 5) return undefined
  if (isBox(n)) {
    const props: Record<string, unknown> = { display: n.props.display ?? 'flex' }
    if (n.props.direction) props.direction = n.props.direction
    if (n.props.gap !== undefined) props.gap = n.props.gap
    const o: Record<string, unknown> = { kind: 'box', props }
    if (n.role) o.role = n.role
    o.children = n.children.map((c) => serializeNode(c, depth + 1)).filter(Boolean)
    return o
  }
  // Include style so the model mirrors weight/colour (e.g. the bold name in an entry).
  const withStyle = (o: Record<string, unknown>): Record<string, unknown> =>
    n.style && Object.keys(n.style).length ? { ...o, style: n.style } : o
  if (n.kind === 'heading') return withStyle({ kind: 'heading', data: { text: n.data.text, level: n.data.level } })
  if (n.kind === 'text') return withStyle({ kind: 'text', data: { text: n.data.text } })
  if (n.kind === 'list') return withStyle({ kind: 'list', data: { items: n.data.items } })
  if (n.kind === 'separator') return { kind: 'separator', data: { variant: n.data.variant } }
  return { kind: n.kind }
}

const TEMPLATE_ROLES: ReadonlySet<string> = new Set([
  'work', 'experience', 'education', 'certifications', 'projects', 'skills',
])

/**
 * One representative entry per role section, as primitive JSON — so the chat model can MIRROR
 * the document's existing structure (nesting, separators, levels) when adding a similar item
 * instead of inventing a new layout.
 */
export function sectionTemplates(root: CanvasBox): string {
  const out: Array<string> = []
  const hasHeading = (c: CanvasNode): boolean =>
    isBox(c) && c.children.some((x) => !isBox(x) && x.kind === 'heading')
  const visit = (b: CanvasBox) => {
    if (b.role && TEMPLATE_ROLES.has(b.role)) {
      const entries = b.children.filter((c): c is CanvasBox => isBox(c) && !hasHeading(c))
      // the first (canonical) entry — not a later AI-added one
      if (entries.length) out.push(`role=${b.role}: ${JSON.stringify(serializeNode(entries[0], 0))}`)
    }
    for (const c of b.children) if (isBox(c)) visit(c)
  }
  visit(root)
  return out.join('\n')
}

const entryHasHeading = (c: CanvasNode): boolean =>
  isBox(c) && c.children.some((x) => !isBox(x) && x.kind === 'heading')

/** The first (canonical) entry box in a container — the style template for new siblings. */
function entryTemplate(container: CanvasNode | null): CanvasBox | null {
  if (!container || !isBox(container)) return null
  const entries = container.children.filter((c): c is CanvasBox => isBox(c) && !entryHasHeading(c))
  return entries[0] ?? null
}

/**
 * Copy an existing entry's styling onto a new node (positionally, by matching kind) — so an
 * AI-added item inherits the section's weights/colours/layout even when the model omits style.
 * Mutates `node` only (it's a fresh sanitized tree); never touches the template.
 */
function graftStyle(tmpl: CanvasNode, node: CanvasNode): void {
  if (isBox(tmpl) && isBox(node)) {
    node.props = { ...node.props, ...tmpl.props }
    const n = Math.min(tmpl.children.length, node.children.length)
    for (let i = 0; i < n; i++) graftStyle(tmpl.children[i], node.children[i])
  } else if (!isBox(tmpl) && !isBox(node) && tmpl.kind === node.kind && tmpl.style) {
    node.style = { ...node.style, ...tmpl.style }
  }
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
      // Match the section's existing entry styling (model output is unreliable for style).
      const tmpl = entryTemplate(findNode(r, container))
      if (tmpl) graftStyle(tmpl, node)
      r = addChild(r, container, node)
      summary.push(`Add ${nodeLabel(node)} → ${op.target ?? 'page'}`)
    } else if (op.op === 'edit_text' && op.id) {
      const target = findNode(r, op.id)
      if (target && !isBox(target)) {
        r = updateElementData(r, op.id, { text: String(op.text ?? '') })
        summary.push(`Edit ${nodeLabel(target)}`)
      }
    } else if (op.op === 'edit_list' && op.id && Array.isArray(op.items)) {
      const target = findNode(r, op.id)
      if (target && !isBox(target) && target.kind === 'list') {
        const items = op.items.map((x) => String(x))
        r = updateElementData(r, op.id, { items })
        summary.push(`Rewrite list (${items.length} items)`)
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
