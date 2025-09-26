import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    setupFiles: ['./src/_mocks/vitest.setup.ts'],
    env: {},
    coverage: {
      provider: 'v8',
      include: ['**/src'],
      exclude: ['**/index.{ts,tsx}'],
    },
    environment: 'jsdom',
    exclude: ['node_modules'],
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
})
