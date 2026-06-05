import { AwardIcon } from 'lucide-react'
import { z } from 'zod'
import { defineBlock } from '../registry'

export type CertificationData = {
  name: string
  issuer: string
  date: string
}

export const certificationBlock = defineBlock<CertificationData>({
  type: 'certification',
  label: 'Certification',
  icon: AwardIcon,
  schema: z.object({
    name: z.string(),
    issuer: z.string(),
    date: z.string(),
  }),
  default: () => ({ name: '', issuer: '', date: '' }),
  fields: [
    { key: 'name', kind: 'text', placeholder: 'Certification' },
    { key: 'issuer', kind: 'text', placeholder: 'Issuer' },
    { key: 'date', kind: 'text', placeholder: '2024' },
  ],
  toAtsLines: (d) => [[d.name, d.issuer].filter(Boolean).join(' — '), d.date],
})
