import {
  ArrowLeftIcon,
  DownloadIcon,
  LayersIcon,
  PencilIcon,
  ShieldCheckIcon,
  SparklesIcon,
  TargetIcon,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import type { ThemeTokens } from '#/lib/templates/tokens'
import { useRenameResume } from '#/lib/db'
import { AiChatPanel } from '#/components/editor/panels/ai-chat-panel'
import { AtsPanel } from '#/components/editor/panels/ats-panel'
import { cn } from '#/lib/utils.ts'
import type { useBlockDoc } from '#/components/blocks'
import { ExportPanel } from './export-panel'
import { TreePanel } from './structure-tree'
import { NavigatorTree } from './navigator-tree'

type Mode = 'build' | 'chat' | 'ats' | 'export'
type Controller = ReturnType<typeof useBlockDoc>

/** Everything a sidebar panel might need — passed to each mode's `render`. */
interface SidebarContext {
  controller: Controller
  tokens: ThemeTokens
  availableSections: Array<{ type: string; label: string }>
  onExportPdf: () => void
  onExportJson: () => void
  onReset: () => void
}

interface SidebarMode {
  key: Mode
  label: string
  icon: typeof LayersIcon
  render: (ctx: SidebarContext) => ReactNode
}

// The mode registry — adding a panel is one entry here, no switch to touch.
const MODES: Array<SidebarMode> = [
  {
    key: 'build',
    label: 'Build',
    icon: LayersIcon,
    // Canvas mode → the element Navigator (mirrors the node tree); otherwise the typed
    // section tree. They share CanvasSelectionContext, so navigator ↔ canvas selection syncs.
    render: (c) =>
      c.controller.doc.canvas ? (
        <NavigatorTree controller={c.controller} />
      ) : (
        <TreePanel
          controller={c.controller}
          availableSections={c.availableSections}
        />
      ),
  },
  {
    key: 'chat',
    label: 'Assistant',
    icon: SparklesIcon,
    render: (c) => <AiChatPanel controller={c.controller} tokens={c.tokens} />,
  },
  {
    key: 'ats',
    label: 'Job Match',
    icon: TargetIcon,
    render: (c) => <AtsPanel controller={c.controller} />,
  },
  {
    key: 'export',
    label: 'Export',
    icon: DownloadIcon,
    render: (c) => (
      <ExportPanel
        onExportPdf={c.onExportPdf}
        onExportJson={c.onExportJson}
        onReset={c.onReset}
      />
    ),
  },
]

/** Inline-editable résumé title — click to rename, saved to the record via useRenameResume. */
function EditableTitle({ resumeId, title }: { resumeId: string; title?: string }) {
  const rename = useRenameResume()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(title ?? '')

  useEffect(() => {
    if (!editing) setValue(title ?? '')
  }, [title, editing])

  function save() {
    setEditing(false)
    const t = value.trim()
    if (t && t !== title) rename.mutate({ id: resumeId, title: t })
    else setValue(title ?? '')
  }

  if (editing) {
    return (
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === 'Enter') save()
          if (e.key === 'Escape') {
            setValue(title ?? '')
            setEditing(false)
          }
        }}
        className="w-full rounded-md border border-primary/40 bg-background px-1.5 py-0.5 font-serif text-base font-medium tracking-tight outline-none"
      />
    )
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      title="Rename resume"
      className="group/title flex w-full items-center gap-1.5 text-left"
    >
      <span className="truncate font-serif text-base font-medium tracking-tight">
        {title || 'Untitled resume'}
      </span>
      <PencilIcon className="size-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover/title:opacity-100" />
    </button>
  )
}

export function EditorSidebar({
  resumeId,
  title,
  controller,
  tokens,
  availableSections,
  onExportPdf,
  onExportJson,
  onReset,
}: {
  resumeId: string
  title?: string
  controller: Controller
  tokens: ThemeTokens
  availableSections: Array<{ type: string; label: string }>
  onExportPdf: () => void
  onExportJson: () => void
  onReset: () => void
}) {
  const [mode, setMode] = useState<Mode>('build')
  const ctx: SidebarContext = {
    controller,
    tokens,
    availableSections,
    onExportPdf,
    onExportJson,
    onReset,
  }
  const activeMode = MODES.find((m) => m.key === mode)

  return (
    <div className="flex h-full">
      <div className="atelier-panel flex w-12 shrink-0 flex-col items-center gap-1 border-r border-border py-3">
        {MODES.map((m) => {
          const active = mode === m.key
          return (
            <button
              key={m.key}
              type="button"
              aria-label={m.label}
              title={m.label}
              onClick={() => setMode(m.key)}
              className={cn(
                'flex size-9 items-center justify-center rounded-lg transition-colors',
                active
                  ? 'bg-background text-primary shadow-sm ring-1 ring-border'
                  : 'text-muted-foreground hover:bg-background/60 hover:text-foreground',
              )}
            >
              <m.icon className="size-5" />
            </button>
          )
        })}
      </div>

      <div className="atelier-panel flex min-w-0 flex-1 flex-col">
        <div className="border-b border-border px-4 py-4">
          <Link
            to="/resumes"
            className="mb-2 inline-flex items-center gap-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeftIcon className="size-3" />
            All resumes
          </Link>
          <EditableTitle resumeId={resumeId} title={title} />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {activeMode?.render(ctx)}
        </div>

        <div className="border-t border-border px-4 py-3">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheckIcon className="size-3.5 text-primary" />
            Saved on your device
          </p>
        </div>
      </div>
    </div>
  )
}
