import { describe, expect, it } from 'vitest'
import type { BlockDoc } from '#/lib/blocks/document'
import type { ResolvedTokens } from '#/lib/templates'
import { decompose } from './decompose'
import { isBox } from './model'
import type { CanvasBox, CanvasElement, CanvasNode } from './model'
import { CanvasSchema } from './schema'

const tokens: ResolvedTokens = {
  accent: '#2f6b4f',
  fontHeadingCss: 'serif',
  fontBodyCss: 'sans-serif',
  fontHeadingPdf: 'Times',
  fontBodyPdf: 'Helvetica',
  baseFontSize: 10,
  headerVariant: 'standard',
  space: (n) => n,
}

function doc(): BlockDoc {
  return {
    header: {
      name: 'Esteban Estrada',
      headline: 'Senior Software Engineer',
      email: 'a@b.com',
      phone: '+57 1',
      url: '',
      location: 'Medellín',
      summary: 'Lead engineer.',
    },
    sections: [
      {
        id: 'sec-experience',
        type: 'experience',
        heading: 'WORK HISTORY',
        items: [
          {
            id: 'w1',
            data: {
              title: 'Senior Software Engineer',
              company: 'Recurly',
              location: 'Medellín',
              period: { start: '04/2026', end: 'Present' },
              bullets: ['Led X', 'Built Y'],
            },
          },
        ],
      },
      {
        id: 'sec-skills',
        type: 'skills',
        items: [{ id: 'skills-1', data: { tags: ['TypeScript', 'Go'] } }],
      },
    ],
  }
}

/** Find the first descendant Box carrying the given role. */
function boxWithRole(root: CanvasBox, role: string): CanvasBox | undefined {
  if (root.role === role) return root
  for (const c of root.children) {
    if (isBox(c)) {
      const hit = boxWithRole(c, role)
      if (hit) return hit
    }
  }
  return undefined
}

const kinds = (nodes: Array<CanvasNode>) => nodes.map((n) => n.kind)
const txt = (n: CanvasNode) => (n as CanvasElement).data.text

describe('decompose', () => {
  it('produces a schema-valid root box', () => {
    expect(() => CanvasSchema.parse(decompose(doc(), tokens))).not.toThrow()
  })

  it('header: name→heading, contact→horizontal box of Text·Separator·Text (literal separators)', () => {
    const root = decompose(doc(), tokens)
    const header = boxWithRole(root, 'header')!
    expect(header.props.direction).toBe('column')
    // name + headline + contact live in an inner block
    const inner = header.children[0] as CanvasBox
    const headingEl = inner.children[0] as CanvasElement
    expect(headingEl.kind).toBe('heading')
    expect(headingEl.data.text).toBe('Esteban Estrada')

    const contact = inner.children.find((c) => isBox(c)) as CanvasBox
    expect(contact.props.direction).toBe('row')
    // email · phone · location (url empty → dropped). 3 texts + 2 separators.
    expect(kinds(contact.children)).toEqual(['text', 'separator', 'text', 'separator', 'text'])
    expect(contact.children.map(txt).filter(Boolean)).toEqual(['a@b.com', '+57 1', 'Medellín'])
  })

  it('experience: section box (role) → header sub-box {heading,divider} + an entry per item', () => {
    const root = decompose(doc(), tokens)
    const work = boxWithRole(root, 'experience')!
    const secHeader = work.children[0] as CanvasBox
    expect(kinds(secHeader.children)).toEqual(['heading', 'divider'])
    expect((secHeader.children[0] as CanvasElement).data.text).toBe('WORK HISTORY')

    const entry = work.children[1] as CanvasBox
    expect(isBox(entry)).toBe(true)

    // classic head row: title·company on the left (dot), period on the right (dash)
    const headRow = entry.children[0] as CanvasBox
    expect(headRow.props.justify).toBe('between')
    const left = headRow.children[0] as CanvasBox
    expect(kinds(left.children)).toEqual(['text', 'separator', 'text'])
    expect((left.children[1] as CanvasElement).data.variant).toBe('dot')
    const period = headRow.children[1] as CanvasBox
    expect((period.children[1] as CanvasElement).data.variant).toBe('dash')

    // bullets render as a single List (granular per line, bulleted look)
    const list = entry.children.find((c) => c.kind === 'list') as CanvasElement
    expect(list.data.items).toEqual(['Led X', 'Built Y'])
  })

  it('skills: section box → header sub-box + a single List of the tags', () => {
    const root = decompose(doc(), tokens)
    const skills = boxWithRole(root, 'skills')!
    expect(kinds(skills.children)).toEqual(['box', 'list'])
    expect((skills.children[1] as CanvasElement).data.items).toEqual(['TypeScript', 'Go'])
  })

  it('every node has a unique id', () => {
    const ids: Array<string> = []
    const walk = (n: CanvasNode) => {
      ids.push(n.id)
      if (isBox(n)) n.children.forEach(walk)
    }
    walk(decompose(doc(), tokens))
    expect(new Set(ids).size).toBe(ids.length)
  })
})
