import type { Resume } from '#/lib/resume'
import { DEFAULT_TOKENS } from '#/lib/templates/tokens'
import type { ThemeTokens } from '#/lib/templates/tokens'

/**
 * A complete sample resume for the "Load a sample" demo — Esteban's current CV (Senior
 * Software Engineer). Lets a first-time visitor see a fully-populated, good-looking
 * document immediately. Mirrors the source CV: serif, centered header, categorized
 * skills, full work history, education, and certifications.
 */

const SKILL_GROUPS = [
  'Languages & Frameworks: TypeScript, Python, Node.js, React, Next.js, React Native, NestJS',
  'Architecture & DevOps: RESTful APIs, Microservices, CI/CD Pipelines, System Scalability, Performance Optimization',
  'Cloud & AI: Google Cloud, AI Algorithms, Model Context Protocol (MCP), LLM Integrations',
  'Leadership: Cross-functional Team Multiplexing, Technical Mentorship, Product Strategy Alignment, Startup Engineering Leadership',
]

export const DEMO_RESUME: Resume = {
  basics: {
    name: 'Esteban Estrada',
    label: 'Senior Software Engineer',
    email: 'esteban.estrada.col@gmail.com',
    phone: '+57 3203700631',
    summary:
      'Lead / Senior Full-Stack Software Engineer with a strong background in building high-performance applications, AI-driven products, and leading cross-functional engineering initiatives. Expertise in scalable architecture design, translating product definitions into technical roadmaps, and optimizing delivery pipelines. Proven track record of multiplexing across teams to mentor engineers, integrate AI solutions that reduce operational bottlenecks, and drive complex features from conception to deployment.',
    location: { city: 'Medellín, Antioquia' },
  },
  work: [
    {
      name: 'Recurly',
      position: 'Senior Software Engineer',
      location: 'Medellín, Antioquia',
      startDate: '04/2026',
      endDate: 'Present',
      highlights: [
        'Technical Leadership & Product Strategy: Partner closely with product management in definition discussions, translating business requirements into scalable technical architectures and leading the end-to-end delivery of complex features for Recurly Commerce (Shopify subscriptions).',
        'Cross-Functional Engineering & DevOps: Multiplex across multiple engineering teams to unblock development and implement robust CI/CD pipelines, significantly improving deployment reliability and speed.',
        'AI & Process Optimization: Spearheaded internal AI implementations that reduced operational bottlenecks across teams, streamlining engineering workflows and knowledge discovery.',
        'Mentorship & Culture: Conduct cross-team technical training and knowledge-sharing sessions to elevate engineering standards, best practices, and team autonomy.',
      ],
    },
    {
      name: 'Recurly',
      position: 'Software Engineer II',
      location: 'Medellín, Antioquia',
      startDate: '07/2025',
      endDate: '04/2026',
      highlights: [
        'Core Systems & Performance: Architected and optimized backend logic for the subscription lifecycle (renewal engines, strategic payment retries) and resolved complex system-level performance issues to ensure high availability.',
        'Professional Growth: Promoted to Senior Software Engineer in under a year, recognized for architectural leadership and continuous improvement of product delivery.',
      ],
    },
    {
      name: 'Archie Labs',
      position: 'Lead Software Developer / Full Stack',
      startDate: '09/2024',
      endDate: '07/2025',
      highlights: [
        'Startup Leadership & Product Strategy: Acted as a hybrid technical lead and product owner, defining core functionalities and driving the engineering roadmap to successfully transition the startup from an early concept into a fully scalable, market-ready AI product.',
        'Team Leadership & Mentorship: Led a cross-functional development team, establishing agile methodologies, architectural guidelines, and fostering a culture of high performance and continuous delivery.',
        'AI Architecture & Integration: Architected the integration of sophisticated AI agents, LLMs, and machine learning models into the core platform, backed by high-performance Node.js and Python microservices.',
        'UI/UX & Frontend Excellence: Directed the frontend architecture (React, Next.js, TypeScript), bridging the gap between design and engineering to deliver highly responsive, accessible, and intuitive user experiences.',
        'Scalability & Performance: Engineered the platform for enterprise-level scale, proactively identifying and resolving infrastructure bottlenecks and optimizing backend data processing workflows.',
      ],
    },
    {
      name: 'Kualty',
      position: 'Full Stack Developer',
      startDate: '10/2022',
      endDate: '12/2023',
      highlights: [
        'Cross-Platform Architecture: Architected and developed a cohesive marketplace ecosystem, delivering both a Progressive Web App (PWA) using React and a high-performance React Native mobile application.',
        'System Integration & Synchronization: Engineered robust API layers to synchronize real-time data across web and mobile clients, ensuring seamless cross-device functionality and backend consistency.',
        'Performance & UX Optimization: Directed performance optimization initiatives for frontend architectures, significantly enhancing load times, reliability, and scalability across iOS, Android, and web browsers.',
      ],
    },
    {
      name: 'Real Media Group',
      position: 'Software Developer',
      location: 'Boston, Massachusetts',
      startDate: '01/2022',
      endDate: '10/2022',
      highlights: [
        'Mobile Product Development: Built and launched a React Native mobile application from the ground up, delivering real-time media streaming and news to users with high reliability and cross-platform support.',
        'Content Management Systems (CMS): Revamped corporate web presence with custom WordPress theme development, streamlining content workflows for marketing teams and reinforcing brand consistency.',
      ],
    },
  ],
  education: [
    {
      institution: 'Universidad Nacional Abierta y a Distancia (UNAD)',
      studyType: 'Bachelor of Science',
      area: 'Software Engineering',
    },
    {
      institution: 'Servicio Nacional de Aprendizaje (SENA)',
      studyType: 'Technical Degree',
      area: 'Software Engineering',
      endDate: '11/2016',
    },
  ],
  skills: SKILL_GROUPS.map((name) => ({ name })),
  certificates: [
    { name: 'AI Fluency Framework & Foundations', issuer: 'Anthropic' },
    { name: 'Claude 101', issuer: 'Anthropic' },
    { name: 'Advanced Topics', issuer: 'Anthropic' },
    { name: 'Claude Code in Action', issuer: 'Anthropic' },
  ],
  meta: {
    hireloom: {
      sectionOrder: ['skills', 'experience', 'education', 'certifications'],
      sectionVariants: { skills: 'list', certifications: 'list' },
      sectionHeadings: { experience: 'Work History' },
    },
  },
}

// Match the source CV's look: serif, centered header, restrained slate accent.
export const DEMO_TOKENS: ThemeTokens = {
  ...DEFAULT_TOKENS,
  accent: '#334155',
  fontHeading: 'serif',
  fontBody: 'serif',
  headerVariant: 'centered',
}
