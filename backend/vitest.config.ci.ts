import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Setup files to load environment variables
    setupFiles: ['./vitest-env-setup.ts'],
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
    reporters: process.env.GITHUB_ACTIONS
      ? ['github-actions', 'json']
      : ['verbose'],
    // Output test results for CI
    outputFile: {
      json: './test-results/results.json',
    },
    // Coverage settings for CI
    coverage: {
      enabled: false,
    },
    // Retry failed tests once in CI
    retry: 1,
    // Log settings
    logHeapUsage: true,
    // Bail on first test failure in CI
    bail: process.env.CI === 'true' ? 1 : 0,
  },
})
