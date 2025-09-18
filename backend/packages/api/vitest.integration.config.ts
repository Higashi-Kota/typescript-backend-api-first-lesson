import path from 'node:path'
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
      '@beauty-salon-backend/domain': path.resolve(__dirname, '../domain/src'),
      '@backend/usecase': path.resolve(__dirname, '../usecase/src'),
      '@beauty-salon-backend/infrastructure': path.resolve(
        __dirname,
        '../infrastructure/src'
      ),
      '@beauty-salon-backend/api': path.resolve(__dirname, 'src'),
    },
  },
})
