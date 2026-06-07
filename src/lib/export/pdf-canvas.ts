import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces'
import type { ResolvedTokens } from '#/lib/templates'
import { isBox } from '#/lib/canvas/model'
import type { CanvasBox, CanvasNode, ElementStyle } from '#/lib/canvas/model'
import { FONT_PDF } from '#/lib/canvas/fonts'
import type { FontChoice } from '#/lib/canvas/fonts'
import {
  A,
  BODY,
  INK,
  MUTED,
  PAGE_CONTENT_WIDTH,
  RULE,
  S,
  familyOf,
  loadPdfMake,
} from './pdf-shared'
import type { PdfFamily, PdfObj } from './pdf-shared'

/**
 * WYSIWYG PDF: render the canvas Box tree straight to pdfmake so the export matches the editor.
 * Boxes → columns / stack / grid; element nodes → text/list/etc. The typed-section renderer lives
 * in pdf.ts; both share the ink palette + font bootstrap from pdf-shared.ts.
 */

const SEP_GLYPH: Record<string, string> = {
  dot: '·',
  bullet: '•',
  dash: '–',
  line: '—',
  slash: '/',
  pipe: '|',
}

/** Map an element's style to pdfmake text props. */
function pdfElStyle(style: ElementStyle | undefined): Record<string, unknown> {
  const s: Record<string, unknown> = {}
  if (!style) return s
  if (style.fontSize !== undefined) s.fontSize = style.fontSize
  if (style.fontWeight !== undefined && style.fontWeight >= 600) s.bold = true
  if (style.italic) s.italics = true
  if (style.underline) s.decoration = 'underline'
  if (style.color) s.color = style.color
  if (style.align) s.alignment = style.align
  return s
}

function pdfElement(
  el: CanvasNode,
  t: ResolvedTokens,
  headingFont: PdfFamily,
  inheritedFont?: FontChoice,
): PdfObj {
  const data = (el as { data?: Record<string, unknown> }).data ?? {}
  const elStyle = (el as { style?: ElementStyle }).style
  const style = pdfElStyle(elStyle)
  const fs = t.baseFontSize
  const font = elStyle?.fontFamily ?? inheritedFont
  const fontProp = font ? { font: FONT_PDF[font] } : {}
  switch (el.kind) {
    case 'heading': {
      const level = data.level === 1 ? 1 : data.level === 3 ? 3 : 2
      const text = S(data.text)
      return {
        text: level === 2 ? text.toUpperCase() : text,
        font: font ? FONT_PDF[font] : headingFont,
        fontSize: level === 1 ? fs * 1.8 : level === 3 ? fs * 1.05 : fs * 0.85,
        bold: level !== 2,
        color: level === 2 ? t.accent : INK,
        characterSpacing: level === 2 ? 1 : 0,
        ...style,
      }
    }
    case 'text':
      return { text: S(data.text), ...fontProp, ...style }
    case 'list':
      return { ul: A(data.items).filter(Boolean), markerColor: t.accent, ...fontProp, ...style }
    case 'separator':
      return { text: SEP_GLYPH[S(data.variant)] ?? '·', color: MUTED, ...style }
    case 'divider':
      return {
        canvas: [
          { type: 'line', x1: 0, y1: 0, x2: PAGE_CONTENT_WIDTH, y2: 0, lineWidth: 0.5, lineColor: RULE },
        ],
        margin: [0, 2, 0, 2],
      }
    case 'spacer':
      return { text: '', margin: [0, 0, 0, typeof data.size === 'number' ? data.size : 8] }
    case 'image':
      return S(data.src)
        ? { image: S(data.src), width: typeof data.width === 'number' ? data.width : 120 }
        : { text: '' }
    case 'button':
      return { text: S(data.label), color: t.accent, bold: true, ...style }
    case 'icon':
      return { text: S(data.name), ...style }
    default:
      return { text: '' }
  }
}

function pdfChildWidth(child: CanvasNode, between: boolean, index: number): string {
  if (isBox(child) && typeof child.props.span === 'number') {
    return `${Math.round((child.props.span / 12) * 100)}%`
  }
  return between && index === 0 ? '*' : 'auto'
}

