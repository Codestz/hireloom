import { enginePrompt } from '../engine'
import { mergeSkillsPrompt, suggestSkillsPrompt } from '../prompts/generators'

/** Pull individual skill tokens out of skill lines, which may be "Group: a, b, c". */
function skillTokens(lines: Array<string>): Array<string> {
  return lines.flatMap((line) => {
    const body = line.includes(':') ? line.slice(line.indexOf(':') + 1) : line
    return body
      .split(/[,/]+/)
      .map((s) => s.trim())
      .filter(Boolean)
  })
}

/** Suggest concrete skills found in the experience that aren't already listed. */
export async function suggestSkills(
  experience: string,
  existing: Array<string>,
): Promise<Array<string>> {
  // Dedupe against skills already named *inside* grouped lines, not whole lines.
  const have = new Set(skillTokens(existing).map((s) => s.toLowerCase()))
  const out = await enginePrompt(suggestSkillsPrompt(experience))
  const seen = new Set<string>()
  return out
    .split(/[,\n]+/)
    .map((s) => s.replace(/^[-•\d.\s]+/, '').trim())
    .filter((s) => s.length > 1 && s.length < 40)
    .filter((s) => {
      const k = s.toLowerCase()
      if (have.has(k) || seen.has(k)) return false
      seen.add(k)
      return true
    })
    .slice(0, 15)
}

/**
 * Add skills the smart way. If the existing skills are grouped category lines
 * ("Architecture & DevOps: …"), weave each addition into the best-matching line via the model
 * and return the updated lines. If they're flat tags, just dedupe-and-append (no AI).
 */
export async function mergeSkills(
  existing: Array<string>,
  additions: Array<string>,
): Promise<Array<string>> {
  const have = new Set(skillTokens(existing).map((s) => s.toLowerCase()))
  const adds = additions.map((s) => s.trim()).filter((s) => s && !have.has(s.toLowerCase()))
  if (!adds.length) return existing

  const grouped = existing.some((l) => l.includes(':'))
  if (!grouped) return [...existing, ...adds]

  const out = await enginePrompt(mergeSkillsPrompt(existing, adds))
  const lines = out
    .split('\n')
    .map((l) => l.replace(/^[-•*\s]+/, '').trim())
    .filter((l) => l.includes(':'))
  return lines.length >= existing.length ? lines : [...existing, ...adds]
}
