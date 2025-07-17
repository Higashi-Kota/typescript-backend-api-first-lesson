import { defineConfig } from '@rslib/core'

export default defineConfig({
  lib: [
    {
      format: 'esm',
      syntax: 'esnext',
      dts: true,
    },
  ],
  source: {
    entry: {
      index: './src/index.ts',
    },
  },
  output: {
    externals: [
      'react',
      '@tanstack/react-query',
      'hono',
      '@beauty-salon-frontend/types',
    ],
  },
})
