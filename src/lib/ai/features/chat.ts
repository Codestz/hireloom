import { enginePrompt } from '../engine'
import { extractJson } from '../json'
import { CREATIVE } from '../sampling'
import { canvasChatPrompt, chatEditPrompt } from '../prompts/chat'
import { clean } from '../prompts/text-actions'
import type { ChatOp } from '#/lib/canvas/chat-ops'

export interface ChatResult {
  reply: string
  ops: Array<ChatOp>
}

/**
 * The CV chat over the canvas: given the conversation + a document outline (+ optional entry
 * templates), returns a reply and structured ops to apply (caller previews then applies via
 * applyChatOps). Cloud Gemini handles this well; on-device models are usually too weak.
 */
export async function chatBuildCanvas(
  history: ReadonlyArray<{ role: 'user' | 'assistant'; text: string }>,
  outline: string,
  templates = '',
): Promise<ChatResult> {
  const convo = history.map((m) => `${m.role.toUpperCase()}: ${m.text}`).join('\n')
  const out = await enginePrompt(canvasChatPrompt(outline, templates, convo), CREATIVE)
  const parsed = extractJson<{ reply?: unknown; ops?: unknown }>(out)
  const reply =
    typeof parsed?.reply === 'string' && parsed.reply.trim()
      ? parsed.reply
      : 'Sorry — I couldn’t parse that. Could you rephrase?'
  const ops = Array.isArray(parsed?.ops) ? (parsed.ops as Array<ChatOp>) : []
  return { reply, ops }
}

export interface ChatAction {
  kind: 'rewrite_summary' | 'add_skills' | 'rewrite_entry' | 'answer'
  /** company/role name — only for rewrite_entry */
  target?: string
  /** summary text · comma skills · newline bullets — depends on kind */
  content?: string
  reply: string
}

/**
 * Legacy typed-section chat brain: given the resume context + a request, return a structured
 * edit action (or a plain answer). To be retired when the chat moves fully to the ToolEngine.
 */
export async function chatEdit(context: string, message: string): Promise<ChatAction> {
  const raw = await enginePrompt(chatEditPrompt(context, message))
  const parsed = extractJson<ChatAction>(raw)
  const kinds = ['rewrite_summary', 'add_skills', 'rewrite_entry', 'answer']
  if (parsed && kinds.includes(parsed.kind)) {
    return { ...parsed, reply: parsed.reply || 'Done.' }
  }
  // Fallback: treat the whole response as a plain answer.
  return { kind: 'answer', reply: clean(raw) || 'Sorry, I could not process that.' }
}
