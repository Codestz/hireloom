import { z } from 'zod'
import { isBox, makeBox } from '#/lib/canvas/model'
import type { CanvasBox } from '#/lib/canvas/model'
import { addChild, findNode, moveNode, removeNode, updateElementData } from '#/lib/canvas/tree-ops'
import { entryFor, sectionShell } from '#/lib/canvas/builders'
import { assignSectionNames } from '#/lib/canvas/document-index'
import { transformText } from '#/lib/ai/service'
import type { ResolvedTokens } from '#/lib/templates'

/**
 * The CV tool registry — the deterministic operations the AI can request as {tool, args} JSON.
 * Each tool VALIDATES its args (zod) and builds via the canonical builders, so an AI add is
 * constructed identically to an import. The ToolEngine (tool-engine.ts) dispatches these.
 */
export interface ToolContext {
  root: CanvasBox
  tokens: ResolvedTokens
}
export interface ToolOutput {
  root: CanvasBox
  summary: string
}
export interface Tool {
  name: string
  description: string
  /** Human description of the args, injected into the chat prompt. */
  argsHint: string
  params: z.ZodTypeAny
  run: (args: unknown, ctx: ToolContext) => ToolOutput | Promise<ToolOutput>
}

function defineTool<TSchema extends z.ZodTypeAny>(def: {
  name: string
  description: string
  argsHint: string
  params: TSchema
  run: (args: z.infer<TSchema>, ctx: ToolContext) => ToolOutput | Promise<ToolOutput>
}): Tool {
  return def as unknown as Tool
}

/** Resolve a section reference (node id, role, or @-name) to its box. */
function resolveSection(root: CanvasBox, ref: string): CanvasBox | null {
  const byId = findNode(root, ref)
  if (byId && isBox(byId)) return byId
  const key = ref.toLowerCase()
  for (const box of root.children) {
    if (isBox(box) && (box.role === ref || box.name?.toLowerCase() === key)) return box
  }
  return null
}

const ACTIONS = ['improve', 'shorten', 'lengthen', 'formal', 'confident', 'grammar'] as const

const TOOL_LIST: Array<Tool> = [
  defineTool({
    name: 'edit_text',
    description: 'Replace the text of a heading/text node.',
    argsHint: '{ "id": <node id>, "text": <new text> }',
    params: z.object({ id: z.string(), text: z.string() }),
    run: ({ id, text }, { root }) => {
      const n = findNode(root, id)
      if (!n || isBox(n)) throw new Error('not a text node')
      return { root: updateElementData(root, id, { text }), summary: 'Edit text' }
    },
  }),
  defineTool({
    name: 'edit_list',
    description: 'Rewrite the items of a bullet/skill list node.',
    argsHint: '{ "id": <list node id>, "items": [<string>, ...] }',
    params: z.object({ id: z.string(), items: z.array(z.string()) }),
    run: ({ id, items }, { root }) => {
      const n = findNode(root, id)
      if (!n || isBox(n) || n.kind !== 'list') throw new Error('not a list node')
      return { root: updateElementData(root, id, { items }), summary: `Rewrite list (${items.length})` }
    },
  }),
  defineTool({
    name: 'transform_text',
    description: 'Improve/shorten/expand/etc. a text node in place (on-device or cloud).',
    argsHint: `{ "id": <node id>, "action": ${ACTIONS.map((a) => `"${a}"`).join('|')} }`,
    params: z.object({ id: z.string(), action: z.enum(ACTIONS) }),
    run: async ({ id, action }, { root }) => {
      const n = findNode(root, id)
      if (!n || isBox(n)) throw new Error('not a text node')
      const next = await transformText(String(n.data.text ?? ''), action)
      return { root: updateElementData(root, id, { text: next }), summary: `${action} text` }
    },
  }),
  defineTool({
    name: 'add_entry',
    description:
      'Add one entry to an existing section, built in that section type\'s canonical style. fields depend on type (e.g. experience: title, company, location, period:{start,end}, bullets[]).',
    argsHint: '{ "section": <role|@name|id>, "type"?: <section type>, "fields": { ... } }',
    params: z.object({
      section: z.string(),
      type: z.string().optional(),
      fields: z.record(z.string(), z.unknown()),
    }),
    run: ({ section, type, fields }, { root, tokens }) => {
      const box = resolveSection(root, section)
      if (!box) throw new Error(`section "${section}" not found`)
      const entry = entryFor(tokens, type ?? box.role ?? 'custom', fields)
      return { root: addChild(root, box.id, entry), summary: `Add entry to ${box.name ?? box.role ?? 'section'}` }
    },
  }),
  defineTool({
    name: 'add_section',
    description: 'Create a new empty section (heading + rule) on the page; add entries with add_entry.',
    argsHint: '{ "role": <e.g. "projects"|"custom">, "title": <heading text> }',
    params: z.object({ role: z.string(), title: z.string() }),
    run: ({ role, title }, { root, tokens }) => {
      const box = makeBox('column', { gap: tokens.space(5) }, [sectionShell(tokens, title)])
      box.role = role
      const next = addChild(root, root.id, box)
      assignSectionNames(next)
      return { root: next, summary: `Add section "${title}"` }
    },
  }),
  defineTool({
    name: 'remove',
    description: 'Remove a node (and its children) by id.',
    argsHint: '{ "id": <node id> }',
    params: z.object({ id: z.string() }),
    run: ({ id }, { root }) => {
      if (id === root.id) throw new Error('cannot remove the page')
      if (!findNode(root, id)) throw new Error('node not found')
      return { root: removeNode(root, id), summary: 'Remove node' }
    },
  }),
  defineTool({
    name: 'move',
    description: 'Move a node into a container (by id) at an optional index.',
    argsHint: '{ "id": <node id>, "to": <container id>, "index"?: <number> }',
    params: z.object({ id: z.string(), to: z.string(), index: z.number().optional() }),
    run: ({ id, to, index }, { root }) => {
      return { root: moveNode(root, id, to, index), summary: 'Move node' }
    },
  }),
]

export const TOOLS: Record<string, Tool> = Object.fromEntries(TOOL_LIST.map((t) => [t.name, t]))

/** The tool catalogue for the chat prompt — name, what it does, and its args shape. */
export function toolsPrompt(): string {
  return TOOL_LIST.map((t) => `- ${t.name}: ${t.description}\n    args: ${t.argsHint}`).join('\n')
}
