import { enginePrompt } from '../engine'
import { extractJson } from '../json'
import { CREATIVE } from '../sampling'
import { toolChatPrompt } from '../prompts/chat'
import { toolsPrompt } from '../tools'
import { toToolCalls } from '../tool-engine'
import type { ToolCall } from '../tool-engine'

export interface ToolChatResult {
  reply: string
  tools: Array<ToolCall>
}

/**
 * The CV chat over the ToolEngine: given the conversation + a document outline, returns a reply and
 * a list of tool calls to apply (caller previews then runs them via runTools). The prompt is
 * assembled from the live tool catalogue (toolsPrompt) so it can't drift. Cloud Gemini handles this
 * well; on-device models are usually too weak for the structured JSON.
 */
export async function chatTools(
  history: ReadonlyArray<{ role: 'user' | 'assistant'; text: string }>,
  outline: string,
  focus = '',
): Promise<ToolChatResult> {
  const convo = history.map((m) => `${m.role.toUpperCase()}: ${m.text}`).join('\n')
  const out = await enginePrompt(toolChatPrompt(outline, toolsPrompt(), focus, convo), CREATIVE)
  const parsed = extractJson<{ reply?: unknown; tools?: unknown }>(out)
  const reply =
    typeof parsed?.reply === 'string' && parsed.reply.trim()
      ? parsed.reply
      : 'Sorry — I couldn’t parse that. Could you rephrase?'
  return { reply, tools: toToolCalls(parsed?.tools) }
}
