import { HeartHandshakeIcon } from 'lucide-react'
import { z } from 'zod'
import { defineBlock } from '../registry'

export type VolunteerData = {
  organization: string
  role: string
  location: string
  period: { start: string; end: string }
  bullets: Array<string>
}

export const volunteerBlock = defineBlock<VolunteerData>({
  type: 'volunteer',
  label: 'Volunteering',
  icon: HeartHandshakeIcon,
  schema: z.object({
    organization: z.string(),
    role: z.string(),
    location: z.string(),
    period: z.object({ start: z.string(), end: z.string() }),
    bullets: z.array(z.string()),
  }),
  default: () => ({
    organization: '',
    role: '',
    location: '',
    period: { start: '', end: '' },
    bullets: [''],
  }),
  fields: [
    { key: 'role', kind: 'text', placeholder: 'Role' },
    { key: 'organization', kind: 'text', placeholder: 'Organization' },
    { key: 'location', kind: 'text', placeholder: 'Location' },
    { key: 'period', kind: 'daterange' },
    { key: 'bullets', kind: 'list', label: 'Highlights' },
  ],
  toAtsLines: (d) => [
    [d.role, d.organization].filter(Boolean).join(' — '),
    [d.location, [d.period.start, d.period.end].filter(Boolean).join(' – ')]
      .filter(Boolean)
      .join(' · '),
    ...d.bullets.filter(Boolean).map((b) => `• ${b}`),
  ],
})
