/**
 * AI service — the single entry point for every resume AI feature. It is engine-agnostic:
 * each call routes through src/lib/ai/engine.ts, which runs it on Chrome's built-in
 * on-device model (default, private) or the user's own Gemini key (opt-in cloud). Callers
 * here don't know which engine ran.
 */
import { enginePrompt, enginePromptStream, engineReady } from './engine'
import { extractJson } from './json'
import type { ChatOp } from '#/lib/canvas/chat-ops'

/** True when the *currently selected* engine can run a request. */
export async function aiActionsAvailable(): Promise<boolean> {
  return engineReady()
}

/**
 * Sampling settings for *creative* calls (improve, summary, cover letter). Models decode
 * near-deterministically by default, so "Regenerate" returns the same text — temperature
 * + topK restore variety. Structured calls (chat actions, skill merge) stay on defaults.
 */
const CREATIVE = { temperature: 1.0, topK: 8 }

const promptOnce = enginePrompt

export type TextAction =
  | 'improve'
  | 'shorten'
  | 'lengthen'
  | 'formal'
  | 'confident'
  | 'grammar'

export const TEXT_ACTIONS: Array<{ id: TextAction; label: string }> = [
  { id: 'improve', label: 'Improve' },
  { id: 'shorten', label: 'Shorten' },
  { id: 'lengthen', label: 'Expand' },
  { id: 'formal', label: 'More formal' },
  { id: 'confident', label: 'More confident' },
  { id: 'grammar', label: 'Fix grammar' },
]

const INSTRUCTIONS: Record<TextAction, string> = {
  improve:
    'Rewrite it to be more impactful: lead with a strong action verb, surface the concrete outcome, and stay concise.',
  shorten: 'Rewrite it more concisely while keeping the key point.',
  lengthen:
    'Expand it with a little more specific, relevant detail — stay truthful and do not invent facts.',
  formal: 'Rewrite it in a more formal, professional tone.',
  confident:
    'Rewrite it to sound more confident and senior, without exaggerating or inventing achievements.',
  grammar:
    'Correct spelling and grammar only. Do not change wording, meaning, or style otherwise.',
}

const SHARED =
  'You are editing one line of a professional resume (a bullet point or summary sentence). Keep it truthful, ATS-friendly, and in implied first person (no "I"/"my"). Respond with ONLY the rewritten text — no preamble, quotes, labels, or markdown.'

