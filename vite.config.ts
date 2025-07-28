import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  // GitHub Pages deployment base path
  base: process.env.NODE_ENV === 'production' ? '/codekit/' : '/',
  
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
    setupFiles: ['./src/test/setup.ts'],
    exclude: [
      '**/node_modules/**',
      '**/src/test/playwright/**',
      '**/dist/**',
      '**/coverage/**'
    ]
  },
  
  build: {
    target: 'ES2022',
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          // Core parsing functionality
          parsers: [
            './src/core/formatters/JsonParser.ts',
            './src/core/formatters/CsvParser.ts', 
            './src/core/formatters/XmlParser.ts',
            './src/core/formatters/FormatRegistry.ts',
            './src/core/formatters/FormatDetector.ts'
          ],
          // Security and analytics
          security: [
            './src/core/security/SecurityManager.ts',
            './src/core/security/CSPManager.ts'
          ],
          analytics: [
            './src/core/analytics/AnalyticsManager.ts'
          ],
          // UI components
          ui: [
            './src/ui/components/StatusBar.ts',
            './src/ui/components/ValidationPanel.ts',
            './src/ui/components/KeyboardShortcuts.ts',
            './src/ui/layout/SplitPanel.ts'
          ],
          // Session management
          session: [
            './src/core/session/SessionManager.ts',
            './src/core/session/CrossTabManager.ts',
            './src/core/session/UserPreferences.ts'
          ],
          // Performance utilities
          performance: [
            './src/utils/performance.ts'
          ]
        },
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.')
          const ext = info[info.length - 1]
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return `assets/images/[name]-[hash][extname]`
          }
          if (/woff2?|eot|ttf|otf/i.test(ext)) {
            return `assets/fonts/[name]-[hash][extname]`
          }
          return `assets/[name]-[hash][extname]`
        },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js'
      }
    },
    // Optimize bundle size
    chunkSizeWarningLimit: 1000,
    reportCompressedSize: true
  },
  
  // GitHub Pages optimization
  server: {
    port: 3000,
    host: true,
    strictPort: true
  },
  
  preview: {
    port: 4173,
    host: true
  },
  
  // Asset optimization
  assetsInclude: ['**/*.md']
})