/**
 * Public surface of the blocks module — the editor (and anything outside this folder)
 * imports from here, not the internal subfolders (canvas/ state/ document/ …).
 */
export { BlockCanvas } from './canvas/block-canvas'
export { computePageBreaks } from './canvas/page-breaks'
export { useBlockDoc } from './state/use-block-doc'
export type { BlockDocController, EditingActions } from './state/use-block-doc'
