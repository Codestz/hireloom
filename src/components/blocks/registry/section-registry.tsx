import type { ComponentType } from 'react'
import {
  AwardClassic,
  CertificationClassic,
  CertificationList,
  CustomClassic,
  EducationClassic,
  EducationCompact,
  EducationStacked,
  ExperienceClassic,
  ExperienceCompact,
  ExperienceStacked,
  ExperienceTimeline,
  LanguagesInline,
  LanguagesPills,
  ProjectClassic,
  PublicationClassic,
  ReferenceClassic,
  SkillsInline,
  SkillsList,
  SkillsPills,
  VolunteerClassic,
} from '#/components/blocks/layouts'
import type { LayoutProps } from '#/components/blocks/layouts'
import { getSection } from '#/lib/blocks/sections'
import type { SectionMeta } from '#/lib/blocks/sections'

/**
 * The one section concern that *must* live in the component layer: the binding from a
 * section type to its design *variants* (which Layout component renders it; the user picks
 * one). The section metadata (heading, kind, entry def) is the domain layer —
 * `lib/blocks/sections.ts`. `getSectionType` joins the two for the editing canvas.
 */

type AnyLayout = ComponentType<LayoutProps<Record<string, unknown>>>
const L = (c: unknown) => c as AnyLayout

export interface SectionVariant {
  id: string
  label: string
  Layout: AnyLayout
}

export interface SectionType extends SectionMeta {
  variants: Array<SectionVariant>
}

const VARIANTS: Partial<Record<string, Array<SectionVariant>>> = {
  experience: [
    { id: 'classic', label: 'Classic', Layout: L(ExperienceClassic) },
    { id: 'compact', label: 'Compact', Layout: L(ExperienceCompact) },
    { id: 'stacked', label: 'Editorial', Layout: L(ExperienceStacked) },
    { id: 'timeline', label: 'Timeline', Layout: L(ExperienceTimeline) },
  ],
  education: [
    { id: 'classic', label: 'Classic', Layout: L(EducationClassic) },
    { id: 'compact', label: 'Compact', Layout: L(EducationCompact) },
    { id: 'stacked', label: 'Editorial', Layout: L(EducationStacked) },
  ],
  projects: [{ id: 'classic', label: 'Classic', Layout: L(ProjectClassic) }],
  volunteer: [{ id: 'classic', label: 'Classic', Layout: L(VolunteerClassic) }],
  certifications: [
    { id: 'classic', label: 'Classic', Layout: L(CertificationClassic) },
    { id: 'list', label: 'List', Layout: L(CertificationList) },
  ],
  awards: [{ id: 'classic', label: 'Classic', Layout: L(AwardClassic) }],
  publications: [
    { id: 'classic', label: 'Classic', Layout: L(PublicationClassic) },
  ],
  skills: [
    { id: 'inline', label: 'Inline', Layout: L(SkillsInline) },
    { id: 'pills', label: 'Pills', Layout: L(SkillsPills) },
    { id: 'list', label: 'List', Layout: L(SkillsList) },
  ],
  languages: [
    { id: 'inline', label: 'Inline', Layout: L(LanguagesInline) },
    { id: 'pills', label: 'Pills', Layout: L(LanguagesPills) },
  ],
  references: [
    { id: 'classic', label: 'Classic', Layout: L(ReferenceClassic) },
  ],
  custom: [{ id: 'classic', label: 'Classic', Layout: L(CustomClassic) }],
}

/** Metadata + design variants joined — for the editing canvas. */
export function getSectionType(type: string): SectionType | undefined {
  const meta = getSection(type)
  const variants = VARIANTS[type]
  if (!meta || !variants) return undefined
  return { ...meta, variants }
}

/** The chosen variant for a section (falls back to the type's first/default). */
export function getSectionVariant(
  type: string,
  variantId?: string,
): SectionVariant | undefined {
  const variants = VARIANTS[type]
  if (!variants) return undefined
  return variants.find((v) => v.id === variantId) ?? variants[0]
}
