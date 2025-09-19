import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
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
    // Commented out global setup for placeholder tests - uncomment when Docker is available
    // globalSetup: './tests/setup/global-setup.ts',
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
      '@beauty-salon-backend/domain': path.resolve(__dirname, '../domain/src'),
      '@beauty-salon-backend/api': path.resolve(__dirname, '../api/src'),
      '@beauty-salon-backend/config': path.resolve(__dirname, '../config/src'),
    },
  },
})
