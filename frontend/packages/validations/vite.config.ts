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
        'validateBirthday/index': resolve(
          __dirname,
          'src/validateBirthday/index.ts'
        ),
        'validateEmail/index': resolve(__dirname, 'src/validateEmail/index.ts'),
        'validateEndDate/index': resolve(
          __dirname,
          'src/validateEndDate/index.ts'
        ),
        'validateFullWidthKatakana/index': resolve(
          __dirname,
          'src/validateFullWidthKatakana/index.ts'
        ),
        'validateHalfWidthKatakana/index': resolve(
          __dirname,
          'src/validateHalfWidthKatakana/index.ts'
        ),
        'validateMaxLength/index': resolve(
          __dirname,
          'src/validateMaxLength/index.ts'
        ),
        'validateMinLength/index': resolve(
          __dirname,
          'src/validateMinLength/index.ts'
        ),
        'validatePassword/index': resolve(
          __dirname,
          'src/validatePassword/index.ts'
        ),
        'validateStartDate/index': resolve(
          __dirname,
          'src/validateStartDate/index.ts'
        ),
        'validateURL/index': resolve(__dirname, 'src/validateURL/index.ts'),
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
