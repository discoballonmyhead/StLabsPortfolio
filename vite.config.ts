import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

const src = fileURLToPath(new URL('./src', import.meta.url))
console.log('[vite.config] alias @ resolves to:', src)

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': src,
    },
  },
})