import { z } from 'zod'
import type { CanvasBox } from './model'

/**
 * Zod schema for the canvas node tree, persisted under `meta.hireloom.canvas`.
 *
 * Lenient by design (mirrors resume/schema.ts): unknown/extra keys are tolerated and the
 * shapes stay loose so live editing and partial/imported trees never fail validation. The
 * recursion (Box → children → Box) is expressed with `z.lazy`.
 */

const BoxPropsSchema = z
  .object({
    display: z.enum(['flex', 'grid', 'block']).default('flex'),
    direction: z.enum(['row', 'column']).optional(),
    gridColumns: z.number().optional(),
    gap: z.number().optional(),
    pad: z.number().optional(),
    margin: z.number().optional(),
    align: z.enum(['start', 'center', 'end', 'stretch', 'baseline']).optional(),
    justify: z.enum(['start', 'center', 'end', 'between', 'around']).optional(),
    wrap: z.boolean().optional(),
    bg: z.string().optional(),
    border: z.string().optional(),
    radius: z.number().optional(),
    span: z.number().optional(),
    fontFamily: z.enum(['sans', 'serif', 'mono']).optional(),
  })
  .passthrough()

const ElementStyleSchema = z
  .object({
    fontFamily: z.enum(['sans', 'serif', 'mono']).optional(),
    fontSize: z.number().optional(),
    fontWeight: z.number().optional(),
    italic: z.boolean().optional(),
    underline: z.boolean().optional(),
    color: z.string().optional(),
    align: z.enum(['left', 'center', 'right', 'justify']).optional(),
    marginTop: z.number().optional(),
    marginBottom: z.number().optional(),
  })
  .passthrough()

const ELEMENT_KINDS = [
  'heading',
  'text',
  'list',
  'separator',
  'divider',
  'spacer',
  'image',
  'icon',
  'button',
] as const

const ElementSchema = z.object({
  id: z.string(),
  kind: z.enum(ELEMENT_KINDS),
  data: z.record(z.string(), z.unknown()).default({}),
  style: ElementStyleSchema.optional(),
})

// Recursive Box schema — typed as CanvasBox so consumers get the model types back.
export const CanvasBoxSchema: z.ZodType<CanvasBox> = z.lazy(() =>
  z.object({
    id: z.string(),
    kind: z.literal('box'),
    role: z.string().optional(),
    name: z.string().optional(),
    props: BoxPropsSchema,
    children: z.array(z.union([CanvasBoxSchema, ElementSchema])),
  }),
)

/** The persisted canvas: the root Box. */
export const CanvasSchema = CanvasBoxSchema