/** Parse a CSS border shorthand → { width, color } for pdfmake table lines. */
function parseBorder(border: string): { width: number; color: string } {
  const w = /(\d+(?:\.\d+)?)px/.exec(border)
  const c = /#[0-9a-f]{3,8}|rgba?\([^)]+\)/i.exec(border)
  return { width: w ? Number(w[1]) : 0.5, color: c ? c[0] : RULE }
}

/** Wrap a content node in a 1-cell table when the box has background/border/padding. */
function withBoxFrame(inner: PdfObj, p: CanvasBox['props']): PdfObj {
  const hasFrame = p.bg !== undefined || p.border !== undefined || p.pad !== undefined
  if (!hasFrame) return inner
  const b = p.border ? parseBorder(p.border) : { width: 0, color: RULE }
  const pad = p.pad ?? 0
  return {
    table: { widths: ['*'], body: [[inner]] },
    layout: {
      fillColor: () => p.bg ?? null,
      hLineWidth: () => b.width,
      vLineWidth: () => b.width,
      hLineColor: () => b.color,
      vLineColor: () => b.color,
      paddingLeft: () => pad,
      paddingRight: () => pad,
      paddingTop: () => pad,
      paddingBottom: () => pad,
    },
  }
}

function pdfNode(
  node: CanvasNode,
  t: ResolvedTokens,
  headingFont: PdfFamily,
  inheritedFont?: FontChoice,
): PdfObj {
  if (!isBox(node)) return pdfElement(node, t, headingFont, inheritedFont)
  const p = node.props
  const gap = p.gap ?? 0
  const margin = p.margin !== undefined ? [p.margin, p.margin, p.margin, p.margin] : undefined
  const display = p.display ?? 'flex'
  const childFont = p.fontFamily ?? inheritedFont

  let inner: PdfObj
  if (display === 'grid') {
    // Grid → rows of N equal columns (pdfmake columns don't wrap, so chunk manually).
    const cols = Math.max(1, p.gridColumns ?? 2)
    const width = `${(100 / cols).toFixed(4)}%`
    const rows: Array<PdfObj> = []
    for (let i = 0; i < node.children.length; i += cols) {
      const columns = node.children
        .slice(i, i + cols)
        .map((c) => ({ ...pdfNode(c, t, headingFont, childFont), width }))
      rows.push({ columns, columnGap: gap || 6, ...(rows.length ? { margin: [0, gap, 0, 0] } : {}) })
    }
    inner = { stack: rows }
  } else if (display === 'flex' && p.direction === 'row') {
    const between = p.justify === 'between'
    const columns = node.children.map((c, i) => ({
      ...pdfNode(c, t, headingFont, childFont),
      width: pdfChildWidth(c, between, i),
    }))
    inner = { columns, columnGap: gap || 6 }
  } else {
    // column / block → vertical stack; emulate gap with a top margin after the first child
    const stack = node.children.map((c, i) => {
      const obj = pdfNode(c, t, headingFont, childFont)
      if (gap && i > 0) {
        const m = Array.isArray(obj.margin) ? [...(obj.margin as Array<number>)] : [0, 0, 0, 0]
        m[1] = (m[1] ?? 0) + gap
        return { ...obj, margin: m }
      }
      return obj
    })
    inner = { stack }
  }

  const framed = withBoxFrame(inner, p)
  return margin ? { ...framed, margin } : framed
}

function buildCanvasDoc(root: CanvasBox, t: ResolvedTokens): TDocumentDefinitions {
  const headingFont = familyOf(t.fontHeadingPdf)
  return {
    pageSize: 'A4',
    pageMargins: [48, 48, 48, 48],
    defaultStyle: { font: familyOf(t.fontBodyPdf), fontSize: t.baseFontSize, color: BODY, lineHeight: 1.3 },
    content: [pdfNode(root, t, headingFont, root.props.fontFamily)] as unknown as Array<Content>,
  }
}

/** WYSIWYG export: build the PDF directly from the canvas tree so it matches the editor. */
export async function downloadCanvasPdf(
  root: CanvasBox,
  tokens: ResolvedTokens,
  filename: string,
): Promise<void> {
  const pdfMake = await loadPdfMake()
  pdfMake.createPdf(buildCanvasDoc(root, tokens)).download(filename)
}
