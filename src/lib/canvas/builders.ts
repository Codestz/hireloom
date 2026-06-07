/**
 * Canonical canvas builders — the ONE place that knows how a resume entry/section is constructed
 * from primitives (the classic INK/SUB/MUTED design, token-derived spacing, the space-between
 * title/date row, the section heading + rule). Both `decompose` (import → canvas) and the AI layer
 * (compose / add-entry tools) call these, so an AI-added item is built identically to an imported
 * one. Pure: tokens + plain data in, CanvasNode out.
 */
import { makeBox, makeElement } from './model'
import type { CanvasBox, CanvasElement, CanvasNode, ElementStyle, SeparatorVariant } from './model'
import type { ResolvedTokens } from '#/lib/templates'

// Same ink palette the typed Layouts use (layouts/primitives.tsx).
export const INK = '#171717'
export const SUB = '#525252'
export const MUTED = '#737373'

export const str = (v: unknown): string => (typeof v === 'string' ? v : '')
export const strArray = (v: unknown): Array<string> =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []

export function text(value: string, style?: ElementStyle): CanvasElement {
  return makeElement('text', { text: value }, style)
}
export function heading(value: string, level: 1 | 2 | 3, style?: ElementStyle): CanvasElement {
  return makeElement('heading', { text: value, level }, style)
}
export function separator(variant: SeparatorVariant): CanvasElement {
  return makeElement('separator', { variant })
}

export interface Part {
  value: string
  style?: ElementStyle
}

/** Muted small-print style (locations, dates). */
export const small = (t: ResolvedTokens): ElementStyle => ({
  color: MUTED,
  fontSize: Math.round(t.baseFontSize * 0.9),
})

/**
 * A horizontal run of non-empty parts joined by a literal separator. null if all empty;
 * a bare Text if only one part; else a row Box of [Text, Separator, Text, …].
 */
export function inlineRow(
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

/** A title·subtitle line on the left, period on the right (classic space-between row). */
export function headRow(
  t: ResolvedTokens,
  title: Part,
  subtitle: string,
  start: string,
  end: string,
): CanvasNode {
  const left =
    inlineRow(t, [title, { value: subtitle, style: { color: SUB } }], 'dot') ??
    text(title.value, title.style)
  const period = inlineRow(
    t,
    [
      { value: start, style: small(t) },
      { value: end, style: small(t) },
    ],
    'dash',
  )
  if (!period) return left
  return makeBox('row', { justify: 'between', align: 'baseline', gap: t.space(8) }, [left, period])
}

/**
 * Build one entry box for a section type (experience, education, certifications, …) from its
 * plain data. Mirrors the classic typed Layouts. Used by decompose AND the AI add-entry tools.
 */
export function entryFor(t: ResolvedTokens, type: string, d: Record<string, unknown>): CanvasBox {
  const children: Array<CanvasNode> = []
  const period = (d.period ?? {}) as { start?: unknown; end?: unknown }
  const start = str(period.start)
  const end = str(period.end)
  const bullets = (items: Array<string>) => {
    if (items.length) children.push(makeElement('list', { items }))
  }

  switch (type) {
    case 'experience':
      children.push(headRow(t, { value: str(d.title), style: { fontWeight: 700, color: INK } }, str(d.company), start, end))
      if (str(d.location)) children.push(text(str(d.location), small(t)))
      bullets(strArray(d.bullets))
      break
    case 'volunteer':
      children.push(headRow(t, { value: str(d.role), style: { fontWeight: 700, color: INK } }, str(d.organization), start, end))
      if (str(d.location)) children.push(text(str(d.location), small(t)))
      bullets(strArray(d.bullets))
      break
    case 'education':
      children.push(headRow(t, { value: str(d.institution), style: { fontWeight: 700, color: INK } }, str(d.degree), start, end))
      if (str(d.area)) children.push(text(str(d.area), small(t)))
      break
    case 'certifications': {
      const row = inlineRow(
        t,
        [{ value: str(d.name), style: { fontWeight: 700, color: INK } }, { value: str(d.issuer), style: { color: SUB } }, { value: str(d.date), style: small(t) }],
        'dot',
      )
      if (row) children.push(row)
      break
    }
    case 'projects': {
      const row = inlineRow(t, [{ value: str(d.name), style: { fontWeight: 700, color: INK } }, { value: str(d.url), style: small(t) }], 'dot')
      if (row) children.push(row)
      if (str(d.description)) children.push(text(str(d.description)))
      break
    }
    case 'awards':
      children.push(headRow(t, { value: str(d.title), style: { fontWeight: 700, color: INK } }, str(d.awarder), str(d.date), ''))
      if (str(d.summary)) children.push(text(str(d.summary)))
      break
    case 'publications': {
      const row = inlineRow(t, [{ value: str(d.name), style: { fontWeight: 700, color: INK } }, { value: str(d.publisher), style: { color: SUB } }, { value: str(d.date), style: small(t) }], 'dot')
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

/** A section's heading + rule, tight together (classic SectionHeading look). */
export function sectionShell(t: ResolvedTokens, headingText: string): CanvasBox {
  return makeBox('column', { gap: t.space(1) }, [heading(headingText, 2), makeElement('divider', {})])
}
