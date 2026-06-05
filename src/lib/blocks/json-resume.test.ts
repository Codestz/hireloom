import { describe, expect, it } from 'vitest'
import type { Resume } from '#/lib/resume'
import { docToResume, resumeToDoc } from './json-resume'

/**
 * The bridge between JSON Resume (the persisted format) and the BlockDoc (the editor
 * model) is the most fragile, highest-value piece — a lossy round-trip silently corrupts
 * a user's résumé on every autosave. These tests pin the contract: data and design choices
 * survive `resume → doc → resume`.
 */

const sample: Resume = {
  basics: {
    name: 'Ada Lovelace',
    label: 'Software Engineer',
    email: 'ada@example.com',
    phone: '+44 20 7946 0000',
    url: 'ada.dev',
    summary: 'Builds reliable systems.',
    location: { city: 'London' },
  },
  work: [
    {
      id: 'w1',
      name: 'Analytical Engines',
      position: 'Principal Engineer',
      location: 'Remote',
      startDate: '2020-01',
      endDate: '2023-06',
      highlights: ['Shipped the compiler', 'Led a team of 6'],
    },
  ],
  education: [
    {
      id: 'e1',
      institution: 'University of London',
      studyType: 'BSc',
      area: 'Mathematics',
      startDate: '2014',
      endDate: '2018',
    },
  ],
  skills: [{ name: 'TypeScript' }, { name: 'Rust' }],
}

interface HireloomMeta {
  sectionVariants?: Record<string, string>
  sectionHeadings?: Record<string, string>
  sectionOrder?: Array<string>
}

describe('resume ↔ doc round-trip', () => {
  it('preserves basics, work, education, and skills', () => {
    const back = docToResume(resumeToDoc(sample), sample)

    expect(back.basics?.name).toBe('Ada Lovelace')
    expect(back.basics?.label).toBe('Software Engineer')
    expect(back.basics?.email).toBe('ada@example.com')
    expect(back.basics?.location?.city).toBe('London')

    expect(back.work?.[0]?.name).toBe('Analytical Engines')
    expect(back.work?.[0]?.position).toBe('Principal Engineer')
    expect(back.work?.[0]?.startDate).toBe('2020-01')
    expect(back.work?.[0]?.endDate).toBe('2023-06')
    expect(back.work?.[0]?.highlights).toEqual([
      'Shipped the compiler',
      'Led a team of 6',
    ])

    expect(back.education?.[0]?.institution).toBe('University of London')
    expect(back.education?.[0]?.area).toBe('Mathematics')

    expect(back.skills?.map((s) => s.name)).toEqual(['TypeScript', 'Rust'])
  })

  it('is idempotent — a second round-trip equals the first', () => {
    const once = docToResume(resumeToDoc(sample), sample)
    const twice = docToResume(resumeToDoc(once), once)
    expect(twice.work).toEqual(once.work)
    expect(twice.education).toEqual(once.education)
    expect(twice.skills).toEqual(once.skills)
    expect(twice.basics).toEqual(once.basics)
  })

  it('round-trips design choices (variant, heading, order) via meta.hireloom', () => {
    const doc = resumeToDoc(sample)
    const exp = doc.sections.find((s) => s.type === 'experience')
    expect(exp).toBeDefined()
    exp!.variant = 'timeline'
    exp!.heading = 'Work History'
    // Move skills to the front.
    doc.sections = [
      ...doc.sections.filter((s) => s.type === 'skills'),
      ...doc.sections.filter((s) => s.type !== 'skills'),
    ]

    const back = docToResume(doc, sample)
    const hl = back.meta?.hireloom
    expect(hl?.sectionVariants?.experience).toBe('timeline')
    expect(hl?.sectionHeadings?.experience).toBe('Work History')
    expect(hl?.sectionOrder?.[0]).toBe('skills')

    // …and importing that résumé restores the choices.
    const restored = resumeToDoc(back)
    const exp2 = restored.sections.find((s) => s.type === 'experience')
    expect(exp2?.variant).toBe('timeline')
    expect(exp2?.heading).toBe('Work History')
    expect(restored.sections[0]?.type).toBe('skills')
  })

  it('round-trips an empty résumé without throwing', () => {
    const empty: Resume = {}
    expect(() => docToResume(resumeToDoc(empty), empty)).not.toThrow()
  })
})
