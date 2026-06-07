import { describe, expect, it } from 'vitest'
import { makeBox, makeElement } from './model'
import { canvasOutline, canvasText, findSummaryNode } from './canvas-text'

describe('canvas-text', () => {
  it('flattens headings, text, and list items to newline-joined text', () => {
    const root = makeBox('column', {}, [
      makeElement('heading', { text: 'Skills', level: 2 }),
      makeElement('list', { items: ['TypeScript', 'Go'] }),
      makeElement('text', { text: 'A summary line.' }),
    ])
    expect(canvasText(root)).toBe('Skills\nTypeScript\nGo\nA summary line.')
  })

  it('finds the header section summary node', () => {
    const summary = makeElement('text', { text: 'Senior engineer with…' })
    const header = makeBox('column', {}, [
      makeBox('column', {}, [makeElement('heading', { text: 'Jane', level: 1 })]),
      summary,
    ])
    header.role = 'header'
    const root = makeBox('column', {}, [header])
    expect(findSummaryNode(root)?.id).toBe(summary.id)
    expect(findSummaryNode(makeBox('column', {}, []))).toBeNull()
  })

  it('canvasOutline carries node ids + content (text + list items)', () => {
    const skills = makeBox('column', {}, [
      makeElement('heading', { text: 'SKILLS', level: 2 }),
      makeElement('list', { items: ['TypeScript', 'Go'] }),
    ])
    skills.role = 'skills'
    const out = canvasOutline(makeBox('column', {}, [skills]))
    expect(out).toMatch(/box role=skills/)
    expect(out).toMatch(/heading \([^)]+\): SKILLS/)
    expect(out).toMatch(/1\. TypeScript/)
    expect(out).toMatch(/2\. Go/)
  })
})
