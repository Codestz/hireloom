import { z } from 'zod'

/**
 * Design tokens shared by a template's HTML canvas and its @react-pdf renderer —
 * the contract that keeps preview and export visually matched (ARCHITECTURE §3, §7).
 * The full template engine (registry + renderers) lands in E1; this is the model
 * the resume record persists.
 */

// Resume fonts map 1:1 to @react-pdf built-ins so the canvas and PDF use identical
// metrics (no font embedding). Brand fonts (Geist/Fraunces) stay in the app chrome.
export const FONT_OPTIONS = ['sans', 'serif', 'mono'] as const
export type FontOption = (typeof FONT_OPTIONS)[number]

/** Page geometry for export. */
export type PageSize = 'a4' | 'letter'

// Basics/header layouts: left-aligned (default), centered, or a compact name+contacts row.
export const HEADER_VARIANTS = ['standard', 'centered', 'compact'] as const
export type HeaderVariant = (typeof HEADER_VARIANTS)[number]

// Structural arrangement the builder produces: one column, a left side-rail, or an accent band.
export const LAYOUT_KINDS = ['single', 'sidebar', 'band'] as const
export type LayoutKind = (typeof LAYOUT_KINDS)[number]

export const ThemeTokensSchema = z.object({
  accent: z.string(), // hex
  fontHeading: z.enum(FONT_OPTIONS),
  fontBody: z.enum(FONT_OPTIONS),
  density: z.number().min(0.7).max(1.3), // spacing multiplier
  baseFontSize: z.number().min(9).max(13), // pt
  headerVariant: z.enum(HEADER_VARIANTS).optional(),
  layout: z.enum(LAYOUT_KINDS).optional(),
})

export type ThemeTokens = z.infer<typeof ThemeTokensSchema>

export const DEFAULT_TEMPLATE_ID = 'ats-safe'

export const DEFAULT_TOKENS: ThemeTokens = {
  accent: '#2f6b4f', // evergreen
  fontHeading: 'sans',
  fontBody: 'sans',
  density: 1,
  baseFontSize: 10,
  headerVariant: 'standard',
}
