import { describe, expect, it } from 'vitest'
import { matchResume } from './match'

describe('matchResume', () => {
  it('matches résumé keywords and flags missing ones', () => {
    const jd =
      'Build web apps with React, TypeScript and Python. Nice to have AWS and Docker.'
    const resume =
      'Senior engineer. Built web apps with React and TypeScript. Strong Python skills.'
    const r = matchResume(jd, resume)
    const matched = r.matched.map((k) => k.term)
    const missing = r.missing.map((k) => k.term)
    expect(matched).toContain('react')
    expect(matched).toContain('typescript')
    expect(matched).toContain('python')
    expect(missing).toContain('aws')
    expect(missing).toContain('docker')
    expect(r.score).toBeGreaterThan(0)
    expect(r.score).toBeLessThanOrEqual(100)
  })

  it('returns an empty result for an empty JD', () => {
    expect(matchResume('', 'anything')).toEqual({
      score: 0,
      matched: [],
      missing: [],
    })
  })

  it('drops stopwords and JD filler', () => {
    const terms = [
      ...matchResume('Required skills and responsibilities for the team.', 'x')
        .matched,
      ...matchResume('Required skills and responsibilities for the team.', 'x')
        .missing,
    ].map((k) => k.term)
    expect(terms).not.toContain('required')
    expect(terms).not.toContain('skills')
    expect(terms).not.toContain('the')
  })
})
