/**
 * Content-aware page-break computation. The old guide drew a line every A4-height —
 * a dumb ruler that cut through blocks and ignored flow. This measures the REAL
 * rendered height of each breakable block (header, sections, entries) and places a
 * break in the gap *before* whichever block would overflow the page — exactly how a
 * paginator flows content (a block never splits; it moves whole to the next page).
 *
 * The same result drives (a) the canvas guide lines and (b) the PDF export, which is
 * forced to break before the same blocks — so the preview matches the download.
 */
const PAGE_MARGIN = 48
const PAGE_CONTENT_H = 842 - PAGE_MARGIN * 2 // A4 842pt − top/bottom margins; sheet is 1px≈1pt

/** Cumulative offsetTop from `el` up to `root` (handles positioned ancestors). */
function topWithin(el: HTMLElement, root: HTMLElement): number {
  let y = 0
  let n: HTMLElement | null = el
  while (n && n !== root) {
    y += n.offsetTop
    n = n.offsetParent as HTMLElement | null
  }
  return y
}

export interface PageBreaks {
  /** Y positions (sheet coords) for the guide lines — start of each new page. */
  tops: Array<number>
  /** Element id (`sec-…` or `item-…`) that begins each new page — for the PDF. */
  ids: Array<string>
}

/**
 * Walk the breakable blocks top-to-bottom, greedily filling pages of PAGE_CONTENT_H.
 * A manual break (`data-page-break`) forces a new page regardless of fill.
 */
export function computePageBreaks(sheet: HTMLElement): PageBreaks {
  const doc = sheet.querySelector<HTMLElement>('.resume-doc')
  if (!doc) return { tops: [], ids: [] }

  // Boundaries = the places content can break without splitting a unit: the header,
  // each section, each entry, and each bullet (pdfmake splits multi-bullet roles
  // between bullets, so we must too — else long roles over-count pages).
  const els = Array.from(
    sheet.querySelectorAll<HTMLElement>(
      '#doc-header, section[id^="sec-"], [id^="item-"], [data-bullet]',
    ),
  )
  const boundaries = els
    .map((el) => ({
      top: topWithin(el, sheet),
      id: el.id,
      manual: el.dataset.pageBreak === 'true',
    }))
    .sort((a, b) => a.top - b.top)
  if (boundaries.length < 2) return { tops: [], ids: [] }

  const contentBottom = topWithin(doc, sheet) + doc.offsetHeight
  const tops: Array<number> = []
  const ids: Array<string> = []
  let pageTop = boundaries[0].top

  for (let i = 1; i < boundaries.length; i++) {
    const b = boundaries[i]
    const bottom =
      i + 1 < boundaries.length ? boundaries[i + 1].top : contentBottom
    if (b.manual || bottom - pageTop > PAGE_CONTENT_H) {
      tops.push(b.top)
      // Only section/entry boundaries have ids the PDF can force a break before;
      // bullet-level breaks (no id) flow naturally in pdfmake near the same spot.
      if (b.id) ids.push(b.id)
      pageTop = b.top
    }
  }
  return { tops, ids }
}
