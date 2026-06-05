import { z } from 'zod'

/**
 * Rich text = ProseMirror/TipTap document JSON. Rich resume fields (summaries,
 * bullets, descriptions) hold either a plain string (legacy / freshly imported) OR
 * a rich doc (once edited on the canvas). Every consumer projects to plain text via
 * `richToPlainText`, so the transition is lossless and the build never breaks.
 * See ARCHITECTURE §2.
 */

export interface RichMark {
  type: string
  attrs?: Record<string, unknown>
}

export interface RichNode {
  type: string
  attrs?: Record<string, unknown>
  content?: Array<RichNode>
  text?: string
  marks?: Array<RichMark>
}

export interface RichText {
  type: 'doc'
  content: Array<RichNode>
}

/** A rich field accepts a plain string or a rich doc. */
export type RichValue = string | RichText

const RichNodeSchema: z.ZodType<RichNode> = z.lazy(() =>
  z.object({
    type: z.string(),
    attrs: z.record(z.string(), z.unknown()).optional(),
    content: z.array(RichNodeSchema).optional(),
    text: z.string().optional(),
    marks: z
      .array(
        z.object({
          type: z.string(),
          attrs: z.record(z.string(), z.unknown()).optional(),
        }),
      )
      .optional(),
  }),
)

export const RichTextSchema = z.object({
  type: z.literal('doc'),
  content: z.array(RichNodeSchema),
})

export const RichValueSchema = z.union([z.string(), RichTextSchema])

export function isRichText(value: unknown): value is RichText {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { type?: unknown }).type === 'doc' &&
    Array.isArray((value as { content?: unknown }).content)
  )
}

function inlineText(node: RichNode): string {
  if (typeof node.text === 'string') return node.text
  if (!node.content) return ''
  return node.content.map(inlineText).join('')
}

function nodesToLines(nodes: Array<RichNode>): Array<string> {
  const lines: Array<string> = []
  for (const node of nodes) {
    switch (node.type) {
      case 'paragraph':
      case 'heading':
        lines.push(inlineText(node))
        break
      case 'bulletList':
      case 'orderedList':
        for (const item of node.content ?? []) {
          lines.push(`- ${inlineText(item).trim()}`)
        }
        break
      case 'hardBreak':
        lines.push('')
        break
      default:
        if (node.content) lines.push(...nodesToLines(node.content))
        else if (typeof node.text === 'string') lines.push(node.text)
    }
  }
  return lines
}

/** Project any rich value to plain text (used by ATS scoring + JSON Resume export). */
export function richToPlainText(value: RichValue | undefined): string {
  if (value == null) return ''
  if (typeof value === 'string') return value
  return nodesToLines(value.content)
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function paragraph(text: string): RichNode {
  return {
    type: 'paragraph',
    content: text ? [{ type: 'text', text }] : [],
  }
}

/** Lift plain text into a rich doc (migration / import). Bullet-ish lines become a list. */
export function plainTextToRich(text: string): RichText {
  const content: Array<RichNode> = []
  let bullets: Array<RichNode> = []
  const flush = () => {
    if (bullets.length) {
      content.push({ type: 'bulletList', content: bullets })
      bullets = []
    }
  }

  for (const line of text.split('\n')) {
    const bullet = /^\s*[-•·]\s+(.*)$/.exec(line)
    if (bullet) {
      bullets.push({ type: 'listItem', content: [paragraph(bullet[1].trim())] })
    } else {
      flush()
      content.push(paragraph(line.trim()))
    }
  }
  flush()

  return { type: 'doc', content: content.length ? content : [paragraph('')] }
}
