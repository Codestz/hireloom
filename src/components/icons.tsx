import type { SVGProps } from 'react'

/**
 * Brand glyphs (GitHub, LinkedIn). lucide-react dropped brand/logo icons in v1, so we inline the
 * official marks here. Same API surface as a lucide icon (className, size via className, data-*).
 */

export function GithubIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M12 .5C5.37.5 0 5.78 0 12.29c0 5.2 3.44 9.6 8.21 11.16.6.11.82-.25.82-.56 0-.28-.01-1.02-.02-2-3.34.7-4.04-1.58-4.04-1.58-.55-1.36-1.33-1.72-1.33-1.72-1.09-.72.08-.71.08-.71 1.2.08 1.84 1.21 1.84 1.21 1.07 1.79 2.81 1.27 3.49.97.11-.76.42-1.27.76-1.56-2.67-.3-5.47-1.31-5.47-5.84 0-1.29.47-2.34 1.24-3.17-.13-.3-.54-1.52.12-3.16 0 0 1.01-.32 3.3 1.21a11.6 11.6 0 0 1 6 0c2.28-1.53 3.29-1.21 3.29-1.21.66 1.64.25 2.86.12 3.16.77.83 1.23 1.88 1.23 3.17 0 4.54-2.81 5.53-5.49 5.83.43.36.81 1.08.81 2.18 0 1.58-.01 2.85-.01 3.24 0 .31.21.68.83.56A12.02 12.02 0 0 0 24 12.29C24 5.78 18.63.5 12 .5Z" />
    </svg>
  )
}

export function LinkedinIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.8 0 0 .77 0 1.73v20.54C0 23.23.8 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z" />
    </svg>
  )
}
