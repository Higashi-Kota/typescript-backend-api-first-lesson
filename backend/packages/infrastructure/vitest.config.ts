import path from 'node:path'
import { createSharedVitestConfig } from '@beauty-salon-backend/test-utils/config'

export default createSharedVitestConfig({
  rootDir: __dirname,
  integrationTest: true,
  parallel: false, // 一時的に並列実行を無効化
  aliases: {
    '@beauty-salon-backend/domain': path.resolve(__dirname, '../domain/src'),
    '@beauty-salon-backend/types': path.resolve(__dirname, '../types/src'),
    '@beauty-salon-backend/config': path.resolve(__dirname, '../config/src'),
  },
})
