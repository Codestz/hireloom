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

/** A box counts as a section when it carries a semantic role (set by decompose + the AI tools). */
function isSection(node: CanvasNode): node is CanvasBox {
  return isBox(node) && node.role !== undefined
}

/**
 * Every section box, found RECURSIVELY through layout wrappers (sidebar rows/columns, bands…),
 * not just root's direct children — so addressing works for any structural layout. A role box is
 * a section (we don't descend into it); a role-less box is a layout wrapper (we descend).
 */
function collectSectionBoxes(root: CanvasBox): Array<CanvasBox> {
  const out: Array<CanvasBox> = []
  const walk = (box: CanvasBox) => {
    for (const c of box.children) {
      if (!isBox(c)) continue
      if (isSection(c)) out.push(c)
      else walk(c)
    }
  }
  walk(root)
  return out
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

/** The addressable sections of a document (any layout). */
export function documentIndex(root: CanvasBox): Array<SectionRef> {
  return collectSectionBoxes(root).map((box) => {
    const h = firstHeading(box)
    return {
      id: box.id,
      name: sectionLabel(box),
      role: box.role,
      headingId: h ? h.id : undefined,
    }
  })
}

/** A thing the chat can @-mention: a whole section, or one entry inside a section. */
export interface MentionTarget {
  id: string
  label: string
  kind: 'section' | 'entry'
  role?: string
  /** For entries: the parent section's name (shown as context in the picker). */
  sectionName?: string
}

/** First couple of text/heading leaves of a box → a short label, e.g. "Senior Engineer · Recurly". */
function entryLabel(box: CanvasBox): string {
  const texts: Array<string> = []
  const walk = (n: CanvasNode) => {
    if (texts.length >= 2) return
    if (isBox(n)) {
      for (const c of n.children) walk(c)
    } else if (n.kind === 'heading' || n.kind === 'text') {
      const t = String(n.data.text ?? '').trim()
      if (t) texts.push(t)
    }
  }
  walk(box)
  const label = texts.join(' · ')
  return (label.length > 52 ? `${label.slice(0, 52)}…` : label) || 'Entry'
}

/** A section's entries = its child boxes that are NOT the heading/header sub-box. */
function sectionEntries(section: CanvasBox): Array<CanvasBox> {
  return section.children.filter(
    (c): c is CanvasBox => isBox(c) && !c.children.some((x) => !isBox(x) && x.kind === 'heading'),
  )
}

/** Everything the chat can @-mention: each section, followed by its entries. */
export function mentionTargets(root: CanvasBox): Array<MentionTarget> {
  const out: Array<MentionTarget> = []
  for (const box of collectSectionBoxes(root)) {
    const name = sectionLabel(box)
    out.push({ id: box.id, label: name, kind: 'section', role: box.role })
    for (const entry of sectionEntries(box)) {
      out.push({ id: entry.id, label: entryLabel(entry), kind: 'entry', sectionName: name })
    }
  }
  return out
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
  for (const box of collectSectionBoxes(root)) {
    box.name = unique(box.name?.trim() || derivedName(box))
  }
}
