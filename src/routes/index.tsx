import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import {
  ArrowRightIcon,
  DownloadIcon,
  GaugeIcon,
  LinkedinIcon,
  ShieldCheckIcon,
  SparklesIcon,
  UploadIcon,
} from 'lucide-react'
import { useRef } from 'react'
import { toast } from 'sonner'
import { ThemeToggle } from '#/components/app/theme-toggle'
import { Button } from '#/components/ui/button'
import { DEMO_RESUME, DEMO_TOKENS } from '#/lib/sample/demo-resume'

export const Route = createFileRoute('/')({ component: Home })

const FEATURES = [
  {
    icon: ShieldCheckIcon,
    title: 'Own your data',
    body: 'Everything lives in your browser. No account, no upload, no servers holding your career.',
  },
  {
    icon: SparklesIcon,
    title: 'On-device AI',
    body: "Sharpen bullets with Chrome's built-in model. Your words never leave the machine.",
  },
  {
    icon: GaugeIcon,
    title: 'ATS-smart',
    body: "Live keyword match against any job post, plus parse-safety checks recruiters' robots respect.",
  },
]

function Home() {
  const navigate = useNavigate()
  const restoreRef = useRef<HTMLInputElement>(null)

  function openImport() {
    void navigate({ to: '/editor', search: { import: true } })
  }

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
      toast.success(`Restored ${n} résumé${n === 1 ? '' : 's'}`)
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : 'Could not restore that file.',
      )
    }
  }

  async function loadDemo() {
    // Seed a fully-populated sample résumé (client-only Dexie), then open the editor.
    const { createResume } = await import('#/lib/db/resumes')
    await createResume({
      title: 'Sample — Esteban Estrada',
      data: DEMO_RESUME,
      tokens: DEMO_TOKENS,
    })
    void navigate({ to: '/editor' })
  }

  return (
    <div className="relative flex min-h-dvh flex-col">
      {/* Woven-thread atmosphere */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(58%_44%_at_50%_-8%,color-mix(in_oklch,var(--primary)_16%,transparent),transparent_72%)]" />
        <div className="absolute inset-0 opacity-[0.04] [background-image:repeating-linear-gradient(90deg,var(--foreground)_0_1px,transparent_1px_19px),repeating-linear-gradient(0deg,var(--foreground)_0_1px,transparent_1px_19px)]" />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-background to-transparent" />
      </div>

      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-5">
        <span className="font-serif text-xl font-medium tracking-tight">
          Hire<span className="text-primary">loom</span>
        </span>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" asChild>
            <a
              href="https://www.gnu.org/licenses/agpl-3.0.html"
              target="_blank"
              rel="noreferrer"
            >
              Open source
            </a>
          </Button>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-10 px-6 py-16 text-center">
        <div className="flex flex-col items-center gap-6">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
            <ShieldCheckIcon className="size-3.5 text-primary" />
            Private by architecture — nothing leaves your device
          </span>

          <h1 className="font-serif text-5xl leading-[1.04] font-medium tracking-tight text-balance sm:text-6xl">
            Build a résumé
            <br />
            you actually <span className="text-primary italic">own.</span>
          </h1>

          <p className="max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">
            A local-first CV builder. Edit richly, preview live, and export to
            PDF or JSON — free, open source, and woven entirely on your machine.
          </p>
        </div>

        <div className="flex flex-col items-center gap-3 sm:flex-row">
          <Button size="lg" asChild>
            <Link to="/editor">
              Start a résumé
              <ArrowRightIcon data-icon="inline-end" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" onClick={openImport}>
            <LinkedinIcon data-icon="inline-start" />
            Import from LinkedIn
          </Button>
        </div>

        <div className="flex flex-col items-center gap-2">
          <p className="text-xs text-muted-foreground">
            Drop your LinkedIn “Save to PDF” export — parsed in your browser,
            never uploaded.
          </p>
          <button
            type="button"
            onClick={loadDemo}
            className="text-xs font-medium text-primary underline-offset-4 hover:underline"
          >
            Just exploring? Load a sample CV →
          </button>
        </div>
      </main>

      <section className="mx-auto w-full max-w-5xl px-6 pb-12">
        <div className="grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <div key={title} className="flex flex-col gap-2 bg-card p-6">
              <Icon className="size-5 text-primary" />
              <h3 className="text-sm font-semibold">{title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <footer className="mx-auto flex w-full max-w-5xl flex-col items-center gap-3 px-6 pb-16 text-center">
        <p className="text-xs text-muted-foreground">
          Your résumés live only in this browser. Keep them safe:
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => void backup()}>
            <DownloadIcon data-icon="inline-start" />
            Back up my data
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => restoreRef.current?.click()}
          >
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
      </footer>
    </div>
  )
}
