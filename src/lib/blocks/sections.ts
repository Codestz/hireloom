import { awardBlock } from './defs/award'
import { certificationBlock } from './defs/certification'
import { customBlock } from './defs/custom'
import { educationBlock } from './defs/education'
import { experienceBlock } from './defs/experience'
import { languagesBlock } from './defs/languages'
import { projectBlock } from './defs/project'
import { publicationBlock } from './defs/publication'
import { referenceBlock } from './defs/reference'
import { skillsBlock } from './defs/skills'
import { volunteerBlock } from './defs/volunteer'
import type { BlockDef } from './types'

/**
 * Section registry (the domain layer): maps a section type — plural to mirror the JSON
 * Resume collections (`projects`, `awards`, …) — to its heading, kind, and entry block
 * definition. Pure data, no React, so `lib` (PDF export, ATS text) reads it directly. The
 * *visual* variants (which Layout component renders a section) live in the component-layer
 * registry, the only part that can't be in `lib`.
 */

export type SectionKind = 'collection' | 'flat'

export interface SectionMeta {
  type: string
  heading: string
  kind: SectionKind
  /** Label for the "add another entry" affordance (collections only). */
  addLabel: string
  /** The entry block definition. BlockDef is invariant in its data type (it both produces and
   *  consumes T), so this heterogeneous registry holds BlockDef<any>; each entry's data is the
   *  correct type at its own call sites. */
  def: BlockDef<any>
}

export const SECTIONS: Array<SectionMeta> = [
  {
    type: 'experience',
    heading: 'Experience',
    kind: 'collection',
    addLabel: 'Add experience',
    def: experienceBlock,
  },
  {
    type: 'education',
    heading: 'Education',
    kind: 'collection',
    addLabel: 'Add education',
    def: educationBlock,
  },
  {
    type: 'projects',
    heading: 'Projects',
    kind: 'collection',
    addLabel: 'Add project',
    def: projectBlock,
  },
  {
    type: 'volunteer',
    heading: 'Volunteering',
    kind: 'collection',
    addLabel: 'Add volunteering',
    def: volunteerBlock,
  },
  {
    type: 'certifications',
    heading: 'Certifications',
    kind: 'collection',
    addLabel: 'Add certification',
    def: certificationBlock,
  },
  {
    type: 'awards',
    heading: 'Awards',
    kind: 'collection',
    addLabel: 'Add award',
    def: awardBlock,
  },
  {
    type: 'publications',
    heading: 'Publications',
    kind: 'collection',
    addLabel: 'Add publication',
    def: publicationBlock,
  },
  {
    type: 'skills',
    heading: 'Skills',
    kind: 'flat',
    addLabel: '',
    def: skillsBlock,
  },
  {
    type: 'languages',
    heading: 'Languages',
    kind: 'flat',
    addLabel: '',
    def: languagesBlock,
  },
  {
    type: 'references',
    heading: 'References',
    kind: 'collection',
    addLabel: 'Add reference',
    def: referenceBlock,
  },
  {
    type: 'custom',
    heading: 'Custom',
    kind: 'flat',
    addLabel: '',
    def: customBlock,
  },
]

export function getSection(type: string): SectionMeta | undefined {
  return SECTIONS.find((s) => s.type === type)
}
