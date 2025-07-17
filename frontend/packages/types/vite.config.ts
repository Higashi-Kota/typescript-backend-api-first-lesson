import { resolve } from 'node:path'
import react from '@vitejs/plugin-react-swc'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

export default defineConfig({
  plugins: [
    react(),
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
        'error/index': resolve(__dirname, 'src/error/index.ts'),
        'pagination/index': resolve(__dirname, 'src/pagination/index.ts'),
      },

      formats: ['es'],
      fileName: 'index',
    },
    rollupOptions: {
      external: [/^@beauty-salon\//],
      output: {
        preserveModules: true,
        preserveModulesRoot: 'src',
        entryFileNames: '[name].js',
        exports: 'named',
      },
    },
    target: 'esnext',
    minify: false,

    chunkSizeWarningLimit: 500,
    reportCompressedSize: true,
  },
})
