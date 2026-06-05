import type { Resume, Work } from '#/lib/resume'
import { createEmptyResume } from '#/lib/resume'

/**
 * Semantic parser: LinkedIn "Save to PDF" → JSON Resume. Operates on already
 * column-separated, ordered text lines (geometry handled in pdf-text.ts), so this
 * stays pure and unit-testable. Best-effort by design — imperfect experience
 * grouping is expected; the user edits, and on-device AI cleanup (task #10) can
 * refine later. See mem:linkedin_pdf_structure.
 */

export interface LinkedInColumns {
  /** Wide right column: name, headline, location, Summary, Experience, Education. */
  main: Array<string>
  /** Narrow left column: Contact, Top Skills, Certifications. */
  sidebar: Array<string>
}

// Localized section headers (lowercased) → canonical section.
const HEADINGS: Record<string, Array<string>> = {
  summary: ['extracto', 'summary', 'about', 'acerca de'],
  experience: ['experiencia', 'experience'],
  education: ['educación', 'educacion', 'education', 'formación'],
  contact: ['contactar', 'contact', 'contacto'],
  topSkills: ['aptitudes principales', 'top skills', 'principales aptitudes'],
  certifications: [
    'certifications',
    'certificaciones',
    'certificación',
    'licenses & certifications',
  ],
}

const MONTHS: Record<string, number> = {
  ene: 1,
  enero: 1,
  jan: 1,
  january: 1,
  feb: 2,
  febrero: 2,
  february: 2,
  mar: 3,
  marzo: 3,
  march: 3,
  abr: 4,
  abril: 4,
  apr: 4,
  april: 4,
  may: 5,
  mayo: 5,
  jun: 6,
  junio: 6,
  june: 6,
  jul: 7,
  julio: 7,
  july: 7,
  ago: 8,
  agosto: 8,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  septiembre: 9,
  september: 9,
  oct: 10,
  octubre: 10,
  october: 10,
  nov: 11,
  noviembre: 11,
  november: 11,
  dic: 12,
  diciembre: 12,
  dec: 12,
  december: 12,
}

const PRESENT = new Set([
  'present',
  'actualidad',
  'presente',
  'current',
  'el momento',
])

export function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
}

function headingKey(line: string): string | undefined {
  const norm = line.trim().toLowerCase()
  for (const [key, aliases] of Object.entries(HEADINGS)) {
    if (aliases.includes(norm)) return key
  }
  return undefined
}

/** "abril de 2026" / "Apr 2026" / "2026" → "2026-04" | "2026". */
function parseMonthYear(text: string): string | undefined {
  const t = text.trim().toLowerCase()
  const monthYear = /([a-záéíóú]+)\.?\s+(?:de\s+)?(\d{4})/.exec(t)
  if (monthYear) {
    const month = MONTHS[monthYear[1]]
    if (month) return `${monthYear[2]}-${String(month).padStart(2, '0')}`
  }
  const yearOnly = /\b(\d{4})\b/.exec(t)
  return yearOnly ? yearOnly[1] : undefined
}

interface DateRange {
  startDate?: string
  endDate?: string
}

/** Parse "abril de 2026 - Present (3 meses)" style ranges; undefined if not a range. */
function parseDateRange(line: string): DateRange | undefined {
  const cleaned = line.replace(/\([^)]*\)/g, '').trim() // drop "(3 meses)"
  const parts = cleaned.split(/\s[-–—]\s/)
  if (parts.length !== 2) return undefined
  const start = parseMonthYear(parts[0])
  if (!start) return undefined
  const endRaw = parts[1].trim().toLowerCase()
  const endDate = PRESENT.has(endRaw) ? undefined : parseMonthYear(parts[1])
  return { startDate: start, endDate }
}

/** "1 año", "1 año 8 meses", "10 meses", "2 yrs 3 mos" → tenure-only line. */
function isTenureLine(line: string): boolean {
  return /^(\d+\s*(año|años|year|years|yr|yrs|mes|meses|month|months|mo|mos)\b\s*)+$/i.test(
    line.trim(),
  )
}

function splitSections(lines: Array<string>): {
  header: Array<string>
  sections: Map<string, Array<string>>
} {
  const header: Array<string> = []
  const sections = new Map<string, Array<string>>()
  let current: string | undefined
  for (const raw of lines) {
    const line = decodeEntities(raw).trim()
    if (!line) continue
    const key = headingKey(line)
    if (key) {
      current = key
      if (!sections.has(key)) sections.set(key, [])
      continue
    }
    if (current) sections.get(current)?.push(line)
    else header.push(line)
  }
  return { header, sections }
}

/** Short, no sentence-ending punctuation → a company/title/location, not prose. */
function isHeaderLike(line: string): boolean {
  const t = line.trim()
  return (
    t.length > 0 &&
    t.length <= 80 &&
    !/[.;:,]$/.test(t) &&
    t.split(/\s+/).length <= 9
  )
}

