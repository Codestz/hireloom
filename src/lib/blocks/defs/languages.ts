import { LanguagesIcon } from 'lucide-react'
import { z } from 'zod'
import { defineBlock } from '../registry'

export type LanguagesData = { tags: Array<string> }

export const languagesBlock = defineBlock<LanguagesData>({
  type: 'languages',
  label: 'Languages',
  icon: LanguagesIcon,
  schema: z.object({ tags: z.array(z.string()) }),
  default: () => ({ tags: [] }),
  fields: [{ key: 'tags', kind: 'taglist', placeholder: 'English (Native)' }],
  toAtsLines: (d) => [d.tags.filter(Boolean).join(' · ')],
})
