import type { Resume } from '#/lib/resume'
import { parseLinkedInResume } from './linkedin'

export * from './linkedin'

/**
 * Import a LinkedIn "Save to PDF" file into a JSON Resume — fully client-side
 * (nothing uploaded). The pdf.js geometry layer is loaded dynamically so its
 * worker stays out of the SSR/route bundle.
 */
export async function importLinkedInPdf(file: File): Promise<Resume> {
  const data = await file.arrayBuffer()
  const { extractLinkedInColumns } = await import('./pdf-text')
  const columns = await extractLinkedInColumns(data)
  return parseLinkedInResume(columns)
}
