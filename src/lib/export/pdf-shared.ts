import { PDF_VFS_FONTS } from './pdf-fonts'

/**
 * Shared base for the two PDF renderers (pdf.ts = typed sections, pdf-canvas.ts = canvas tree):
 * the ink palette, string coercion, and the pdfmake bootstrap (font registration + lazy load).
 */

export const INK = '#171717'
export const SUB = '#525252'
export const MUTED = '#737373'
export const BODY = '#404040'
export const RULE = '#d4d4d4'
export const PAGE_CONTENT_WIDTH = 499 // A4 595.28pt − 2×48 margins

export const S = (v: unknown): string => (typeof v === 'string' ? v : '')
export const A = (v: unknown): Array<string> =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []

/** A loose pdfmake content node (we build these structurally). */
export type PdfObj = Record<string, unknown>

export type PdfFamily = 'Roboto' | 'SourceSerif' | 'JetBrainsMono'

/**
 * Map a resolved token PDF font to a registered family. Sans → Roboto (in pdfmake's vfs);
 * Serif → Source Serif 4, Mono → JetBrains Mono — static .ttf vendored into the vfs (pdf-fonts.ts),
 * since pdfmake's browser build lacks the standard-14 fonts and our app serif is variable woff2.
 */
export function familyOf(pdfFont: string): PdfFamily {
  if (pdfFont.startsWith('Times')) return 'SourceSerif'
  if (pdfFont.startsWith('Courier')) return 'JetBrainsMono'
  return 'Roboto'
}

type FontVariants = {
  normal: string
  bold: string
  italics: string
  bolditalics: string
}

interface PdfMakeStatic {
  addVirtualFileSystem: (vfs: Record<string, string>) => void
  addFonts: (fonts: Record<string, FontVariants>) => void
  createPdf: (def: unknown) => { download: (filename?: string) => void }
}

// Roboto ships in pdfmake's vfs; Source Serif / JetBrains Mono are vendored (pdf-fonts).
// Italics map to the regular cut (we only embed Regular + Bold to keep the payload small).
const PDF_FONTS: Record<string, FontVariants> = {
  Roboto: {
    normal: 'Roboto-Regular.ttf',
    bold: 'Roboto-Medium.ttf',
    italics: 'Roboto-Italic.ttf',
    bolditalics: 'Roboto-MediumItalic.ttf',
  },
  SourceSerif: {
    normal: 'SourceSerif4-Regular.ttf',
    bold: 'SourceSerif4-Bold.ttf',
    italics: 'SourceSerif4-Regular.ttf',
    bolditalics: 'SourceSerif4-Bold.ttf',
  },
  JetBrainsMono: {
    normal: 'JetBrainsMono-Regular.ttf',
    bold: 'JetBrainsMono-Bold.ttf',
    italics: 'JetBrainsMono-Regular.ttf',
    bolditalics: 'JetBrainsMono-Bold.ttf',
  },
}

export async function loadPdfMake(): Promise<PdfMakeStatic> {
  const mod = (await import('pdfmake/build/pdfmake')) as unknown as { default?: PdfMakeStatic }
  const pdfMake = (mod.default ?? mod) as unknown as PdfMakeStatic
  const fontsMod = (await import('pdfmake/build/vfs_fonts')) as unknown as {
    default?: unknown
    vfs?: unknown
    pdfMake?: { vfs?: unknown }
  }
  const f = (fontsMod.default ?? fontsMod) as { vfs?: unknown; pdfMake?: { vfs?: unknown } }
  const base = (f.vfs ?? f.pdfMake?.vfs ?? f) as Record<string, string>
  // pdfmake 0.3.x: register via addVirtualFileSystem/addFonts (which merge into the internal
  // singletons). Assigning .vfs/.fonts directly doesn't reach the VFS the renderer reads. Both
  // merge, so re-calling each export is harmless.
  pdfMake.addVirtualFileSystem(base) // Roboto
  pdfMake.addVirtualFileSystem(PDF_VFS_FONTS) // Source Serif + JetBrains Mono
  pdfMake.addFonts(PDF_FONTS)
  return pdfMake
}
