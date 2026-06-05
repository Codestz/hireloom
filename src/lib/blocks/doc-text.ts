import type { BlockDoc } from './document'
import { getSection } from './sections'

/** Flatten the whole document to the plain text the PDF/ATS/AI sees. */
export function resumeText(doc: BlockDoc): string {
  const h = doc.header
  const parts: Array<string> = [
    h.name,
    h.headline,
    h.summary,
    h.email,
    h.url,
    h.location,
  ]
  for (const s of doc.sections) {
    const def = getSection(s.type)?.def
    for (const item of s.items) {
      if (def) parts.push(...def.toAtsLines(item.data))
    }
  }
  return parts.filter(Boolean).join('\n')
}

/** Compact, labelled context for the chat — summary + experience (with companies) + skills. */
export function chatContext(doc: BlockDoc): string {
  const h = doc.header
  const lines: Array<string> = []
  if (h.summary) lines.push(`SUMMARY: ${h.summary}`)
  const exp = doc.sections.find((s) => s.type === 'experience')
  if (exp) {
    lines.push('EXPERIENCE:')
    for (const item of exp.items) {
      const d = item.data as {
        title?: string
        company?: string
        bullets?: Array<string>
      }
      lines.push(`• ${d.title ?? ''} — ${d.company ?? ''}`)
      for (const b of d.bullets ?? []) if (b) lines.push(`    - ${b}`)
    }
  }
  const skills = doc.sections.find((s) => s.type === 'skills')
  if (skills) {
    const tags = (skills.items[0]?.data.tags as Array<string> | undefined) ?? []
    if (tags.length) {
      // One line per entry so the model sees whether skills are grouped categories.
      lines.push('SKILLS:', ...tags.map((t) => `- ${t}`))
    }
  }
  return lines.join('\n')
}

/** Just the work-experience lines — context for summary/skills generation. */
export function experienceText(doc: BlockDoc): string {
  const exp = doc.sections.find((s) => s.type === 'experience')
  if (!exp) return ''
  const lines: Array<string> = []
  for (const item of exp.items) {
    const d = item.data as {
      title?: string
      company?: string
      bullets?: Array<string>
    }
    const head = [d.title, d.company].filter(Boolean).join(' — ')
    if (head) lines.push(head)
    for (const b of d.bullets ?? []) if (b) lines.push(`- ${b}`)
  }
  return lines.join('\n')
}
