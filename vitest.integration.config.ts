import path from 'node:path'
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
      // backend packages for integration tests
      '@beauty-salon-backend/domain': path.resolve(
        __dirname,
        'backend/packages/domain/src'
      ),
      '@beauty-salon-backend/types': path.resolve(
        __dirname,
        'backend/packages/types/src'
      ),
      '@beauty-salon-backend/infrastructure': path.resolve(
        __dirname,
        'backend/packages/infrastructure/src'
      ),
      '@beauty-salon-backend/api': path.resolve(
        __dirname,
        'backend/packages/api/src'
      ),
      '@beauty-salon-backend/config': path.resolve(
        __dirname,
        'backend/packages/config/src'
      ),
      '@beauty-salon-backend/mappers': path.resolve(
        __dirname,
        'backend/packages/mappers/src'
      ),
      '@beauty-salon-backend/test-utils': path.resolve(
        __dirname,
        'backend/packages/test-utils/src'
      ),
      '@beauty-salon-backend/migration': path.resolve(
        __dirname,
        'backend/apps/migration/src'
      ),
    },
  },
})
