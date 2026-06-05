import { z } from 'zod'
import { RichValueSchema } from './rich'

/**
 * Canonical resume model = JSON Resume schema (https://jsonresume.org/schema).
 *
 * Design choices (see mem:conventions):
 * - The Zod schema is the single source of truth; TS types are derived via `z.infer`.
 *   Do NOT hand-write parallel interfaces.
 * - Fields are intentionally lenient (loose strings, everything optional) so the schema
 *   never blocks live editing or a partially-complete import. Strict, user-facing
 *   validation (e.g. "this email looks wrong") belongs in the form layer, not here.
 * - Staying faithful to the JSON Resume standard keeps exports portable / interoperable.
 */

/** JSON Resume permits `YYYY`, `YYYY-MM`, `YYYY-MM-DD`, or a full ISO8601 timestamp. */
export const iso8601 = z
  .string()
  .regex(
    /^\d{4}(-\d{2}(-\d{2}(T.*)?)?)?$/,
    'Expected YYYY, YYYY-MM, YYYY-MM-DD, or ISO8601',
  )

export const LocationSchema = z.object({
  address: z.string().optional(),
  postalCode: z.string().optional(),
  city: z.string().optional(),
  countryCode: z.string().optional(),
  region: z.string().optional(),
})

export const ProfileSchema = z.object({
  network: z.string().optional(),
  username: z.string().optional(),
  url: z.string().optional(),
})

export const BasicsSchema = z.object({
  name: z.string().optional(),
  label: z.string().optional(),
  image: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  url: z.string().optional(),
  summary: RichValueSchema.optional(),
  location: LocationSchema.optional(),
  profiles: z.array(ProfileSchema).optional(),
})

export const WorkSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  location: z.string().optional(),
  description: z.string().optional(),
  position: z.string().optional(),
  url: z.string().optional(),
  startDate: iso8601.optional(),
  endDate: iso8601.optional(),
  summary: RichValueSchema.optional(),
  highlights: z.array(RichValueSchema).optional(),
})

export const VolunteerSchema = z.object({
  organization: z.string().optional(),
  position: z.string().optional(),
  url: z.string().optional(),
  startDate: iso8601.optional(),
  endDate: iso8601.optional(),
  summary: RichValueSchema.optional(),
  highlights: z.array(RichValueSchema).optional(),
})

export const EducationSchema = z.object({
  id: z.string().optional(),
  institution: z.string().optional(),
  url: z.string().optional(),
  area: z.string().optional(),
  studyType: z.string().optional(),
  startDate: iso8601.optional(),
  endDate: iso8601.optional(),
  score: z.string().optional(),
  courses: z.array(z.string()).optional(),
})

export const AwardSchema = z.object({
  title: z.string().optional(),
  date: iso8601.optional(),
  awarder: z.string().optional(),
  summary: z.string().optional(),
})

export const CertificateSchema = z.object({
  name: z.string().optional(),
  date: iso8601.optional(),
  issuer: z.string().optional(),
  url: z.string().optional(),
})

export const PublicationSchema = z.object({
  name: z.string().optional(),
  publisher: z.string().optional(),
  releaseDate: iso8601.optional(),
  url: z.string().optional(),
  summary: z.string().optional(),
})

export const SkillSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  level: z.string().optional(),
  keywords: z.array(z.string()).optional(),
})

export const LanguageSchema = z.object({
  language: z.string().optional(),
  fluency: z.string().optional(),
})

export const InterestSchema = z.object({
  name: z.string().optional(),
  keywords: z.array(z.string()).optional(),
})

export const ReferenceSchema = z.object({
  name: z.string().optional(),
  reference: z.string().optional(),
})

export const ProjectSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  description: RichValueSchema.optional(),
  highlights: z.array(RichValueSchema).optional(),
  keywords: z.array(z.string()).optional(),
  startDate: iso8601.optional(),
  endDate: iso8601.optional(),
  url: z.string().optional(),
  roles: z.array(z.string()).optional(),
  entity: z.string().optional(),
  type: z.string().optional(),
})

export const MetaSchema = z.object({
  canonical: z.string().optional(),
  version: z.string().optional(),
  lastModified: z.string().optional(),
  hireloom: z
    .object({
      sectionOrder: z.array(z.string()).optional(),
      sectionVariants: z.record(z.string(), z.string()).optional(),
      sectionColumns: z.record(z.string(), z.string()).optional(),
      sectionHeadings: z.record(z.string(), z.string()).optional(),
      customLines: z.array(z.string()).optional(),
    })
    .optional(),
})

export const ResumeSchema = z.object({
  $schema: z.string().optional(),
  basics: BasicsSchema.optional(),
  work: z.array(WorkSchema).optional(),
  volunteer: z.array(VolunteerSchema).optional(),
  education: z.array(EducationSchema).optional(),
  awards: z.array(AwardSchema).optional(),
  certificates: z.array(CertificateSchema).optional(),
  publications: z.array(PublicationSchema).optional(),
  skills: z.array(SkillSchema).optional(),
  languages: z.array(LanguageSchema).optional(),
  interests: z.array(InterestSchema).optional(),
  references: z.array(ReferenceSchema).optional(),
  projects: z.array(ProjectSchema).optional(),
  meta: MetaSchema.optional(),
})

export type Location = z.infer<typeof LocationSchema>
export type Profile = z.infer<typeof ProfileSchema>
export type Basics = z.infer<typeof BasicsSchema>
export type Work = z.infer<typeof WorkSchema>
export type Volunteer = z.infer<typeof VolunteerSchema>
export type Education = z.infer<typeof EducationSchema>
export type Award = z.infer<typeof AwardSchema>
export type Certificate = z.infer<typeof CertificateSchema>
export type Publication = z.infer<typeof PublicationSchema>
export type Skill = z.infer<typeof SkillSchema>
export type Language = z.infer<typeof LanguageSchema>
export type Interest = z.infer<typeof InterestSchema>
export type Reference = z.infer<typeof ReferenceSchema>
export type Project = z.infer<typeof ProjectSchema>
export type Meta = z.infer<typeof MetaSchema>
export type Resume = z.infer<typeof ResumeSchema>

/** Canonical JSON Resume `$schema` URL stamped on export. */
export const JSON_RESUME_SCHEMA_URL =
  'https://raw.githubusercontent.com/jsonresume/resume-schema/v1.0.0/schema.json'

/** Ordered list of array-typed sections — handy for editor section rendering/reorder. */
export const RESUME_SECTION_KEYS = [
  'work',
  'volunteer',
  'education',
  'projects',
  'skills',
  'awards',
  'certificates',
  'publications',
  'languages',
  'interests',
  'references',
] as const

export type ResumeSectionKey = (typeof RESUME_SECTION_KEYS)[number]
