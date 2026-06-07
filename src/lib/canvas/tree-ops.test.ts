import { describe, expect, it } from 'vitest'
import { makeBox, makeElement } from './model'
import type { CanvasBox } from './model'
import { CanvasSchema } from './schema'
import {
  addChild,
  findNode,
  findParent,
  insertNode,
  mapNode,
  moveNode,
  pathToNode,
  removeNode,
  setBoxRole,
  updateBoxProps,
  updateElementData,
  updateElementStyle,
} from './tree-ops'

/** Build a small fixture: root[V] { headerBox[H]{ textA, sep, textB }, skills[V, role:skills]{ list } } */
function fixture() {
  const textA = makeElement('text', { text: 'A' })
  const sep = makeElement('separator', { variant: 'dot' })
  const textB = makeElement('text', { text: 'B' })
  const header = makeBox('row', {}, [textA, sep, textB])
  const list = makeElement('list', { items: ['x', 'y'] })
  const skills = makeBox('column', {}, [list])
  skills.role = 'skills'
  const root = makeBox('column', {}, [header, skills])
  return { root, textA, sep, textB, header, list, skills }
}

describe('findNode / findParent / pathToNode', () => {
  it('finds nodes and their parents at any depth', () => {
    const { root, textB, header, list, skills } = fixture()
    expect(findNode(root, textB.id)).toBe(textB)
    expect(findNode(root, 'missing')).toBeNull()
    expect(findParent(root, textB.id)).toBe(header)
    expect(findParent(root, list.id)).toBe(skills)
    expect(findParent(root, root.id)).toBeNull()
  })

  it('returns the id path from root to node', () => {
    const { root, textB, header } = fixture()
    expect(pathToNode(root, textB.id)).toEqual([root.id, header.id, textB.id])
    expect(pathToNode(root, 'missing')).toEqual([])
  })
})

describe('immutability', () => {
  it('mapNode returns a new root but leaves untouched subtrees by reference', () => {
    const { root, textA, skills } = fixture()
    const next = mapNode(root, textA.id, (n) => ({ ...n }))
    expect(next).not.toBe(root)
    // skills branch was untouched → same reference preserved
    expect(findNode(next, skills.id)).toBe(skills)
  })
})

describe('updates', () => {
  it('updateBoxProps merges props', () => {
    const { root, header } = fixture()
    const next = updateBoxProps(root, header.id, { gap: 8, direction: 'column' })
    const box = findNode(next, header.id) as CanvasBox
    expect(box.props).toEqual({ display: 'flex', direction: 'column', gap: 8 })
  })

  it('setBoxRole sets and clears', () => {
    const { root, header, skills } = fixture()
    expect((findNode(setBoxRole(root, header.id, 'work'), header.id) as CanvasBox).role).toBe('work')
    expect((findNode(setBoxRole(root, skills.id, undefined), skills.id) as CanvasBox).role).toBeUndefined()
  })

  it('updateElementData / updateElementStyle merge', () => {
    const { root, textA } = fixture()
    let next = updateElementData(root, textA.id, { text: 'Z' })
    next = updateElementStyle(next, textA.id, { fontWeight: 700 })
    const el = findNode(next, textA.id)
    expect(el).toMatchObject({ data: { text: 'Z' }, style: { fontWeight: 700 } })
  })

  it('update ops are no-ops on the wrong node type', () => {
    const { root, header, textA } = fixture()
    expect(updateElementData(root, header.id, { text: 'x' })).toBe(root) // header is a Box
    expect(updateBoxProps(root, textA.id, { gap: 4 })).toBe(root) // textA is an Element
  })
})

describe('structure: insert / add / remove / move', () => {
  it('insertNode at index, addChild appends', () => {
    const { root, header, textA } = fixture()
    const mid = makeElement('text', { text: 'MID' })
    const next = insertNode(root, header.id, mid, 1)
    const box = findNode(next, header.id) as CanvasBox
    expect(box.children[1]).toBe(mid)
    expect(box.children[0]).toBe(textA)

    const tail = makeElement('text', { text: 'TAIL' })
    const appended = addChild(root, header.id, tail)
    const box2 = findNode(appended, header.id) as CanvasBox
    expect(box2.children.at(-1)).toBe(tail)
  })

  it('removeNode drops the subtree; cannot remove root', () => {
    const { root, sep, header } = fixture()
    const next = removeNode(root, sep.id)
    expect(findNode(next, sep.id)).toBeNull()
    expect((findNode(next, header.id) as CanvasBox).children).toHaveLength(2)
    expect(removeNode(root, root.id)).toBe(root)
  })

  it('moveNode relocates a node into another box', () => {
    const { root, textA, skills, header } = fixture()
    const next = moveNode(root, textA.id, skills.id, 0)
    expect((findNode(next, skills.id) as CanvasBox).children[0]).toBe(textA)
    expect((findNode(next, header.id) as CanvasBox).children).toHaveLength(2)
  })

  it('moveNode refuses to drop a box into itself or a descendant', () => {
    const { root, header, textA } = fixture()
    expect(moveNode(root, header.id, header.id, 0)).toBe(root)
    expect(moveNode(root, header.id, textA.id, 0)).toBe(root) // textA is inside header
  })
})

describe('schema round-trip', () => {
  it('parses a tree and preserves structure', () => {
    const { root } = fixture()
    const parsed = CanvasSchema.parse(root)
    expect(parsed).toEqual(root)
    // re-parse is stable
    expect(CanvasSchema.parse(parsed)).toEqual(parsed)
  })

  it('applies prop defaults and tolerates extra keys', () => {
    const raw = {
      id: 'box-1',
      kind: 'box',
      props: { foo: 'bar' },
      children: [{ id: 'text-1', kind: 'text', data: { text: 'hi' } }],
    }
    const parsed = CanvasSchema.parse(raw)
    expect(parsed.props.display).toBe('flex') // default applied
  })
})
