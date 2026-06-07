import { diffLines } from '#/lib/diff'
import type { DiffLine } from '#/lib/diff'
import { isBox } from '#/lib/canvas/model'
import type { CanvasBox, CanvasNode } from '#/lib/canvas/model'
import { findNode } from '#/lib/canvas/tree-ops'
import { entryFor } from '#/lib/canvas/builders'
import type { ResolvedTokens } from '#/lib/templates'
import type { ToolCall } from './tool-engine'

/**
 * Preview helpers for proposed tool calls — a GitHub-style before/after diff and the set of node
 * ids each call will touch (for the canvas "AI edit" rings). Read-only; mirrors what runTools does.
 */
export interface ToolDiff {
  title: string
  lines: Array<DiffLine>
}

const S = (v: unknown): string => (typeof v === 'string' ? v : '')
const SA = (v: unknown): Array<string> =>
  Array.isArray(v) ? v.map((x) => String(x)) : []

function textLeaves(node: CanvasNode): Array<string> {
  const out: Array<string> = []
  const walk = (n: CanvasNode) => {
    if (isBox(n)) {
      for (const c of n.children) walk(c)
    } else if (n.kind === 'heading' || n.kind === 'text') {
      const t = String(n.data.text ?? '').trim()
      if (t) out.push(t)
    } else if (n.kind === 'list') {
      for (const i of Array.isArray(n.data.items) ? n.data.items : []) {
        const t = String(i).trim()
        if (t) out.push(t)
      }
    }
  }
  walk(node)
  return out
}

/** Resolve a section reference (id, role, or @-name) to its box. */
function resolveSection(root: CanvasBox, ref: string): CanvasBox | null {
  const byId = findNode(root, ref)
  if (byId && isBox(byId)) return byId
  const key = ref.toLowerCase()
  for (const box of root.children) {
    if (isBox(box) && (box.role === ref || box.name?.toLowerCase() === key)) return box
  }
  return null
}

export function toolDiffs(
  root: CanvasBox,
  tokens: ResolvedTokens,
  calls: ReadonlyArray<ToolCall>,
): Array<ToolDiff> {
  const out: Array<ToolDiff> = []
  for (const { tool, args } of calls) {
    const a = (args ?? {}) as Record<string, unknown>
    if (tool === 'edit_text') {
      const n = findNode(root, S(a.id))
      if (!n || isBox(n)) continue
      out.push({ title: 'Edit text', lines: diffLines(String(n.data.text ?? '').split('\n'), S(a.text).split('\n')) })
    } else if (tool === 'edit_list') {
      const n = findNode(root, S(a.id))
      if (!n || isBox(n) || n.kind !== 'list') continue
      out.push({ title: 'Rewrite list', lines: diffLines(SA(n.data.items), SA(a.items)) })
    } else if (tool === 'transform_text') {
      const n = findNode(root, S(a.id))
      if (!n || isBox(n)) continue
      out.push({
        title: `${S(a.action) || 'Rewrite'} text (AI rewrites on Apply)`,
        lines: String(n.data.text ?? '').split('\n').map((text) => ({ t: 'same', text })),
      })
    } else if (tool === 'add_entry') {
      const box = resolveSection(root, S(a.section))
      if (!box) continue
      const entry = entryFor(tokens, S(a.type) || box.role || 'custom', (a.fields ?? {}) as Record<string, unknown>)
      out.push({ title: `Add entry to ${box.name ?? box.role ?? 'section'}`, lines: textLeaves(entry).map((text) => ({ t: 'add', text })) })
    } else if (tool === 'add_section') {
      out.push({ title: 'Add section', lines: [{ t: 'add', text: S(a.title) }] })
    } else if (tool === 'remove') {
      const n = findNode(root, S(a.id))
      if (!n) continue
      out.push({ title: 'Remove', lines: textLeaves(n).map((text) => ({ t: 'del', text })) })
    }
  }
  return out
}

/** Node ids the calls will touch (add → its section/page) — for the canvas affected rings. */
export function toolTargetIds(root: CanvasBox, calls: ReadonlyArray<ToolCall>): Array<string> {
  const ids = new Set<string>()
  for (const { tool, args } of calls) {
    const a = (args ?? {}) as Record<string, unknown>
    if (tool === 'add_entry') {
      const box = resolveSection(root, S(a.section))
      if (box) ids.add(box.id)
    } else if (tool === 'add_section') {
      ids.add(root.id)
    } else if (typeof a.id === 'string' && findNode(root, a.id)) {
      ids.add(a.id)
    }
  }
  return [...ids]
}
