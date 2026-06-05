import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces'
import { defaultColumn } from '#/lib/templates'
import type { LayoutKind, ResolvedTokens } from '#/lib/templates'
import type { HeaderData } from '#/lib/blocks/defs/header'
import type { BlockDoc, DocSection } from '#/lib/blocks/document'
import { PDF_VFS_FONTS } from './pdf-fonts'
import { getSection } from '#/lib/blocks/sections'

/**
 * Our own client-side PDF export (pdfmake) — builds the file in-browser and downloads
 * it directly: no print dialog, no browser headers, on-device, selectable/ATS-safe
 * text. Mirrors each section's chosen design variant + the resolved tokens. The
 * prebuilt browser bundle is dynamic-imported so it stays out of the main chunk.
 */

const INK = '#171717'
const SUB = '#525252'
const MUTED = '#737373'
const BODY = '#404040'
const RULE = '#d4d4d4'
const PAGE_CONTENT_WIDTH = 499 // A4 595.28pt − 2×48 margins

const S = (v: unknown): string => (typeof v === 'string' ? v : '')
const A = (v: unknown): Array<string> =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
const period = (v: unknown): string => {
  const p = (v ?? {}) as { start?: unknown; end?: unknown }
  return [S(p.start), S(p.end)].filter(Boolean).join(' – ')
}

type Data = Record<string, unknown>
type PdfFamily = 'Roboto' | 'SourceSerif' | 'JetBrainsMono'

/**
 * Map a resolved token PDF font to a registered family. Sans → Roboto (in pdfmake's
 * vfs); Serif → Source Serif 4, Mono → JetBrains Mono — static .ttf subset to Latin and
 * vendored into the vfs (see pdf-fonts.ts), since pdfmake's browser build lacks the
 * standard-14 fonts and our app serif (Fraunces) is variable woff2. So a serif/mono
 * resume exports in a real serif/mono, matching the canvas.
 */
function familyOf(pdfFont: string): PdfFamily {
  if (pdfFont.startsWith('Times')) return 'SourceSerif'
  if (pdfFont.startsWith('Courier')) return 'JetBrainsMono'
  return 'Roboto'
}

function titleRun(
  a: string,
  b: string,
  aColor = INK,
  bColor = SUB,
): Array<Content> {
  return [
    { text: a, bold: true, color: aColor },
    ...(b
      ? [
          { text: ' · ', color: MUTED } as Content,
          { text: b, color: bColor } as Content,
        ]
      : []),
  ]
}

function bullets(data: Data, accent: string, mt: number): Content | null {
  const items = A(data.bullets).filter(Boolean)
  if (!items.length) return null
  return { ul: items, markerColor: accent, margin: [0, mt, 0, 0] }
}

function experience(d: Data, t: ResolvedTokens, variant: string): Content {
  const fs = t.baseFontSize
  const loc = S(d.location)
  const per: Content = {
    text: period(d.period),
    color: MUTED,
    fontSize: fs * 0.9,
    alignment: 'right',
    width: 'auto',
  }

  if (variant === 'stacked') {
    return {
      stack: [
        { text: S(d.title), bold: true, color: INK, fontSize: fs * 1.15 },
        {
          text: [S(d.company), loc, period(d.period)]
            .filter(Boolean)
            .join('  ·  '),
          color: SUB,
          fontSize: fs * 0.9,
          margin: [0, t.space(1), 0, 0],
        },
        bullets(d, t.accent, t.space(3)),
      ].filter(Boolean) as Array<Content>,
    }
  }

  if (variant === 'compact') {
    return {
      stack: [
        {
          columns: [
            {
              width: '*',
              text: [
                ...titleRun(S(d.title), S(d.company)),
                ...(loc
                  ? [{ text: '  ·  ' + loc, color: MUTED, fontSize: fs * 0.9 }]
                  : []),
              ],
            },
            per,
          ],
        },
        bullets(d, t.accent, t.space(2)),
      ].filter(Boolean) as Array<Content>,
    }
  }

  const inner: Array<Content> = [
    {
      columns: [{ width: '*', text: titleRun(S(d.title), S(d.company)) }, per],
    },
    ...(loc
      ? [
          {
            text: loc,
            color: MUTED,
            fontSize: fs * 0.9,
            margin: [0, t.space(1), 0, 0],
          } as Content,
        ]
      : []),
    ...(bullets(d, t.accent, t.space(4))
      ? [bullets(d, t.accent, t.space(4))!]
      : []),
  ]

  if (variant === 'timeline') {
    return {
      table: {
        widths: [2, '*'],
        body: [[{ text: '', fillColor: t.accent }, { stack: inner }]],
      },
      layout: {
        defaultBorder: false,
        paddingLeft: (i: number) => (i === 0 ? 0 : 8),
        paddingRight: () => 0,
        paddingTop: () => 0,
        paddingBottom: () => 0,
      },
    }
  }
  return { stack: inner }
}

