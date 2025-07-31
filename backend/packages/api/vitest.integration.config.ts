import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    name: 'api-integration',
    include: ['tests/**/*.integration.test.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
    environment: 'node',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    poolOptions: {
      threads: {
        singleThread: true, // testcontainersは並列実行に対応していないため
      },
    },
  },
  resolve: {
    alias: {
      '@beauty-salon-backend/domain': '../../../backend/packages/domain/src',
      '@backend/usecase': '../../../backend/packages/usecase/src',
      '@beauty-salon-backend/infrastructure':
        '../../../backend/packages/infrastructure/src',
      '@beauty-salon-backend/types': '../../../backend/packages/types/src',
    },
  },
})
