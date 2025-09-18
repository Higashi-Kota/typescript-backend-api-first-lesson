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
      // backend packages
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
    },
  },
})
