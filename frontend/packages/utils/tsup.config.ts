import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'booleanUtil/index': 'src/booleanUtil/index.ts',
    'dateUtil/index': 'src/dateUtil/index.ts',
    'fileUtil/index': 'src/fileUtil/index.ts',
    'formatUtil/index': 'src/formatUtil/index.ts',
    'mimeUtil/index': 'src/mimeUtil/index.ts',
    'queryParamUtil/index': 'src/queryParamUtil/index.ts',
    'randUtil/index': 'src/randUtil/index.ts',
    'transformUtil/index': 'src/transformUtil/index.ts',
    'typeUtil/index': 'src/typeUtil/index.ts',
    'validationUtil/index': 'src/validationUtil/index.ts',
  },

  format: ['esm'],

  dts: {
    resolve: true,
    compilerOptions: {
      composite: false,
      incremental: false,
    },
  },

  clean: true,

  splitting: false,

  sourcemap: false,

  minify: false,

  target: 'esnext',

  external: [],

  bundle: true,

  treeshake: true,

  platform: 'neutral',

  esbuildOptions(options) {
    options.conditions = ['import', 'module', 'default']
    options.format = 'esm'
    options.outExtension = {
      '.js': '.js',
    }
  },

  outDir: 'dist',

  onSuccess: async () => {
    console.log('✅ @beauty-salon-frontend/utils built successfully!')
  },
})
