import { enginePrompt, enginePromptStream } from '../engine'
import { CREATIVE } from '../sampling'
import { clean, textActionPrompt } from '../prompts/text-actions'
import type { TextAction } from '../prompts/text-actions'

/** Run a single-line text transform and return the rewritten text. */
export async function transformText(text: string, action: TextAction): Promise<string> {
  const t = text.trim()
  if (!t) return text
  const out = await enginePrompt(textActionPrompt(t, action), CREATIVE)
  return clean(out) || t
}

/**
 * Streaming variant — invokes `onChunk` with the growing text as the model generates it, so the
 * UI can show the rewrite "typing" live. Returns the final cleaned text.
 */
export async function transformTextStream(
  text: string,
  action: TextAction,
  onChunk: (partial: string) => void,
): Promise<string> {
  const t = text.trim()
  if (!t) return text
  const final = await enginePromptStream(
    textActionPrompt(t, action),
    (partial) => onChunk(partial.replace(/^["'“”]+/, '')),
    CREATIVE,
  )
  return clean(final) || t
}
