import { BookOpenIcon } from 'lucide-react'
import { z } from 'zod'
import { defineBlock } from '../registry'

export type PublicationData = {
  name: string
  publisher: string
  date: string
  url: string
  summary: string
}

export const publicationBlock = defineBlock<PublicationData>({
  type: 'publication',
  label: 'Publication',
  icon: BookOpenIcon,
  schema: z.object({
    name: z.string(),
    publisher: z.string(),
    date: z.string(),
    url: z.string(),
    summary: z.string(),
  }),
  default: () => ({ name: '', publisher: '', date: '', url: '', summary: '' }),
  fields: [
    { key: 'name', kind: 'text', placeholder: 'Title' },
    { key: 'publisher', kind: 'text', placeholder: 'Publisher' },
    { key: 'date', kind: 'text', placeholder: '2024' },
    { key: 'url', kind: 'link', placeholder: 'Link' },
    { key: 'summary', kind: 'longtext', placeholder: 'Short description…' },
  ],
  toAtsLines: (d) => [
    [d.name, d.publisher].filter(Boolean).join(' — '),
    [d.date, d.url].filter(Boolean).join(' · '),
    d.summary,
  ],
})
