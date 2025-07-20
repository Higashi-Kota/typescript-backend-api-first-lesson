import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // CI-specific settings
    testTimeout: 120000, // 2 minutes for CI
    hookTimeout: 180000, // 3 minutes for hooks in CI
    // Run tests sequentially in CI to avoid resource conflicts
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
        maxForks: 1,
      },
    },
    // CI reporter
    reporters: process.env.GITHUB_ACTIONS ? ['github-actions', 'json'] : ['verbose'],
    // Output test results for CI
    outputFile: {
      json: './test-results/results.json',
    },
    // Coverage settings for CI
    coverage: {
      enabled: true,
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData.ts',
        '**/*.spec.ts',
        '**/*.test.ts',
        '**/test-utils/**',
        '**/__tests__/**',
      ],
    },
    // Retry failed tests once in CI
    retry: 1,
    // Log settings
    logHeapUsage: true,
    // Bail on first test failure in CI
    bail: process.env.CI === 'true' ? 1 : 0,
  },
})