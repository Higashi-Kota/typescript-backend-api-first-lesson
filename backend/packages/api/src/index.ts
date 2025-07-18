/**
 * Express Application Setup
 * CLAUDEガイドラインに準拠したAPI層の実装
 */

import type { CustomerRepository } from '@beauty-salon-backend/domain'
import { DrizzleCustomerRepository } from '@beauty-salon-backend/infrastructure'
import compression from 'compression'
import cors from 'cors'
import express, { type Express } from 'express'
import helmet from 'helmet'
import { pinoHttp } from 'pino-http'
import { errorHandler } from './middleware/error-handler'
import { requestId } from './middleware/request-id'
import { createCustomerRoutes } from './routes/customers.js'

import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

// 依存関係の型
export type AppDependencies = {
  database: PostgresJsDatabase<Record<string, unknown>>
  logger?: ReturnType<typeof import('pino').pino>
}

export const createApp = (deps: AppDependencies): Express => {
  const app = express()
  const { database, logger } = deps

  // ミドルウェアの設定
  app.use(helmet())
  app.use(cors())
  app.use(compression())
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))
  app.use(requestId)

  if (logger) {
    app.use(pinoHttp({ logger }))
  }

  // ヘルスチェック
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
  })

  // リポジトリの初期化
  const customerRepository: CustomerRepository = new DrizzleCustomerRepository(
    database as PostgresJsDatabase
  )

  // ルートの設定
  app.use('/api/v1/customers', createCustomerRoutes({ customerRepository }))

  // エラーハンドリング（最後に設定）
  app.use(errorHandler)

  return app
}

// 開発用のスタンドアロンサーバー
if (import.meta.url === `file://${process.argv[1]}`) {
  const port = process.env.PORT || 3000

  // TODO: 実際のデータベース接続を設定
  const mockDb = {} as PostgresJsDatabase
  const app = createApp({ database: mockDb })

  app.listen(port, () => {
    console.log(`API server listening on port ${port}`)
  })
}
