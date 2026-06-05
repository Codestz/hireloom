import { RESUME_SECTION_KEYS } from './schema'
import type { Resume } from './schema'

/** Section order used when a resume has none yet. */
export const DEFAULT_SECTION_ORDER: Array<string> = [...RESUME_SECTION_KEYS]

function uid(): string {
  return crypto.randomUUID()
}

function withIds<T extends { id?: string }>(
  items: Array<T> | undefined,
): Array<T> | undefined {
  return items?.map((item) => (item.id ? item : { ...item, id: uid() }))
}

/**
 * Backfill stable ids on reorderable array items (DnD identity) and a default
 * section order. Idempotent — existing ids are preserved. See ARCHITECTURE §2, §6.
 */
export function ensureResumeIds(resume: Resume): Resume {
  return {
    ...resume,
    work: withIds(resume.work),
    education: withIds(resume.education),
    skills: withIds(resume.skills),
    projects: withIds(resume.projects),
    meta: {
      ...resume.meta,
      hireloom: {
        sectionOrder:
          resume.meta?.hireloom?.sectionOrder ?? DEFAULT_SECTION_ORDER,
        ...resume.meta?.hireloom,
      },
    },
  }
}
