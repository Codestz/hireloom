import { createEmptyResume, ensureResumeIds } from '#/lib/resume'
import type { Resume } from '#/lib/resume'
import { DEFAULT_TEMPLATE_ID, DEFAULT_TOKENS } from '#/lib/templates/tokens'
import type { ThemeTokens } from '#/lib/templates/tokens'
import { templateTokens } from '#/lib/templates/presets'
import { TEMPLATE_SAMPLE } from '#/lib/sample/template-sample'
import { db } from './db'
import type { ResumeRecord } from './db'

/**
 * CRUD over the local resume store. Pure data layer — no React. TanStack Query
 * hooks in queries.ts wrap these; the editor calls the hooks (see mem:conventions).
 */

function newId(): string {
  return crypto.randomUUID()
}

/** Most-recently-updated first. */
export function listResumes(): Promise<Array<ResumeRecord>> {
  return db.resumes.orderBy('updatedAt').reverse().toArray()
}

export function getResume(id: string): Promise<ResumeRecord | undefined> {
  return db.resumes.get(id)
}

export async function createResume(opts?: {
  title?: string
  data?: Resume
  tokens?: ThemeTokens
  templateId?: string
}): Promise<ResumeRecord> {
  const now = Date.now()
  const record: ResumeRecord = {
    id: newId(),
    title: opts?.title?.trim() || 'Untitled resume',
    data: ensureResumeIds(opts?.data ?? createEmptyResume()),
    templateId: opts?.templateId ?? DEFAULT_TEMPLATE_ID,
    tokens: opts?.tokens ?? { ...DEFAULT_TOKENS },
    createdAt: now,
    updatedAt: now,
  }
  await db.resumes.add(record)
  return record
}

/** Create a new resume seeded with the neutral sample content + a template's layout/theme tokens. */
export function createResumeFromTemplate(templateId: string): Promise<ResumeRecord> {
  return createResume({
    title: 'Untitled resume',
    data: TEMPLATE_SAMPLE,
    tokens: templateTokens(templateId),
    templateId,
  })
}

/** Overwrite resume content (the editor's autosave target). Bumps updatedAt. */
export async function updateResumeData(
  id: string,
  data: Resume,
): Promise<void> {
  // Dexie's UpdateSpec recurses on the rich (recursive) Resume content type — a known library
  // type-depth limitation; the call is correct at runtime.
  // @ts-expect-error Dexie UpdateSpec<ResumeRecord> exceeds the type-instantiation depth on `data`.
  await db.resumes.update(id, { data, updatedAt: Date.now() })
}

export async function updateResumeTokens(
  id: string,
  tokens: ThemeTokens,
): Promise<void> {
  await db.resumes.update(id, { tokens, updatedAt: Date.now() })
}

export async function updateResumeTemplate(
  id: string,
  templateId: string,
): Promise<void> {
  await db.resumes.update(id, { templateId, updatedAt: Date.now() })
}

export async function renameResume(id: string, title: string): Promise<void> {
  await db.resumes.update(id, {
    title: title.trim() || 'Untitled resume',
    updatedAt: Date.now(),
  })
}

export async function deleteResume(id: string): Promise<void> {
  await db.resumes.delete(id)
}

const BACKUP_VERSION = 1

/** Serialize every resume to a portable JSON backup (local-first safety net). */
export async function exportBackup(): Promise<string> {
  const resumes = await db.resumes.toArray()
  return JSON.stringify(
    {
      app: 'hireloom',
      version: BACKUP_VERSION,
      exportedAt: Date.now(),
      resumes,
    },
    null,
    2,
  )
}

/** Restore resumes from a backup file — each added as a new record. Returns the count. */
export async function importBackup(json: string): Promise<number> {
  let parsed: { app?: string; resumes?: Array<Partial<ResumeRecord>> }
  try {
    parsed = JSON.parse(json) as typeof parsed
  } catch {
    throw new Error('That file isn’t valid JSON.')
  }
  if (parsed.app !== 'hireloom' || !Array.isArray(parsed.resumes)) {
    throw new Error('That doesn’t look like a HireLoom backup.')
  }
  let count = 0
  for (const r of parsed.resumes) {
    if (!r.data) continue
    await createResume({
      title: r.title,
      data: r.data,
      tokens: r.tokens,
      templateId: r.templateId,
    })
    count++
  }
  return count
}

export async function duplicateResume(
  id: string,
): Promise<ResumeRecord | undefined> {
  const source = await db.resumes.get(id)
  if (!source) return undefined
  return createResume({
    title: `${source.title} (copy)`,
    data: structuredClone(source.data),
  })
}

/**
 * Editor entry point: return the most recent resume, creating an empty one if the
 * store is empty. Guarantees the editor always has something to bind to.
 */
export async function getOrCreateLatestResume(): Promise<ResumeRecord> {
  // ordered ascending by updatedAt → last() is the most recent (typed T | undefined)
  const latest = await db.resumes.orderBy('updatedAt').last()
  return latest ?? createResume()
}
