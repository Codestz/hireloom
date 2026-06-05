import { GraduationCapIcon } from 'lucide-react'
import { z } from 'zod'
import { dateRange } from '#/lib/resume'
import { defineBlock } from '../registry'

export type EducationData = {
  institution: string
  degree: string
  area: string
  period: { start: string; end: string }
}

export const educationBlock = defineBlock<EducationData>({
  type: 'education',
  label: 'Education',
  icon: GraduationCapIcon,
  schema: z.object({
    institution: z.string(),
    degree: z.string(),
    area: z.string(),
    period: z.object({ start: z.string(), end: z.string() }),
  }),
  default: () => ({
    institution: '',
    degree: '',
    area: '',
    period: { start: '', end: '' },
  }),
  fields: [
    { key: 'institution', kind: 'text', placeholder: 'Institution' },
    { key: 'degree', kind: 'text', placeholder: 'Degree' },
    { key: 'area', kind: 'text', placeholder: 'Field of study' },
    { key: 'period', kind: 'daterange' },
  ],
  toAtsLines: (d) => [
    [d.institution, d.degree].filter(Boolean).join(' — '),
    [d.area, dateRange(d.period.start, d.period.end)]
      .filter(Boolean)
      .join(' · '),
  ],
})
