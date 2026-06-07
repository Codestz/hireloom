import { describe, expect, it } from 'vitest'
import { makeBox, makeElement } from './model'
import type { CanvasBox } from './model'
import { assignSectionNames, documentIndex, humanizeRole, sectionLabel } from './document-index'

function section(role: string | undefined, headingText: string): CanvasBox {
  const header = makeBox('column', {}, [makeElement('heading', { text: headingText, level: 2 })])
  const box = makeBox('column', {}, [header, makeBox('column', {}, [makeElement('text', { text: 'entry' })])])
  if (role) box.role = role
  return box
}

describe('document index', () => {
  it('lists top-level sections with derived names, role and headingId', () => {
    const exp = section('work', 'Work History')
    const skills = section('skills', 'Skills')
    const root = makeBox('column', {}, [exp, skills])
    assignSectionNames(root)
    const idx = documentIndex(root)
    expect(idx.map((s) => s.name)).toEqual(['Work History', 'Skills'])
    expect(idx[0].role).toBe('work')
    expect(idx[0].id).toBe(exp.id)
    expect(idx[0].headingId).toBe((exp.children[0] as CanvasBox).children[0].id)
  })

  it('de-duplicates names with numeric suffixes', () => {
    const a = section('custom', 'Projects')
    const b = section('custom', 'Projects')
    const root = makeBox('column', {}, [a, b])
    assignSectionNames(root)
    expect([a.name, b.name]).toEqual(['Projects', 'Projects 2'])
    expect(documentIndex(root).map((s) => s.name)).toEqual(['Projects', 'Projects 2'])
  })

  it('keeps an existing (user-set) name and labels header by role', () => {
    const renamed = section('custom', 'Side Stuff')
    renamed.name = 'My Side Projects'
    const header = makeBox('column', {}, [makeElement('heading', { text: 'Jane Doe', level: 1 })])
    header.role = 'header'
    const root = makeBox('column', {}, [header, renamed])
    assignSectionNames(root)
    expect(sectionLabel(header)).toBe('Header') // not the person's name
    expect(renamed.name).toBe('My Side Projects')
  })

  it('ignores non-section boxes (no role, no heading)', () => {
    const plain = makeBox('column', {}, [makeElement('text', { text: 'loose' })])
    const root = makeBox('column', {}, [plain])
    expect(documentIndex(root)).toHaveLength(0)
  })

  it('humanizeRole maps known roles and title-cases unknowns', () => {
    expect(humanizeRole('work')).toBe('Experience')
    expect(humanizeRole('side_hustle')).toBe('Side Hustle')
  })
})
