import * as pdfjs from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import type { LinkedInColumns } from './linkedin'

/**
 * pdf.js geometry layer (browser-only — pulls the pdf.js worker). Extracts text
 * items with positions, splits the LinkedIn two-column layout (narrow left sidebar
 * vs wide main column), groups items into reading-ordered lines, and strips page
 * footers. The semantic mapping lives in linkedin.ts. See mem:linkedin_pdf_structure.
 *
 * Import this module dynamically so the worker stays out of the SSR/route bundle.
 */

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

interface PositionedItem {
  page: number
  x: number
  y: number
  width: number
  str: string
}

const FOOTER = /^(page|página|pagina)\s+\d+\s+(of|de)\s+\d+$/i
const SIDEBAR_FRACTION = 0.32 // left ~⅓ of the page width is the sidebar

/** Join items on one line, inserting a space only across real gaps. */
function joinLine(items: Array<PositionedItem>): string {
  const sorted = [...items].sort((a, b) => a.x - b.x)
  let out = ''
  let prevEnd: number | null = null
  for (const it of sorted) {
    if (prevEnd !== null && it.x - prevEnd > 1) out += ' '
    out += it.str
    prevEnd = it.x + it.width
  }
  return out.trim()
}

/** Group items (within a column) into lines by shared baseline, top→bottom. */
function toLines(items: Array<PositionedItem>): Array<string> {
  const sorted = [...items].sort((a, b) =>
    a.page !== b.page ? a.page - b.page : b.y - a.y,
  )
  const lines: Array<string> = []
  let bucket: Array<PositionedItem> = []
  let refY: number | null = null
  let refPage: number | null = null

  const flush = () => {
    if (!bucket.length) return
    const text = joinLine(bucket)
    if (text && !FOOTER.test(text)) lines.push(text)
    bucket = []
  }

  for (const it of sorted) {
    if (refY === null || it.page !== refPage || Math.abs(it.y - refY) > 3) {
      flush()
      refY = it.y
      refPage = it.page
    }
    bucket.push(it)
  }
  flush()
  return lines
}

export async function extractLinkedInColumns(
  data: ArrayBuffer,
): Promise<LinkedInColumns> {
  const loadingTask = pdfjs.getDocument({ data })
  const doc = await loadingTask.promise
  const sidebar: Array<PositionedItem> = []
  const main: Array<PositionedItem> = []

  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p)
    const viewport = page.getViewport({ scale: 1 })
    const split = viewport.width * SIDEBAR_FRACTION
    const content = await page.getTextContent()

    for (const item of content.items) {
      if (!('str' in item) || !item.str.trim()) continue
      const positioned: PositionedItem = {
        page: p,
        x: item.transform[4] as number,
        y: item.transform[5] as number,
        width: item.width,
        str: item.str,
      }
      ;(positioned.x < split ? sidebar : main).push(positioned)
    }
  }

  await loadingTask.destroy()
  return { main: toLines(main), sidebar: toLines(sidebar) }
}

/**
 * Layout-agnostic extraction for *any* résumé PDF — every page's text in reading
 * order, one line per visual line. Semantic structuring is left to the AI import.
 */
export async function extractPdfText(data: ArrayBuffer): Promise<string> {
  const loadingTask = pdfjs.getDocument({ data })
  const doc = await loadingTask.promise
  const items: Array<PositionedItem> = []

  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p)
    const content = await page.getTextContent()
    for (const item of content.items) {
      if (!('str' in item) || !item.str.trim()) continue
      items.push({
        page: p,
        x: item.transform[4] as number,
        y: item.transform[5] as number,
        width: item.width,
        str: item.str,
      })
    }
  }

  await loadingTask.destroy()
  return toLines(items).join('\n')
}
