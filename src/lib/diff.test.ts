import { describe, expect, it } from 'vitest'
import { diffLines } from './diff'

describe('diffLines', () => {
  it('keeps unchanged lines, marks removals and additions', () => {
    const d = diffLines(['a', 'b', 'c'], ['a', 'B', 'c'])
    expect(d).toEqual([
      { t: 'same', text: 'a' },
      { t: 'del', text: 'b' },
      { t: 'add', text: 'B' },
      { t: 'same', text: 'c' },
    ])
  })

  it('handles pure additions and removals', () => {
    expect(diffLines([], ['x']).map((l) => l.t)).toEqual(['add'])
    expect(diffLines(['x'], []).map((l) => l.t)).toEqual(['del'])
    expect(diffLines(['x'], ['x']).map((l) => l.t)).toEqual(['same'])
  })
})
