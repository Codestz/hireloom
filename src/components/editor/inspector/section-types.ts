import type { ComponentType } from 'react'
import type { useBlockDoc } from '#/components/blocks'
import type { CanvasNode } from '#/lib/canvas/model'

export type Controller = ReturnType<typeof useBlockDoc>

/** Props every settings section receives. */
export interface Ctx {
  node: CanvasNode
  controller: Controller
  parentId: string | null
}

/** A settings section: rendered when `appliesTo(node)` is true. Add one → no monolith edit. */
export interface Section {
  id: string
  appliesTo: (node: CanvasNode) => boolean
  Component: ComponentType<Ctx>
}
