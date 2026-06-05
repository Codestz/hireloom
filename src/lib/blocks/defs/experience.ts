import { BriefcaseIcon } from 'lucide-react'
import { z } from 'zod'
import { dateRange } from '#/lib/resume'
import { defineBlock } from '../registry'

export type ExperienceData = {
  title: string
  company: string
  location: string
  period: { start: string; end: string }
  bullets: Array<string>
}

/**
 * The whole Experience block — ~40 lines define its data, editing, ATS/PDF
 * projection, and AI. Everything else in the app derives from this.
 */
export const experienceBlock = defineBlock<ExperienceData>({
  type: 'experience',
  label: 'Experience',
  icon: BriefcaseIcon,
  schema: z.object({
    title: z.string(),
    company: z.string(),
    location: z.string(),
    period: z.object({ start: z.string(), end: z.string() }),
    bullets: z.array(z.string()),
  }),
  default: () => ({
    title: '',
    company: '',
    location: '',
    period: { start: '', end: '' },
    bullets: [''],
  }),
  fields: [
    { key: 'title', kind: 'text', placeholder: 'Job title' },
    { key: 'company', kind: 'text', placeholder: 'Company' },
    { key: 'location', kind: 'text', placeholder: 'Location' },
    { key: 'period', kind: 'daterange' },
    { key: 'bullets', kind: 'list', label: 'Highlights' },
  ],
  toAtsLines: (d) => [
    [d.title, d.company].filter(Boolean).join(' — '),
    [d.location, dateRange(d.period.start, d.period.end)]
      .filter(Boolean)
      .join(' · '),
    ...d.bullets.filter(Boolean).map((b) => `• ${b}`),
  ],
  ai: {
    improve: (d) =>
      [
        'You are a resume editor. Rewrite the EXPERIENCE below to be concise,',
        'action-led, and quantified where reasonable. Stay truthful — do not invent',
        'facts. Return ONLY JSON: {"title":string,"company":string,"bullets":string[]}.',
        '',
        JSON.stringify({
          title: d.title,
          company: d.company,
          bullets: d.bullets,
        }),
      ].join('\n'),
  },
})
