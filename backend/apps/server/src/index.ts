import { createApp } from '@beauty-salon-backend/api'
import { env, environment, validateEnv } from '@beauty-salon-backend/config'
import { getDb } from '@beauty-salon-backend/infrastructure'

async function startServer() {
  try {
    // Validate environment variables
    validateEnv()

    // 環境情報のログ出力
    console.log('========================================')
    console.log(
      `Starting server in ${env.NODE_ENV.value.toUpperCase()} environment`,
    )
    console.log(`Environment: ${environment}`)
    console.log(`API Version: ${env.API_VERSION.value}`)
    console.log(`API Prefix: ${env.API_PREFIX.value}`)
    console.log('========================================')

    // データベース接続の取得
    const database = getDb()
    console.log('Database connection obtained')

    // データベース接続のテスト
    try {
      await database.execute('SELECT 1')
      console.log('Database connection test successful')
    } catch (dbError) {
      console.error('Database connection test failed:', dbError)
      throw dbError
    }

    // Expressアプリの作成
    const app = createApp({ database })
    console.log('Express app created')

    // サーバーの起動
    const port = env.PORT.value
    const server = app.listen(port, () => {
      console.log('========================================')
      console.log(`🚀 API server is running`)
      console.log(`📍 Environment: ${environment}`)
      console.log(`🔗 URL: http://localhost:${port}`)
      console.log(`🏥 Health: http://localhost:${port}/health`)
      console.log(
        `📚 API Base: http://localhost:${port}${env.API_PREFIX.value}/${env.API_VERSION.value}`,
      )
      console.log('========================================')
    })

    // グレースフルシャットダウン
    const shutdown = () => {
      console.log('Shutting down server...')
      server.close(() => {
        console.log('HTTP server closed')
        process.exit(0)
      })
    }

    process.on('SIGTERM', shutdown)
    process.on('SIGINT', shutdown)
  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}

// サーバーを起動
startServer()
