import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@/core': resolve(__dirname, 'src/core'),
      '@/formatters': resolve(__dirname, 'src/core/formatters'),
      '@/renderers': resolve(__dirname, 'src/ui/renderers'),
      '@/components': resolve(__dirname, 'src/ui/components'),
      '@/utils': resolve(__dirname, 'src/utils'),
      '@/types': resolve(__dirname, 'src/types')
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts']
  },
  build: {
    target: 'ES2022'
  }
})