import { defineConfig } from '@rslib/core'

const isProduction = process.env.NODE_ENV === 'production'
const isDevelopment = process.env.NODE_ENV === 'development'
const isTest = process.env.NODE_ENV === 'test'
const isStaging = process.env.NODE_ENV === 'staging'

export default defineConfig({
  lib: [
    {
      source: {
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
        tsconfigPath: './tsconfig.json',
      },
      format: 'esm',
      syntax: 'esnext',
      dts: true,
      bundle: true,
      output: {
        minify: isProduction,
        sourceMap: isDevelopment || isTest || isStaging,
        target: 'web',
        externals: [/^@beauty-salon-frontend\//],
      },
    },
  ],

  output: {
    distPath: {
      root: 'dist',
    },
    cleanDistPath: 'auto',
  },

  plugins: [
    {
      name: 'build-success',
      setup(api) {
        api.onAfterBuild(() => {
          console.log('✅ @beauty-salon-frontend/io built successfully!')
        })
      },
    },
  ],
})
