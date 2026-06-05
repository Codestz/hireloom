import { Link } from '@tanstack/react-router'
import { MonitorIcon } from 'lucide-react'
import { Button } from '#/components/ui/button'

/**
 * Shown on small screens instead of the editor. The sidebar + click-to-edit canvas need a
 * real screen; rather than ship a broken half-experience to mostly-mobile referral traffic,
 * we ask the visitor to switch to a laptop/desktop. Hidden at `md` and in print.
 */
export function MobileGate() {
  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-5 bg-background px-8 text-center md:hidden print:hidden">
      <span className="font-serif text-2xl font-medium tracking-tight">
        Hire<span className="text-primary">loom</span>
      </span>
      <MonitorIcon className="size-9 text-primary" />
      <div className="flex flex-col gap-2">
        <h1 className="text-lg font-semibold">Best on a bigger screen</h1>
        <p className="max-w-xs text-sm text-muted-foreground">
          The editor needs room to build and preview your résumé. Open HireLoom
          on a laptop or desktop to get started — your data stays on your device
          either way.
        </p>
      </div>
      <Button asChild variant="outline" size="sm">
        <Link to="/">Back to home</Link>
      </Button>
    </div>
  )
}
