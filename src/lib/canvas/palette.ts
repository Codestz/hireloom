import { makeBox, makeElement } from './model'
import type { CanvasNode } from './model'

/**
 * The component palette catalog — the single source of truth for what each palette item
 * creates. Pure (no UI), so both the palette cards and the DnD drop handler resolve the same
 * node from a key. Drag ids are namespaced `new:<key>` so the canvas DnD provider can tell a
 * palette drop from a node move.
 */
export type PaletteKey =
  | 'box-column'
  | 'box-row'
  | 'heading'
  | 'text'
  | 'list'
  | 'separator'
  | 'divider'
  | 'spacer'
  | 'image'
  | 'icon'
  | 'button'

export const PALETTE_LABEL: Record<PaletteKey, string> = {
  'box-column': 'Column',
  'box-row': 'Row',
  heading: 'Heading',
  text: 'Text',
  list: 'List',
  separator: 'Separator',
  divider: 'Divider',
  spacer: 'Spacer',
  image: 'Image',
  icon: 'Icon',
  button: 'Button',
}

export function makePaletteNode(key: PaletteKey): CanvasNode {
  switch (key) {
    case 'box-column':
      return makeBox('column', { gap: 8 })
    case 'box-row':
      return makeBox('row', { gap: 6 })
    case 'heading':
      return makeElement('heading', { text: 'Heading', level: 2 })
    case 'text':
      return makeElement('text', { text: 'Text' })
    case 'list':
      return makeElement('list', { items: ['Item'] })
    case 'separator':
      return makeElement('separator', { variant: 'dot' })
    case 'divider':
      return makeElement('divider', {})
    case 'spacer':
      return makeElement('spacer', { size: 12 })
    case 'image':
      return makeElement('image', { src: '', alt: '' })
    case 'icon':
      return makeElement('icon', { name: '' })
    case 'button':
      return makeElement('button', { label: 'Button' })
  }
}

const PREFIX = 'new:'
const KEYS = new Set<string>(Object.keys(PALETTE_LABEL))

export const paletteDragId = (key: PaletteKey): string => `${PREFIX}${key}`

export function paletteKeyFromId(id: string): PaletteKey | null {
  if (!id.startsWith(PREFIX)) return null
  const key = id.slice(PREFIX.length)
  return KEYS.has(key) ? (key as PaletteKey) : null
}
