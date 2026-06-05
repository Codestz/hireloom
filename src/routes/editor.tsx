import { createFileRoute } from '@tanstack/react-router'
import { EditorWorkspace } from '#/components/editor/editor-workspace'
import { useLatestResume } from '#/lib/db'

export const Route = createFileRoute('/editor')({
  component: EditorPage,
  validateSearch: (search: Record<string, unknown>): { import?: true } =>
    search.import === true || search.import === 'true' ? { import: true } : {},
})

function EditorPage() {
  const { import: autoImport } = Route.useSearch()
  const { data: record, isLoading } = useLatestResume()

  if (isLoading || !record) {
    return (
      <div className="flex h-dvh items-center justify-center text-sm text-muted-foreground">
        Loading your résumé…
      </div>
    )
  }

  // Key by id so switching résumés re-seeds the editor form.
  return (
    <EditorWorkspace key={record.id} record={record} autoImport={autoImport} />
  )
}
