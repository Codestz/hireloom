/**
 * Font-family choices that work in BOTH the canvas (CSS) and the PDF (pdfmake registered
 * families). A node's effective font cascades: own override → nearest ancestor box → the
 * document default (token fonts). Three families keep canvas and PDF in lockstep.
 */
export type FontChoice = 'sans' | 'serif' | 'mono'

export const FONT_CSS: Record<FontChoice, string> = {
  sans: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  serif: 'ui-serif, Georgia, "Times New Roman", serif',
  mono: 'ui-monospace, SFMono-Regular, Menlo, monospace',
}

/** Matches the registered pdfmake families (see pdf.ts familyOf). */
export const FONT_PDF: Record<FontChoice, 'Roboto' | 'SourceSerif' | 'JetBrainsMono'> = {
  sans: 'Roboto',
  serif: 'SourceSerif',
  mono: 'JetBrainsMono',
}

export const FONT_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'Default' },
  { value: 'sans', label: 'Sans' },
  { value: 'serif', label: 'Serif' },
  { value: 'mono', label: 'Mono' },
]

export function isFontChoice(v: unknown): v is FontChoice {
  return v === 'sans' || v === 'serif' || v === 'mono'
}
