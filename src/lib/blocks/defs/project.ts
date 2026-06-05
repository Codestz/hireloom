import { FolderGit2Icon } from 'lucide-react'
import { z } from 'zod'
import { defineBlock } from '../registry'

export type ProjectData = {
  name: string
  url: string
  description: string
}

export const projectBlock = defineBlock<ProjectData>({
  type: 'project',
  label: 'Project',
  icon: FolderGit2Icon,
  schema: z.object({
    name: z.string(),
    url: z.string(),
    description: z.string(),
  }),
  default: () => ({ name: '', url: '', description: '' }),
  fields: [
    { key: 'name', kind: 'text', placeholder: 'Project name' },
    { key: 'url', kind: 'link', placeholder: 'link' },
    {
      key: 'description',
      kind: 'longtext',
      placeholder: 'What it does / your role…',
    },
  ],
  toAtsLines: (d) => [
    [d.name, d.url].filter(Boolean).join(' · '),
    d.description,
  ],
  ai: {
    improve: (d) =>
      [
        'Rewrite this project description to be concise and impact-focused',
        '(1–2 sentences). Stay truthful. Return ONLY JSON: {"description": string}.',
        '',
        d.description,
      ].join('\n'),
  },
})
