import { describe, expect, it } from 'vitest'
import { INK, entryFor, sectionShell } from './builders'
import { isBox } from './model'
import type { CanvasBox, CanvasElement } from './model'
import type { ResolvedTokens } from '#/lib/templates'

const t = { baseFontSize: 10, space: (n: number) => n * 4 } as unknown as ResolvedTokens

describe('builders', () => {
  it('experience entry = head row + location + bullets', () => {
    const e = entryFor(t, 'experience', {
      title: 'Engineer',
      company: 'Acme',
      location: 'NYC',
      period: { start: '2020', end: '2023' },
      bullets: ['did x', 'did y'],
    })
    expect(e.kind).toBe('box')
    expect(e.children.map((c) => c.kind)).toEqual(['box', 'text', 'list'])
    expect((e.children[2] as CanvasElement).data.items).toEqual(['did x', 'did y'])
  })

  it('certification entry = one inline row with a bold INK name', () => {
    const c = entryFor(t, 'certifications', { name: 'AWS SA', issuer: 'Amazon', date: '2024' })
    const row = c.children[0]
    expect(isBox(row)).toBe(true)
    const name = (row as CanvasBox).children[0] as CanvasElement
    expect(name.data.text).toBe('AWS SA')
    expect(name.style?.fontWeight).toBe(700)
    expect(name.style?.color).toBe(INK)
  })

  it('sectionShell = heading(level 2) + divider', () => {
    const s = sectionShell(t, 'Skills')
    expect(s.children.map((c) => c.kind)).toEqual(['heading', 'divider'])
    expect((s.children[0] as CanvasElement).data).toMatchObject({ text: 'Skills', level: 2 })
  })
})
