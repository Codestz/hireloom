import { ShieldCheckIcon } from 'lucide-react'
import { Badge } from '#/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '#/components/ui/tooltip'

/**
 * The trust signal (VISION pillar 1). Surfaces the core promise everywhere:
 * nothing about the resume leaves the device.
 */
export function LocalBadge() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="secondary" className="gap-1.5">
          <ShieldCheckIcon className="size-3.5" />
          Local
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        Everything stays on your device. Nothing is uploaded.
      </TooltipContent>
    </Tooltip>
  )
}
