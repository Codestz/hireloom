/**
 * Date presentation shared by every renderer (HTML canvas, PDF export) so all outputs
 * format dates identically.
 */

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

/** "2020-06" → "Jun 2020"; "2020" → "2020"; passthrough for anything else. */
export function formatDate(value?: string): string {
  if (!value) return ''
  const match = /^(\d{4})(?:-(\d{2}))?/.exec(value)
  if (!match) return value
  const [, year, month] = match
  if (month) {
    const idx = Number(month) - 1
    if (idx >= 0 && idx < 12) return `${MONTHS[idx]} ${year}`
  }
  return year
}

/** "Jun 2020 – Present" style range; empty if no start date. */
export function dateRange(start?: string, end?: string): string {
  const from = formatDate(start)
  if (!from) return ''
  const to = end ? formatDate(end) : 'Present'
  return `${from} – ${to}`
}
