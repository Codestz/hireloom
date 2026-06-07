import { createFileRoute } from '@tanstack/react-router'
import { ResumesDashboard } from '#/components/home/resumes-dashboard'

export const Route = createFileRoute('/resumes')({ component: ResumesDashboard })