function education(d: Data, t: ResolvedTokens, variant: string): Content {
  const fs = t.baseFontSize
  const area = S(d.area)
  const per: Content = {
    text: period(d.period),
    color: MUTED,
    fontSize: fs * 0.9,
    alignment: 'right',
    width: 'auto',
  }

  if (variant === 'stacked') {
    return {
      stack: [
        { text: S(d.institution), bold: true, color: INK, fontSize: fs * 1.1 },
        {
          text: [S(d.degree), area, period(d.period)]
            .filter(Boolean)
            .join('  ·  '),
          color: SUB,
          fontSize: fs * 0.9,
          margin: [0, t.space(1), 0, 0],
        },
      ],
    }
  }

  if (variant === 'compact') {
    return {
      columns: [
        {
          width: '*',
          text: [
            ...titleRun(S(d.institution), S(d.degree)),
            ...(area
              ? [{ text: '  ·  ' + area, color: MUTED, fontSize: fs * 0.9 }]
              : []),
          ],
        },
        per,
      ],
    }
  }

  return {
    stack: [
      {
        columns: [
          { width: '*', text: titleRun(S(d.institution), S(d.degree)) },
          per,
        ],
      },
      ...(area
        ? [
            {
              text: area,
              color: MUTED,
              fontSize: fs * 0.9,
              margin: [0, t.space(1), 0, 0],
            } as Content,
          ]
        : []),
    ],
  }
}

function project(d: Data, t: ResolvedTokens): Content {
  const fs = t.baseFontSize
  return {
    stack: [
      {
        text: [
          { text: S(d.name), bold: true, color: INK },
          ...(d.url
            ? [
                { text: ' · ', color: MUTED },
                { text: S(d.url), color: t.accent, fontSize: fs * 0.9 },
              ]
            : []),
        ],
      },
      ...(d.description
        ? [{ text: S(d.description), margin: [0, t.space(2), 0, 0] } as Content]
        : []),
    ],
  }
}

function certification(d: Data, t: ResolvedTokens, variant: string): Content {
  const fs = t.baseFontSize
  if (variant === 'list') {
    return {
      ul: [
        {
          text: [
            { text: S(d.name), bold: true, color: INK },
            ...(d.issuer
              ? [{ text: '  ' + S(d.issuer), color: MUTED, fontSize: fs * 0.9 }]
              : []),
          ],
        },
      ],
      markerColor: t.accent,
    }
  }
  return {
    columns: [
      { width: '*', text: titleRun(S(d.name), S(d.issuer)) },
      {
        width: 'auto',
        text: S(d.date),
        color: MUTED,
        fontSize: fs * 0.9,
        alignment: 'right',
      },
    ],
  }
}

function tags(
  values: Array<string>,
  t: ResolvedTokens,
  variant: string,
): Content {
  const items = values.filter(Boolean)
  if (variant === 'list') {
    return { ul: items, markerColor: t.accent }
  }
  // inline + pills both render as a flowing dot-separated run in PDF
  return { text: items.join('   ·   '), color: BODY }
}

