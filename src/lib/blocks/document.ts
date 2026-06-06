import type { HeaderData } from './defs/header'
import type { CanvasBox } from '#/lib/canvas/model'

/**
 * The in-editor document model. This is the canonical shape the editor manipulates and
 * the PDF renders — distinct from the JSON Resume interchange format (see json-resume.ts,
 * which bridges the two). It lives in `lib` so both the data layer and the UI depend on it,
 * never the other way around.
 */

export interface DocItem {
  id: string
  data: Record<string, unknown>
}

export interface DocSection {
  id: string
  type: string
  /** Chosen design variant (defaults to the section type's first variant). */
  variant?: string
  /** Column in the two-column layout (defaults via defaultColumn(type)). */
  column?: 'side' | 'main'
  /** Custom heading override (rename); falls back to the section type's heading. */
  heading?: string
  items: Array<DocItem>
}

export interface BlockDoc {
  header: HeaderData
  sections: Array<DocSection>
  /**
   * Canvas builder tree (root Box). Optional during the typed→canvas migration: when
   * absent the editor renders the typed `sections`; when present the canvas is the layout
   * source of truth. Persisted under `meta.hireloom.canvas`.
   */
  canvas?: CanvasBox
}
