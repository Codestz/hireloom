import type { CanvasBox } from '#/lib/canvas/model'
import type { ResolvedTokens } from '#/lib/templates'
import { TOOLS } from './tools'
import type { Tool } from './tools'

/**
 * The ToolEngine — dispatches the AI's {tool, args} JSON against the canvas. Each call is
 * validated (zod) by its tool then run; tools thread a new root. This is the security + safety
 * boundary for the tool path: unknown tools and invalid args are rejected into `errors`, never
 * applied. Engine-agnostic (the model just emits JSON; we execute).
 */
export interface ToolCall {
  tool: string
  args: unknown
}

export interface ToolRunResult {
  root: CanvasBox
  summary: Array<string>
  errors: Array<string>
}

function isToolCall(v: unknown): v is ToolCall {
  return typeof v === 'object' && v !== null && typeof (v as { tool?: unknown }).tool === 'string'
}

/** Coerce arbitrary parsed JSON into a clean ToolCall list. */
export function toToolCalls(raw: unknown): Array<ToolCall> {
  return Array.isArray(raw) ? raw.filter(isToolCall) : []
}

export async function runTools(
  root: CanvasBox,
  tokens: ResolvedTokens,
  calls: ReadonlyArray<ToolCall>,
  registry: Record<string, Tool> = TOOLS,
): Promise<ToolRunResult> {
  let r = root
  const summary: Array<string> = []
  const errors: Array<string> = []
  for (const call of calls) {
    if (!(call.tool in registry)) {
      errors.push(`Unknown tool "${call.tool}"`)
      continue
    }
    const tool = registry[call.tool]
    const parsed = tool.params.safeParse(call.args)
    if (!parsed.success) {
      errors.push(`${call.tool}: invalid args`)
      continue
    }
    try {
      const out = await tool.run(parsed.data, { root: r, tokens })
      r = out.root
      summary.push(out.summary)
    } catch (e) {
      errors.push(`${call.tool}: ${e instanceof Error ? e.message : 'failed'}`)
    }
  }
  return { root: r, summary, errors }
}
