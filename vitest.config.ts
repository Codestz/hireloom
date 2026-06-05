import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

/**
 * Standalone test config — intentionally does NOT load vite.config.ts, whose
 * TanStack Start / Nitro plugin can't initialize under Vitest's dev server.
 * React component tests can opt into jsdom per-file with:
 *   // @vitest-environment jsdom
 */
export default defineConfig({
  resolve: {
    alias: {
      '#': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
