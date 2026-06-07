import { useMemo, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { CopyIcon, MoreVerticalIcon, PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react'
import { toast } from 'sonner'
import { ThemeToggle } from '#/components/app/theme-toggle'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import { ScaledCanvasPreview } from '#/components/blocks/canvas-tree/scaled-canvas-preview'
import { decompose } from '#/lib/canvas/decompose'
import { resumeToDoc } from '#/lib/blocks/json-resume'
import { resolveTokens } from '#/lib/templates'
import {
  useDeleteResume,
  useDuplicateResume,
  useRenameResume,
  useResumes,
} from '#/lib/db'
import type { ResumeRecord } from '#/lib/db'

function timeAgo(ts: number): string {
  const s = Math.round((Date.now() - ts) / 1000)
  if (s < 60) return 'just now'
  const m = Math.round(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.round(h / 24)
  if (d < 30) return `${d}d ago`
  return new Date(ts).toLocaleDateString()
}

/** The "Your resumes" dashboard: every saved resume as a live thumbnail with open/rename/duplicate/delete. */
export function ResumesDashboard() {
  const { data: resumes, isLoading } = useResumes()
  const [renaming, setRenaming] = useState<ResumeRecord | null>(null)
  const [deleting, setDeleting] = useState<ResumeRecord | null>(null)

  return (
    <div className="min-h-dvh bg-background">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <Link to="/" className="font-serif text-xl font-medium tracking-tight">
          Hire<span className="text-primary">loom</span>
        </Link>
        <ThemeToggle />
      </header>

      <main className="mx-auto w-full max-w-6xl px-6 pb-20">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="font-serif text-3xl font-medium tracking-tight">Your resumes</h1>
          <Button asChild>
            <Link to="/" hash="templates">
              <PlusIcon data-icon="inline-start" />
              New resume
            </Link>
          </Button>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : !resumes || resumes.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-2 gap-x-6 gap-y-7 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {resumes.map((r) => (
              <ResumeCard
                key={r.id}
                record={r}
                onRename={() => setRenaming(r)}
                onDelete={() => setDeleting(r)}
              />
            ))}
          </div>
        )}
      </main>

      <RenameDialog record={renaming} onClose={() => setRenaming(null)} />
      <DeleteDialog record={deleting} onClose={() => setDeleting(null)} />
    </div>
  )
}

function ResumeCard({
  record,
  onRename,
  onDelete,
}: {
  record: ResumeRecord
  onRename: () => void
  onDelete: () => void
}) {
  const navigate = useNavigate()
  const duplicate = useDuplicateResume()

  const preview = useMemo(() => {
    const tokens = resolveTokens(record.tokens)
    const d = resumeToDoc(record.data)
    return { tokens, root: d.canvas ?? decompose(d, tokens) }
  }, [record])

  const open = () => void navigate({ to: '/editor', search: { id: record.id } })

  return (
    <div className="group flex flex-col">
      <div className="relative aspect-[8.5/11] w-full overflow-hidden rounded-xl border border-border bg-white shadow-sm transition-all group-hover:-translate-y-1 group-hover:border-primary/50 group-hover:shadow-lg">
        <ScaledCanvasPreview root={preview.root} tokens={preview.tokens} />
        <button
          type="button"
          onClick={open}
          aria-label={`Open ${record.title}`}
          className="absolute inset-0"
        />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center gap-2 bg-foreground/35 opacity-0 transition-opacity group-hover:opacity-100">
          <Button size="sm" className="pointer-events-auto h-7 gap-1 px-2.5 text-[11px]" onClick={open}>
            <PencilIcon className="size-3" />
            Open
          </Button>
          <Button
            size="sm"
            variant="secondary"
            aria-label="Delete résumé"
            className="pointer-events-auto size-7 p-0"
            onClick={onDelete}
          >
            <Trash2Icon className="size-3.5" />
          </Button>
        </div>
      </div>
      <div className="mt-2 flex items-start justify-between gap-1">
        <button type="button" onClick={open} className="min-w-0 text-left">
          <p className="truncate text-sm font-medium">{record.title}</p>
          <p className="text-[11px] text-muted-foreground">Edited {timeAgo(record.updatedAt)}</p>
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="resume actions"
              className="-mr-1 flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <MoreVerticalIcon className="size-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={onRename}>
              <PencilIcon className="size-3.5" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() =>
                duplicate.mutate(record.id, { onSuccess: () => toast.success('resume duplicated') })
              }
            >
              <CopyIcon className="size-3.5" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={onDelete}>
              <Trash2Icon className="size-3.5" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
          {/* Delete is also surfaced on card hover; kept here for keyboard/menu access. */}
        </DropdownMenu>
      </div>
    </div>
  )
}

function RenameDialog({ record, onClose }: { record: ResumeRecord | null; onClose: () => void }) {
  const rename = useRenameResume()
  const [title, setTitle] = useState('')

  function submit() {
    if (!record) return
    rename.mutate({ id: record.id, title: title.trim() || record.title })
    onClose()
  }

  return (
    <Dialog
      open={!!record}
      onOpenChange={(o) => {
        if (o && record) setTitle(record.title)
        else onClose()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename resume</DialogTitle>
        </DialogHeader>
        <Input
          value={title}
          autoFocus
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="resume name"
        />
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function DeleteDialog({ record, onClose }: { record: ResumeRecord | null; onClose: () => void }) {
  const del = useDeleteResume()

  function confirm() {
    if (!record) return
    del.mutate(record.id, { onSuccess: () => toast.success('resume deleted') })
    onClose()
  }

  return (
    <Dialog open={!!record} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete this resume?</DialogTitle>
          <DialogDescription>
            <span className="font-medium text-foreground">{record?.title}</span> will be permanently
            removed from this browser. This can’t be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={confirm}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-border py-20 text-center">
      <p className="text-sm text-muted-foreground">No resumes yet.</p>
      <div className="flex gap-3">
        <Button asChild>
          <Link to="/" hash="templates">
            Start from a template
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/import">Import a resume</Link>
        </Button>
      </div>
    </div>
  )
}
