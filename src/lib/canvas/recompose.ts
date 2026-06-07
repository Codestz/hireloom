import type { BlockDoc, DocSection } from '#/lib/blocks/document'
import type { HeaderData } from '#/lib/blocks/defs/header'
import { isBox } from './model'
import type { CanvasBox, CanvasNode } from './model'

/**
 * Inverse of decompose(): rebuild a typed BlockDoc (header + sections) from the canvas Box tree
 * so export (PDF / JSON Resume) reflects what's on the canvas. It walks role-tagged boxes and
 * reverses decompose's structure (title·company dot row, start–end dash row, bullet list, etc.).
 *
 * Robust for the common case (a decomposed tree with edited text / light restructuring). It
 * degrades gracefully on heavily hand-built trees — unknown shapes fall back to collecting text
 * in reading order — because reconstructing JSON-Resume's structured fields from free primitives
 * is inherently best-effort (the accepted pure-primitive tradeoff).
 */

const uid = () => crypto.randomUUID()

const isText = (n: CanvasNode) => n.kind === 'text'
const isList = (n: CanvasNode) => n.kind === 'list'
const textVal = (n: CanvasNode): string =>
  typeof (n as { data?: { text?: unknown } }).data?.text === 'string'
    ? String((n as { data: { text: string } }).data.text)
    : ''

/** Text values of a box's direct children, skipping separators/other kinds. */
function inlineTexts(box: CanvasBox): Array<string> {
  return box.children.filter(isText).map(textVal)
}

function listItems(n: CanvasNode): Array<string> {
  const items = (n as { data?: { items?: unknown } }).data?.items
  return Array.isArray(items) ? items.filter((x): x is string => typeof x === 'string') : []
}

function hasSeparator(box: CanvasBox, variant: string): boolean {
  return box.children.some(
    (c) => c.kind === 'separator' && (c as { data?: { variant?: unknown } }).data?.variant === variant,
  )
}

function firstHeading(node: CanvasNode): string {
  if (node.kind === 'heading') return textVal(node)
  if (isBox(node)) for (const c of node.children) {
    const h = firstHeading(c)
    if (h) return h
  }
  return ''
}

/** All text-element values under a node, depth-first in reading order. */
function allTexts(node: CanvasNode): Array<string> {
  if (node.kind === 'text') return [textVal(node)]
  if (isBox(node)) return node.children.flatMap(allTexts)
  return []
}

/** First box (depth-first) matching the predicate. */
function findBox(node: CanvasNode, pred: (b: CanvasBox) => boolean): CanvasBox | null {
  if (!isBox(node)) return null
  if (pred(node)) return node
  for (const c of node.children) {
    const hit = findBox(c, pred)
    if (hit) return hit
  }
  return null
}

/** Parse a decompose headRow: title·subtitle (dot) on the left, start–end (dash) on the right. */
function parseHeadRow(node: CanvasNode | undefined): {
  primary: string
  secondary: string
  start: string
  end: string
} {
  const empty = { primary: '', secondary: '', start: '', end: '' }
  if (!node) return empty
  if (!isBox(node)) return { ...empty, primary: textVal(node) }
  const childBoxes = node.children.filter(isBox)
  let left: CanvasBox = node
  let period: CanvasBox | null = null
  if (childBoxes.length) {
    period = childBoxes.find((b) => hasSeparator(b, 'dash')) ?? null
    left = childBoxes.find((b) => b !== period) ?? childBoxes[0]
  }
  const lt = inlineTexts(left)
  const pt = period ? inlineTexts(period) : []
  return { primary: lt[0] ?? '', secondary: lt[1] ?? '', start: pt[0] ?? '', end: pt[1] ?? '' }
}

