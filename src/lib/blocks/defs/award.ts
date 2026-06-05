import { TrophyIcon } from 'lucide-react'
import { z } from 'zod'
import { defineBlock } from '../registry'

export type AwardData = {
  title: string
  awarder: string
  date: string
  summary: string
}

export const awardBlock = defineBlock<AwardData>({
  type: 'award',
  label: 'Award',
  icon: TrophyIcon,
  schema: z.object({
    title: z.string(),
    awarder: z.string(),
    date: z.string(),
    summary: z.string(),
  }),
  default: () => ({ title: '', awarder: '', date: '', summary: '' }),
  fields: [
    { key: 'title', kind: 'text', placeholder: 'Award' },
    { key: 'awarder', kind: 'text', placeholder: 'Awarded by' },
    { key: 'date', kind: 'text', placeholder: '2024' },
    { key: 'summary', kind: 'longtext', placeholder: 'What it recognized…' },
  ],
  toAtsLines: (d) => [
    [d.title, d.awarder].filter(Boolean).join(' — '),
    d.date,
    d.summary,
  ],
})
