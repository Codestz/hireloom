import { WrenchIcon } from 'lucide-react'
import { z } from 'zod'
import { defineBlock } from '../registry'

export type SkillsData = { tags: Array<string> }

export const skillsBlock = defineBlock<SkillsData>({
  type: 'skills',
  label: 'Skills',
  icon: WrenchIcon,
  schema: z.object({ tags: z.array(z.string()) }),
  default: () => ({ tags: [] }),
  fields: [{ key: 'tags', kind: 'taglist', placeholder: 'Skill' }],
  toAtsLines: (d) => [d.tags.filter(Boolean).join(' · ')],
})
