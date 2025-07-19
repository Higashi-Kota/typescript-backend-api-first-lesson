/**
 * Express Application Setup
 * CLAUDEガイドラインに準拠したAPI層の実装
 */

import type {
  CustomerRepository,
  ReservationRepository,
  ReviewRepository,
  SalonRepository,
  SessionRepository,
  UserId,
  UserRepository,
} from '@beauty-salon-backend/domain'
import {
  DrizzleCustomerRepository,
  DrizzleReservationRepository,
  DrizzleReviewRepository,
  DrizzleSalonRepository,
  DrizzleSessionRepository,
  DrizzleUserRepository,
} from '@beauty-salon-backend/infrastructure'
import compression from 'compression'
import cors from 'cors'
import express, { type Express } from 'express'
import helmet from 'helmet'
import type { StringValue } from 'ms'
import { pinoHttp } from 'pino-http'
import type { AuthConfig, UserRole } from './middleware/auth.middleware.js'
import { errorHandler } from './middleware/error-handler'
import { generalRateLimiter } from './middleware/rate-limit.js'
import { requestId } from './middleware/request-id'
import { createAccountLockRoutes } from './routes/auth-account-lock.js'
import { createEmailVerificationRoutes } from './routes/auth-email-verification.js'
import { createIpRestrictionRoutes } from './routes/auth-ip-restriction.js'
import { createPasswordChangeRoutes } from './routes/auth-password-change.js'
import { createPasswordResetRoutes } from './routes/auth-password-reset.js'
import { createSessionRoutes } from './routes/auth-session.js'
import { createTwoFactorRoutes } from './routes/auth-two-factor.js'
import { createAuthRoutes } from './routes/auth.js'
import { createCustomerRoutes } from './routes/customers.js'
import { createReservationRoutes } from './routes/reservations.js'
import { createReviewRoutes } from './routes/reviews.js'
import { createSalonRoutes } from './routes/salons.js'
import {
  MockEmailService,
  createEmailServiceWrappers,
} from './services/email.service.js'
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

  // グローバルレートリミット（すべてのAPIエンドポイントに適用）
  app.use('/api/', generalRateLimiter)

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
  const userRepository: UserRepository = new DrizzleUserRepository(
    database as PostgresJsDatabase
  )
  const sessionRepository: SessionRepository = new DrizzleSessionRepository(
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

  // Email service setup
  const emailService = new MockEmailService()
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000'
  const emailServiceWrappers = createEmailServiceWrappers(emailService, baseUrl)

  // Auth repository adapter for backward compatibility
  const authUserRepository = {
    findByEmail: async (email: string) => {
      const result = await userRepository.findByEmail(email)
      if (result.type === 'err' || !result.value) return null
      return {
        id: result.value.data.id,
        email: result.value.data.email,
        name: result.value.data.name,
        passwordHash: result.value.data.passwordHash,
        role: result.value.data.role,
        createdAt: result.value.data.createdAt,
      }
    },
    create: async (user: {
      email: string
      name: string
      passwordHash: string
      role: UserRole
    }) => {
      const newUser = {
        status: {
          type: 'unverified' as const,
          emailVerificationToken: '',
          tokenExpiry: new Date(),
        },
        data: {
          id: '' as UserId, // Will be generated by repository
          email: user.email,
          name: user.name,
          passwordHash: user.passwordHash,
          role: user.role,
          emailVerified: false,
          twoFactorStatus: { type: 'disabled' as const },
          passwordResetStatus: { type: 'none' as const },
          passwordHistory: [],
          trustedIpAddresses: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      }
      const result = await userRepository.save(newUser)
      if (result.type === 'err') throw new Error('Failed to create user')
      return {
        id: result.value.data.id,
        email: result.value.data.email,
        name: result.value.data.name,
        passwordHash: result.value.data.passwordHash,
        role: result.value.data.role,
        createdAt: result.value.data.createdAt,
      }
    },
    findById: async (id: string) => {
      const result = await userRepository.findById(id as UserId)
      if (result.type === 'err' || !result.value) return null
      return {
        id: result.value.data.id,
        email: result.value.data.email,
        name: result.value.data.name,
        passwordHash: result.value.data.passwordHash,
        role: result.value.data.role,
        createdAt: result.value.data.createdAt,
      }
    },
  }

  // ルートの設定
  app.use(
    '/api/v1/auth',
    createAuthRoutes({
      jwtService,
      userRepository: authUserRepository,
      authConfig,
    })
  )
  app.use(
    '/api/v1/auth',
    createPasswordResetRoutes({
      userRepository,
      sessionRepository,
      sendPasswordResetEmail: emailServiceWrappers.sendPasswordResetEmail,
      sendPasswordChangedEmail: emailServiceWrappers.sendPasswordChangedEmail,
    })
  )
  app.use(
    '/api/v1/auth',
    createEmailVerificationRoutes({
      userRepository,
      sendEmailVerification: emailServiceWrappers.sendEmailVerification,
      authConfig,
    })
  )
  app.use(
    '/api/v1/auth',
    createPasswordChangeRoutes({
      userRepository,
      sendPasswordChangedEmail: emailServiceWrappers.sendPasswordChangedEmail,
      authConfig,
    })
  )
  app.use(
    '/api/v1/auth',
    createTwoFactorRoutes({
      userRepository,
      authConfig,
      appName: process.env.APP_NAME || 'Beauty Salon',
    })
  )
  app.use(
    '/api/v1/admin/auth',
    createAccountLockRoutes({
      userRepository,
      authConfig,
    })
  )
  app.use(
    '/api/v1/auth',
    createSessionRoutes({
      userRepository,
      sessionRepository,
      jwtService,
      authConfig,
    })
  )
  app.use(
    '/api/v1/admin/auth',
    createIpRestrictionRoutes({
      userRepository,
      authConfig,
      maxTrustedIps: 10,
      ipRestrictionEnabled: process.env.IP_RESTRICTION_ENABLED === 'true',
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
