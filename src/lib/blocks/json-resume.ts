import type { BlockDoc, DocSection } from './document'
import { richToPlainText } from '#/lib/resume'
import type { Resume } from '#/lib/resume'

/**
 * Bridge between the canonical JSON Resume model (storage, import/export) and the
 * editor's BlockDoc. Rich fields are read as plain text and written as plain strings
 * (the schema accepts `string`), so legacy data round-trips without TipTap.
 */

const uid = () => crypto.randomUUID()
const str = (v: unknown): string => (typeof v === 'string' ? v : '')

/**
 * Break a chunk of text into bullet points. LinkedIn exports cram a whole role into
 * one paragraph with `•` markers — split on those (or newlines) so it reads as a list
 * instead of one giant bullet.
 */
function splitBullets(text: string): Array<string> {
  const t = text.trim()
  if (!t) return []
  if (/[•·▪‣]/.test(t)) {
    return t
      .split(/\s*[•·▪‣]\s*/)
      .map((s) => s.trim())
      .filter(Boolean)
  }
  return t
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean)
}
const strArray = (v: unknown): Array<string> =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
const period = (v: unknown): { start: string; end: string } => {
  const p = (v ?? {}) as { start?: unknown; end?: unknown }
  return { start: str(p.start), end: str(p.end) }
}

export function resumeToDoc(resume: Resume): BlockDoc {
  const b = resume.basics ?? {}
  const header = {
    name: b.name ?? '',
    headline: b.label ?? '',
    email: b.email ?? '',
    phone: b.phone ?? '',
    url: b.url ?? '',
    location: b.location?.city ?? '',
    summary: richToPlainText(b.summary),
  }

  const sections: Array<DocSection> = []

  sections.push({
    id: 'sec-experience',
    type: 'experience',
    items: (resume.work ?? []).map((w) => ({
      id: w.id ?? uid(),
      data: {
        title: w.position ?? '',
        company: w.name ?? '',
        location: w.location ?? '',
        period: { start: w.startDate ?? '', end: w.endDate ?? '' },
        bullets: (w.highlights?.length
          ? w.highlights.map(richToPlainText)
          : [richToPlainText(w.summary)]
        ).flatMap(splitBullets),
      },
    })),
  })

  sections.push({
    id: 'sec-education',
    type: 'education',
    items: (resume.education ?? []).map((e) => ({
      id: e.id ?? uid(),
      data: {
        institution: e.institution ?? '',
        degree: e.studyType ?? '',
        area: e.area ?? '',
        period: { start: e.startDate ?? '', end: e.endDate ?? '' },
      },
    })),
  })

  sections.push({
    id: 'sec-skills',
    type: 'skills',
    items: [
      {
        id: 'skills-1',
        data: {
          tags: (resume.skills ?? []).map((s) => s.name ?? '').filter(Boolean),
        },
      },
    ],
  })

  if (resume.projects?.length) {
    sections.push({
      id: 'sec-projects',
      type: 'projects',
      items: resume.projects.map((p) => ({
        id: p.id ?? uid(),
        data: {
          name: p.name ?? '',
          url: p.url ?? '',
          description: richToPlainText(p.description),
        },
      })),
    })
  }

  if (resume.certificates?.length) {
    sections.push({
      id: 'sec-certifications',
      type: 'certifications',
      items: resume.certificates.map((c) => ({
        id: uid(),
        data: {
          name: c.name ?? '',
          issuer: c.issuer ?? '',
          date: c.date ?? '',
        },
      })),
    })
  }

  if (resume.languages?.length) {
    sections.push({
      id: 'sec-languages',
      type: 'languages',
      items: [
        {
          id: 'languages-1',
          data: {
            tags: resume.languages
              .map((l) =>
                l.fluency
                  ? `${l.language ?? ''} (${l.fluency})`
                  : (l.language ?? ''),
              )
              .filter(Boolean),
          },
        },
      ],
    })
  }

  if (resume.volunteer?.length) {
    sections.push({
      id: 'sec-volunteer',
      type: 'volunteer',
      items: resume.volunteer.map((v) => ({
        id: uid(),
        data: {
          role: v.position ?? '',
          organization: v.organization ?? '',
          location: '',
          period: { start: v.startDate ?? '', end: v.endDate ?? '' },
          bullets: (v.highlights?.length
            ? v.highlights.map(richToPlainText)
            : [richToPlainText(v.summary)]
          ).flatMap(splitBullets),
        },
      })),
    })
  }

  if (resume.awards?.length) {
    sections.push({
      id: 'sec-awards',
      type: 'awards',
      items: resume.awards.map((a) => ({
        id: uid(),
        data: {
          title: a.title ?? '',
          awarder: a.awarder ?? '',
          date: a.date ?? '',
          summary: str(a.summary),
        },
      })),
    })
  }

  if (resume.publications?.length) {
    sections.push({
      id: 'sec-publications',
      type: 'publications',
      items: resume.publications.map((p) => ({
        id: uid(),
        data: {
          name: p.name ?? '',
          publisher: p.publisher ?? '',
          date: p.releaseDate ?? '',
          url: p.url ?? '',
          summary: str(p.summary),
        },
      })),
    })
  }

  if (resume.references?.length) {
    sections.push({
      id: 'sec-references',
      type: 'references',
      items: resume.references.map((r) => ({
        id: uid(),
        data: { name: r.name ?? '', reference: str(r.reference) },
      })),
    })
  }

  // Apply persisted design choices + section order (stored in meta.hireloom).
  const hl = resume.meta?.hireloom

  // Custom section lives only in meta (JSON Resume has no slot for it).
  if (hl?.customLines?.length) {
    sections.push({
      id: 'sec-custom',
      type: 'custom',
      items: [{ id: 'custom-1', data: { lines: hl.customLines } }],
    })
  }

  const variants = hl?.sectionVariants ?? {}
  const columns = hl?.sectionColumns ?? {}
  const breaks = new Set(hl?.sectionBreaks ?? [])
  const headings = hl?.sectionHeadings ?? {}
  for (const s of sections) {
    if (variants[s.type]) s.variant = variants[s.type]
    const col = columns[s.type]
    if (col === 'side' || col === 'main') s.column = col
    if (breaks.has(s.type)) s.pageBreakBefore = true
    if (headings[s.type]) s.heading = headings[s.type]
  }
  const order = hl?.sectionOrder
  if (order?.length) {
    const rank = (t: string) => {
      const i = order.indexOf(t)
      return i < 0 ? order.length : i
    }
    sections.sort((x, y) => rank(x.type) - rank(y.type))
  }

  return { header, sections }
}

