/**
 * Bridge: typed BlockDoc → canvas Box tree (WS-A, decompose direction).
 *
 * Maps the header + each typed section onto the canonical primitive builders (lib/canvas/builders),
 * the SAME constructors the AI layer uses — so an imported entry and an AI-added one are built
 * identically. Box `role` = the section type so the reverse bridge (recompose) can rebuild
 * JSON-Resume for export/ATS.
 */

import type { BlockDoc, DocSection } from '#/lib/blocks/document'
import type { ResolvedTokens } from '#/lib/templates'
import { isBox, makeBox, makeElement } from './model'
import type { CanvasBox, CanvasNode } from './model'
import { assignSectionNames } from './document-index'
import {
  INK,
  SUB,
  entryFor,
  heading,
  inlineRow,
  sectionShell,
  small,
  str,
  strArray,
  text,
} from './builders'

export function decompose(doc: BlockDoc, t: ResolvedTokens): CanvasBox {
  function sectionBox(section: DocSection, compact = false): CanvasBox {
    const children: Array<CanvasNode> = [sectionShell(t, sectionHeadingText(section))]

    if (section.type === 'custom') {
      const lines = strArray(section.items.at(0)?.data.lines)
      if (lines.length) children.push(makeElement('list', { items: lines }))
    } else if (section.type === 'skills' || section.type === 'languages') {
      const tags = strArray(section.items.at(0)?.data.tags)
      if (tags.length) children.push(makeElement('list', { items: tags }))
    } else {
      for (const item of section.items) children.push(entryFor(t, section.type, item.data, compact))
    }

    const box = makeBox('column', { gap: t.space(5) }, children)
    box.role = section.type
    return box
  }

  function headerBox(): CanvasBox {
    const h = doc.header
    const fs = t.baseFontSize
    const centered = t.headerVariant === 'centered'
    const center = centered ? ('center' as const) : undefined

    // name + headline + contact live in an inner block that is centered for the
    // 'centered' header variant (matches HeaderLayout); the summary stays left below it.
    const inner: Array<CanvasNode> = []
    if (h.name)
      inner.push(heading(h.name, 1, { fontSize: Math.round(fs * 2), color: INK, align: center }))
    if (h.headline)
      inner.push(text(h.headline, { fontSize: Math.round(fs * 1.1), color: SUB, align: center }))
    const contact = inlineRow(
      t,
      [h.email, h.phone, h.url, h.location].map((v) => ({ value: str(v), style: small(t) })),
      'dot',
    )
    if (contact) {
      if (centered && isBox(contact)) contact.props.justify = 'center'
      else if (centered && !isBox(contact)) contact.style = { ...contact.style, align: 'center' }
      inner.push(contact)
    }

    const innerBox = makeBox('column', { gap: t.space(2), align: center }, inner)
    const children: Array<CanvasNode> = [innerBox]
    const summary = typeof h.summary === 'string' ? h.summary : ''
    if (summary) children.push(text(summary, { marginTop: t.space(6) }))

    const box = makeBox('column', { gap: 0 }, children)
    box.role = 'header'
    return box
  }

  const header = headerBox()
  // In the sidebar layout, side-rail sections live in a narrow column → build them compact (stacked
  // heads) so title·date rows don't wrap. `arrange` then places them into the rail.
  const sidebar = t.layout === 'sidebar'
  const sections = doc.sections.map((s) => sectionBox(s, sidebar && SIDE_ROLES.has(s.type)))
  const root = arrange(t, header, sections)
  assignSectionNames(root) // unique @-mention labels for every section
  return root
}

/** Roles that go in the side rail for the 'sidebar' layout (skills/credentials/short lists). */
const SIDE_ROLES: ReadonlySet<string> = new Set([
  'skills',
  'languages',
  'certifications',
  'education',
  'interests',
  'awards',
])

/** Arrange the header + section boxes into the structural layout the template asks for. */
function arrange(t: ResolvedTokens, header: CanvasBox, sections: Array<CanvasBox>): CanvasBox {
  if (t.layout === 'sidebar') {
    const side = sections.filter((s) => SIDE_ROLES.has(s.role ?? ''))
    const main = sections.filter((s) => !SIDE_ROLES.has(s.role ?? ''))
    const body = makeBox('row', { gap: t.space(10), align: 'start' }, [
      makeBox('column', { gap: t.space(8), span: 8 }, main),
      makeBox('column', { gap: t.space(8), span: 4 }, side),
    ])
    return makeBox('column', { gap: t.space(10) }, [header, body])
  }
  if (t.layout === 'band') {
    tintHeaderBand(header, t)
    return makeBox('column', { gap: t.space(10) }, [header, ...sections])
  }
  return makeBox('column', { gap: t.space(10) }, [header, ...sections])
}

/** Turn the header into a full-width accent band with white text. */
function tintHeaderBand(header: CanvasBox, t: ResolvedTokens): void {
  header.props.bg = t.accent
  header.props.pad = t.space(8)
  header.props.radius = 6
  const recolor = (n: CanvasNode) => {
    if (isBox(n)) n.children.forEach(recolor)
    else n.style = { ...n.style, color: '#ffffff' }
  }
  header.children.forEach(recolor)
}

function sectionHeadingText(section: DocSection): string {
  if (section.heading?.trim()) return section.heading
  return section.type.replace(/(^|\s)\w/g, (m) => m.toUpperCase())
}
