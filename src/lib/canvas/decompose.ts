/**
 * Bridge: typed BlockDoc → canvas Box tree (WS-A, decompose direction).
 *
 * Explodes the header and each typed section into PURE PRIMITIVES — every field its own Text,
 * every separator a literal node, bullets a List. Crucially it reproduces the *classic* typed
 * design (ExperienceClassic et al.) using only node layout + style: a space-between title/date
 * row, the INK/SUB/MUTED palette, token-derived sizes/spacing, the section-heading rule. This
 * proves the builder can match the hand-tuned look with config alone. Box `role` = the section
 * type so the reverse bridge (recompose) can rebuild JSON-Resume for export/ATS.
 */

import type { BlockDoc, DocSection } from '#/lib/blocks/document'
import type { ResolvedTokens } from '#/lib/templates'
import { makeBox, makeElement } from './model'
import type {
  CanvasBox,
  CanvasElement,
  CanvasNode,
  ElementStyle,
  SeparatorVariant,
} from './model'

// Same ink palette the typed Layouts use (layouts/primitives.tsx).
const INK = '#171717'
const SUB = '#525252'
const MUTED = '#737373'

const str = (v: unknown): string => (typeof v === 'string' ? v : '')
const strArray = (v: unknown): Array<string> =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []

function text(value: string, style?: ElementStyle): CanvasElement {
  return makeElement('text', { text: value }, style)
}
function heading(value: string, level: 1 | 2 | 3, style?: ElementStyle): CanvasElement {
  return makeElement('heading', { text: value, level }, style)
}
function separator(variant: SeparatorVariant): CanvasElement {
  return makeElement('separator', { variant })
}

interface Part {
  value: string
  style?: ElementStyle
}

/**
 * A horizontal run of non-empty parts joined by a literal separator. null if all empty;
 * a bare Text if only one part; else a row Box of [Text, Separator, Text, …].
 */
function inlineRow(
  t: ResolvedTokens,
  parts: Array<Part>,
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
  return makeBox('row', { gap: t.space(2), align: 'baseline' }, children)
}

export function decompose(doc: BlockDoc, t: ResolvedTokens): CanvasBox {
  const small = (): ElementStyle => ({ color: MUTED, fontSize: Math.round(t.baseFontSize * 0.9) })

  /** A title·subtitle line on the left, period on the right (classic space-between row). */
  function headRow(title: Part, subtitle: string, start: string, end: string): CanvasNode {
    const left =
      inlineRow(t, [title, { value: subtitle, style: { color: SUB } }], 'dot') ??
      text(title.value, title.style)
    const period = inlineRow(
      t,
      [
        { value: start, style: small() },
        { value: end, style: small() },
      ],
      'dash',
    )
    if (!period) return left
    return makeBox('row', { justify: 'between', align: 'baseline', gap: t.space(8) }, [
      left,
      period,
    ])
  }

  function entryBox(type: string, d: Record<string, unknown>): CanvasBox {
    const children: Array<CanvasNode> = []
    const period = (d.period ?? {}) as { start?: unknown; end?: unknown }
    const start = str(period.start)
    const end = str(period.end)
    const bullets = (items: Array<string>) => {
      if (items.length) children.push(makeElement('list', { items }))
    }

    switch (type) {
      case 'experience':
        children.push(headRow({ value: str(d.title), style: { fontWeight: 700, color: INK } }, str(d.company), start, end))
        if (str(d.location)) children.push(text(str(d.location), small()))
        bullets(strArray(d.bullets))
        break
      case 'volunteer':
        children.push(headRow({ value: str(d.role), style: { fontWeight: 700, color: INK } }, str(d.organization), start, end))
        if (str(d.location)) children.push(text(str(d.location), small()))
        bullets(strArray(d.bullets))
        break
      case 'education':
        children.push(headRow({ value: str(d.institution), style: { fontWeight: 700, color: INK } }, str(d.degree), start, end))
        if (str(d.area)) children.push(text(str(d.area), small()))
        break
      case 'certifications': {
        const row = inlineRow(
          t,
          [{ value: str(d.name), style: { fontWeight: 700, color: INK } }, { value: str(d.issuer), style: { color: SUB } }, { value: str(d.date), style: small() }],
          'dot',
        )
        if (row) children.push(row)
        break
      }
      case 'projects': {
        const row = inlineRow(t, [{ value: str(d.name), style: { fontWeight: 700, color: INK } }, { value: str(d.url), style: small() }], 'dot')
        if (row) children.push(row)
        if (str(d.description)) children.push(text(str(d.description)))
        break
      }
      case 'awards':
        children.push(headRow({ value: str(d.title), style: { fontWeight: 700, color: INK } }, str(d.awarder), str(d.date), ''))
        if (str(d.summary)) children.push(text(str(d.summary)))
        break
      case 'publications': {
        const row = inlineRow(t, [{ value: str(d.name), style: { fontWeight: 700, color: INK } }, { value: str(d.publisher), style: { color: SUB } }, { value: str(d.date), style: small() }], 'dot')
        if (row) children.push(row)
        if (str(d.summary)) children.push(text(str(d.summary)))
        break
      }
      case 'references':
        children.push(text(str(d.name), { fontWeight: 700, color: INK }))
        if (str(d.reference)) children.push(text(str(d.reference)))
        break
      default:
        for (const v of Object.values(d)) if (str(v)) children.push(text(str(v)))
    }
    return makeBox('column', { gap: t.space(1) }, children)
  }

  function sectionBox(section: DocSection): CanvasBox {
    // Section heading + rule, tight together (classic SectionHeading look).
    const header = makeBox('column', { gap: t.space(1) }, [
      heading(sectionHeadingText(section), 2),
      makeElement('divider', {}),
    ])
    const children: Array<CanvasNode> = [header]

    if (section.type === 'custom') {
      const lines = strArray(section.items.at(0)?.data.lines)
      if (lines.length) children.push(makeElement('list', { items: lines }))
    } else if (section.type === 'skills' || section.type === 'languages') {
      const tags = strArray(section.items.at(0)?.data.tags)
      if (tags.length) children.push(makeElement('list', { items: tags }))
    } else {
      for (const item of section.items) children.push(entryBox(section.type, item.data))
    }

    const box = makeBox('column', { gap: t.space(5) }, children)
    box.role = section.type
    return box
  }

  function headerBox(): CanvasBox {
    const h = doc.header
    const children: Array<CanvasNode> = []
    if (h.name)
      children.push(heading(h.name, 1, { fontSize: Math.round(t.baseFontSize * 2), color: INK }))
    if (h.headline) children.push(text(h.headline, { color: SUB }))
    const contact = inlineRow(
      t,
      [h.email, h.phone, h.url, h.location].map((v) => ({ value: str(v), style: small() })),
      'dot',
    )
    if (contact) children.push(contact)
    const summary = typeof h.summary === 'string' ? h.summary : ''
    if (summary) children.push(text(summary))

    const box = makeBox('column', { gap: t.space(2) }, children)
    box.role = 'header'
    return box
  }

  const children: Array<CanvasNode> = [headerBox()]
  for (const section of doc.sections) children.push(sectionBox(section))
  return makeBox('column', { gap: t.space(10) }, children)
}

function sectionHeadingText(section: DocSection): string {
  if (section.heading?.trim()) return section.heading
  return section.type.replace(/(^|\s)\w/g, (m) => m.toUpperCase())
}
