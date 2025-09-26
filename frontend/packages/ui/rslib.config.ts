import { defineConfig } from '@rslib/core'

const isProduction = process.env.NODE_ENV === 'production'
const isDevelopment = process.env.NODE_ENV === 'development'
const isTest = process.env.NODE_ENV === 'test'
const isStaging = process.env.NODE_ENV === 'staging'
const isLocalhost = process.env.NODE_ENV === 'localhost'

export default defineConfig({
  lib: [
    {
      format: 'esm',
      syntax: 'esnext',
      dts: true,
      bundle: true,
      output: {
        minify: isProduction,
        sourceMap: isDevelopment || isTest || isStaging || isLocalhost,
      },
    },
  ],
  source: {
    entry: {
      index: './src/index.ts',
    },
    tsconfigPath: './tsconfig.json',
  },
  output: {
    externals: ['react', 'react-dom', 'react/jsx-runtime'],
    distPath: {
      root: 'dist',
    },
    cleanDistPath: 'auto',
    copy: [
      {
        from: 'src/styles',
        to: 'styles',
      },
    ],
  },
  tools: {
    swc: {
      jsc: {
        transform: {
          react: {
            runtime: 'automatic',
            importSource: 'react',
          },
        },
      },
    },
  },
  plugins: [
    {
      name: 'build-success',
      setup(api) {
        api.onAfterBuild(() => {
          console.log('✅ @beauty-salon-frontend/ui built successfully!')
        })
      },
    },
  ],
})
