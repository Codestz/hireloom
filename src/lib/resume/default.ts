import { JSON_RESUME_SCHEMA_URL } from './schema'
import type { Resume } from './schema'

/**
 * A blank-but-valid resume. Arrays are present-and-empty so the editor can map over
 * sections without null checks. `meta.lastModified` is intentionally left undefined —
 * callers stamp it at save time (Date is unavailable in some build contexts).
 */
export function createEmptyResume(): Resume {
  return {
    $schema: JSON_RESUME_SCHEMA_URL,
    basics: {
      name: '',
      label: '',
      email: '',
      phone: '',
      url: '',
      summary: '',
      location: {},
      profiles: [],
    },
    work: [],
    volunteer: [],
    education: [],
    awards: [],
    certificates: [],
    publications: [],
    skills: [],
    languages: [],
    interests: [],
    references: [],
    projects: [],
    meta: { version: 'v1.0.0' },
  }
}

/** Minimal seed used for previews / first-run demo. */
export function createSampleResume(): Resume {
  return {
    ...createEmptyResume(),
    basics: {
      name: 'Ada Lovelace',
      label: 'Software Engineer',
      email: 'ada@example.com',
      phone: '+1 555 0100',
      url: 'https://example.com',
      summary:
        "Engineer focused on correctness, performance, and building tools that get out of the user's way.",
      location: { city: 'London', countryCode: 'GB', region: 'England' },
      profiles: [
        {
          network: 'GitHub',
          username: 'ada',
          url: 'https://github.com/ada',
        },
      ],
    },
    work: [
      {
        name: 'Analytical Engines Ltd.',
        position: 'Lead Engineer',
        startDate: '2023-01',
        summary: 'Led design of the first general-purpose computing platform.',
        highlights: [
          'Designed the first published algorithm intended for machine execution.',
          'Defined looping and branching constructs still in use today.',
        ],
      },
    ],
    skills: [
      { name: 'Algorithms', level: 'Expert', keywords: ['analysis', 'design'] },
    ],
  }
}
