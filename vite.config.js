import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    // "@/..." -> "src/..." — previously provided by the Base44 vite plugin.
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  optimizeDeps: {
    include: ['pdfjs-dist'],
  },
  server: {
    // `npm run dev` runs Vite for the UI and `wrangler dev` for the API.
    // Everything the app calls at /api or /files goes to the worker.
    proxy: {
      '/api': 'http://127.0.0.1:8787',
      '/files': 'http://127.0.0.1:8787',
    },
  },
  build: {
    outDir: 'dist',
  },
});
