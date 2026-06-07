import { isBox } from '#/lib/canvas/model'
import { findNode } from '#/lib/canvas/tree-ops'
import type { Ctx, Controller } from './section-types'

/** Shared option lists + predicates for the inspector section components. */

export const ROLE_OPTIONS = [
  ['', '— none —'],
  ['header', 'Header'],
  ['summary', 'Summary'],
  ['work', 'Work'],
  ['education', 'Education'],
  ['skills', 'Skills'],
  ['projects', 'Projects'],
  ['certifications', 'Certifications'],
  ['awards', 'Awards'],
  ['publications', 'Publications'],
  ['languages', 'Languages'],
  ['volunteer', 'Volunteer'],
  ['references', 'References'],
  ['custom', 'Custom'],
].map(([value, label]) => ({ value, label }))

export const SEPARATOR_OPTIONS = ['dot', 'bullet', 'dash', 'line', 'slash', 'pipe'].map((v) => ({
  value: v,
  label: v,
}))

/** Heading/text/list nodes carry an ElementStyle (the Typography section applies to these). */
export const isStyleable = (n: Ctx['node']) =>
  n.kind === 'heading' || n.kind === 'text' || n.kind === 'list'

/** A node's index among its parent's children (used when converting list ↔ text in place). */
export function indexInParent(controller: Controller, parentId: string, id: string): number {
  const root = controller.doc.canvas
  if (!root) return 0
  const parent = findNode(root, parentId)
  if (!parent || !isBox(parent)) return 0
  const i = parent.children.findIndex((c) => c.id === id)
  return i < 0 ? parent.children.length : i
}
