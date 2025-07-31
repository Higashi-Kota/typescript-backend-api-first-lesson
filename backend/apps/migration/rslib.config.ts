import { defineConfig } from '@rslib/core'
import { copyFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

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
        target: 'node',
        externals: ['drizzle-orm', 'postgres', '@beauty-salon-backend/config'],
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
      name: 'copy-scripts',
      setup(api) {
        api.onAfterBuild(() => {
          // Copy scripts directory to dist
          const scriptsDir = join(__dirname, 'scripts')
          const distScriptsDir = join(__dirname, 'dist', 'scripts')

          // Create scripts directory in dist
          mkdirSync(distScriptsDir, { recursive: true })

          // Copy SQL files
          const sqlFiles = [
            '20250730_000001_initial_schema.sql',
            'cleanup_schema.sql',
          ]

          for (const file of sqlFiles) {
            copyFileSync(join(scriptsDir, file), join(distScriptsDir, file))
          }

          console.log('✅ Scripts copied to dist/scripts')
        })
      },
    },
    {
      name: 'build-success',
      setup(api) {
        api.onAfterBuild(() => {
          console.log('✅ @beauty-salon-backend/migration built successfully!')
        })
      },
    },
  ],
})
