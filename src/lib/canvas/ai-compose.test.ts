import { describe, expect, it } from 'vitest'
import { sanitizeAiNode } from './ai-compose'
import { isBox } from './model'
import type { CanvasBox, CanvasElement } from './model'

describe('sanitizeAiNode (security boundary)', () => {
  it('builds a clean tree, minting ids and whitelisting props', () => {
    const raw = {
      kind: 'box',
      id: 'evil-id', // ignored — fresh id minted
      role: 'skills',
      props: { display: 'flex', direction: 'column', gap: 8, evil: 'x', onClick: 'boom' },
      children: [
        { kind: 'heading', data: { text: 'SKILLS', level: 2 } },
        { kind: 'list', data: { items: ['TypeScript', 'Go', 42] } },
        { kind: 'script', data: { text: 'alert(1)' } }, // unknown kind → downgraded to text
      ],
    }
    const node = sanitizeAiNode(raw) as CanvasBox
    expect(node.kind).toBe('box')
    expect(node.id).not.toBe('evil-id')
    expect(node.role).toBe('skills')
    expect(node.props).toEqual({ display: 'flex', direction: 'column', gap: 8 }) // evil/onClick dropped
    expect(node.children.map((c) => c.kind)).toEqual(['heading', 'list', 'text'])
    expect((node.children[1] as CanvasElement).data.items).toEqual(['TypeScript', 'Go']) // 42 dropped
    expect((node.children[2] as CanvasElement).data.text).toBe('alert(1)') // downgraded, inert text
  })

  it('coerces element data and clamps heading level', () => {
    const h = sanitizeAiNode({ kind: 'heading', data: { text: 'Hi', level: 9 } }) as CanvasElement
    expect(h.data).toEqual({ text: 'Hi', level: 3 })
    const sep = sanitizeAiNode({ kind: 'separator', data: { variant: 'nope' } }) as CanvasElement
    expect(sep.data.variant).toBe('dot') // invalid → default
  })

  it('bounds depth — deeply nested boxes collapse to salvaged text', () => {
    let raw: Record<string, unknown> = { kind: 'box', children: [{ kind: 'text', data: { text: 'deep' } }] }
    for (let i = 0; i < 10; i++) raw = { kind: 'box', children: [raw] }
    const node = sanitizeAiNode(raw) as CanvasBox
    // Walk down; nothing should exceed the depth cap and it must not throw / recurse forever.
    let d = 0
    let cur: CanvasBox | null = node
    while (cur && isBox(cur) && cur.children.length) {
      const next = cur.children[0]
      d++
      cur = isBox(next) ? next : null
      if (d > 20) break
    }
    expect(d).toBeLessThanOrEqual(7)
  })

  it('returns null for junk', () => {
    expect(sanitizeAiNode({ kind: 'nonsense' })).toBeNull()
    expect(sanitizeAiNode(null)).toBeNull()
  })
})
