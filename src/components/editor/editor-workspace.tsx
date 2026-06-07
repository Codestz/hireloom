import { TopBar } from '#/components/app/top-bar'
import { BlockCanvas } from '#/components/blocks'
import type { ResumeRecord } from '#/lib/db'
import { useNavigate } from '@tanstack/react-router'
import { EditorSidebar } from '#/components/editor/sidebar/editor-sidebar'
import { InspectorPanel } from '#/components/editor/inspector/inspector-panel'
import { CanvasSelectionProvider } from '#/components/blocks/canvas-tree/selection'
import { AiHighlightProvider } from '#/components/blocks/canvas-tree/ai-highlight'
import { CanvasDndProvider } from '#/components/blocks/canvas-tree/canvas-dnd'
import { CanvasKeyboard } from '#/components/blocks/canvas-tree/canvas-keyboard'
import { MobileGate } from './mobile-gate'
import { ResizableSidebar } from './resizable-sidebar'
import { useResumeEditor } from './use-resume-editor'

/**
 * The editor workspace: a structure-tree sidebar + the click-to-edit block canvas. All
 * data orchestration (load, autosave, export, import) lives in `useResumeEditor`; this is
 * the view that wires it to the sidebar and canvas.
 */
export interface EditorWorkspaceProps {
  record: ResumeRecord
}

export function EditorWorkspace({ record }: EditorWorkspaceProps) {
  const editor = useResumeEditor(record)
  const navigate = useNavigate()
  const canvasMode = Boolean(editor.controller.doc.canvas)

  return (
    <>
      <MobileGate />

      <div className="hidden h-dvh flex-col overflow-hidden md:flex print:block print:h-auto print:overflow-visible">
        <TopBar minimal onImport={() => void navigate({ to: '/import' })} />

        <CanvasSelectionProvider>
         <AiHighlightProvider>
         {canvasMode ? <CanvasKeyboard controller={editor.controller} /> : null}
         <CanvasDndProvider controller={editor.controller}>
          <div className="flex flex-1 overflow-hidden print:block print:overflow-visible">
            <ResizableSidebar>
              <EditorSidebar
                resumeId={record.id}
                title={record.title}
                controller={editor.controller}
                tokens={editor.tokens}
                availableSections={editor.availableSections}
                onExportPdf={editor.exportPdf}
                onExportJson={editor.exportJson}
                onReset={editor.resetResume}
              />
            </ResizableSidebar>

            <main className="min-w-0 flex-1">
              <BlockCanvas
                controller={editor.controller}
                tokens={editor.resolved}
                layout={editor.layout}
              />
            </main>

            {canvasMode ? (
              <aside className="hidden w-[300px] shrink-0 border-l border-border md:block print:hidden">
                <InspectorPanel controller={editor.controller} />
              </aside>
            ) : null}
          </div>
         </CanvasDndProvider>
         </AiHighlightProvider>
        </CanvasSelectionProvider>
      </div>
    </>
  )
}