function award(d: Data, t: ResolvedTokens): Content {
  const fs = t.baseFontSize
  return {
    stack: [
      {
        columns: [
          { width: '*', text: titleRun(S(d.title), S(d.awarder)) },
          {
            width: 'auto',
            text: S(d.date),
            color: MUTED,
            fontSize: fs * 0.9,
            alignment: 'right',
          },
        ],
      },
      ...(d.summary
        ? [{ text: S(d.summary), margin: [0, t.space(2), 0, 0] } as Content]
        : []),
    ],
  }
}

function volunteer(d: Data, t: ResolvedTokens): Content {
  const fs = t.baseFontSize
  return {
    stack: [
      {
        columns: [
          { width: '*', text: titleRun(S(d.role), S(d.organization)) },
          {
            width: 'auto',
            text: period(d.period),
            color: MUTED,
            fontSize: fs * 0.9,
            alignment: 'right',
          },
        ],
      },
      ...(bullets(d, t.accent, t.space(4))
        ? [bullets(d, t.accent, t.space(4))!]
        : []),
    ],
  }
}

function publication(d: Data, t: ResolvedTokens): Content {
  const fs = t.baseFontSize
  return {
    stack: [
      {
        columns: [
          { width: '*', text: titleRun(S(d.name), S(d.publisher)) },
          {
            width: 'auto',
            text: S(d.date),
            color: MUTED,
            fontSize: fs * 0.9,
            alignment: 'right',
          },
        ],
      },
      ...(d.url
        ? [
            {
              text: S(d.url),
              color: t.accent,
              fontSize: fs * 0.9,
              margin: [0, t.space(1), 0, 0],
            } as Content,
          ]
        : []),
      ...(d.summary
        ? [{ text: S(d.summary), margin: [0, t.space(2), 0, 0] } as Content]
        : []),
    ],
  }
}

function reference(d: Data, t: ResolvedTokens): Content {
  return {
    stack: [
      { text: S(d.name), bold: true, color: INK },
      ...(d.reference
        ? [
            {
              text: S(d.reference),
              italics: true,
              color: SUB,
              margin: [0, t.space(1), 0, 0],
            } as Content,
          ]
        : []),
    ],
  }
}

function entryFor(
  section: DocSection,
  d: Data,
  t: ResolvedTokens,
): Content | null {
  const variant = section.variant ?? 'classic'
  switch (section.type) {
    case 'experience':
      return experience(d, t, variant)
    case 'education':
      return education(d, t, variant)
    case 'projects':
      return project(d, t)
    case 'certifications':
      return certification(d, t, variant)
    case 'volunteer':
      return volunteer(d, t)
    case 'awards':
      return award(d, t)
    case 'publications':
      return publication(d, t)
    case 'references':
      return reference(d, t)
    default:
      return null
  }
}

function headerContent(
  h: HeaderData,
  t: ResolvedTokens,
  headingFont: PdfFamily,
): Array<Content> {
  const fs = t.baseFontSize
  const contacts = [h.email, h.phone, h.url, h.location].filter(Boolean)
  const contactsText = contacts.join('   ·   ')
  const summary: Array<Content> = h.summary
    ? [{ text: h.summary, margin: [0, t.space(8), 0, 0], lineHeight: 1.35 }]
    : []

  if (t.headerVariant === 'compact') {
    const out: Array<Content> = [
      {
        columns: [
          {
            width: '*',
            text: h.name || 'Your Name',
            font: headingFont,
            fontSize: fs * 1.7,
            bold: true,
            color: INK,
          },
          ...(contactsText
            ? [
                {
                  width: 'auto',
                  text: contactsText,
                  fontSize: fs * 0.85,
                  color: MUTED,
                  alignment: 'right',
                } as Content,
              ]
            : []),
        ],
      },
    ]
    if (h.headline)
      out.push({
        text: h.headline,
        fontSize: fs * 1.05,
        color: SUB,
        margin: [0, t.space(1), 0, 0],
      })
    return [...out, ...summary]
  }

  const al =
    t.headerVariant === 'centered' ? { alignment: 'center' as const } : {}
  const out: Array<Content> = [
    {
      text: h.name || 'Your Name',
      font: headingFont,
      fontSize: fs * 2,
      bold: true,
      color: INK,
      ...al,
    },
  ]
  if (h.headline)
    out.push({
      text: h.headline,
      fontSize: fs * 1.1,
      color: SUB,
      margin: [0, t.space(2), 0, 0],
      ...al,
    })
  if (contactsText)
    out.push({
      text: contactsText,
      fontSize: fs * 0.9,
      color: MUTED,
      margin: [0, t.space(3), 0, 0],
      ...al,
    })
  return [...out, ...summary]
}

