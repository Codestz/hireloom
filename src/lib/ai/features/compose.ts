import { enginePrompt } from '../engine'
import { extractJson } from '../json'
import { CREATIVE } from '../sampling'
import { composePrompt } from '../prompts/compose'

/**
 * Compose a resume section as a primitive Box tree from a description. Returns the raw parsed
 * JSON — the caller MUST run it through sanitizeAiNode (lib/canvas/ai-compose) before use.
 */
export async function composeBlock(request: string): Promise<unknown> {
  const out = await enginePrompt(composePrompt(request), CREATIVE)
  return extractJson(out)
}
