import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/__tests__/**/*.test.ts'],
    exclude: ['**/placeholder.test.ts', '**/*.d.ts'],
    setupFiles: ['./src/__tests__/_shared/setup.ts'],
    testTimeout: 60000,
    hookTimeout: 60000,
    // Environment variables to fix testcontainers credential issues
    env: {
      TESTCONTAINERS_RYUK_DISABLED: 'true',
      DOCKER_CONFIG: '/dev/null',
      TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE: '/var/run/docker.sock',
      NODE_ENV: 'test',
    },
    // Single thread for database schema isolation
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
    // Better error reporting for integration tests
    reporters: ['verbose'],
    logHeapUsage: true,
  },
})
