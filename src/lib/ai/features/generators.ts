import { enginePromptStream } from '../engine'
import { extractJson } from '../json'
import { CREATIVE } from '../sampling'
import {
  coverLetterPrompt,
  importStructurePrompt,
  summaryPrompt,
  tailorPrompt,
} from '../prompts/generators'

/** Stream an arbitrary generation prompt (used by the document generators). */
export function streamPrompt(prompt: string, onChunk: (partial: string) => void): Promise<string> {
  return enginePromptStream(prompt, onChunk, CREATIVE)
}

/** Draft a professional summary grounded in the work history (streams into the UI). */
export function generateSummary(
  experience: string,
  onChunk: (partial: string) => void,
): Promise<string> {
  return streamPrompt(summaryPrompt(experience), onChunk)
}

/** Draft a focused cover letter from the resume + a job description (streams). */
export function generateCoverLetter(
  resume: string,
  jd: string,
  onChunk: (partial: string) => void,
): Promise<string> {
  return streamPrompt(coverLetterPrompt(resume, jd), onChunk)
}

/** Rewrite the summary to target a specific job — truthfully, using the JD's language. */
export function tailorSummary(
  resume: string,
  jd: string,
  onChunk: (partial: string) => void,
): Promise<string> {
  return streamPrompt(tailorPrompt(resume, jd), onChunk)
}

/**
 * Structure raw resume text (from any PDF) into a JSON Resume object via the AI engine. Streams
 * so the importer can show live progress; `onProgress` gets the running char count.
 */
export async function structureResumeJson(
  text: string,
  onProgress?: (chars: number) => void,
): Promise<Record<string, unknown> | null> {
  const raw = await streamPrompt(importStructurePrompt(text), (partial) => onProgress?.(partial.length))
  return extractJson<Record<string, unknown>>(raw)
}
