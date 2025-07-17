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
      '@backend/domain':
        '/home/aine/higashi-wrksp/typescript-backend-api-first-lesson/backend/packages/domain/src',
      '@backend/usecase':
        '/home/aine/higashi-wrksp/typescript-backend-api-first-lesson/backend/packages/usecase/src',
      '@beauty-salon-backend/infrastructure':
        '/home/aine/higashi-wrksp/typescript-backend-api-first-lesson/backend/packages/infrastructure/src',
      '@beauty-salon-backend/types':
        '/home/aine/higashi-wrksp/typescript-backend-api-first-lesson/backend/packages/types/src',
    },
  },
})
