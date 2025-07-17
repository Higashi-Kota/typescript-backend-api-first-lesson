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
        externals: [],
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
          console.log('✅ @beauty-salon-frontend/utils built successfully!')
        })
      },
    },
  ],
})