const clean = (s: string) => s.replace(/^["'“”]+|["'“”]+$/g, '').trim()

/** Run a single-line text transform on-device and return the rewritten text. */
export async function transformText(
  text: string,
  action: TextAction,
): Promise<string> {
  const t = text.trim()
  if (!t) return text
  const out = await promptOnce(
    `${SHARED}\n\nTask: ${INSTRUCTIONS[action]}\n\nText:\n${t}`,
    CREATIVE,
  )
  return clean(out) || t
}

/**
 * Streaming variant — invokes `onChunk` with the growing text as the model generates it,
 * so the UI can show the rewrite "typing" live. Returns the final cleaned text. Falls
 * back to a single non-streamed call where promptStreaming isn't supported.
 */
export async function transformTextStream(
  text: string,
  action: TextAction,
  onChunk: (partial: string) => void,
): Promise<string> {
  const t = text.trim()
  if (!t) return text
  const prompt = `${SHARED}\n\nTask: ${INSTRUCTIONS[action]}\n\nText:\n${t}`
  const final = await enginePromptStream(
    prompt,
    (partial) => onChunk(partial.replace(/^["'“”]+/, '')),
    CREATIVE,
  )
  return clean(final) || t
}

/** Stream an arbitrary generation prompt (used by the document generators). */
export async function streamPrompt(
  prompt: string,
  onChunk: (partial: string) => void,
): Promise<string> {
  return enginePromptStream(prompt, onChunk, CREATIVE)
}

/** Draft a professional summary grounded in the work history (streams into the UI). */
export function generateSummary(
  experience: string,
  onChunk: (partial: string) => void,
): Promise<string> {
  return streamPrompt(
    `Write a concise, compelling professional resume summary — 2 to 3 sentences, about 50 words, implied first person (no "I"/"my"). Use ONLY the experience below; do not invent anything. Respond with ONLY the summary text.\n\nExperience:\n${experience.slice(0, 3000)}`,
    onChunk,
  )
}

/** Draft a focused cover letter from the resume + a job description (streams). */
export function generateCoverLetter(
  resume: string,
  jd: string,
  onChunk: (partial: string) => void,
): Promise<string> {
  return streamPrompt(
    `Write a focused, professional cover letter (3 short paragraphs) for the job below, drawing only on the candidate's real resume. Be specific and confident; never fabricate experience or use clichés. Respond with ONLY the letter body — no addresses, date, or "Dear Hiring Manager" header.\n\nJob description:\n${jd.slice(0, 1500)}\n\nResume:\n${resume.slice(0, 2500)}`,
    onChunk,
  )
}

/**
 * Structure raw resume text (from any PDF) into a JSON Resume object via the AI engine.
 * Streams so the importer can show live progress; `onProgress` gets the running char count.
 */
export async function structureResumeJson(
  text: string,
  onProgress?: (chars: number) => void,
): Promise<Record<string, unknown> | null> {
  const prompt = `Convert the resume text below into JSON Resume format. Respond with ONLY a JSON object, no commentary:
{"basics":{"name":"","label":"job title","email":"","phone":"","url":"","summary":"","location":{"city":""}},"work":[{"name":"company","position":"title","startDate":"","endDate":"","highlights":["bullet","bullet"]}],"education":[{"institution":"","studyType":"degree","area":"field","startDate":"","endDate":""}],"skills":[{"name":""}]}
Rules: use ONLY information present in the text; omit any field you cannot fill. Put each achievement/bullet as its own highlight string. Keep dates as written.

RÉSUMÉ TEXT:
${text.slice(0, 6000)}

JSON:`
  const raw = await streamPrompt(prompt, (partial) =>
    onProgress?.(partial.length),
  )
  return extractJson<Record<string, unknown>>(raw)
}

/** Rewrite the summary to target a specific job — truthfully, using the JD's language. */
export function tailorSummary(
  resume: string,
  jd: string,
  onChunk: (partial: string) => void,
): Promise<string> {
  return streamPrompt(
    `Rewrite the candidate's professional resume summary to target the job below. Naturally adopt the job's key terminology WHERE the candidate's real experience already supports it — never claim a skill or experience not present in the resume. 2-3 sentences, implied first person (no "I"/"my"). Respond with ONLY the summary text.\n\nJOB DESCRIPTION:\n${jd.slice(0, 1500)}\n\nRÉSUMÉ:\n${resume.slice(0, 2500)}`,
    onChunk,
  )
}

const COMPOSE_SCHEMA = `You compose a section of a résumé as a tree of layout PRIMITIVES and return ONLY JSON (no prose, no markdown fences).

Node shapes:
- Box (container): { "kind":"box", "props":{ "display":"flex", "direction":"column"|"row", "gap":<px> }, "role"?:"work"|"education"|"skills"|"projects"|"certifications"|"summary"|"custom", "children":[ ...nodes ] }
- Heading:  { "kind":"heading", "data":{ "text":<string>, "level":1|2|3 } }
- Text:     { "kind":"text", "data":{ "text":<string> } }
- List:     { "kind":"list", "data":{ "items":[<string>, ...] } }
- Separator:{ "kind":"separator", "data":{ "variant":"dot"|"dash" } }
- Divider:  { "kind":"divider" }

Conventions: a section is a Box(role) containing a Heading (level 2) then its content. For a "Title · Company" line use a row Box [ Text(bold), Separator(dot), Text ]; for dates a row Box with a dash separator. Keep everything truthful and concise; do not invent specifics that weren't given. Output a SINGLE root box.`

/**
 * Compose a résumé section as a primitive Box tree from a description. Returns the raw parsed
 * JSON — the caller MUST run it through sanitizeAiNode (lib/canvas/ai-compose) before use.
 */
export async function composeBlock(request: string): Promise<unknown> {
  const out = await promptOnce(
    `${COMPOSE_SCHEMA}\n\nCompose this section: ${request}\n\nJSON:`,
    CREATIVE,
  )
  return extractJson(out)
}

const CHAT_SCHEMA = `You help edit a résumé built as a tree of layout primitives. You are given a compact OUTLINE of the current document — each line shows a node's kind, a role/heading/text preview, and its id in (parentheses). Use those ids to target edits.

Reply conversationally in "reply". When the user asks for a concrete change, also return "ops" to apply it. If the request is ambiguous or missing specifics, ASK in "reply" and return "ops": [] — never invent facts.

Return ONLY JSON (no markdown): { "reply": <string>, "ops": [ <op>, ... ] }

Ops:
- { "op":"add", "target": <box role e.g. "skills"|"work"|"education" | a node id | "page">, "node": <primitive subtree> }
- { "op":"edit_text", "id": <node id>, "text": <new text> }
- { "op":"remove", "id": <node id> }

Primitive subtree (for "add"):
- Box: { "kind":"box", "props":{ "display":"flex","direction":"column"|"row","gap":<px> }, "role"?:<string>, "children":[...] }
- Heading: { "kind":"heading","data":{ "text":<string>,"level":1|2|3 } }
- Text: { "kind":"text","data":{ "text":<string> } }
- List: { "kind":"list","data":{ "items":[<string>,...] } }
- Separator: { "kind":"separator","data":{ "variant":"dot"|"dash" } }   Divider: { "kind":"divider" }
A new section = Box(role) with a Heading (level 2) then its content.`

export interface ChatResult {
  reply: string
  ops: Array<ChatOp>
}

/**
 * The CV chat over the canvas: given the conversation + a document outline, returns a reply and
 * structured ops to apply (caller previews then applies via applyChatOps). Cloud Gemini handles
 * this well; on-device models are usually too weak for the structured JSON.
 */
export async function chatBuildCanvas(
  history: ReadonlyArray<{ role: 'user' | 'assistant'; text: string }>,
  outline: string,
): Promise<ChatResult> {
  const convo = history.map((m) => `${m.role.toUpperCase()}: ${m.text}`).join('\n')
  const out = await promptOnce(
    `${CHAT_SCHEMA}\n\nDOCUMENT OUTLINE:\n${outline}\n\nCONVERSATION:\n${convo}\nASSISTANT (JSON only):`,
    CREATIVE,
  )
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
 * The CV chat brain: given the resume context + a user request, return a structured
 * edit action (or a plain answer). The caller previews/applies it — the model never
 * mutates the document directly. Stateless per turn so it always sees the current CV.
 */
export async function chatEdit(
  context: string,
  message: string,
): Promise<ChatAction> {
  const prompt = `You are a resume editing assistant. Read the resume and the user's request, then reply with ONE JSON object and nothing else:
{"kind":"rewrite_summary|add_skills|rewrite_entry|answer","target":"company or role name (only for rewrite_entry)","content":"new content","reply":"a short friendly message to the user"}

Content rules by kind:
- rewrite_summary: content = a 2-3 sentence professional summary.
- add_skills: content = a comma-separated list of skills to add.
- rewrite_entry: target = the company name exactly as written; content = the rewritten bullet points, one per line.
- answer: content = "" (use for questions, advice, or unclear requests).

Be truthful — use only what's in the resume; never invent employers, dates, or facts. Only change what the user asked for.

RÉSUMÉ:
${context.slice(0, 4000)}

USER REQUEST: ${message}

JSON:`
  const raw = await promptOnce(prompt)
  const parsed = extractJson<ChatAction>(raw)
  const kinds = ['rewrite_summary', 'add_skills', 'rewrite_entry', 'answer']
  if (parsed && kinds.includes(parsed.kind)) {
    return { ...parsed, reply: parsed.reply || 'Done.' }
  }
  // Fallback: treat the whole response as a plain answer.
  return {
    kind: 'answer',
    reply: clean(raw) || 'Sorry, I could not process that.',
  }
}

/** Pull individual skill tokens out of skill lines, which may be "Group: a, b, c". */
function skillTokens(lines: Array<string>): Array<string> {
  return lines.flatMap((line) => {
    const body = line.includes(':') ? line.slice(line.indexOf(':') + 1) : line
    return body
      .split(/[,/]+/)
      .map((s) => s.trim())
      .filter(Boolean)
  })
}

/** Suggest concrete skills found in the experience that aren't already listed. */
export async function suggestSkills(
  experience: string,
  existing: Array<string>,
): Promise<Array<string>> {
  // Dedupe against skills already named *inside* grouped lines, not whole lines.
  const have = new Set(skillTokens(existing).map((s) => s.toLowerCase()))
  const out = await promptOnce(
    `From the resume experience below, extract the concrete technical skills, tools, languages, and frameworks that are actually mentioned. Respond as a single comma-separated list — no categories, no duplicates, no commentary.\n\nExperience:\n${experience.slice(0, 3000)}`,
  )
  const seen = new Set<string>()
  return out
    .split(/[,\n]+/)
    .map((s) => s.replace(/^[-•\d.\s]+/, '').trim())
    .filter((s) => s.length > 1 && s.length < 40)
    .filter((s) => {
      const k = s.toLowerCase()
      if (have.has(k) || seen.has(k)) return false
      seen.add(k)
      return true
    })
    .slice(0, 15)
}

/**
 * Add skills the smart way. If the existing skills are grouped category lines
 * ("Architecture & DevOps: …"), weave each addition into the best-matching line via the
 * model and return the updated lines. If they're flat tags, just dedupe-and-append (no AI).
 */
export async function mergeSkills(
  existing: Array<string>,
  additions: Array<string>,
): Promise<Array<string>> {
  const have = new Set(skillTokens(existing).map((s) => s.toLowerCase()))
  const adds = additions
    .map((s) => s.trim())
    .filter((s) => s && !have.has(s.toLowerCase()))
  if (!adds.length) return existing

  const grouped = existing.some((l) => l.includes(':'))
  if (!grouped) return [...existing, ...adds]

  const out = await promptOnce(
    `These are resume skill groups, one per line in the format "Group: item, item, item":\n${existing.join('\n')}\n\nAdd each of these skills to the single most relevant existing group: ${adds.join(', ')}.\nRules: keep the exact same groups and "Group: items" format, do NOT create new groups, do NOT duplicate, append the new skills to the end of the matching group's list. Respond with ONLY the updated groups, one per line.`,
  )
  const lines = out
    .split('\n')
    .map((l) => l.replace(/^[-•*\s]+/, '').trim())
    .filter((l) => l.includes(':'))
  return lines.length >= existing.length ? lines : [...existing, ...adds]
}
