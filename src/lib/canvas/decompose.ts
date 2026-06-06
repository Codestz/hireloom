/**
 * Bridge: typed BlockDoc → canvas Box tree (WS-A, decompose direction).
 *
 * Explodes the header and each typed section into PURE PRIMITIVES — every field becomes its
 * own Text, every separator (` · `, ` – `) becomes a literal Separator node, every bullet its
 * own list item. The section's BlockDoc `type` is stamped as the Box `role` so the reverse
 * bridge (recompose, walked by role) can rebuild JSON-Resume for export/ATS.
 *
 * This is the migration that makes an existing CV "just work" in the builder: an old resume
 * with no persisted canvas gets one synthesized here, identical in content to its typed form.
 */

import type { BlockDoc, DocSection } from '#/lib/blocks/document'
import { makeBox, makeElement } from './model'
import type {
  CanvasBox,
  CanvasElement,
  CanvasNode,
  ElementStyle,
  SeparatorVariant,
} from './model'

const str = (v: unknown): string => (typeof v === 'string' ? v : '')
const strArray = (v: unknown): Array<string> =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []

function text(value: string, style?: ElementStyle): CanvasElement {
  return makeElement('text', { text: value }, style)
}

function heading(value: string, level: 1 | 2 | 3 = 2): CanvasElement {
  return makeElement('heading', { text: value, level })
}

function separator(variant: SeparatorVariant): CanvasElement {
  return makeElement('separator', { variant })
}

/**
 * Join non-empty text parts with a literal separator between each. Returns:
 * - null if every part is empty,
 * - a single Text if exactly one part is non-empty (no needless box/separator),
 * - else a horizontal Box of [Text, Separator, Text, …].
 */
function inlineParts(
  parts: Array<{ value: string; style?: ElementStyle }>,
  variant: SeparatorVariant,
): CanvasNode | null {
  const present = parts.filter((p) => p.value.trim() !== '')
  if (present.length === 0) return null
  if (present.length === 1) return text(present[0].value, present[0].style)
  const children: Array<CanvasNode> = []
  present.forEach((p, i) => {
    if (i > 0) children.push(separator(variant))
    children.push(text(p.value, p.style))
  })
  return makeBox('horizontal', { gap: 6 }, children)
}

const BOLD: ElementStyle = { fontWeight: 700 }
const MUTED: ElementStyle = { color: '#6b7280' }

/** A title·subtitle line (dot) + a start–end line (dash), shared by experience/education-like entries. */
function titleAndDates(
  title: { value: string; style?: ElementStyle },
  subtitle: string,
  start: string,
  end: string,
): Array<CanvasNode> {
  const out: Array<CanvasNode> = []
  const line = inlineParts([title, { value: subtitle }], 'dot')
  if (line) out.push(line)
  const dates = inlineParts([{ value: start }, { value: end }], 'dash')
  if (dates) out.push(dates)
  return out
}

