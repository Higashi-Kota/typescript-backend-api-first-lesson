import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts', 'src/components/**/*.tsx'],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  external: ['react', 'react-dom'],
  treeshake: true,
  esbuildOptions(options) {
    options.jsx = 'automatic'
  },
})
