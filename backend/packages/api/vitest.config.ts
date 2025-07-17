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
      '@': path.resolve(__dirname, 'src'),
      '@beauty-salon-backend/types': path.resolve(__dirname, '../types/src'),
      '@beauty-salon-backend/infrastructure': path.resolve(
        __dirname,
        '../infrastructure/src'
      ),
      '@beauty-salon-backend/config': path.resolve(__dirname, '../config/src'),
    },
  },
})
