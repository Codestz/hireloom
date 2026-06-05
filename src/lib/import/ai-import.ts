import { structureResumeJson } from '#/lib/ai/service'
import { createEmptyResume, safeParseResume } from '#/lib/resume'
import type { Resume } from '#/lib/resume'

/**
 * AI-assisted import for *any* résumé PDF: the on-device model turns raw extracted text
 * into a JSON Resume, which we normalize (dates → ISO, coerce shapes) and validate. It's
 * a best-effort head start, not a perfect parse — the user reviews and fixes on the canvas.
 * Falls back to dropping the raw text into the summary so nothing is ever lost.
 */

const MONTHS: Record<string, string> = {
  jan: '01',
  feb: '02',
  mar: '03',
  apr: '04',
  may: '05',
  jun: '06',
  jul: '07',
  aug: '08',
  sep: '09',
  oct: '10',
  nov: '11',
  dec: '12',
}

/** Coerce a free-form date ("Apr 2026", "04/2026", "2026") to ISO YYYY[-MM]; else drop it. */
function normDate(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined
  const s = v.trim()
  if (!s || /^(present|current|now|ongoing|to date)$/i.test(s)) return undefined
  let m = /^(\d{4})-(\d{2})(-\d{2})?$/.exec(s)
  if (m) return s.slice(0, m[3] ? 10 : 7)
  m = /^(\d{1,2})[/.-](\d{4})$/.exec(s)
  if (m) return `${m[2]}-${m[1].padStart(2, '0')}`
  m = /^([A-Za-z]{3,})\.?\s+(\d{4})$/.exec(s)
  if (m) {
    const mm = MONTHS[m[1].slice(0, 3).toLowerCase()]
    if (mm) return `${m[2]}-${mm}`
  }
  m = /(\d{4})/.exec(s)
  return m ? m[1] : undefined
}

function str(v: unknown): string | undefined {
  const s = typeof v === 'string' ? v.trim() : ''
  return s || undefined
}
function arr(v: unknown): Array<Record<string, unknown>> {
  return Array.isArray(v) ? (v as Array<Record<string, unknown>>) : []
}
function strList(v: unknown): Array<string> {
  return Array.isArray(v)
    ? v.map((x) => (typeof x === 'string' ? x.trim() : '')).filter(Boolean)
    : []
}

/** Reshape the model's loose JSON into a schema-valid Resume. */
function coerce(o: Record<string, unknown>): unknown {
  const b = (o.basics as Record<string, unknown> | undefined) ?? {}
  const loc = b.location as Record<string, unknown> | undefined
  return {
    basics: {
      name: str(b.name),
      label: str(b.label),
      email: str(b.email),
      phone: str(b.phone),
      url: str(b.url),
      summary: str(b.summary),
      location: loc ? { city: str(loc.city) } : undefined,
    },
    work: arr(o.work).map((w) => ({
      name: str(w.name),
      position: str(w.position),
      startDate: normDate(w.startDate),
      endDate: normDate(w.endDate),
      highlights: strList(w.highlights),
    })),
    education: arr(o.education).map((e) => ({
      institution: str(e.institution),
      studyType: str(e.studyType),
      area: str(e.area),
      startDate: normDate(e.startDate),
      endDate: normDate(e.endDate),
    })),
    skills: arr(o.skills)
      .map((s) => ({ name: str(s.name) }))
      .filter((s) => s.name),
  }
}

/** Last-resort résumé so an import never loses the user's content. */
function fallback(text: string): Resume {
  const base = createEmptyResume()
  const firstLine = text
    .split('\n')
    .find((l) => l.trim())
    ?.trim()
  return {
    ...base,
    basics: {
      ...base.basics,
      name: firstLine?.slice(0, 60),
      summary: text.slice(0, 1200),
    },
  }
}

export async function aiImportResume(
  text: string,
  onProgress?: (chars: number) => void,
): Promise<Resume> {
  const raw = await structureResumeJson(text, onProgress)
  if (!raw) return fallback(text)
  const parsed = safeParseResume(coerce(raw))
  return parsed.ok ? parsed.resume : fallback(text)
}
