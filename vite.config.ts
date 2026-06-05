import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    devtools(),
    tailwindcss(),
    // HireLoom is fully client-side (IndexedDB, contentEditable, on-device AI), so we ship
    // a static SPA — no SSR server function (and no Vercel routing loop to it).
    tanstackStart({ spa: { enabled: true } }),
    viteReact(),
  ],
})

export default config
