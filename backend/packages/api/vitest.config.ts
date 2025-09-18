import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    env: {
      NODE_ENV: 'development',
    },
    // Timeout settings for integration tests
    testTimeout: 60000, // 60 seconds for individual tests
    hookTimeout: 120000, // 120 seconds for hooks (beforeAll, afterAll)
    // Disable parallel execution for integration tests to avoid port conflicts
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    globalSetup: './src/__tests__/setup/global-setup.ts',
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
      '@beauty-salon-backend/api': path.resolve(__dirname, 'src'),
      '@beauty-salon-backend/infrastructure': path.resolve(
        __dirname,
        '../infrastructure/src'
      ),
      '@beauty-salon-backend/config': path.resolve(__dirname, '../config/src'),
      '@beauty-salon-backend/mappers/db-to-domain': path.resolve(
        __dirname,
        '../mappers/src/db-to-domain'
      ),
      '@beauty-salon-backend/mappers/domain-to-db': path.resolve(
        __dirname,
        '../mappers/src/domain-to-db'
      ),
      '@beauty-salon-backend/mappers/api-to-domain': path.resolve(
        __dirname,
        '../mappers/src/api-to-domain'
      ),
      '@beauty-salon-backend/mappers/domain-to-api': path.resolve(
        __dirname,
        '../mappers/src/domain-to-api'
      ),
      '@beauty-salon-backend/mappers': path.resolve(
        __dirname,
        '../mappers/src'
      ),
    },
  },
})
