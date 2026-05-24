import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/WA1/',       // GitHub Pages repo path
  build: {
    outDir: 'docs',    // GitHub Pages can serve from /docs on the main branch
  }
})
