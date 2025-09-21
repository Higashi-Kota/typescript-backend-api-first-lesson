import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    name: 'api-integration',
    include: ['src/__tests__/**/*.integration.test.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
    environment: 'node',
    globals: true,
    setupFiles: [],
    poolOptions: {
      threads: {
        singleThread: true, // testcontainersは並列実行に対応していないため
      },
    },
  },
  resolve: {
    alias: {
      '@beauty-salon-backend/domain': path.resolve(__dirname, '../domain/src'),
      '@beauty-salon-backend/infrastructure': path.resolve(
        __dirname,
        '../infrastructure/src'
      ),
      '@beauty-salon-backend/generated': path.resolve(
        __dirname,
        '../generated/src'
      ),
    },
  },
})
