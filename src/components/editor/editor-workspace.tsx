import { TopBar } from '#/components/app/top-bar'
import { BlockCanvas } from '#/components/blocks'
import type { ResumeRecord } from '#/lib/db'
import { useState } from 'react'
import { EditorSidebar } from '#/components/editor/sidebar/editor-sidebar'
import { ImportDialog } from '#/components/editor/dialogs/import-dialog'
import { InspectorPanel } from '#/components/editor/inspector/inspector-panel'
import { CanvasSelectionProvider } from '#/components/blocks/canvas-tree/selection'
import { CanvasDndProvider } from '#/components/blocks/canvas-tree/canvas-dnd'
import { CanvasKeyboard } from '#/components/blocks/canvas-tree/canvas-keyboard'
import { MobileGate } from './mobile-gate'
import { useResumeEditor } from './use-resume-editor'

/**
 * The editor workspace: a structure-tree sidebar + the click-to-edit block canvas. All
 * data orchestration (load, autosave, export, import) lives in `useResumeEditor`; this is
 * the view that wires it to the sidebar and canvas.
 */
export interface EditorWorkspaceProps {
  record: ResumeRecord
  autoImport?: boolean
}

export function EditorWorkspace({ record, autoImport }: EditorWorkspaceProps) {
  const editor = useResumeEditor(record)
  const [importOpen, setImportOpen] = useState(Boolean(autoImport))
  const canvasMode = Boolean(editor.controller.doc.canvas)

  return (
    <>
      <MobileGate />

      <div className="hidden h-dvh flex-col overflow-hidden md:flex print:block print:h-auto print:overflow-visible">
        <TopBar minimal onImport={() => setImportOpen(true)} />
        <ImportDialog
          open={importOpen}
          onOpenChange={setImportOpen}
          onImported={editor.replaceResume}
        />

        <CanvasSelectionProvider>
         {canvasMode ? <CanvasKeyboard controller={editor.controller} /> : null}
         <CanvasDndProvider controller={editor.controller}>
          <div className="flex flex-1 overflow-hidden print:block print:overflow-visible">
            <aside className="hidden w-[340px] shrink-0 border-r border-border md:block print:hidden">
              <EditorSidebar
                title={record.title}
                controller={editor.controller}
                tokens={editor.tokens}
                activeTemplate={editor.templateId}
                availableSections={editor.availableSections}
                onTokensChange={editor.changeTokens}
                onApplyTemplate={editor.applyTemplate}
                onExportPdf={editor.exportPdf}
                onExportJson={editor.exportJson}
                onReset={editor.resetResume}
              />
            </aside>

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
        </CanvasSelectionProvider>
      </div>
    </>
  )
}
