import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
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
      '@beauty-salon-backend/api': path.resolve(
        __dirname,
        '../../packages/api/src'
      ),
      '@beauty-salon-backend/config': path.resolve(
        __dirname,
        '../../packages/config/src'
      ),
    },
  },
})
