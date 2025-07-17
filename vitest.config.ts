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
      '@beauty-salon-backend/types': '/backend/packages/types/src',
      '@beauty-salon-backend/core': '/backend/packages/core/src',
      '@beauty-salon-backend/infrastructure':
        '/backend/packages/infrastructure/src',
      '@beauty-salon-backend/api': '/backend/packages/api/src',
      '@beauty-salon-backend/config': '/backend/packages/config/src',
    },
  },
})
