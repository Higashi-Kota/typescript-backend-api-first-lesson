import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'domains/index': 'src/domains/index.ts',
    'factory/index': 'src/factory/index.ts',
    'hocs/index': 'src/hocs/index.ts',
    'hooks/index': 'src/hooks/index.ts',
    'libs/index': 'src/libs/index.ts',
    'manager/index': 'src/manager/index.ts',
    'repositories/index': 'src/repositories/index.ts',
    'types/index': 'src/types/index.ts',
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

  external: [/^@beauty-salon\//],

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
    console.log('✅ @beauty-salon-frontend/io built successfully!')
  },
})
