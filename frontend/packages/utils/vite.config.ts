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
        'booleanUtil/index': resolve(__dirname, 'src/booleanUtil/index.ts'),
        'dateUtil/index': resolve(__dirname, 'src/dateUtil/index.ts'),
        'fileUtil/index': resolve(__dirname, 'src/fileUtil/index.ts'),
        'formatUtil/index': resolve(__dirname, 'src/formatUtil/index.ts'),
        'mimeUtil/index': resolve(__dirname, 'src/mimeUtil/index.ts'),
        'queryParamUtil/index': resolve(
          __dirname,
          'src/queryParamUtil/index.ts'
        ),
        'randUtil/index': resolve(__dirname, 'src/randUtil/index.ts'),
        'transformUtil/index': resolve(__dirname, 'src/transformUtil/index.ts'),
        'typeUtil/index': resolve(__dirname, 'src/typeUtil/index.ts'),
        'validationUtil/index': resolve(
          __dirname,
          'src/validationUtil/index.ts'
        ),
      },

      formats: ['es'],
    },
    rollupOptions: {
      external: [],
      output: {
        preserveModules: true,
        preserveModulesRoot: 'src',
        entryFileNames: '[name].js',
        exports: 'named',

        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
        },
      },
    },
    target: 'esnext',
    minify: false,

    chunkSizeWarningLimit: 500,
    reportCompressedSize: true,
  },
})
