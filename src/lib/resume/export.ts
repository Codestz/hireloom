import { downloadBlob, slugify } from '#/lib/utils.ts'
import { JSON_RESUME_SCHEMA_URL } from './schema'
import type { Resume } from './schema'

/**
 * JSON Resume export — the "own your data" proof. A plain, standards-compliant `.json`
 * produced entirely client-side. (Import validation lives in validate.ts.)
 */

/** Stamp the canonical $schema + meta.version on the outgoing document. */
export function buildResumeExport(resume: Resume): Resume {
  return {
    ...resume,
    $schema: resume.$schema ?? JSON_RESUME_SCHEMA_URL,
    meta: { ...resume.meta, version: resume.meta?.version ?? 'v1.0.0' },
  }
}

/** Trigger a client-side download of the resume as JSON Resume. */
export function downloadResumeJson(resume: Resume, title: string): void {
  const json = JSON.stringify(buildResumeExport(resume), null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  downloadBlob(blob, `${slugify(title)}.json`)
}
