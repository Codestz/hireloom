import type { Resume } from '#/lib/resume'

/**
 * A neutral, fully-populated sample résumé used to seed a new résumé from a template and to render
 * the template gallery previews. Generic enough that a first-time user immediately sees a real
 * document to edit — not someone else's CV.
 */
export const TEMPLATE_SAMPLE: Resume = {
  basics: {
    name: 'Alex Morgan',
    label: 'Product Designer',
    email: 'alex.morgan@email.com',
    phone: '(555) 123-4567',
    url: 'alexmorgan.design',
    summary:
      'Product designer with 6+ years shaping intuitive, end-to-end experiences for web and mobile. Partners closely with engineering and product to turn research into shipped, measurable outcomes.',
    location: { city: 'Austin, TX' },
  },
  work: [
    {
      name: 'Northwind',
      position: 'Senior Product Designer',
      location: 'Austin, TX',
      startDate: '2022',
      endDate: 'Present',
      highlights: [
        'Led the redesign of the core dashboard, lifting task-completion rate by 28% and cutting support tickets by a third.',
        'Built and maintained the design system adopted across 4 product teams, halving design-to-ship time.',
        'Ran weekly usability sessions and translated findings into a prioritized, shipped roadmap.',
      ],
    },
    {
      name: 'Brightside',
      position: 'Product Designer',
      location: 'Remote',
      startDate: '2019',
      endDate: '2022',
      highlights: [
        'Designed the onboarding flow that raised activation from 41% to 63% over two quarters.',
        'Owned end-to-end design for the mobile app from research through high-fidelity delivery.',
      ],
    },
  ],
  education: [
    {
      institution: 'University of Texas at Austin',
      studyType: 'B.F.A.',
      area: 'Design',
      endDate: '2018',
    },
  ],
  skills: [
    { name: 'Design: Figma, Prototyping, Design Systems, Interaction Design' },
    { name: 'Research: Usability Testing, Interviews, Journey Mapping' },
    { name: 'Collaboration: Cross-functional Leadership, Design Ops' },
  ],
  certificates: [{ name: 'Certified Usability Analyst', issuer: 'HFI' }],
  meta: {
    hireloom: {
      sectionOrder: ['experience', 'skills', 'education', 'certifications'],
      sectionVariants: { skills: 'list', certifications: 'list' },
      sectionHeadings: { experience: 'Experience' },
    },
  },
}
