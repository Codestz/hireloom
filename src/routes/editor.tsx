import { createFileRoute, Link } from '@tanstack/react-router'
import { EditorWorkspace } from '#/components/editor/editor-workspace'
import { useLatestResume, useResume } from '#/lib/db'

export const Route = createFileRoute('/editor')({
  component: EditorPage,
  // ?id=<resumeId> opens a specific resume (from the /resumes dashboard); otherwise the latest.
  validateSearch: (s: Record<string, unknown>): { id?: string } =>
    typeof s.id === 'string' ? { id: s.id } : {},
})

function EditorPage() {
  const { id } = Route.useSearch()
  const byId = useResume(id)
  const latest = useLatestResume()
  const usingId = Boolean(id)
  const record = usingId ? byId.data : latest.data
  const isLoading = usingId ? byId.isLoading : latest.isLoading

  if (isLoading) {
    return (
      <div className="flex h-dvh items-center justify-center text-sm text-muted-foreground">
        Loading your resume…
      </div>
    )
  }

  if (!record) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-3 text-center text-sm text-muted-foreground">
        <p>That resume doesn’t exist — it may have been deleted.</p>
        <Link to="/resumes" className="font-medium text-primary underline-offset-4 hover:underline">
          ← Back to your resumes
        </Link>
      </div>
    )
  }

  // Key by id so switching resumes re-seeds the editor form.
  return <EditorWorkspace key={record.id} record={record} />
}
