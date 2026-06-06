import { createContext, useContext } from 'react'

/** Live drag state shared from the DnD provider to the renderer (drop line + dimming). */
export interface DragState {
  activeId: string | null
  /** Container the pointer is currently over (a box id). */
  overContainerId: string | null
  /** Index within that container where the drop line shows. */
  dropIndex: number | null
}

export const DragContext = createContext<DragState>({
  activeId: null,
  overContainerId: null,
  dropIndex: null,
})

export const useDragState = (): DragState => useContext(DragContext)
