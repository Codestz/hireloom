import { UserRoundIcon } from 'lucide-react'
import { z } from 'zod'
import { defineBlock } from '../registry'

export type HeaderData = {
  name: string
  headline: string
  email: string
  phone: string
  url: string
  location: string
  summary: string
}

export const headerBlock = defineBlock<HeaderData>({
  type: 'header',
  label: 'Header',
  icon: UserRoundIcon,
  schema: z.object({
    name: z.string(),
    headline: z.string(),
    email: z.string(),
    phone: z.string(),
    url: z.string(),
    location: z.string(),
    summary: z.string(),
  }),
  default: () => ({
    name: '',
    headline: '',
    email: '',
    phone: '',
    url: '',
    location: '',
    summary: '',
  }),
  fields: [
    { key: 'name', kind: 'text', placeholder: 'Your name' },
    { key: 'headline', kind: 'text', placeholder: 'Headline' },
    { key: 'email', kind: 'text', placeholder: 'email' },
    { key: 'phone', kind: 'text', placeholder: 'phone' },
    { key: 'url', kind: 'link', placeholder: 'website' },
    { key: 'location', kind: 'text', placeholder: 'city' },
    {
      key: 'summary',
      kind: 'longtext',
      placeholder: 'A short professional summary…',
    },
  ],
  toAtsLines: (d) => [
    d.name,
    d.headline,
    [d.email, d.phone, d.url, d.location].filter(Boolean).join(' · '),
    d.summary,
  ],
  ai: {
    improve: (d) =>
      [
        'Rewrite this professional summary to be concise and compelling',
        '(2–3 sentences, first person implied, no clichés). Stay truthful.',
        'Return ONLY JSON: {"summary": string}.',
        '',
        d.summary,
      ].join('\n'),
  },
})
