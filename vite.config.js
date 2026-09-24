import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({
  base: process.env.VITE_BASE_PATH || (process.env.GITHUB_ACTIONS ? '/sarrun/' : '/'),
  plugins: [react()],
  build: { rollupOptions: { input: { main: resolve(process.cwd(), 'index.html'), docs: resolve(process.cwd(), 'docs.html') } } },
})