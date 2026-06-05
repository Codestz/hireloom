import Dexie from 'dexie'
import type { EntityTable } from 'dexie'
import { ensureResumeIds } from '#/lib/resume'
import type { Resume } from '#/lib/resume'
import { DEFAULT_TEMPLATE_ID, DEFAULT_TOKENS } from '#/lib/templates/tokens'
import type { ThemeTokens } from '#/lib/templates/tokens'

/**
 * Local-first store (VISION pillar 1). Everything lives in IndexedDB; nothing is
 * ever sent to a server. Dexie opens lazily on first query, so importing this
 * module during SSR is safe — queries only run client-side (see mem:conventions).
 */
export interface ResumeRecord {
  id: string
  title: string
  data: Resume
  templateId: string
  tokens: ThemeTokens
  createdAt: number
  updatedAt: number
}

export const db = new Dexie('hireloom') as Dexie & {
  resumes: EntityTable<ResumeRecord, 'id'>
}

// v1 — original MVP shape.
db.version(1).stores({
  resumes: 'id, updatedAt, title',
})

// v2 — Phase 2: per-resume template/tokens + backfilled item ids + section order.
db.version(2)
  .stores({ resumes: 'id, updatedAt, title' })
  .upgrade(async (tx) => {
    await tx
      .table('resumes')
      .toCollection()
      .modify((rec: Partial<ResumeRecord>) => {
        rec.templateId ??= DEFAULT_TEMPLATE_ID
        rec.tokens ??= { ...DEFAULT_TOKENS }
        if (rec.data) rec.data = ensureResumeIds(rec.data)
      })
  })
