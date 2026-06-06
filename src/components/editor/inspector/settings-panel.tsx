import { ChevronRightIcon, Trash2Icon } from 'lucide-react'
import { Fragment } from 'react'
import { useCanvasSelection } from '#/components/blocks/canvas-tree/selection'
import { KIND_LABEL } from '#/components/blocks/canvas-tree/node-style'
import { findNode } from '#/lib/canvas/tree-ops'
import { SECTIONS } from './sections'
import { useSelectedNode } from './use-selected-node'
import type { Controller } from './section-types'

/**
 * Inspector "Settings" tab: a breadcrumb to the selected node + its applicable sections (from
 * the SECTIONS registry) + a delete action. All the per-kind UI lives in sections.tsx; node
 * resolution in useSelectedNode — this is just composition.
 */
export function SettingsPanel({ controller }: { controller: Controller }) {
  const { select } = useCanvasSelection()
  const { root, node, parentId, path, isRoot } = useSelectedNode(controller)

  if (!root) return null
  if (!node) {
    return (
      <p className="px-3 py-4 text-xs text-muted-foreground">
        Select a node on the canvas to edit it.
      </p>
    )
  }

  const sections = SECTIONS.filter((s) => s.appliesTo(node))

  return (
    <div>
      <div className="border-b border-border px-3 py-2.5">
        <div className="flex flex-wrap items-center gap-0.5 text-[11px]">
          {path.map((id, i) => {
            const n = findNode(root, id)
            const label = n ? (KIND_LABEL[n.kind] ?? n.kind) : id
            const last = i === path.length - 1
            return (
              <Fragment key={id}>
                {i > 0 ? (
                  <ChevronRightIcon className="size-3 shrink-0 text-muted-foreground/40" />
                ) : null}
                <button
                  type="button"
                  disabled={last}
                  onClick={() => select(id)}
                  className={
                    last
                      ? 'font-semibold text-foreground'
                      : 'text-muted-foreground transition-colors hover:text-foreground'
                  }
                >
                  {label}
                </button>
              </Fragment>
            )
          })}
        </div>
      </div>

      {sections.map((s) => (
        <s.Component key={s.id} node={node} controller={controller} parentId={parentId} />
      ))}

      {!isRoot ? (
        <div className="px-3 py-3">
          <button
            type="button"
            onClick={() => {
              controller.onCanvasRemoveNode(node.id)
              select(null)
            }}
            className="flex w-full items-center justify-center gap-1.5 rounded-md border border-border px-2 py-1.5 text-xs text-red-500 transition-colors hover:bg-red-500 hover:text-white"
          >
            <Trash2Icon className="size-3.5" /> Delete node
          </button>
        </div>
      ) : null}
    </div>
  )
}
