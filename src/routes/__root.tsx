import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { Analytics } from '@vercel/analytics/react'
import { useEffect } from 'react'

import '@fontsource-variable/geist'
import '@fontsource-variable/fraunces'
import { Providers } from '#/components/providers'
import appCss from '../styles.css?url'

// Absolute site origin for social tags. Set VITE_SITE_URL at build/deploy time
// (e.g. https://hireloom.app); LinkedIn requires an absolute og:image/og:url. Falls
// back to a relative path in dev so local previews still work.
const SITE_URL = (
  (import.meta.env as Record<string, string | undefined>).VITE_SITE_URL ?? ''
).replace(/\/+$/, '')
const abs = (path: string) => (SITE_URL ? `${SITE_URL}${path}` : path)

// Chrome Origin Trial token for the Prompt API (on-device AI without chrome://flags).
// Supplied per-deploy via the VITE_ORIGIN_TRIAL env var (set in Vercel) — origin-bound and
// expiring, so it lives in env, not the repo. Renew at developer.chrome.com/origintrials.
const ORIGIN_TRIAL = (import.meta.env as Record<string, string | undefined>)
  .VITE_ORIGIN_TRIAL

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'HireLoom — Private, local-first CV builder',
      },
      {
        name: 'description',
        content:
          'A private, local-first resume builder. On-device AI, ATS-safe PDF export, zero uploads — free and open source. Your career data never leaves your machine.',
      },
      {
        name: 'theme-color',
        content: '#171717',
      },
      // Enables Chrome's built-in Prompt API for visitors without flags (on-device AI).
      ...(ORIGIN_TRIAL
        ? [{ httpEquiv: 'origin-trial', content: ORIGIN_TRIAL }]
        : []),
      // Social unfurl (LinkedIn/Twitter). Absolute URLs when VITE_SITE_URL is set.
      { property: 'og:title', content: 'HireLoom — a resume you actually own' },
      {
        property: 'og:description',
        content:
          'Private, local-first CV builder. On-device AI, ATS-safe PDF export, zero uploads. Free & open source.',
      },
      { property: 'og:type', content: 'website' },
      { property: 'og:image', content: abs('/og.png') },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:image', content: abs('/og.png') },
      ...(SITE_URL ? [{ property: 'og:url', content: SITE_URL }] : []),
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
      {
        rel: 'manifest',
        href: '/manifest.json',
      },
      {
        rel: 'apple-touch-icon',
        href: '/apple-touch-icon.png',
      },
      { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
      { rel: 'icon', href: '/favicon.ico', sizes: '32x32' },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  // Register the offline service worker (production only — avoids stale caches in dev).
  useEffect(() => {
    if (import.meta.env.PROD && 'serviceWorker' in navigator) {
      void navigator.serviceWorker.register('/sw.js').catch(() => undefined)
    }
  }, [])

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <Providers>{children}</Providers>
        <TanStackDevtools
          config={{
            position: 'bottom-right',
          }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
        <Scripts />
        {/* Anonymous, cookie-less page-view analytics (no PII, never resume content). */}
        <Analytics />
      </body>
    </html>
  )
}
