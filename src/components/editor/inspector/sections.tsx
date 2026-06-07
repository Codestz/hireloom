import { isBox } from '#/lib/canvas/model'
import type { Section } from './section-types'
import { isStyleable } from './section-helpers'
import {
  AppearanceSection,
  LayoutSection,
  RoleSection,
  SizeSpacingSection,
} from './box-sections'
import {
  ConvertSection,
  HeadingSection,
  ImageSection,
  SeparatorSection,
  TypographySection,
} from './element-sections'

/**
 * The per-node inspector registry: SettingsPanel renders every section whose `appliesTo` matches
 * the selected node. Section components live in box-sections.tsx / element-sections.tsx; this is
 * just the wiring. Order matters — sections render top-to-bottom in the inspector.
 */
export const SECTIONS: Array<Section> = [
  { id: 'layout', appliesTo: isBox, Component: LayoutSection },
  { id: 'size', appliesTo: isBox, Component: SizeSpacingSection },
  { id: 'appearance', appliesTo: isBox, Component: AppearanceSection },
  { id: 'role', appliesTo: isBox, Component: RoleSection },
  { id: 'heading', appliesTo: (n) => n.kind === 'heading', Component: HeadingSection },
  { id: 'separator', appliesTo: (n) => n.kind === 'separator', Component: SeparatorSection },
  { id: 'image', appliesTo: (n) => n.kind === 'image', Component: ImageSection },
  { id: 'typography', appliesTo: isStyleable, Component: TypographySection },
  { id: 'convert', appliesTo: (n) => n.kind === 'list' || n.kind === 'text', Component: ConvertSection },
]
