import path from 'node:path'
import { createSharedVitestConfig } from '@beauty-salon-backend/test-utils/config'

export default createSharedVitestConfig({
  rootDir: __dirname,
  integrationTest: true,
  parallel: true, // スキーマ分離により並列実行可能
  aliases: {
    '@beauty-salon-backend/types': path.resolve(__dirname, '../types/src'),
    '@beauty-salon-backend/infrastructure': path.resolve(
      __dirname,
      '../infrastructure/src'
    ),
    '@beauty-salon-backend/config': path.resolve(__dirname, '../config/src'),
  },
})
