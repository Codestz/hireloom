import { DownloadIcon, FileJsonIcon, FileTextIcon, UploadIcon } from 'lucide-react'
import { useRef } from 'react'
import { toast } from 'sonner'
import { Button } from '#/components/ui/button'
import { StartOverDialog } from '#/components/editor/dialogs/start-over-dialog'

/** The Export sidebar mode: download (PDF / JSON), local backup/restore, and the start-over reset. */
export function ExportPanel({
  onExportPdf,
  onExportJson,
  onReset,
}: {
  onExportPdf: () => void
  onExportJson: () => void
  onReset: () => void
}) {
  return (
    <div className="flex flex-col gap-2 p-3">
      <p className="px-1 pb-1 text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
        Download
      </p>
      <Button variant="outline" className="justify-start" onClick={onExportPdf}>
        <FileTextIcon data-icon="inline-start" />
        PDF
      </Button>
      <Button variant="outline" className="justify-start" onClick={onExportJson}>
        <FileJsonIcon data-icon="inline-start" />
        JSON Resume
      </Button>
      <p className="mt-1 px-1 text-xs text-muted-foreground">
        Text-based, ATS-safe. Generated on your device — nothing is uploaded.
      </p>

      <BackupRestore />

      <div className="mt-4 border-t border-border pt-3">
        <p className="px-1 pb-1 text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
          Danger zone
        </p>
        <StartOverDialog onConfirm={onReset} />
      </div>
    </div>
  )
}

/** Local backup / restore — your resumes live only in this browser; this keeps them safe. */
function BackupRestore() {
  const restoreRef = useRef<HTMLInputElement>(null)

  async function backup() {
    const { exportBackup } = await import('#/lib/db/resumes')
    const json = await exportBackup()
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
    a.download = `hireloom-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
    toast.success('Backup downloaded')
  }

  async function restore(file: File) {
    const { importBackup } = await import('#/lib/db/resumes')
    try {
      const n = await importBackup(await file.text())
      toast.success(`Restored ${n} resume${n === 1 ? '' : 's'}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not restore that file.')
    }
  }

  return (
    <div className="mt-4 border-t border-border pt-3">
      <p className="px-1 pb-1 text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
        Back up &amp; restore
      </p>
      <p className="px-1 pb-2 text-xs text-muted-foreground">
        Your resumes live only in this browser. Export a backup to keep them safe.
      </p>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="justify-start" onClick={() => void backup()}>
          <DownloadIcon data-icon="inline-start" />
          Back up
        </Button>
        <Button variant="ghost" size="sm" onClick={() => restoreRef.current?.click()}>
          <UploadIcon data-icon="inline-start" />
          Restore
        </Button>
        <input
          ref={restoreRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void restore(f)
            e.target.value = ''
          }}
        />
      </div>
    </div>
  )
}
