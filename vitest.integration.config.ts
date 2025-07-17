import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.integration.test.ts', '**/repositories/*.test.ts'],
    testTimeout: 60000,
    hookTimeout: 60000,
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
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
