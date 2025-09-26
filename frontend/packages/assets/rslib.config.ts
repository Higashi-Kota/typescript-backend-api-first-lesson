import { defineConfig } from '@rslib/core'

const isProduction = process.env.NODE_ENV === 'production'
const isDevelopment = process.env.NODE_ENV === 'development'
const isTest = process.env.NODE_ENV === 'test'
const isStaging = process.env.NODE_ENV === 'staging'
const isLocalhost = process.env.NODE_ENV === 'localhost'

export default defineConfig({
  lib: [
    {
      source: {
        entry: {
          index: 'src/index.ts',
        },
        tsconfigPath: './tsconfig.json',
      },
      format: 'esm',
      syntax: 'esnext',
      dts: true,
      bundle: true,
      output: {
        minify: isProduction,
        sourceMap: isDevelopment || isTest || isStaging || isLocalhost,
        target: 'web',
        externals: [],
        dataUriLimit: 4096,
        assetPrefix: './',
      },
    },
  ],

  source: {
    assetsInclude: [
      '**/*.png',
      '**/*.jpg',
      '**/*.jpeg',
      '**/*.gif',
      '**/*.svg',
      '**/*.webp',
    ],
  },

  output: {
    distPath: {
      root: 'dist',
      image: 'images',
    },
    cleanDistPath: 'auto',
    filename: {
      image: '[name][ext]',
    },
  },

  plugins: [
    {
      name: 'build-success',
      setup(api) {
        api.onAfterBuild(() => {
          console.log('✅ @beauty-salon-frontend/assets built successfully!')
        })
      },
    },
  ],
})