function items(doc: BlockDoc, type: string): Array<Record<string, unknown>> {
  const sec = doc.sections.find((s) => s.type === type)
  return sec ? sec.items.map((it) => ({ __id: it.id, ...it.data })) : []
}

export function docToResume(doc: BlockDoc, base?: Resume): Resume {
  const h = doc.header

  const work = items(doc, 'experience').map((d) => ({
    id: str(d.__id),
    position: str(d.title),
    name: str(d.company),
    location: str(d.location),
    startDate: period(d.period).start || undefined,
    endDate: period(d.period).end || undefined,
    highlights: strArray(d.bullets),
  }))

  const education = items(doc, 'education').map((d) => ({
    id: str(d.__id),
    institution: str(d.institution),
    studyType: str(d.degree),
    area: str(d.area),
    startDate: period(d.period).start || undefined,
    endDate: period(d.period).end || undefined,
  }))

  const skillTags = strArray(items(doc, 'skills')[0]?.tags)
  const skills = skillTags.map((name) => ({ name }))

  const projects = items(doc, 'projects').map((d) => ({
    id: str(d.__id),
    name: str(d.name),
    url: str(d.url),
    description: str(d.description),
  }))

  const certificates = items(doc, 'certifications').map((d) => ({
    name: str(d.name),
    issuer: str(d.issuer),
    date: str(d.date) || undefined,
  }))

  const languages = strArray(items(doc, 'languages')[0]?.tags).map((tag) => {
    const m = /^(.*?)\s*\(([^)]*)\)\s*$/.exec(tag)
    return m
      ? { language: m[1].trim(), fluency: m[2].trim() }
      : { language: tag }
  })

  const volunteer = items(doc, 'volunteer').map((d) => ({
    organization: str(d.organization),
    position: str(d.role),
    startDate: period(d.period).start || undefined,
    endDate: period(d.period).end || undefined,
    highlights: strArray(d.bullets),
  }))

  const awards = items(doc, 'awards').map((d) => ({
    title: str(d.title),
    awarder: str(d.awarder),
    date: str(d.date) || undefined,
    summary: str(d.summary) || undefined,
  }))

  const publications = items(doc, 'publications').map((d) => ({
    name: str(d.name),
    publisher: str(d.publisher),
    releaseDate: str(d.date) || undefined,
    url: str(d.url) || undefined,
    summary: str(d.summary) || undefined,
  }))

  const references = items(doc, 'references').map((d) => ({
    name: str(d.name),
    reference: str(d.reference),
  }))

  const sectionVariants: Record<string, string> = {}
  const sectionColumns: Record<string, string> = {}
  const sectionBreaks: Array<string> = []
  const sectionHeadings: Record<string, string> = {}
  for (const s of doc.sections) {
    if (s.variant) sectionVariants[s.type] = s.variant
    if (s.column) sectionColumns[s.type] = s.column
    if (s.pageBreakBefore) sectionBreaks.push(s.type)
    if (s.heading) sectionHeadings[s.type] = s.heading
  }
  const customLines = strArray(items(doc, 'custom')[0]?.lines)

  return {
    ...base,
    basics: {
      ...base?.basics,
      name: h.name,
      label: h.headline,
      email: h.email,
      phone: h.phone,
      url: h.url,
      summary: h.summary,
      location: { ...base?.basics?.location, city: h.location },
    },
    work,
    education,
    skills,
    projects,
    ...(certificates.length ? { certificates } : {}),
    ...(languages.length ? { languages } : {}),
    ...(volunteer.length ? { volunteer } : {}),
    ...(awards.length ? { awards } : {}),
    ...(publications.length ? { publications } : {}),
    ...(references.length ? { references } : {}),
    meta: {
      ...base?.meta,
      hireloom: {
        ...base?.meta?.hireloom,
        sectionOrder: doc.sections.map((s) => s.type),
        sectionVariants,
        sectionColumns,
        sectionBreaks,
        sectionHeadings,
        ...(customLines.length ? { customLines } : {}),
      },
    },
  }
}