function bandHeaderContent(
  h: HeaderData,
  t: ResolvedTokens,
  headingFont: PdfFamily,
): Array<Content> {
  const fs = t.baseFontSize
  const contacts = [h.email, h.phone, h.url, h.location].filter(Boolean)
  const band: Array<Content> = [
    {
      text: h.name || 'Your Name',
      font: headingFont,
      fontSize: fs * 2,
      bold: true,
      color: '#ffffff',
    },
  ]
  if (h.headline)
    band.push({
      text: h.headline,
      fontSize: fs * 1.05,
      color: '#eef3f0',
      margin: [0, 2, 0, 0],
    })
  if (contacts.length)
    band.push({
      text: contacts.join('   ·   '),
      fontSize: fs * 0.85,
      color: '#e3ece8',
      margin: [0, 4, 0, 0],
    })
  const out: Array<Content> = [
    {
      table: {
        widths: ['*'],
        body: [
          [{ fillColor: t.accent, margin: [14, 12, 14, 12], stack: band }],
        ],
      },
      layout: 'noBorders',
    },
  ]
  if (h.summary)
    out.push({
      text: h.summary,
      margin: [0, t.space(8), 0, 0],
      lineHeight: 1.35,
    })
  return out
}

function sectionContent(
  section: DocSection,
  t: ResolvedTokens,
  headingFont: PdfFamily,
  ruleWidth: number,
  breakBefore = false,
  autoBreaks: Set<string> = new Set(),
): Array<Content> {
  const st = getSection(section.type)
  if (!st) return []
  const fs = t.baseFontSize
  const headingBreak = breakBefore || autoBreaks.has(`sec-${section.id}`)
  const out: Array<Content> = [
    {
      text: (section.heading ?? st.heading).toUpperCase(),
      font: headingFont,
      color: t.accent,
      fontSize: fs * 0.85,
      bold: true,
      characterSpacing: 1,
      margin: [0, t.space(16), 0, 2],
      ...(headingBreak ? { pageBreak: 'before' as const } : {}),
    },
    {
      canvas: [
        {
          type: 'line',
          x1: 0,
          y1: 0,
          x2: ruleWidth,
          y2: 0,
          lineWidth: 0.5,
          lineColor: RULE,
        },
      ],
      margin: [0, 0, 0, t.space(6)],
    },
  ]
  if (section.type === 'custom') {
    const lines = A(section.items.at(0)?.data.lines).filter(Boolean)
    if (lines.length) out.push({ ul: lines, markerColor: t.accent })
  } else if (st.kind === 'flat') {
    out.push(
      tags(A(section.items.at(0)?.data.tags), t, section.variant ?? 'inline'),
    )
  } else {
    section.items.forEach((item, i) => {
      const node = entryFor(section, item.data, t)
      if (node)
        out.push({
          ...(node as object),
          margin: [0, i ? t.space(6) : 0, 0, 0],
          ...(autoBreaks.has(`item-${item.id}`)
            ? { pageBreak: 'before' as const }
            : {}),
        } as Content)
    })
  }
  return out
}

