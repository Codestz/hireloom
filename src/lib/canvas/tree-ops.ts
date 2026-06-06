/**
 * Pure, immutable operations on the canvas Box tree. Every function returns a NEW root and
 * never mutates its input — so React state updates stay referentially honest and undo/redo
 * (later) is a matter of keeping old roots. Ids are stable; callers mint them via the model
 * helpers (newNodeId/makeBox/makeElement).
 */

import type { BoxProps, CanvasBox, CanvasElement, CanvasNode } from './model'
import { isBox } from './model'

/** Depth-first search for a node by id. Returns null if absent. */
export function findNode(root: CanvasNode, id: string): CanvasNode | null {
  if (root.id === id) return root
  if (!isBox(root)) return null
  for (const child of root.children) {
    const hit = findNode(child, id)
    if (hit) return hit
  }
  return null
}

/** The Box that directly contains `id`, or null (including when `id` is the root). */
export function findParent(root: CanvasBox, id: string): CanvasBox | null {
  for (const child of root.children) {
    if (child.id === id) return root
    if (isBox(child)) {
      const hit = findParent(child, id)
      if (hit) return hit
    }
  }
  return null
}

/** Ids of the path from root → node (inclusive), or [] if not found. Useful for selection. */
export function pathToNode(root: CanvasNode, id: string): Array<string> {
  if (root.id === id) return [root.id]
  if (!isBox(root)) return []
  for (const child of root.children) {
    const sub = pathToNode(child, id)
    if (sub.length) return [root.id, ...sub]
  }
  return []
}

/**
 * Return a new tree with the node matching `id` replaced by `fn(node)`. If `fn` returns the
 * same reference, the subtree is returned unchanged (cheap no-op). The root itself can be
 * transformed too.
 */
export function mapNode(
  root: CanvasBox,
  id: string,
  fn: (node: CanvasNode) => CanvasNode,
): CanvasBox {
  const next = mapNodeRec(root, id, fn)
  return next as CanvasBox
}

function mapNodeRec(
  node: CanvasNode,
  id: string,
  fn: (node: CanvasNode) => CanvasNode,
): CanvasNode {
  if (node.id === id) return fn(node)
  if (!isBox(node)) return node
  const children = node.children.map((child) => mapNodeRec(child, id, fn))
  const changed = children.some((child, i) => child !== node.children[i])
  return changed ? { ...node, children } : node
}

/** Merge a patch into a Box's props. No-op if `id` is not a Box. */
export function updateBoxProps(
  root: CanvasBox,
  id: string,
  patch: Partial<BoxProps>,
): CanvasBox {
  return mapNode(root, id, (node) =>
    isBox(node) ? { ...node, props: { ...node.props, ...patch } } : node,
  )
}

/** Set a Box's role (undefined clears it). No-op if `id` is not a Box. */
export function setBoxRole(
  root: CanvasBox,
  id: string,
  role: string | undefined,
): CanvasBox {
  return mapNode(root, id, (node) => {
    if (!isBox(node)) return node
    const next = { ...node, role }
    if (role === undefined) delete (next as { role?: string }).role
    return next
  })
}

/** Shallow-merge into an element's `data`. No-op if `id` is a Box. */
export function updateElementData(
  root: CanvasBox,
  id: string,
  patch: Record<string, unknown>,
): CanvasBox {
  return mapNode(root, id, (node) =>
    isBox(node)
      ? node
      : ({ ...node, data: { ...node.data, ...patch } } satisfies CanvasElement),
  )
}

/** Shallow-merge into an element's `style`. No-op if `id` is a Box. */
export function updateElementStyle(
  root: CanvasBox,
  id: string,
  patch: CanvasElement['style'],
): CanvasBox {
  return mapNode(root, id, (node) =>
    isBox(node)
      ? node
      : ({ ...node, style: { ...node.style, ...patch } } satisfies CanvasElement),
  )
}

/**
 * Insert `node` into the children of Box `parentId` at `index` (clamped; appended when
 * index is omitted or out of range). No-op if `parentId` is not a Box.
 */
export function insertNode(
  root: CanvasBox,
  parentId: string,
  node: CanvasNode,
  index?: number,
): CanvasBox {
  return mapNode(root, parentId, (parent) => {
    if (!isBox(parent)) return parent
    const children = [...parent.children]
    const at = index === undefined ? children.length : clamp(index, 0, children.length)
    children.splice(at, 0, node)
    return { ...parent, children }
  })
}

/** Append `node` to Box `parentId`. */
export function addChild(
  root: CanvasBox,
  parentId: string,
  node: CanvasNode,
): CanvasBox {
  return insertNode(root, parentId, node)
}

/** Remove the node `id` (and its subtree). The root cannot be removed (returns unchanged). */
export function removeNode(root: CanvasBox, id: string): CanvasBox {
  if (root.id === id) return root
  return removeRec(root) as CanvasBox
  function removeRec(node: CanvasNode): CanvasNode {
    if (!isBox(node)) return node
    let changed = false
    const children: Array<CanvasNode> = []
    for (const child of node.children) {
      if (child.id === id) {
        changed = true
        continue
      }
      const next = removeRec(child)
      if (next !== child) changed = true
      children.push(next)
    }
    return changed ? { ...node, children } : node
  }
}

/**
 * Move node `id` to be a child of Box `toParentId` at `toIndex`. Removes from its current
 * parent first, then inserts. Guards against moving a Box into itself or its own descendant
 * (returns the tree unchanged in that case), and against moving/replacing the root.
 */
export function moveNode(
  root: CanvasBox,
  id: string,
  toParentId: string,
  toIndex?: number,
): CanvasBox {
  if (id === root.id) return root
  const node = findNode(root, id)
  const target = findNode(root, toParentId)
  if (!node || !target || !isBox(target)) return root
  // Disallow dropping a box into itself or a descendant.
  if (isBox(node) && (id === toParentId || findNode(node, toParentId))) return root
  const detached = removeNode(root, id)
  return insertNode(detached, toParentId, node, toIndex)
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n))
}
