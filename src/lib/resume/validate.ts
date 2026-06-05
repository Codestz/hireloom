import { ResumeSchema } from './schema'
import type { Resume } from './schema'

/**
 * Validation at the import/export boundary (task #8). The schema is lenient by design
 * (see schema.ts), so this mostly guards against structurally-wrong JSON rather than
 * "incomplete" résumés — which are expected and fine.
 */

export type ParseResult =
  | { ok: true; resume: Resume }
  | { ok: false; error: string }

/** Non-throwing parse for untrusted input (e.g. an imported .json file). */
export function safeParseResume(input: unknown): ParseResult {
  const result = ResumeSchema.safeParse(input)
  if (result.success) return { ok: true, resume: result.data }
  const first = result.error.issues[0]
  const path = first.path.join('.') || '(root)'
  return { ok: false, error: `${path}: ${first.message}` }
}

/** Parse a raw JSON string (handles malformed JSON distinctly from schema errors). */
export function parseResumeJson(text: string): ParseResult {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return { ok: false, error: 'File is not valid JSON.' }
  }
  return safeParseResume(data)
}
