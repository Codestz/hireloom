import { Link } from '@tanstack/react-router'
import { ChevronDownIcon, DownloadIcon, UploadIcon } from 'lucide-react'
import { Button } from '#/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import { LocalBadge } from './local-badge'
import { ThemeToggle } from './theme-toggle'

/**
 * Editor top bar — logo, local badge, optional Import, theme. Export + ATS now live in
 * the editor sidebar; the non-minimal branch keeps a download menu for other surfaces.
 */
export function TopBar({
  onExportJson,
  onExportPdf,
  onImport,
  minimal,
}: {
  onExportJson?: () => void
  onExportPdf?: () => void
  /** Opens the import/replace dialog (shown even in minimal mode). */
  onImport?: () => void
  /** Hide Export (the block editor moves it into the sidebar). */
  minimal?: boolean
}) {
  return (
    <header className="atelier-panel flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
      <div className="flex items-center gap-3">
        <Link to="/" className="flex items-center gap-2">
          <span className="font-serif text-lg font-medium tracking-tight">
            Hire<span className="text-primary">loom</span>
          </span>
        </Link>
        <LocalBadge />
      </div>

      <div className="flex items-center gap-1.5">
        {onImport ? (
          <Button variant="ghost" size="sm" onClick={onImport}>
            <UploadIcon data-icon="inline-start" />
            Import
          </Button>
        ) : null}
        {minimal ? null : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <DownloadIcon data-icon="inline-start" />
                Export
                <ChevronDownIcon data-icon="inline-end" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Download résumé</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={onExportPdf} disabled={!onExportPdf}>
                  PDF
                </DropdownMenuItem>
                <DropdownMenuItem disabled>Word (.docx)</DropdownMenuItem>
                <DropdownMenuItem disabled>Plain text (ATS)</DropdownMenuItem>
                <DropdownMenuItem
                  onClick={onExportJson}
                  disabled={!onExportJson}
                >
                  JSON Resume
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <ThemeToggle />
      </div>
    </header>
  )
}
