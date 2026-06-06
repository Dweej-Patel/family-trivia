import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// `base` is '/' for local dev/preview, but the GitHub Pages workflow sets
// VITE_BASE to "/<repo-name>/" so assets resolve from the project subpath.
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
  },
})
