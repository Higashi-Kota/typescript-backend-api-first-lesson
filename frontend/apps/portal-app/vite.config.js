import { resolve } from 'node:path'
import react from '@vitejs/plugin-react-swc'
import { visualizer } from 'rollup-plugin-visualizer'
import { defineConfig, loadEnv } from 'vite'
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd())
  const customEnv = {
    VITE_MODE: env.VITE_MODE || mode,
    VITE_BACKEND_BASE_URL: env.VITE_BACKEND_BASE_URL || 'http://localhost:8787',
    VITE_APP_TITLE: env.VITE_APP_TITLE || 'Beauty Salon Portal',
  }
  return {
    define: {
      'process.env': customEnv,
    },
    plugins: [react()],
    resolve: {
      alias: [{ find: '@', replacement: resolve(__dirname, './src') }],
    },
    server: {
      port: 3001,
      strictPort: true,
      host: true,
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('react')) {
              return 'react-vendor'
            }
            if (id.includes('@tanstack/react-query')) {
              return 'react-query'
            }
            if (id.includes('@beauty-salon-frontend/')) {
              return 'workspace-packages'
            }
            if (id.includes('node_modules')) {
              return 'vendor'
            }
          },
        },
        plugins: [
          mode === 'analyze' &&
            visualizer({
              open: true,
              filename: 'dist/stats.html',
              gzipSize: true,
              brotliSize: true,
            }),
        ].filter(Boolean),
      },
    },
  }
})
