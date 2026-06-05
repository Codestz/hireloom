import { describe, expect, it } from 'vitest'
import { createEmptyResume, createSampleResume } from './default'
import { ResumeSchema } from './schema'
import { parseResumeJson, safeParseResume } from './validate'

describe('résumé model', () => {
  it('empty résumé is schema-valid and round-trips through JSON', () => {
    const empty = createEmptyResume()
    expect(ResumeSchema.safeParse(empty).success).toBe(true)

    const result = parseResumeJson(JSON.stringify(empty))
    expect(result.ok).toBe(true)
  })

  it('sample résumé is schema-valid', () => {
    expect(ResumeSchema.safeParse(createSampleResume()).success).toBe(true)
  })

  it('accepts JSON Resume date variants (YYYY, YYYY-MM, YYYY-MM-DD)', () => {
    for (const startDate of ['2020', '2020-06', '2020-06-15']) {
      expect(safeParseResume({ work: [{ name: 'Acme', startDate }] }).ok).toBe(
        true,
      )
    }
  })

  it('rejects malformed dates and non-JSON', () => {
    expect(safeParseResume({ work: [{ startDate: 'June 2020' }] }).ok).toBe(
      false,
    )
    expect(parseResumeJson('{not json').ok).toBe(false)
  })

  it('rejects structurally-wrong input (array where object expected)', () => {
    expect(safeParseResume({ basics: [] }).ok).toBe(false)
  })
})
