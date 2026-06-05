import type { ComponentType } from 'react'
import type { Resume } from '#/lib/resume'
import type { PageSize, FontOption, ThemeTokens } from './tokens'

/**
 * Template engine (ARCHITECTURE §7). A template provides two renderers — an HTML
 * Canvas and a @react-pdf Pdf — both driven by the SAME resolved tokens, which is
 * what keeps preview and export visually matched. Resume fonts map 1:1 to react-pdf
 * built-ins so metrics line up without embedding.
 */

const FONT_MAP: Record<FontOption, { css: string; pdf: string }> = {
  sans: {
    css: "Helvetica, Arial, 'Helvetica Neue', sans-serif",
    pdf: 'Helvetica',
  },
  serif: { css: "Georgia, 'Times New Roman', serif", pdf: 'Times-Roman' },
  mono: { css: "'Courier New', Courier, monospace", pdf: 'Courier' },
}

function fontOf(key: string): { css: string; pdf: string } {
  return key in FONT_MAP ? FONT_MAP[key as FontOption] : FONT_MAP.sans
}

export interface ResolvedTokens {
  accent: string
  fontHeadingCss: string
  fontBodyCss: string
  fontHeadingPdf: string
  fontBodyPdf: string
  baseFontSize: number
  headerVariant: 'standard' | 'centered' | 'compact'
  /** Density-scaled spacing — same numbers used as px (canvas) and pt (PDF). */
  space: (n: number) => number
}

export function resolveTokens(tokens: ThemeTokens): ResolvedTokens {
  const heading = fontOf(tokens.fontHeading)
  const body = fontOf(tokens.fontBody)
  const density = tokens.density || 1
  return {
    accent: tokens.accent || '#2f6b4f',
    fontHeadingCss: heading.css,
    fontBodyCss: body.css,
    fontHeadingPdf: heading.pdf,
    fontBodyPdf: body.pdf,
    baseFontSize: tokens.baseFontSize || 10,
    headerVariant: tokens.headerVariant ?? 'standard',
    space: (n) => Math.round(n * density),
  }
}

export interface TemplateProps {
  resume: Resume
  tokens: ResolvedTokens
  pageSize?: PageSize
}

/** Canvas (HTML) template — static, SSR-safe, used by the preview. */
export interface ResumeTemplate {
  id: string
  name: string
  description: string
  defaultTokens: ThemeTokens
  Canvas: ComponentType<TemplateProps>
}

/** PDF template component — lives in the pdf-registry, dynamic-imported at export. */
export type TemplatePdf = ComponentType<TemplateProps>
