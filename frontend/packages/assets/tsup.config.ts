import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
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
    console.log('✅ @beauty-salon-frontend/assets built successfully!')
  },
})
