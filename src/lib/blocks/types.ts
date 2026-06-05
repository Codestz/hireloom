import type { LucideIcon } from 'lucide-react'
import type { z } from 'zod'

/**
 * Block architecture (BLOCKS.md). A BlockDef is the single source of truth for a
 * block type — it drives data, editing, rendering, and AI.
 */

/** The editing vocabulary. A new kind = one case in <BlockField>. */
export type FieldKind =
  | 'text'
  | 'longtext'
  | 'link'
  | 'daterange'
  | 'list'
  | 'taglist'

export interface FieldDef {
  key: string
  kind: FieldKind
  label?: string
  placeholder?: string
}

export interface BlockDef<T> {
  type: string
  label: string
  icon: LucideIcon
  /** Source of truth — validation + JSON-Resume mapping. */
  schema: z.ZodType<T>
  /** A fresh, empty instance. */
  default: () => T
  /** Drives both in-place editing and template layout. */
  fields: Array<FieldDef>
  /** Plain-text projection for ATS + PDF. */
  toAtsLines: (data: T) => Array<string>
  /** AI: build a prompt from the block's structured data. */
  ai?: { improve: (data: T) => string }
}

export interface BlockInstance<T = unknown> {
  id: string
  type: string
  data: T
}
