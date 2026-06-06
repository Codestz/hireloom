import { describe, expect, it } from 'vitest'
import type { BlockDoc } from '#/lib/blocks/document'
import { decompose } from './decompose'
import { isBox    } from './model'
import type {CanvasBox, CanvasElement, CanvasNode} from './model';
import { CanvasSchema } from './schema'

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
    expect(() => CanvasSchema.parse(decompose(doc()))).not.toThrow()
  })

  it('header: name→heading, contact→horizontal box of Text·Separator·Text (literal separators)', () => {
    const root = decompose(doc())
    const header = boxWithRole(root, 'header')!
    expect(header.props.direction).toBe('column')
    const headingEl = header.children[0] as CanvasElement
    expect(headingEl.kind).toBe('heading')
    expect(headingEl.data.text).toBe('Esteban Estrada')

    const contact = header.children.find((c) => isBox(c)) as CanvasBox
    expect(contact.props.direction).toBe('row')
    // email · phone · location (url empty → dropped). 3 texts + 2 separators.
    expect(kinds(contact.children)).toEqual(['text', 'separator', 'text', 'separator', 'text'])
    expect(contact.children.map(txt).filter(Boolean)).toEqual(['a@b.com', '+57 1', 'Medellín'])
  })

  it('experience: section box has role, heading, divider, and an entry box per item', () => {
    const root = decompose(doc())
    const work = boxWithRole(root, 'experience')!
    expect(work.children[0].kind).toBe('heading')
    expect((work.children[0] as CanvasElement).data.text).toBe('WORK HISTORY')
    expect(work.children[1].kind).toBe('divider')
    const entry = work.children[2] as CanvasBox
    expect(isBox(entry)).toBe(true)

    // title·company line is a horizontal box with a literal dot separator
    const titleLine = entry.children[0] as CanvasBox
    expect(kinds(titleLine.children)).toEqual(['text', 'separator', 'text'])
    expect((titleLine.children[1] as CanvasElement).data.variant).toBe('dot')

    // date line uses a dash separator
    const dateLine = entry.children[1] as CanvasBox
    expect((dateLine.children[1] as CanvasElement).data.variant).toBe('dash')

    // each bullet became its own Text
    const bulletTexts = entry.children.filter(
      (c) => c.kind === 'text' && ['Led X', 'Built Y'].includes(String((c).data.text)),
    )
    expect(bulletTexts).toHaveLength(2)
  })

  it('skills: section box → heading + divider + a single List of the tags', () => {
    const root = decompose(doc())
    const skills = boxWithRole(root, 'skills')!
    expect(kinds(skills.children)).toEqual(['heading', 'divider', 'list'])
    expect((skills.children[2] as CanvasElement).data.items).toEqual(['TypeScript', 'Go'])
  })

  it('every node has a unique id', () => {
    const ids: Array<string> = []
    const walk = (n: CanvasNode) => {
      ids.push(n.id)
      if (isBox(n)) n.children.forEach(walk)
    }
    walk(decompose(doc()))
    expect(new Set(ids).size).toBe(ids.length)
  })
})
