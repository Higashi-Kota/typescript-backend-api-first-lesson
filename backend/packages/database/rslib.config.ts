import { cpSync } from 'node:fs'
import { join } from 'node:path'
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
      dts: false,
      bundle: true,
      output: {
        minify: isProduction,
        sourceMap: isDevelopment || isTest || isStaging || isLocalhost,
        target: 'node',
        externals: [
          'drizzle-orm',
          'drizzle-orm/pg-core',
          'drizzle-orm/relations',
          'postgres',
        ],
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
      name: 'copy-sql-files',
      setup(api) {
        api.onAfterBuild(() => {
          // Copy SQL files to dist directory
          const sqlSrc = join(process.cwd(), 'sql')
          const sqlDest = join(process.cwd(), 'dist', 'sql')
          cpSync(sqlSrc, sqlDest, { recursive: true })
          console.log('✅ SQL files copied to dist/sql')
        })
      },
    },
    {
      name: 'build-success',
      setup(api) {
        api.onAfterBuild(() => {
          console.log('✅ @beauty-salon-backend/database built successfully!')
        })
      },
    },
  ],
})
