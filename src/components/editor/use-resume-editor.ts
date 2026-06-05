import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { computePageBreaks, useBlockDoc  } from '#/components/blocks'
import { downloadResumePdf } from '#/lib/export/pdf'
import { SECTIONS } from '#/lib/blocks/sections'
import {
  updateResumeData,
  useUpdateResumeData,
  useUpdateResumeTemplate,
  useUpdateResumeTokens,
} from '#/lib/db'
import type { ResumeRecord } from '#/lib/db'
import { docToResume, resumeToDoc } from '#/lib/blocks/json-resume'
import { downloadResumeJson } from '#/lib/resume'
import { slugify } from '#/lib/utils.ts'
import type { Resume } from '#/lib/resume'
import { getTemplate, resolveTokens } from '#/lib/templates'
import type { ThemeTokens } from '#/lib/templates/tokens'

const AUTOSAVE_MS = 600

/**
 * The editor's orchestration seam: owns the BlockDoc controller, theme/template state,
 * debounced autosave, and the export/import handlers — so the workspace component stays a
 * pure view. All persistence goes through the `lib/db` hooks (no raw Dexie in components).
 */
export function useResumeEditor(record: ResumeRecord) {
  // The editable document is built once from the loaded resume.
  const initialDoc = useMemo(() => resumeToDoc(record.data), [record.data])
  const controller = useBlockDoc(initialDoc)
  const { doc } = controller

  const [tokens, setTokens] = useState<ThemeTokens>(record.tokens)
  const [templateId, setTemplateId] = useState(record.templateId)
  const resolved = useMemo(() => resolveTokens(tokens), [tokens])
  const layout = getTemplate(templateId)?.layout ?? 'single'

  const saveData = useUpdateResumeData(record.id)
  const saveTokens = useUpdateResumeTokens(record.id)
  const saveTemplate = useUpdateResumeTemplate(record.id)

  // Autosave: BlockDoc → JSON Resume → Dexie (debounced; preserves unknown fields).
  useEffect(() => {
    const t = setTimeout(
      () => saveData.mutate(docToResume(doc, record.data)),
      AUTOSAVE_MS,
    )
    return () => clearTimeout(t)
  }, [doc])

  // Section types not yet present (sections are unique — no two Experiences).
  const availableSections = useMemo(() => {
    const present = new Set(doc.sections.map((s) => s.type))
    return SECTIONS.filter((st) => !present.has(st.type)).map((st) => ({
      type: st.type,
      label: st.heading,
    }))
  }, [doc.sections])

  function changeTokens(next: ThemeTokens) {
    setTokens(next)
    saveTokens.mutate(next)
  }

  function applyTemplate(id: string) {
    const tpl = getTemplate(id)
    if (!tpl) return
    setTemplateId(id)
    changeTokens({
      ...tokens,
      fontHeading: tpl.font,
      fontBody: tpl.font,
      density: tpl.density,
    })
    controller.onApplyVariants(tpl.variants)
    saveTemplate.mutate(id)
  }

  function replaceResume(resume: Resume) {
    // Replace + reload from a clean /editor URL so the editor re-seeds and the ?import
    // flag doesn't reopen the dialog.
    void updateResumeData(record.id, resume).then(() =>
      window.location.assign('/editor'),
    )
  }

  function exportJson() {
    downloadResumeJson(docToResume(doc, record.data), record.title)
    toast.success('Exported JSON Resume')
  }

  function exportPdf() {
    const id = toast.loading('Generating PDF…')
    // Break the PDF at the same blocks the canvas guide shows (preview == file).
    const sheet = document.querySelector('.atelier-sheet')
    const autoBreaks =
      sheet instanceof HTMLElement && layout !== 'sidebar'
        ? computePageBreaks(sheet).ids
        : []
    downloadResumePdf(doc, resolved, `${slugify(record.title)}.pdf`, {
      layout,
      autoBreaks,
    })
      .then(() => toast.success('Downloaded PDF', { id }))
      .catch((e: unknown) => {
        console.error('[pdf-export]', e)
        toast.error('PDF export failed', { id })
      })
  }

  return {
    controller,
    tokens,
    templateId,
    resolved,
    layout,
    availableSections,
    changeTokens,
    applyTemplate,
    replaceResume,
    exportJson,
    exportPdf,
  }
}
