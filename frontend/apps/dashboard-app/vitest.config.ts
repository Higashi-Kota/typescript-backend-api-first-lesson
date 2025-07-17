import path from 'node:path'
import react from '@vitejs/plugin-react-swc'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData.ts',
        '**/*.spec.ts',
        '**/*.test.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@beauty-salon-frontend/api-client': path.resolve(
        __dirname,
        '../../packages/api-client/src'
      ),
      '@beauty-salon-frontend/types': path.resolve(
        __dirname,
        '../../packages/types/src'
      ),
      '@beauty-salon-frontend/ui': path.resolve(
        __dirname,
        '../../packages/ui/src'
      ),
    },
  },
})
