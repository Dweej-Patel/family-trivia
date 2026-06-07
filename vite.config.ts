import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// A unique id per build, baked into the bundle (`__BUILD_ID__`) and also written
// to `version.json`. The app polls version.json to detect when a newer build is
// live and offers a one-tap refresh — so users aren't stuck on a cached version.
const BUILD_ID = Date.now().toString(36)

// https://vite.dev/config/
// `base` is '/' for local dev/preview, but the GitHub Pages workflow sets
// VITE_BASE to "/<repo-name>/" so assets resolve from the project subpath.
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  define: { __BUILD_ID__: JSON.stringify(BUILD_ID) },
  plugins: [
    react(),
    {
      name: 'emit-version-json',
      generateBundle() {
        this.emitFile({
          type: 'asset',
          fileName: 'version.json',
          source: JSON.stringify({ id: BUILD_ID }),
        })
      },
    },
  ],
  server: {
    port: 5173,
    host: true,
  },
})
