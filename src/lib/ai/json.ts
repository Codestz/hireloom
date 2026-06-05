/** Pull the first `{…}` object out of a model response and parse it. Returns null on failure. */
export function extractJson<T>(text: string): T | null {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end <= start) return null
  try {
    return JSON.parse(text.slice(start, end + 1)) as T
  } catch {
    return null
  }
}
