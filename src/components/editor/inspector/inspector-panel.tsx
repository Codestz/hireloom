import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Settings2Icon, SquarePlusIcon } from 'lucide-react'
import type { useBlockDoc } from '#/components/blocks'
import { useCanvasSelection } from '#/components/blocks/canvas-tree/selection'
import { isBox } from '#/lib/canvas/model'
import { findNode } from '#/lib/canvas/tree-ops'
import { ComponentsPalette } from './components-palette'
import { SettingsPanel } from './settings-panel'
import { cn } from '#/lib/utils.ts'

type Controller = ReturnType<typeof useBlockDoc>
type Tab = 'components' | 'settings'

/**
 * Right inspector shell: a Components / Settings tab switch over the canvas. The real work
 * lives in components-palette.tsx and settings-panel.tsx (the latter a per-node section
 * registry), so this stays a thin router. Selecting a container favours Components (so you
 * can fill it); selecting a leaf favours Settings.
 */
export function InspectorPanel({ controller }: { controller: Controller }) {
  const { selectedId } = useCanvasSelection()
  const [tab, setTab] = useState<Tab>('components')
  const lastSelected = useRef<string | null>(null)

  useEffect(() => {
    if (selectedId && selectedId !== lastSelected.current) {
      const root = controller.doc.canvas
      const node = root ? findNode(root, selectedId) : null
      setTab(node && isBox(node) ? 'components' : 'settings')
    }
    lastSelected.current = selectedId
  }, [selectedId, controller.doc.canvas])

  const tabs: Array<{ id: Tab; label: string; icon: typeof Settings2Icon }> = [
    { id: 'components', label: 'Components', icon: SquarePlusIcon },
    { id: 'settings', label: 'Settings', icon: Settings2Icon },
  ]

  const showHints = Boolean(selectedId) && selectedId !== controller.doc.canvas?.id

  return (
    <div className="flex h-full flex-col text-sm">
      <div className="flex border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 border-b-2 px-3 py-2.5 text-xs font-medium transition-colors',
              tab === t.id
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            <t.icon className="size-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {tab === 'components' ? (
          <ComponentsPalette controller={controller} />
        ) : (
          <SettingsPanel controller={controller} />
        )}
      </div>

      {showHints ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border px-3 py-2 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Key>Alt</Key>
            <Key>↑↓</Key>
            reorder
          </span>
          <span className="flex items-center gap-1">
            <Key>Del</Key>
            remove
          </span>
          <span className="flex items-center gap-1">
            <Key>Esc</Key>
            deselect
          </span>
        </div>
      ) : null}
    </div>
  )
}

function Key({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded border border-border bg-muted px-1 py-px font-mono text-[10px] text-foreground">
      {children}
    </kbd>
  )
}
