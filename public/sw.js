/*
 * HireLoom service worker — runtime caching for offline use (VISION: local-first).
 * Network-first with cache fallback for same-origin GETs; navigations fall back to
 * the cached app shell when offline. resume data lives in IndexedDB, never here, and
 * nothing is sent anywhere — this only caches the app's own static assets.
 */
const CACHE = 'hireloom-runtime-v1'

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(
        keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)),
      )
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  if (new URL(request.url).origin !== self.location.origin) return

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE)
      try {
        const fresh = await fetch(request)
        if (fresh && fresh.ok) cache.put(request, fresh.clone())
        return fresh
      } catch {
        const cached = await cache.match(request)
        if (cached) return cached
        if (request.mode === 'navigate') {
          const shell = await cache.match('/')
          if (shell) return shell
        }
        throw new Error('Offline and resource not cached.')
      }
    })(),
  )
})
