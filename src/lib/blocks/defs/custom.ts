import { ListIcon } from 'lucide-react'
import { z } from 'zod'
import { defineBlock } from '../registry'

/**
 * A free-form section: a renamable heading + a bulleted list of lines. Covers the
 * "Additional Information" / "Interests" / catch-all blocks real CVs use that don't map
 * to a typed section. Each line is plain text (e.g. "Technical Skills: React, …").
 */
export type CustomData = { lines: Array<string> }

export const customBlock = defineBlock<CustomData>({
  type: 'custom',
  label: 'Custom section',
  icon: ListIcon,
  schema: z.object({ lines: z.array(z.string()) }),
  default: () => ({ lines: [''] }),
  fields: [{ key: 'lines', kind: 'list', label: 'Lines' }],
  toAtsLines: (d) => d.lines.filter(Boolean),
})
