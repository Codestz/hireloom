import { DEFAULT_TOKENS } from './tokens'
import type { FontOption, ThemeTokens } from './tokens'

/**
 * Templates = document LAYOUT (the real templating). Styling — font, accent, density —
 * stays separate (Design panel) and applies on top of any layout. Based on the three
 * archetypes that dominate 2026 CV design: single column (ATS-safe), two-column with a
 * side rail (human-first), and a full-width header band.
 */
export type LayoutKind = 'single' | 'sidebar' | 'band'
export type Column = 'side' | 'main'

export interface Template {
  id: string
  label: string
  description: string
  layout: LayoutKind
  font: FontOption
  density: number
  /** sectionType → variant id (sensible defaults for the layout) */
  variants: Record<string, string>
}

const COMMON = {
  experience: 'classic',
  education: 'classic',
  projects: 'classic',
}

export const TEMPLATES: Array<Template> = [
  {
    id: 'ats-safe',
    label: 'Single Column',
    description: 'One column, parse-safe. Best for ATS / online applications.',
    layout: 'single',
    font: 'sans',
    density: 1,
    variants: {
      ...COMMON,
      certifications: 'list',
      skills: 'inline',
      languages: 'inline',
    },
  },
  {
    id: 'two-column',
    label: 'Two Columns',
    description:
      'Skills & contact in a side rail. Human-first — less ATS-safe.',
    layout: 'sidebar',
    font: 'sans',
    density: 1,
    variants: {
      ...COMMON,
      certifications: 'list',
      skills: 'list',
      languages: 'list',
    },
  },
  {
    id: 'band',
    label: 'Header Band',
    description: 'Full-width accent header, single-column body.',
    layout: 'band',
    font: 'sans',
    density: 1,
    variants: {
      ...COMMON,
      certifications: 'classic',
      skills: 'inline',
      languages: 'inline',
    },
  },
  {
    id: 'compact',
    label: 'Compact',
    description: 'Dense, single-column serif — fits a deep history on one page.',
    layout: 'single',
    font: 'serif',
    density: 0.85,
    variants: {
      ...COMMON,
      certifications: 'list',
      skills: 'inline',
      languages: 'inline',
    },
  },
]

const SIDEBAR_TYPES = new Set(['skills', 'languages', 'certifications'])

/** Research-backed default split for the two-column layout (overridable per section). */
export function defaultColumn(type: string): Column {
  return SIDEBAR_TYPES.has(type) ? 'side' : 'main'
}

export function getTemplate(id: string | undefined): Template | undefined {
  return TEMPLATES.find((t) => t.id === id)
}

/** Per-template theme overrides — distinct layout + accent/font so the gallery reads as variety. */
const TEMPLATE_THEME: Record<string, Partial<ThemeTokens>> = {
  'ats-safe': { layout: 'single', accent: '#2f6b4f', fontHeading: 'sans', fontBody: 'sans', headerVariant: 'standard' },
  'two-column': { layout: 'sidebar', accent: '#334155', fontHeading: 'sans', fontBody: 'sans', headerVariant: 'standard' },
  band: { layout: 'band', accent: '#4f46e5', fontHeading: 'sans', fontBody: 'sans', headerVariant: 'centered' },
  compact: { layout: 'single', accent: '#0f172a', fontHeading: 'serif', fontBody: 'serif', headerVariant: 'compact', density: 0.85, baseFontSize: 9 },
}

/** Full ThemeTokens for a template id (layout + theme) — for seeding a résumé and gallery previews. */
export function templateTokens(id: string): ThemeTokens {
  return { ...DEFAULT_TOKENS, ...(TEMPLATE_THEME[id] ?? {}) }
}
