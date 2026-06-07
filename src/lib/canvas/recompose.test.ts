import { describe, expect, it } from 'vitest'
import type { BlockDoc } from '#/lib/blocks/document'
import type { ResolvedTokens } from '#/lib/templates'
import { decompose } from './decompose'
import { recompose } from './recompose'

const tokens: ResolvedTokens = {
  accent: '#2f6b4f',
  fontHeadingCss: 'serif',
  fontBodyCss: 'sans-serif',
  fontHeadingPdf: 'Times',
  fontBodyPdf: 'Helvetica',
  baseFontSize: 10,
  headerVariant: 'standard',
  layout: 'single',
  space: (n) => n,
}

function doc(): BlockDoc {
  return {
    header: {
      name: 'Esteban Estrada',
      headline: 'Senior Software Engineer',
      email: 'a@b.com',
      phone: '+57 3203700631',
      url: 'codestz.dev',
      location: 'Medellín, Antioquia',
      summary: 'Lead engineer who ships.',
    },
    sections: [
      {
        id: 'sec-experience',
        type: 'experience',
        heading: 'WORK HISTORY',
        items: [
          {
            id: 'w1',
            data: {
              title: 'Senior Software Engineer',
              company: 'Recurly',
              location: 'Medellín',
              period: { start: '04/2026', end: 'Present' },
              bullets: ['Led X', 'Built Y'],
            },
          },
        ],
      },
      {
        id: 'sec-education',
        type: 'education',
        items: [
          {
            id: 'e1',
            data: {
              institution: 'UNAD',
              degree: 'BSc',
              area: 'Software Engineering',
              period: { start: '', end: '2020' },
            },
          },
        ],
      },
      { id: 'sec-skills', type: 'skills', items: [{ id: 's1', data: { tags: ['TypeScript', 'Go'] } }] },
      {
        id: 'sec-certifications',
        type: 'certifications',
        items: [{ id: 'c1', data: { name: 'Claude 101', issuer: 'Anthropic', date: '' } }],
      },
    ],
  }
}

/** decompose → recompose should preserve content (the export-from-canvas round trip). */
describe('recompose (inverse of decompose)', () => {
  const back = recompose(decompose(doc(), tokens))
  const section = (type: string) => back.sections.find((s) => s.type === type)
  const item = (type: string) => section(type)?.items[0]?.data as Record<string, unknown>

  it('restores the header (name, headline, contact, summary)', () => {
    expect(back.header).toMatchObject({
      name: 'Esteban Estrada',
      headline: 'Senior Software Engineer',
      email: 'a@b.com',
      phone: '+57 3203700631',
      url: 'codestz.dev',
      location: 'Medellín, Antioquia',
      summary: 'Lead engineer who ships.',
    })
  })

  it('restores an experience entry (title/company/location/dates/bullets)', () => {
    expect(item('experience')).toMatchObject({
      title: 'Senior Software Engineer',
      company: 'Recurly',
      location: 'Medellín',
      period: { start: '04/2026', end: 'Present' },
      bullets: ['Led X', 'Built Y'],
    })
  })

  it('restores education + the custom section heading', () => {
    expect(item('education')).toMatchObject({ institution: 'UNAD', degree: 'BSc', area: 'Software Engineering' })
    expect(section('experience')?.heading).toBe('WORK HISTORY')
  })

  it('restores skills tags and certifications', () => {
    expect(item('skills')).toEqual({ tags: ['TypeScript', 'Go'] })
    expect(item('certifications')).toMatchObject({ name: 'Claude 101', issuer: 'Anthropic' })
  })
})

/** Genericity: a non-single layout (sidebar nests sections in columns) must still round-trip. */
describe('recompose across the sidebar layout', () => {
  const back = recompose(decompose(doc(), { ...tokens, layout: 'sidebar' }))
  const types = back.sections.map((s) => s.type).sort()

  it('recovers every section despite the two-column nesting', () => {
    expect(types).toEqual(['certifications', 'education', 'experience', 'skills'])
    expect(back.header.name).toBe('Esteban Estrada')
    expect(back.sections.find((s) => s.type === 'experience')?.items[0]?.data).toMatchObject({
      title: 'Senior Software Engineer',
      company: 'Recurly',
    })
  })
})