function entryData(role: string, entry: CanvasBox): Record<string, unknown> {
  const head = entry.children.at(0)
  const hr = parseHeadRow(head)
  const list = entry.children.find(isList)
  const bullets = list ? listItems(list) : []
  const directTexts = entry.children.filter(isText).map(textVal) // location/area/summary/etc
  const period = { start: hr.start, end: hr.end }
  // Inline texts of the entry's first row (used by cert/project/publication shapes).
  const headTexts = head ? (isBox(head) ? inlineTexts(head) : [textVal(head)]) : []

  switch (role) {
    case 'experience':
      return { title: hr.primary, company: hr.secondary, location: directTexts[0] ?? '', period, bullets }
    case 'volunteer':
      return { role: hr.primary, organization: hr.secondary, location: directTexts[0] ?? '', period, bullets }
    case 'education':
      return { institution: hr.primary, degree: hr.secondary, area: directTexts[0] ?? '', period }
    case 'certifications':
      return { name: headTexts[0] ?? '', issuer: headTexts[1] ?? '', date: headTexts[2] ?? '' }
    case 'projects':
      return { name: headTexts[0] ?? '', url: headTexts[1] ?? '', description: directTexts[0] ?? '' }
    case 'awards':
      return { title: hr.primary, awarder: hr.secondary, date: hr.start, summary: directTexts[0] ?? '' }
    case 'publications':
      return { name: headTexts[0] ?? '', publisher: headTexts[1] ?? '', date: headTexts[2] ?? '', summary: directTexts[0] ?? '' }
    case 'references':
      return { name: directTexts[0] ?? '', reference: directTexts[1] ?? '' }
    default:
      return { lines: directTexts }
  }
}

function recomposeSection(box: CanvasBox, role: string): DocSection {
  const childBoxes = box.children.filter(isBox)
  const heading = firstHeading(box)
  const list = box.children.find(isList)

  let items: DocSection['items']
  if (role === 'skills' || role === 'languages') {
    items = [{ id: `${role}-1`, data: { tags: list ? listItems(list) : [] } }]
  } else if (role === 'custom') {
    items = [{ id: 'custom-1', data: { lines: list ? listItems(list) : [] } }]
  } else {
    // childBoxes[0] is the heading+divider sub-box; the rest are entries.
    const entries = childBoxes.slice(1)
    items = entries.map((e) => ({ id: uid(), data: entryData(role, e) }))
  }

  return { id: `sec-${role}`, type: role, heading, items }
}

function recomposeHeader(box: CanvasBox): HeaderData {
  const name = firstHeading(box)
  // The contact row is the (possibly nested) horizontal box containing an email, else any
  // multi-text row. name/headline/contact are nested in an inner box, so search recursively.
  const contactBox =
    findBox(box, (b) => inlineTexts(b).some((v) => v.includes('@'))) ??
    findBox(box, (b) => inlineTexts(b).length >= 3)
  const contact = contactBox ? inlineTexts(contactBox) : []
  const contactSet = new Set(contact)
  // Remaining text leaves in reading order ≈ [headline, …, summary].
  const others = allTexts(box).filter((v) => v && !contactSet.has(v))

  let email = '',
    phone = '',
    url = '',
    location = ''
  for (const v of contact) {
    if (v.includes('@')) email = v
    else if (/^\+?\d[\d\s()-]{4,}/.test(v)) phone = v
    else if (/\.[a-z]{2,}/i.test(v) && !v.includes(' ') && !v.includes('@')) url = v
    else location = v
  }

  return {
    name,
    headline: others[0] ?? '',
    email,
    phone,
    url,
    location,
    summary: others.length > 1 ? others[others.length - 1] : '',
  }
}

const KNOWN_ROLES = new Set([
  'experience',
  'volunteer',
  'education',
  'skills',
  'languages',
  'projects',
  'certifications',
  'awards',
  'publications',
  'references',
  'custom',
])

/** Find the first box with a given role, recursively (handles nested layouts). */
function findRoleBox(node: CanvasNode, role: string): CanvasBox | null {
  if (!isBox(node)) return null
  for (const c of node.children) {
    if (isBox(c) && c.role === role) return c
    const hit = findRoleBox(c, role)
    if (hit) return hit
  }
  return null
}

/** Collect role sections in document order, descending through role-less layout wrappers. */
function collectRoleSections(box: CanvasBox, out: Array<DocSection>): void {
  for (const c of box.children) {
    if (!isBox(c)) continue
    if (c.role && c.role !== 'header') {
      const role = KNOWN_ROLES.has(c.role) ? c.role : 'custom'
      out.push(recomposeSection(c, role))
    } else if (!c.role) {
      collectRoleSections(c, out) // a layout wrapper (sidebar row/column, band…) — descend
    }
  }
}

/** Rebuild a BlockDoc (header + sections) from the canvas root, for export / ATS. */
export function recompose(root: CanvasBox): BlockDoc {
  const header = recomposeHeader(findRoleBox(root, 'header') ?? root)
  const sections: Array<DocSection> = []
  collectRoleSections(root, sections)
  return { header, sections }
}
