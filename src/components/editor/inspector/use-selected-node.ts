import { useCanvasSelection } from '#/components/blocks/canvas-tree/selection'
import type { CanvasBox, CanvasNode } from '#/lib/canvas/model'
import { findNode, findParent, pathToNode } from '#/lib/canvas/tree-ops'
import type { Controller } from './section-types'

export interface SelectedNode {
  root: CanvasBox | null
  node: CanvasNode | null
  parentId: string | null
  /** Ids root → node (inclusive), for the breadcrumb. */
  path: Array<string>
  isRoot: boolean
}

/** Resolve the currently-selected canvas node (+ its parent and ancestor path). */
export function useSelectedNode(controller: Controller): SelectedNode {
  const { selectedId } = useCanvasSelection()
  const root = controller.doc.canvas ?? null
  const node = root && selectedId ? findNode(root, selectedId) : null
  const parentId = root && node ? (findParent(root, node.id)?.id ?? null) : null
  const path = root && node ? pathToNode(root, node.id) : []
  const isRoot = Boolean(root && node && node.id === root.id)
  return { root, node, parentId, path, isRoot }
}
