/**
 * Express Application Setup
 * CLAUDEガイドラインに準拠したAPI層の実装
 */

import type {
  CustomerRepository,
  ReservationRepository,
  ReviewRepository,
  SalonRepository,
} from '@beauty-salon-backend/domain'
import {
  DrizzleCustomerRepository,
  DrizzleReservationRepository,
  DrizzleReviewRepository,
  DrizzleSalonRepository,
} from '@beauty-salon-backend/infrastructure'
import compression from 'compression'
import cors from 'cors'
import express, { type Express } from 'express'
import helmet from 'helmet'
import type { StringValue } from 'ms'
import { pinoHttp } from 'pino-http'
import type { AuthConfig, UserRole } from './middleware/auth.middleware.js'
import { errorHandler } from './middleware/error-handler'
import { requestId } from './middleware/request-id'
import { createAuthRoutes } from './routes/auth.js'
import { createCustomerRoutes } from './routes/customers.js'
import { createReservationRoutes } from './routes/reservations.js'
import { createReviewRoutes } from './routes/reviews.js'
import { createSalonRoutes } from './routes/salons.js'
import { JwtService } from './services/jwt.service.js'

import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

// 依存関係の型
export type AppDependencies = {
  database: PostgresJsDatabase<Record<string, unknown>>
  logger?: ReturnType<typeof import('pino').pino>
  jwtSecret?: string
  jwtAccessTokenExpiresIn?: StringValue
  jwtRefreshTokenExpiresIn?: StringValue
}

export const createApp = (deps: AppDependencies): Express => {
  const app = express()
  const {
    database,
    logger,
    jwtSecret,
    jwtAccessTokenExpiresIn,
    jwtRefreshTokenExpiresIn,
  } = deps

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
  const salonRepository: SalonRepository = new DrizzleSalonRepository(
    database as PostgresJsDatabase
  )
  const reservationRepository: ReservationRepository =
    new DrizzleReservationRepository(database as PostgresJsDatabase)
  const reviewRepository: ReviewRepository = new DrizzleReviewRepository(
    database as PostgresJsDatabase
  )

  // 認証設定
  const authConfig: AuthConfig = {
    jwtSecret: jwtSecret || process.env.JWT_SECRET || 'your-secret-key',
    jwtExpiresIn: jwtAccessTokenExpiresIn || '1h',
  }

  // JWTサービス
  const jwtService = new JwtService({
    accessTokenSecret: authConfig.jwtSecret,
    refreshTokenSecret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret',
    accessTokenExpiresIn: (jwtAccessTokenExpiresIn || '1h') as StringValue,
    refreshTokenExpiresIn: (jwtRefreshTokenExpiresIn || '7d') as StringValue,
  })

  // TODO: 仮のuserRepository実装（本来は実際のリポジトリを使用）
  const mockUserRepository = {
    findByEmail: async (email: string) => {
      // テスト用のダミーユーザー
      if (email === 'admin@example.com') {
        return {
          id: '123e4567-e89b-12d3-a456-426614174000',
          email: 'admin@example.com',
          name: 'Admin User',
          passwordHash: '$2b$10$xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', // bcrypt hash of "password"
          role: 'admin' as const,
          createdAt: new Date(),
        }
      }
      return null
    },
    create: async (
      user: Omit<
        {
          id: string
          email: string
          name: string
          passwordHash: string
          role: UserRole
          createdAt: Date
        },
        'id' | 'createdAt'
      >
    ) => {
      return {
        ...user,
        id: '123e4567-e89b-12d3-a456-426614174001',
        createdAt: new Date(),
      }
    },
    findById: async (id: string) => {
      if (id === '123e4567-e89b-12d3-a456-426614174000') {
        return {
          id: '123e4567-e89b-12d3-a456-426614174000',
          email: 'admin@example.com',
          name: 'Admin User',
          passwordHash: '$2b$10$xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
          role: 'admin' as const,
          createdAt: new Date(),
        }
      }
      return null
    },
  }

  // ルートの設定
  app.use(
    '/api/v1/auth',
    createAuthRoutes({
      jwtService,
      userRepository: mockUserRepository,
      authConfig,
    })
  )
  app.use('/api/v1/customers', createCustomerRoutes({ customerRepository }))
  app.use('/api/v1/salons', createSalonRoutes({ salonRepository, authConfig }))
  app.use(
    '/api/v1/reservations',
    createReservationRoutes({ reservationRepository, authConfig })
  )
  app.use(
    '/api/v1/reviews',
    createReviewRoutes({ reviewRepository, reservationRepository, authConfig })
  )

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
