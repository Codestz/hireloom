import { describe, expect, it } from 'vitest'
import { makeBox, makeElement, isBox } from './model'
import type { CanvasBox } from './model'
import { applyChatOps, canvasOutline } from './chat-ops'
import type { ChatOp } from './chat-ops'

function root(): CanvasBox {
  const skills = makeBox('column', {}, [makeElement('heading', { text: 'SKILLS', level: 2 })])
  skills.role = 'skills'
  return makeBox('column', {}, [skills])
}

describe('applyChatOps', () => {
  it('adds a sanitized subtree into a box resolved by role', () => {
    const r = root()
    const ops: Array<ChatOp> = [
      {
        op: 'add',
        target: 'skills',
        node: { kind: 'list', data: { items: ['TypeScript', 'Go'] } },
      },
    ]
    const { root: next, summary } = applyChatOps(r, ops)
    const skills = next.children.find((c) => isBox(c) && c.role === 'skills') as CanvasBox
    expect(skills.children.map((c) => c.kind)).toEqual(['heading', 'list'])
    expect(summary[0]).toMatch(/Add list/)
  })

  it('edits a node text by id and removes by id', () => {
    const r = root()
    const skills = r.children[0] as CanvasBox
    const headingId = skills.children[0].id
    const edited = applyChatOps(r, [{ op: 'edit_text', id: headingId, text: 'CORE SKILLS' }]).root
    const h = (edited.children[0] as CanvasBox).children[0]
    expect((h as { data: { text: string } }).data.text).toBe('CORE SKILLS')

    const removed = applyChatOps(r, [{ op: 'remove', id: headingId }]).root
    expect((removed.children[0] as CanvasBox).children).toHaveLength(0)
  })

  it('ignores junk add nodes (sanitizer rejects) and never removes the root', () => {
    const r = root()
    expect(applyChatOps(r, [{ op: 'add', target: 'page', node: { kind: 'evil' } }]).root.children).toHaveLength(1)
    expect(applyChatOps(r, [{ op: 'remove', id: r.id }]).root).toBe(r)
  })

  it('grafts the existing entry styling onto an AI-added item (model omits style)', () => {
    // certifications section: header + one styled entry (bold name · issuer)
    const name = makeElement('text', { text: 'Claude 101' }, { fontWeight: 700, color: '#171717' })
    const sep = makeElement('separator', { variant: 'dot' })
    const issuer = makeElement('text', { text: 'Anthropic' }, { color: '#525252' })
    const entry = makeBox('column', {}, [makeBox('row', {}, [name, sep, issuer])])
    const header = makeBox('column', {}, [makeElement('heading', { text: 'CERTIFICATIONS', level: 2 })])
    const certs = makeBox('column', {}, [header, entry])
    certs.role = 'certifications'
    const r = makeBox('column', {}, [certs])

    // model returns the right structure but NO style on the new name
    const ops: Array<ChatOp> = [
      {
        op: 'add',
        target: 'certifications',
        node: {
          kind: 'box',
          props: { display: 'flex', direction: 'column' },
          children: [
            {
              kind: 'box',
              props: { display: 'flex', direction: 'row' },
              children: [
                { kind: 'text', data: { text: 'AWS Solutions Architect' } },
                { kind: 'separator', data: { variant: 'dot' } },
                { kind: 'text', data: { text: 'Amazon' } },
              ],
            },
          ],
        },
      },
    ]
    const next = applyChatOps(r, ops).root
    const section = next.children[0] as CanvasBox
    const added = section.children.at(-1) as CanvasBox
    const row = added.children[0] as CanvasBox
    const newName = row.children[0] as { style?: { fontWeight?: number } }
    expect(newName.style?.fontWeight).toBe(700) // grafted from the existing entry
  })

  it('canvasOutline lists nodes with ids the model can reference', () => {
    const out = canvasOutline(root())
    expect(out).toMatch(/box role=skills/)
    expect(out).toMatch(/heading "SKILLS"/)
    expect(out).toContain('(') // ids present
  })
})