function parseExperience(lines: Array<string>): Array<Work> {
  const work: Array<Work> = []
  let company: string | undefined
  const isDate = lines.map((l) => Boolean(parseDateRange(l)))

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // "1 año 8 meses" → the line above is the company these roles belong to.
    if (isTenureLine(line)) {
      if (i > 0) company = lines[i - 1]
      continue
    }

    // A date range anchors a role; the line just above it is the role title.
    if (isDate[i]) {
      const range = parseDateRange(line)
      if (range) {
        work.push({
          name: company,
          position: i > 0 ? lines[i - 1] : undefined,
          startDate: range.startDate,
          endDate: range.endDate,
          highlights: [],
        })
      }
      continue
    }

    const last = work.at(-1)

    // The line right after a date is the role's location, not its description.
    if (
      i > 0 &&
      isDate[i - 1] &&
      last &&
      !last.location &&
      isHeaderLike(line)
    ) {
      last.location = line
      continue
    }

    // Append to the current role's summary — but not the NEXT role's header. Its
    // title sits right before a date; its company sits before that title, or before
    // a tenure line (a multi-role company). Those would otherwise leak into this
    // role's last bullet.
    const nextIsDate = i + 1 < lines.length && isDate[i + 1]
    const nextIsTenure = i + 1 < lines.length && isTenureLine(lines[i + 1])
    const titleThenDate =
      i + 2 < lines.length && isDate[i + 2] && !nextIsDate && isHeaderLike(line)
    if (last?.startDate && !nextIsDate && !nextIsTenure && !titleThenDate) {
      last.summary = last.summary ? `${last.summary} ${line}` : line
    }
  }

  return work.filter((w) => w.position ?? w.name ?? w.startDate)
}

/**
 * Sidebar names (skills, certifications) can wrap across two PDF lines, e.g.
 * "Model Context Protocol: Advanced" + "Topics". Rejoin a line into the previous one
 * when it's clearly a continuation: it starts lowercase, or it's a short fragment
 * following a colon-titled name that didn't end a sentence.
 */
function mergeWrappedNames(lines: Array<string>): Array<string> {
  const out: Array<string> = []
  for (const line of lines) {
    const prev = out.at(-1)
    const startsLower = /^[a-záéíóúñ]/.test(line)
    const short = line.split(/\s+/).length <= 3
    const prevColon = prev ? prev.includes(':') && !/[.!?]$/.test(prev) : false
    if (prev && (startsLower || (prevColon && short))) {
      out[out.length - 1] = `${prev} ${line}`
    } else {
      out.push(line)
    }
  }
  return out
}

/** LinkedIn wraps long emails across two lines ("…gmail.c" + "om"); rejoin them. */
function mergeWrappedEmail(lines: Array<string>): Array<string> {
  const out: Array<string> = []
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i]
    const truncated = /@/.test(line) && !/@[^@\s]+\.[a-z]{2,}$/i.test(line)
    const next = lines[i + 1]
    if (truncated && next && /^[a-z]{1,5}$/i.test(next)) {
      line += next
      i++
    }
    out.push(line)
  }
  return out
}

export function parseLinkedInResume(columns: LinkedInColumns): Resume {
  const resume = createEmptyResume()
  const { header, sections } = splitSections(columns.main)
  const side = splitSections(columns.sidebar)

  // Header order: name, headline (may wrap to several lines), location (last line).
  resume.basics = { ...resume.basics, name: header[0] ?? '' }
  if (header.length >= 2) {
    resume.basics.label = header.slice(1, -1).join(' ')
    resume.basics.location = { city: header[header.length - 1] }
  }

  const summary = sections.get('summary')
  if (summary?.length) resume.basics.summary = summary.join(' ')

  const experience = sections.get('experience')
  if (experience?.length) resume.work = parseExperience(experience)

  // Sidebar: contacts (emails / urls), top skills, certifications.
  const contact = mergeWrappedEmail(side.sections.get('contact') ?? [])
  for (const line of contact) {
    if (/@/.test(line) && !resume.basics.email) resume.basics.email = line
    else if (/linkedin\.com/i.test(line)) {
      resume.basics.profiles = [
        ...(resume.basics.profiles ?? []),
        { network: 'LinkedIn', url: line.replace(/\s*\(.*\)$/, '') },
      ]
    } else if (/\./.test(line) && !resume.basics.url) {
      resume.basics.url = line.replace(/\s*\(.*\)$/, '')
    }
  }

  const skills = mergeWrappedNames(side.sections.get('topSkills') ?? [])
  if (skills.length) resume.skills = skills.map((name) => ({ name }))

  const certs = mergeWrappedNames(side.sections.get('certifications') ?? [])
  if (certs.length) resume.certificates = certs.map((name) => ({ name }))

  return resume
}
