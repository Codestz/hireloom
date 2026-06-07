import { describe, expect, it } from 'vitest'
import { makeBox, makeElement, isBox } from '#/lib/canvas/model'
import type { CanvasBox, CanvasElement } from '#/lib/canvas/model'
import type { ResolvedTokens } from '#/lib/templates'
import { runTools, toToolCalls } from './tool-engine'

const tokens = { baseFontSize: 10, space: (n: number) => n * 4 } as unknown as ResolvedTokens

function doc(): CanvasBox {
  const exp = makeBox('column', {}, [
    makeBox('column', {}, [makeElement('heading', { text: 'WORK', level: 2 })]),
  ])
  exp.role = 'work'
  return makeBox('column', {}, [exp])
}

describe('ToolEngine', () => {
  it('edits a list and reports a summary', async () => {
    const list = makeElement('list', { items: ['old'] })
    const root = makeBox('column', {}, [makeBox('column', {}, [list])])
    const res = await runTools(root, tokens, [{ tool: 'edit_list', args: { id: list.id, items: ['a', 'b'] } }])
    const edited = (res.root.children[0] as CanvasBox).children[0] as CanvasElement
    expect(edited.data.items).toEqual(['a', 'b'])
    expect(res.summary).toEqual(['Rewrite list (2)'])
    expect(res.errors).toEqual([])
  })

  it('adds an entry to a section by role, built canonically', async () => {
    const root = doc()
    const res = await runTools(root, tokens, [
      {
        tool: 'add_entry',
        args: { section: 'work', fields: { title: 'Engineer', company: 'Acme', bullets: ['x'] } },
      },
    ])
    const work = res.root.children[0] as CanvasBox
    // header sub-box + the new entry box
    expect(work.children).toHaveLength(2)
    const entry = work.children[1] as CanvasBox
    expect(isBox(entry)).toBe(true)
    expect(res.summary[0]).toMatch(/Add entry/)
  })

  it('rejects unknown tools and invalid args without mutating', async () => {
    const root = doc()
    const res = await runTools(root, tokens, [
      { tool: 'nope', args: {} },
      { tool: 'edit_text', args: { id: 123 } },
      { tool: 'remove', args: { id: root.id } },
    ])
    expect(res.root).toBe(root)
    expect(res.errors).toHaveLength(3)
  })

  it('toToolCalls filters junk', () => {
    expect(toToolCalls([{ tool: 'edit_text', args: {} }, 5, { args: {} }])).toHaveLength(1)
    expect(toToolCalls('nope')).toEqual([])
  })
})
