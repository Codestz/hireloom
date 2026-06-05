import { CheckIcon, CpuIcon, CloudIcon, TriangleAlertIcon } from 'lucide-react'
import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { getAiConfig, setAiConfig } from '#/lib/ai/engine'
import type { EngineKind } from '#/lib/ai/engine'
import { cn } from '#/lib/utils.ts'

/**
 * AI engine settings — choose the on-device model (default, fully private) or bring your
 * own Gemini key (opt-in cloud, works without Chrome flags). The key is stored only in
 * this browser and goes browser→Google directly; we have no backend, so we never see it.
 */
export function AiSettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [cfg, setCfg] = useState(getAiConfig)

  function update(patch: Partial<typeof cfg>) {
    const next = { ...cfg, ...patch }
    setCfg(next)
    setAiConfig(patch)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>AI engine</DialogTitle>
          <DialogDescription>
            On-device is private and default. Cloud uses your own Gemini key —
            choose it only if you can’t run Chrome’s built-in AI.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 pt-1">
          <EngineCard
            kind="device"
            active={cfg.engine === 'device'}
            icon={CpuIcon}
            title="On-device (Chrome)"
            body="100% private — nothing leaves your machine. Needs Chrome’s built-in AI."
            onClick={() => update({ engine: 'device' })}
          />
          <EngineCard
            kind="gemini"
            active={cfg.engine === 'gemini'}
            icon={CloudIcon}
            title="Gemini API (your key)"
            body="Works in any browser, fast. Sends your résumé text to Google."
            onClick={() => update({ engine: 'gemini' })}
          />

          {cfg.engine === 'gemini' ? (
            <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
              <label className="flex flex-col gap-1 text-xs font-medium">
                Gemini API key
                <input
                  type="password"
                  value={cfg.geminiKey}
                  onChange={(e) => update({ geminiKey: e.target.value.trim() })}
                  placeholder="AIza…"
                  autoComplete="off"
                  spellCheck={false}
                  className="rounded-md border border-border bg-background px-2 py-1.5 font-mono text-xs outline-none focus:border-primary/50"
                />
              </label>
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-primary underline-offset-4 hover:underline"
              >
                Get a free key at aistudio.google.com →
              </a>
              <p className="flex items-start gap-1.5 text-[11px] text-amber-700">
                <TriangleAlertIcon className="mt-px size-3.5 shrink-0" />
                Cloud AI sends your résumé text to Google’s Gemini API — it
                leaves your device. Your key is stored only in this browser.
              </p>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function EngineCard({
  active,
  icon: Icon,
  title,
  body,
  onClick,
}: {
  kind: EngineKind
  active: boolean
  icon: typeof CpuIcon
  title: string
  body: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-start gap-3 rounded-lg border p-3 text-left transition-colors',
        active
          ? 'border-primary bg-primary/5'
          : 'border-border hover:border-primary/40',
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0 text-primary" />
      <span className="flex flex-col gap-0.5">
        <span className="flex items-center gap-1.5 text-sm font-medium">
          {title}
          {active ? <CheckIcon className="size-3.5 text-primary" /> : null}
        </span>
        <span className="text-xs text-muted-foreground">{body}</span>
      </span>
    </button>
  )
}
