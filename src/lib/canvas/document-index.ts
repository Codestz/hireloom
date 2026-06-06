import { isBox } from './model'
import type { CanvasBox, CanvasNode } from './model'

/**
 * The Document Index — the single source of truth for "what sections exist and how to address
 * them". Powers the chat `@`-mention autocomplete, the AI's context, and canvas/navigator
 * highlight. A *section* is a top-level box (direct child of root) that carries a `role` or a
 * heading. Each has a UNIQUE `name` (the `@` address label); `role` stays the semantic anchor.
 */

export interface SectionRef {
  /** The section box id — what the AI and `@`-mentions target. */
  id: string
  /** Unique, human-friendly address label. */
  name: string
  /** Semantic/ATS role, if any. */
  role?: string
  /** The section's heading element id (for scoped highlight / editing), if any. */
  headingId?: string
}

const ROLE_LABELS: Record<string, string> = {
  header: 'Header',
  summary: 'Summary',
  work: 'Experience',
  volunteer: 'Volunteering',
  education: 'Education',
  projects: 'Projects',
  skills: 'Skills',
  languages: 'Languages',
  awards: 'Awards',
  certifications: 'Certifications',
  publications: 'Publications',
  references: 'References',
  interests: 'Interests',
}

export function humanizeRole(role: string | undefined): string {
  if (!role) return ''
  return ROLE_LABELS[role] ?? role.replace(/[_-]+/g, ' ').replace(/(^|\s)\w/g, (m) => m.toUpperCase()).trim()
}

/** The first heading element found in a box's subtree (depth-first), or null. */
function firstHeading(box: CanvasBox): CanvasNode | null {
  for (const c of box.children) {
    if (!isBox(c) && c.kind === 'heading') return c
    if (isBox(c)) {
      const hit = firstHeading(c)
      if (hit) return hit
    }
  }
  return null
}

/** A top-level box counts as a section when it has a role or a heading. */
function isSection(node: CanvasNode): node is CanvasBox {
  return isBox(node) && (node.role !== undefined || firstHeading(node) !== null)
}

/** The address label for a section, IGNORING any stored name (used to (re)derive defaults). */
function derivedName(box: CanvasBox): string {
  if (box.role === 'header') return 'Header'
  const h = firstHeading(box)
  const text = h && !isBox(h) ? String(h.data.text ?? '').trim() : ''
  if (text) return text
  return humanizeRole(box.role) || 'Section'
}

/** The effective label: a stored unique name, else the derived default. */
export function sectionLabel(box: CanvasBox): string {
  return box.name?.trim() || derivedName(box)
}

/** The addressable sections of a document (root's section children). */
export function documentIndex(root: CanvasBox): Array<SectionRef> {
  return root.children.filter(isSection).map((box) => {
    const h = firstHeading(box)
    return {
      id: box.id,
      name: sectionLabel(box),
      role: box.role,
      headingId: h ? h.id : undefined,
    }
  })
}

/**
 * Assign every section a UNIQUE `name` in place — keep existing names, derive defaults for the
 * rest, and de-duplicate with " 2", " 3"… suffixes. Call after decompose and after the AI adds a
 * section, so `@`-addresses stay stable and collision-free.
 */
export function assignSectionNames(root: CanvasBox): void {
  const used = new Set<string>()
  const unique = (base: string): string => {
    let name = base
    let i = 2
    while (used.has(name.toLowerCase())) name = `${base} ${i++}`
    used.add(name.toLowerCase())
    return name
  }
  for (const box of root.children) {
    if (!isSection(box)) continue
    box.name = unique(box.name?.trim() || derivedName(box))
  }
}
