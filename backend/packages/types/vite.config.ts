import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

const isProduction = process.env.NODE_ENV === 'production'
const isDevelopment = process.env.NODE_ENV === 'development'
const isTest = process.env.NODE_ENV === 'test'
const isStaging = process.env.NODE_ENV === 'staging'

export default defineConfig({
  plugins: [
    dts({
      insertTypesEntry: false,
      outDir: 'dist',
      tsconfigPath: './tsconfig.json',
      exclude: ['**/*.test.ts', '**/*.spec.ts'],
    }),
  ],
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        branded: resolve(__dirname, 'src/branded.ts'),
        api: resolve(__dirname, 'src/api.ts'),
      },
      formats: ['es'],
      fileName: '[name]',
    },
    rollupOptions: {
      external: [/^@beauty-salon\//, 'zod'],
      output: {
        preserveModules: true,
        preserveModulesRoot: 'src',
        entryFileNames: '[name].js',
        exports: 'named',
      },
    },
    target: 'esnext',
    minify: isProduction,
    chunkSizeWarningLimit: 500,
    reportCompressedSize: true,
    sourcemap: isDevelopment || isTest || isStaging,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
})