/** One entry box for the given section type. */
function entryBox(type: string, d: Record<string, unknown>): CanvasBox {
  const children: Array<CanvasNode> = []
  const period = (d.period ?? {}) as { start?: unknown; end?: unknown }
  const start = str(period.start)
  const end = str(period.end)

  switch (type) {
    case 'experience': {
      children.push(
        ...titleAndDates({ value: str(d.title), style: BOLD }, str(d.company), start, end),
      )
      if (str(d.location)) children.push(text(str(d.location), MUTED))
      for (const b of strArray(d.bullets)) children.push(text(b))
      break
    }
    case 'volunteer': {
      children.push(
        ...titleAndDates({ value: str(d.role), style: BOLD }, str(d.organization), start, end),
      )
      if (str(d.location)) children.push(text(str(d.location), MUTED))
      for (const b of strArray(d.bullets)) children.push(text(b))
      break
    }
    case 'education': {
      children.push(
        ...titleAndDates(
          { value: str(d.institution), style: BOLD },
          str(d.degree),
          start,
          end,
        ),
      )
      if (str(d.area)) children.push(text(str(d.area), MUTED))
      break
    }
    case 'certifications': {
      children.push(text(str(d.name), BOLD))
      const line = inlineParts([{ value: str(d.issuer) }, { value: str(d.date) }], 'dot')
      if (line) children.push(line)
      break
    }
    case 'projects': {
      const line = inlineParts(
        [{ value: str(d.name), style: BOLD }, { value: str(d.url) }],
        'dot',
      )
      if (line) children.push(line)
      if (str(d.description)) children.push(text(str(d.description)))
      break
    }
    case 'awards': {
      children.push(
        ...titleAndDates({ value: str(d.title), style: BOLD }, str(d.awarder), str(d.date), ''),
      )
      if (str(d.summary)) children.push(text(str(d.summary)))
      break
    }
    case 'publications': {
      const line = inlineParts(
        [{ value: str(d.name), style: BOLD }, { value: str(d.publisher) }, { value: str(d.date) }],
        'dot',
      )
      if (line) children.push(line)
      if (str(d.url)) children.push(text(str(d.url), MUTED))
      if (str(d.summary)) children.push(text(str(d.summary)))
      break
    }
    case 'references': {
      children.push(text(str(d.name), BOLD))
      if (str(d.reference)) children.push(text(str(d.reference)))
      break
    }
    default: {
      // Unknown entry shape: dump any string fields as Text so nothing is silently lost.
      for (const v of Object.values(d)) if (str(v)) children.push(text(str(v)))
    }
  }
  return makeBox('vertical', { gap: 2 }, children)
}

/** Default heading text when a section has no custom heading. */
function sectionHeading(section: DocSection): string {
  if (section.heading?.trim()) return section.heading
  return section.type.replace(/(^|\s)\w/g, (m) => m.toUpperCase())
}

/** Tag-style sections (skills/languages) → a List of one Text per tag (user's simplification). */
function isTagSection(type: string): boolean {
  return type === 'skills' || type === 'languages'
}

/** A whole section → a role-tagged vertical Box { Heading, Divider, …content }. */
function sectionBox(section: DocSection): CanvasBox {
  const children: Array<CanvasNode> = [
    heading(sectionHeading(section)),
    makeElement('divider', {}),
  ]

  if (section.type === 'custom') {
    const lines = strArray(section.items.at(0)?.data.lines)
    if (lines.length) children.push(makeElement('list', { items: lines }))
  } else if (isTagSection(section.type)) {
    const tags = strArray(section.items.at(0)?.data.tags)
    if (tags.length) children.push(makeElement('list', { items: tags }))
  } else {
    for (const item of section.items) children.push(entryBox(section.type, item.data))
  }

  const box = makeBox('vertical', { gap: 12 }, children)
  box.role = section.type
  return box
}

/** The header (basics) → a vertical Box { Heading(name), Text(headline), contact Box, Text(summary) }. */
function headerBox(doc: BlockDoc): CanvasBox {
  const h = doc.header
  const children: Array<CanvasNode> = []
  if (h.name) children.push(makeElement('heading', { text: h.name, level: 1 }, { fontSize: 28, fontWeight: 700 }))
  if (h.headline) children.push(text(h.headline, MUTED))
  const contact = inlineParts(
    [{ value: h.email }, { value: h.phone }, { value: h.url }, { value: h.location }].map((p) => ({
      value: str(p.value),
    })),
    'dot',
  )
  if (contact) children.push(contact)
  const summary = typeof h.summary === 'string' ? h.summary : ''
  if (summary) children.push(text(summary))

  const box = makeBox('vertical', { gap: 4 }, children)
  box.role = 'header'
  return box
}

/**
 * Decompose a typed BlockDoc into a canvas root Box of pure primitives. Header first, then
 * each section in document order. Empty sections (no items / tags) still emit their heading
 * box so the structure stays visible and editable.
 */
export function decompose(doc: BlockDoc): CanvasBox {
  const children: Array<CanvasNode> = [headerBox(doc)]
  for (const section of doc.sections) children.push(sectionBox(section))
  return makeBox('vertical', { gap: 16 }, children)
}
