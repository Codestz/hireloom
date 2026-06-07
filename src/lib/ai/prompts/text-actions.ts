/** Single-line resume text transforms (the ✨ menu): action set, instructions, prompt builder. */

export type TextAction = 'improve' | 'shorten' | 'lengthen' | 'formal' | 'confident' | 'grammar'

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

/** Strip wrapping quotes the model sometimes adds. */
export const clean = (s: string): string => s.replace(/^["'“”]+|["'“”]+$/g, '').trim()

/** The prompt for one text transform (text should already be trimmed). */
export function textActionPrompt(text: string, action: TextAction): string {
  return `${SHARED}\n\nTask: ${INSTRUCTIONS[action]}\n\nText:\n${text}`
}
