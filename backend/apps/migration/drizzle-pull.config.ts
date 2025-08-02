import { resolve } from 'node:path'
import * as dotenv from 'dotenv'
import { defineConfig } from 'drizzle-kit'

// プロジェクトルートの.envファイルを読み込む
dotenv.config({ path: resolve(__dirname, '../../../.env') })

export default defineConfig({
  out: '../../packages/infrastructure/src/database',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },
  introspect: {
    casing: 'preserve',
  },
  verbose: true,
  strict: true,
})
