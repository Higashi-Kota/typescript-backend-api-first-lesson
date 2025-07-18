import { defineConfig } from '@rslib/core'

const isProduction = process.env.NODE_ENV === 'production'
const isDevelopment = process.env.NODE_ENV === 'development'
const isTest = process.env.NODE_ENV === 'test'
const isStaging = process.env.NODE_ENV === 'staging'

export default defineConfig({
  lib: [
    {
      format: 'esm',
      syntax: 'esnext',
      dts: true,
      bundle: false,
      output: {
        minify: isProduction,
        sourceMap: isDevelopment || isTest || isStaging,
      },
    },
  ],
  source: {
    entry: {
      index: './src/index.ts',
    },
    tsconfigPath: './tsconfig.json',
    transformImport: [
      {
        libraryName: 'react',
        customName: 'React',
      },
    ],
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
