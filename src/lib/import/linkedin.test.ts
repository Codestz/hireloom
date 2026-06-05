import { describe, expect, it } from 'vitest'
import { parseLinkedInResume } from './linkedin'

// Mirrors the structure of a real LinkedIn "Save to PDF" export (Spanish locale),
// post column-separation + line-grouping. pdf-text.ts (geometry/pdf.js) is verified
// in-browser, not here.
const main = [
  'Esteban Estrada',
  'Senior Software Engineer @Recurly | Full-Stack | AI Engineering',
  'Medellín, Antioquia, Colombia',
  'Extracto',
  'I am a Software Engineer at Recurly &amp; beyond.',
  'Experiencia',
  'Recurly',
  '1 año',
  'Senior Software Engineer',
  'abril de 2026 - Present (3 meses)',
  'Medellín',
  'Software Engineer II',
  'julio de 2025 - abril de 2026 (10 meses)',
  'Medellín, Antioquia, Colombia',
  'Archie Labs',
  '1 año 8 meses',
  'Senior Software Developer',
  'septiembre de 2024 - julio de 2025 (11 meses)',
  'Building AI-driven web applications.',
]

const sidebar = [
  'Contactar',
  'esteban.estrada.col@gmail.com',
  'www.linkedin.com/in/esteban (LinkedIn)',
  'codestz.dev/ (Blog)',
  'Aptitudes principales',
  'Google Cloud',
  'NestJS',
  'Certifications',
  'Claude Code in Action',
]

describe('LinkedIn parser', () => {
  const resume = parseLinkedInResume({ main, sidebar })

  it('extracts header basics', () => {
    expect(resume.basics?.name).toBe('Esteban Estrada')
    expect(resume.basics?.label).toContain('Senior Software Engineer')
    expect(resume.basics?.location?.city).toBe('Medellín, Antioquia, Colombia')
  })

  it('extracts and decodes the summary', () => {
    expect(resume.basics?.summary).toBe(
      'I am a Software Engineer at Recurly & beyond.',
    )
  })

  it('groups roles under companies with parsed dates', () => {
    const work = resume.work ?? []
    expect(work.length).toBe(3)

    expect(work[0]).toMatchObject({
      name: 'Recurly',
      position: 'Senior Software Engineer',
      startDate: '2026-04',
    })
    expect(work[0].endDate).toBeUndefined() // "Present"

    expect(work[1]).toMatchObject({
      name: 'Recurly',
      position: 'Software Engineer II',
      startDate: '2025-07',
      endDate: '2026-04',
    })

    expect(work[2]).toMatchObject({
      name: 'Archie Labs',
      position: 'Senior Software Developer',
      startDate: '2024-09',
      endDate: '2025-07',
    })
  })

  it('extracts contacts, skills, and certificates from the sidebar', () => {
    expect(resume.basics?.email).toBe('esteban.estrada.col@gmail.com')
    expect(resume.basics?.profiles?.[0]).toMatchObject({ network: 'LinkedIn' })
    expect(resume.basics?.url).toBe('codestz.dev/')
    expect(resume.skills?.map((s) => s.name)).toEqual([
      'Google Cloud',
      'NestJS',
    ])
    expect(resume.certificates?.[0].name).toBe('Claude Code in Action')
  })

  it('captures role locations and never leaks the next company into a role', () => {
    const work = resume.work ?? []
    expect(work[0].location).toBe('Medellín')
    expect(work[1].location).toBe('Medellín, Antioquia, Colombia')
    // The next company ("Archie Labs") must not bleed into the previous role.
    expect(work[1].summary ?? '').not.toContain('Archie Labs')
    expect(work[2].summary).toBe('Building AI-driven web applications.')
  })

  it('rejoins a sidebar name that wrapped across two PDF lines', () => {
    const r = parseLinkedInResume({
      main: [],
      sidebar: [
        'Certifications',
        'Model Context Protocol: Advanced',
        'Topics',
        'Claude Code in Action',
      ],
    })
    expect(r.certificates?.map((c) => c.name)).toEqual([
      'Model Context Protocol: Advanced Topics',
      'Claude Code in Action',
    ])
  })
})
