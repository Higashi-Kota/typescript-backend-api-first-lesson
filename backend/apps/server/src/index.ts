import { createApp } from '@beauty-salon-backend/api'
import { env } from '@beauty-salon-backend/config'
import { getDb } from '@beauty-salon-backend/infrastructure'

// データベース接続の取得
const database = getDb()

// Expressアプリの作成
const app = createApp({ database })

// サーバーの起動
const port = env.PORT || 3000
app.listen(port, () => {
  console.log(`API server is running on http://localhost:${port}`)
})
