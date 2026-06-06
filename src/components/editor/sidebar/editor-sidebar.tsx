import {
  DownloadIcon,
  FileJsonIcon,
  FileTextIcon,
  LayersIcon,
  MessageSquareIcon,
  PaletteIcon,
  ShieldCheckIcon,
  SparklesIcon,
  TargetIcon,
} from 'lucide-react'
import { useState } from 'react'
import type { ReactNode } from 'react'
import type { ThemeTokens } from '#/lib/templates/tokens'
import { Button } from '#/components/ui/button'
import { StartOverDialog } from '#/components/editor/dialogs/start-over-dialog'
import { AiChatPanel } from '#/components/editor/panels/ai-chat-panel'
import { AiStudioPanel } from '#/components/editor/panels/ai-studio-panel'
import { AtsPanel } from '#/components/editor/panels/ats-panel'
import { DesignPanel } from '#/components/editor/panels/design-panel'
import { cn } from '#/lib/utils.ts'
import type { useBlockDoc } from '#/components/blocks'
import { TreePanel } from './structure-tree'
import { NavigatorTree } from './navigator-tree'

type Mode = 'build' | 'design' | 'ai' | 'chat' | 'ats' | 'export'
type Controller = ReturnType<typeof useBlockDoc>

/** Everything a sidebar panel might need — passed to each mode's `render`. */
interface SidebarContext {
  controller: Controller
  tokens: ThemeTokens
  activeTemplate?: string
  availableSections: Array<{ type: string; label: string }>
  onTokensChange: (next: ThemeTokens) => void
  onApplyTemplate: (id: string) => void
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
    key: 'design',
    label: 'Design',
    icon: PaletteIcon,
    render: (c) => (
      <DesignPanel
        tokens={c.tokens}
        activeTemplate={c.activeTemplate}
        onChange={c.onTokensChange}
        onApplyTemplate={c.onApplyTemplate}
      />
    ),
  },
  {
    key: 'ai',
    label: 'AI Studio',
    icon: SparklesIcon,
    render: (c) => <AiStudioPanel controller={c.controller} />,
  },
  {
    key: 'chat',
    label: 'CV Chat',
    icon: MessageSquareIcon,
    render: (c) => <AiChatPanel controller={c.controller} />,
  },
  {
    key: 'ats',
    label: 'ATS match',
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

function ExportPanel({
  onExportPdf,
  onExportJson,
  onReset,
}: {
  onExportPdf: () => void
  onExportJson: () => void
  onReset: () => void
}) {
  return (
    <div className="flex flex-col gap-2 p-3">
      <p className="px-1 pb-1 text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
        Download
      </p>
      <Button variant="outline" className="justify-start" onClick={onExportPdf}>
        <FileTextIcon data-icon="inline-start" />
        PDF
      </Button>
      <Button
        variant="outline"
        className="justify-start"
        onClick={onExportJson}
      >
        <FileJsonIcon data-icon="inline-start" />
        JSON Resume
      </Button>
      <p className="mt-1 px-1 text-xs text-muted-foreground">
        Text-based, ATS-safe. Generated on your device — nothing is uploaded.
      </p>

      <div className="mt-4 border-t border-border pt-3">
        <p className="px-1 pb-1 text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
          Danger zone
        </p>
        <StartOverDialog onConfirm={onReset} />
      </div>
    </div>
  )
}

export function EditorSidebar({
  title,
  controller,
  tokens,
  activeTemplate,
  availableSections,
  onTokensChange,
  onApplyTemplate,
  onExportPdf,
  onExportJson,
  onReset,
}: {
  title?: string
  controller: Controller
  tokens: ThemeTokens
  activeTemplate?: string
  availableSections: Array<{ type: string; label: string }>
  onTokensChange: (next: ThemeTokens) => void
  onApplyTemplate: (id: string) => void
  onExportPdf: () => void
  onExportJson: () => void
  onReset: () => void
}) {
  const [mode, setMode] = useState<Mode>('build')
  const ctx: SidebarContext = {
    controller,
    tokens,
    activeTemplate,
    availableSections,
    onTokensChange,
    onApplyTemplate,
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
          <p className="text-[10px] font-medium tracking-widest text-muted-foreground uppercase">
            Editing
          </p>
          <h2 className="mt-1 truncate font-serif text-base font-medium tracking-tight">
            {title || 'Your resume'}
          </h2>
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
