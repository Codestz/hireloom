import { describe, expect, it } from 'vitest'
import { JSON_RESUME_SCHEMA_URL, parseResumeJson } from '#/lib/resume'
import { slugify } from '#/lib/utils.ts'
import { buildResumeExport } from './export'

describe('JSON Resume export', () => {
  it('slugify strips diacritics and non-alphanumerics', () => {
    expect(slugify('My résumé')).toBe('my-resume')
    expect(slugify('Ada Lovelace — CV')).toBe('ada-lovelace-cv')
    expect(slugify('   ')).toBe('resume')
  })

  it('stamps $schema and meta.version', () => {
    const out = buildResumeExport({ basics: { name: 'Ada' } })
    expect(out.$schema).toBe(JSON_RESUME_SCHEMA_URL)
    expect(out.meta?.version).toBe('v1.0.0')
    expect(out.basics?.name).toBe('Ada')
  })

  it('preserves an existing $schema', () => {
    const out = buildResumeExport({ $schema: 'custom://x', basics: {} })
    expect(out.$schema).toBe('custom://x')
  })

  it('export → import round-trips through the validator', () => {
    const exported = buildResumeExport({
      basics: { name: 'Ada', email: 'ada@example.com' },
      work: [{ name: 'Acme', startDate: '2020-01' }],
    })
    const result = parseResumeJson(JSON.stringify(exported))
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.resume.basics?.name).toBe('Ada')
      expect(result.resume.work?.[0].name).toBe('Acme')
    }
  })
})
