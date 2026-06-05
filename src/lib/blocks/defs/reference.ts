import { QuoteIcon } from 'lucide-react'
import { z } from 'zod'
import { defineBlock } from '../registry'

export type ReferenceData = {
  name: string
  reference: string
}

export const referenceBlock = defineBlock<ReferenceData>({
  type: 'reference',
  label: 'Reference',
  icon: QuoteIcon,
  schema: z.object({
    name: z.string(),
    reference: z.string(),
  }),
  default: () => ({ name: '', reference: '' }),
  fields: [
    { key: 'name', kind: 'text', placeholder: 'Name · title' },
    { key: 'reference', kind: 'longtext', placeholder: 'What they said…' },
  ],
  toAtsLines: (d) => [d.name, d.reference],
})