interface LayoutOpts {
  layout?: LayoutKind
  /** Element ids (`sec-…`/`item-…`) to force a page break before (from the canvas). */
  autoBreaks?: Array<string>
}

function buildDoc(
  doc: BlockDoc,
  t: ResolvedTokens,
  opts: LayoutOpts = {},
): TDocumentDefinitions {
  const fs = t.baseFontSize
  const bodyFont = familyOf(t.fontBodyPdf)
  const headingFont = familyOf(t.fontHeadingPdf)
  const layout = opts.layout ?? 'single'
  const autoBreaks = new Set(opts.autoBreaks ?? [])
  const isSide = (s: DocSection) =>
    (s.column ?? defaultColumn(s.type)) === 'side'

  let content: Array<Content>
  if (layout === 'sidebar') {
    const sideW = 165
    const side = doc.sections
      .filter(isSide)
      .flatMap((s) => sectionContent(s, t, headingFont, sideW - 6))
    const main = doc.sections
      .filter((s) => !isSide(s))
      .flatMap((s) => sectionContent(s, t, headingFont, 310))
    content = [
      ...headerContent(doc.header, t, headingFont),
      {
        margin: [0, t.space(4), 0, 0],
        columnGap: 18,
        columns: [
          { width: sideW, stack: side },
          { width: '*', stack: main },
        ],
      },
    ]
  } else {
    const head =
      layout === 'band'
        ? bandHeaderContent(doc.header, t, headingFont)
        : headerContent(doc.header, t, headingFont)
    content = [
      ...head,
      ...doc.sections.flatMap((s, i) =>
        sectionContent(
          s,
          t,
          headingFont,
          PAGE_CONTENT_WIDTH,
          i > 0 && !!s.pageBreakBefore,
          autoBreaks,
        ),
      ),
    ]
  }

  return {
    pageSize: 'A4',
    pageMargins: [48, 48, 48, 48],
    defaultStyle: {
      font: bodyFont,
      fontSize: fs,
      color: BODY,
      lineHeight: 1.3,
    },
    content,
  }
}

type FontVariants = {
  normal: string
  bold: string
  italics: string
  bolditalics: string
}
interface PdfMakeStatic {
  vfs?: Record<string, string>
  fonts?: Record<string, FontVariants>
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

async function loadPdfMake(): Promise<PdfMakeStatic> {
  const mod = (await import('pdfmake/build/pdfmake')) as unknown as {
    default?: PdfMakeStatic
  }
  const pdfMake = (mod.default ?? mod) as unknown as PdfMakeStatic
  const fontsMod = (await import('pdfmake/build/vfs_fonts')) as unknown as {
    default?: unknown
    vfs?: unknown
    pdfMake?: { vfs?: unknown }
  }
  const f = (fontsMod.default ?? fontsMod) as {
    vfs?: unknown
    pdfMake?: { vfs?: unknown }
  }
  const base = (f.vfs ?? f.pdfMake?.vfs ?? f) as Record<string, string>
  // pdfmake 0.3.x: register via addVirtualFileSystem/addFonts (which merge into the
  // internal singletons). Assigning .vfs/.fonts directly doesn't reach the VFS the
  // renderer reads, so vendored families wouldn't be found. Both merge, so re-calling
  // each export is harmless.
  pdfMake.addVirtualFileSystem(base) // Roboto
  pdfMake.addVirtualFileSystem(PDF_VFS_FONTS) // Source Serif + JetBrains Mono
  pdfMake.addFonts(PDF_FONTS)
  return pdfMake
}

export async function downloadResumePdf(
  doc: BlockDoc,
  tokens: ResolvedTokens,
  filename: string,
  opts: LayoutOpts = {},
): Promise<void> {
  const pdfMake = await loadPdfMake()
  pdfMake.createPdf(buildDoc(doc, tokens, opts)).download(filename)
}
