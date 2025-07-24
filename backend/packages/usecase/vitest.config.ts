import { createSharedVitestConfig } from '@beauty-salon-backend/test-utils/config'

export default createSharedVitestConfig({
  rootDir: __dirname,
  integrationTest: false, // 単体テスト用
  parallel: true,
})
