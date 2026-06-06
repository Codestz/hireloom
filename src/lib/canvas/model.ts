/**
 * Canvas builder model — the node tree the page-builder edits.
 *
 * Philosophy (see .docs/builder-rework-plan.md): PURE PRIMITIVES. Nothing is baked into
 * containers. A page is a single root `Box`; everything is either a `Box` (the only
 * container: vertical/horizontal layout, nestable — a horizontal Box with `span`ned
 * children IS a grid/row) or a leaf `Element` (heading/text/list/separator/divider/…).
 * "Section", "Row", "Columns" are not types — they are starter compositions of Boxes.
 *
 * This lives in `lib` so both the data layer and the UI depend on it, never the reverse.
 * It is layout-only; semantic meaning for export/ATS is carried by an optional `role` on a
 * Box and reconstructed by the bridge (see decompose/recompose, WS-A).
 */

export type BoxLayout = 'vertical' | 'horizontal'

/** Leaf element kinds. Anything that is not a `box`. */
export type ElementKind =
  | 'heading'
  | 'text'
  | 'list'
  | 'separator'
  | 'divider'
  | 'spacer'
  | 'image'
  | 'icon'
  | 'button'

/** The glyph a standalone `separator` element draws between two siblings. */
export type SeparatorVariant = 'dot' | 'line' | 'dash' | 'slash' | 'pipe' | 'bullet'

export type BoxAlign = 'start' | 'center' | 'end' | 'stretch'
export type BoxJustify = 'start' | 'center' | 'end' | 'between' | 'around'
export type TextAlign = 'left' | 'center' | 'right' | 'justify'

/**
 * Export/ATS semantic hint on a Box. Well-known values map to JSON-Resume collections;
 * any other string is a custom section. Layout stays free regardless of role.
 */
export type NodeRole =
  | 'header'
  | 'summary'
  | 'work'
  | 'volunteer'
  | 'education'
  | 'projects'
  | 'skills'
  | 'languages'
  | 'awards'
  | 'certifications'
  | 'publications'
  | 'references'
  | 'interests'
  | 'custom'

export interface BoxProps {
  layout: BoxLayout
  /** Spacing between children, in px. */
  gap?: number
  /** Inner padding, in px. */
  pad?: number
  /** Outer margin, in px. */
  margin?: number
  align?: BoxAlign
  justify?: BoxJustify
  /** Allow children to wrap (horizontal layout). */
  wrap?: boolean
  /** CSS color / token for background. */
  bg?: string
  /** CSS border shorthand. */
  border?: string
  /** Border radius, in px. */
  radius?: number
  /** Width in /12 units when this Box sits inside a horizontal parent Box. */
  span?: number
}

export interface ElementStyle {
  fontSize?: number
  fontWeight?: number
  italic?: boolean
  underline?: boolean
  color?: string
  align?: TextAlign
  marginTop?: number
  marginBottom?: number
}

export interface CanvasBox {
  id: string
  kind: 'box'
  /** Optional semantic hint for export/ATS; layout is independent of it. */
  role?: string
  props: BoxProps
  children: Array<CanvasNode>
}

export interface CanvasElement {
  id: string
  kind: ElementKind
  /**
   * Element payload. Expected shapes by kind:
   * - heading:   { text: string; level?: 1 | 2 | 3 }
   * - text:      { text: string }
   * - list:      { items: string[]; ordered?: boolean }
   * - separator: { variant: SeparatorVariant }
   * - divider:   { thickness?: number }
   * - spacer:    { size: number }
   * - image:     { src: string; alt?: string; width?: number }
   * - icon:      { name: string }
   * - button:    { label: string; href?: string }
   */
  data: Record<string, unknown>
  style?: ElementStyle
}

export type CanvasNode = CanvasBox | CanvasElement

/** A builder document is a single root Box. */
export interface CanvasDoc {
  root: CanvasBox
}

export function isBox(node: CanvasNode): node is CanvasBox {
  return node.kind === 'box'
}

export function isElement(node: CanvasNode): node is CanvasElement {
  return node.kind !== 'box'
}

/** Mint a fresh, kind-prefixed node id. */
export function newNodeId(kind: 'box' | ElementKind): string {
  return `${kind}-${crypto.randomUUID().slice(0, 8)}`
}

/** Create an empty Box with the given layout (defaults vertical). */
export function makeBox(
  layout: BoxLayout = 'vertical',
  props: Partial<BoxProps> = {},
  children: Array<CanvasNode> = [],
): CanvasBox {
  return {
    id: newNodeId('box'),
    kind: 'box',
    props: { layout, ...props },
    children,
  }
}

/** Create a leaf element of the given kind. */
export function makeElement(
  kind: ElementKind,
  data: Record<string, unknown> = {},
  style?: ElementStyle,
): CanvasElement {
  return { id: newNodeId(kind), kind, data, ...(style ? { style } : {}) }
}

/** An empty starting document: one vertical root Box. */
export function emptyCanvas(): CanvasDoc {
  return { root: makeBox('vertical') }
}
