import { createApp } from '@beauty-salon-backend/api'
import { env } from '@beauty-salon-backend/config'
import { getDb } from '@beauty-salon-backend/infrastructure'

async function startServer() {
  try {
    // stdout/stderrのバッファリングを無効化
    if (process.stdout) {
      process.stdout.setEncoding('utf8')
    }
    if (process.stderr) {
      process.stderr.setEncoding('utf8')
    }

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

    // Expressアプリの作成（一時的な互換性のため）
    const app = createApp({ database })
    console.log('Express app created')

    // サーバーの起動
    const port = env.PORT ?? 3000
    const server = app.listen(port, () => {
      console.log(`API server is running on http://localhost:${port}`)
      console.log(`Health check available at: http://localhost:${port}/health`)
      console.log('Server is ready to accept connections')
    })

    // 起動完了後に再度ヘルスチェックURLを表示
    setTimeout(() => {
      console.log(
        `Server is listening. Test with: curl http://localhost:${port}/health`
      )
    }, 1000)

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
