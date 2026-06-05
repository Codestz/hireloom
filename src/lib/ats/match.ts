/**
 * Deterministic ATS keyword match — fully on-device, no AI, works in every browser.
 * It extracts the meaningful terms (single words + 2–3 word phrases) from the job
 * description the user pastes — NOT a hardcoded list — ranks them by frequency, then
 * checks which appear in the résumé's plain text. Optional on-device AI (Chrome) can
 * layer synonym/suggestion help on top, but the score here is real and reproducible.
 */

// Function words + résumé/JD boilerplate that carry no matching signal.
const STOPWORDS = new Set([
  'a',
  'an',
  'the',
  'and',
  'or',
  'but',
  'if',
  'then',
  'else',
  'for',
  'to',
  'of',
  'in',
  'on',
  'at',
  'by',
  'with',
  'as',
  'is',
  'are',
  'be',
  'been',
  'being',
  'was',
  'were',
  'will',
  'would',
  'can',
  'could',
  'should',
  'shall',
  'may',
  'might',
  'must',
  'do',
  'does',
  'did',
  'have',
  'has',
  'had',
  'this',
  'that',
  'these',
  'those',
  'it',
  'its',
  'we',
  'our',
  'you',
  'your',
  'they',
  'their',
  'he',
  'she',
  'his',
  'her',
  'i',
  'me',
  'my',
  'us',
  'them',
  'who',
  'whom',
  'which',
  'what',
  'when',
  'where',
  'why',
  'how',
  'all',
  'any',
  'both',
  'each',
  'few',
  'more',
  'most',
  'other',
  'some',
  'such',
  'no',
  'not',
  'only',
  'own',
  'same',
  'so',
  'than',
  'too',
  'very',
  'just',
  'from',
  'up',
  'out',
  'about',
  'into',
  'over',
  'after',
  'before',
  'between',
  'per',
  'also',
  'etc',
  'e.g',
  'i.e',
  'including',
  'include',
  'includes',
  'using',
  'use',
  'used',
  'able',
  'within',
  'across',
  'via',
  'plus',
  'well',
  'work',
  'working',
  'role',
  'job',
  'position',
  'candidate',
  'applicant',
  'years',
  'year',
  'months',
  'looking',
  'seeking',
  'join',
  'help',
  'new',
  'strong',
  'good',
  'great',
  'excellent',
  'required',
  'require',
  'nice',
  'preferred',
  'prefer',
  'desired',
  'ideal',
  'responsibilities',
  'qualifications',
  'skills',
  'ability',
  'bonus',
  'team',
])

function tokenize(text: string): Array<string> {
  // Keep tech-y characters (c++, node.js, c#, .net), drop the rest.
  return (
    text.toLowerCase().match(/[a-z0-9][a-z0-9+#.-]*[a-z0-9+#]|[a-z0-9]/g) ?? []
  )
    .map((t) => t.replace(/[.-]+$/, ''))
    .filter(Boolean)
}

const isStop = (w: string) =>
  STOPWORDS.has(w) || w.length < 2 || /^\d+$/.test(w)

export interface Keyword {
  term: string
  /** how many times it appears in the JD */
  count: number
  present: boolean
}

/**
 * Pull ranked keywords from the JD: content unigrams (the reliable ATS signal) plus
 * *repeated* clean 2-word phrases. One-off bigrams and stopword-spanning n-grams are
 * noise that rarely match a résumé verbatim, so we skip them.
 */
function extractKeywords(jd: string, limit = 24): Array<Keyword> {
  const tokens = tokenize(jd)
  const uni = new Map<string, number>()
  const bi = new Map<string, number>()
  for (let i = 0; i < tokens.length; i++) {
    const w = tokens[i]
    if (!isStop(w)) uni.set(w, (uni.get(w) ?? 0) + 1)
    const w2 = tokens[i + 1]
    if (w2 && !isStop(w) && !isStop(w2)) {
      const p = `${w} ${w2}`
      bi.set(p, (bi.get(p) ?? 0) + 1)
    }
  }
  const sorted = (m: Map<string, number>) =>
    [...m.entries()].sort((a, b) => b[1] - a[1])
  const phrases = sorted(bi)
    .filter(([, c]) => c >= 2)
    .slice(0, 6)
  const words = sorted(uni).slice(0, 20)

  const seen = new Set<string>()
  const out: Array<Keyword> = []
  for (const [term, count] of [...phrases, ...words]) {
    if (seen.has(term) || out.length >= limit) continue
    seen.add(term)
    out.push({ term, count, present: false })
  }
  return out
}

function present(term: string, resumeLower: string): boolean {
  if (/^[a-z0-9]+$/.test(term)) {
    return new RegExp(`\\b${term}\\b`).test(resumeLower)
  }
  return resumeLower.includes(term)
}

export interface MatchResult {
  score: number // 0–100
  matched: Array<Keyword>
  missing: Array<Keyword>
}

export function matchResume(jd: string, resumeText: string): MatchResult {
  const resumeLower = resumeText.toLowerCase()
  const keywords = extractKeywords(jd).map((k) => ({
    ...k,
    present: present(k.term, resumeLower),
  }))
  if (!keywords.length) return { score: 0, matched: [], missing: [] }
  const matched = keywords.filter((k) => k.present)
  const missing = keywords.filter((k) => !k.present)
  const score = Math.round((matched.length / keywords.length) * 100)
  return { score, matched, missing }
}
