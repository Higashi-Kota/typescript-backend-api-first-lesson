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
  initializeEncryptionService,
} from '@beauty-salon-backend/infrastructure'
import compression from 'compression'
import cors from 'cors'
import express, { type Express } from 'express'
import session from 'express-session'
import helmet from 'helmet'
import type { StringValue } from 'ms'
import { pinoHttp } from 'pino-http'
import type { AuthConfig, UserRole } from './middleware/auth.middleware.js'
import {
  csrfProtection,
  csrfTokenHandler,
} from './middleware/csrf-protection.js'
import { errorHandler } from './middleware/error-handler'
import {
  enforceSecureCookies,
  httpsRedirect,
} from './middleware/https-redirect.js'
import {
  errorLoggingMiddleware,
  loggingMiddleware,
} from './middleware/logging.js'
import { metricsHandler, metricsMiddleware } from './middleware/metrics.js'
import { generalRateLimiter } from './middleware/rate-limit.js'
import { requestId } from './middleware/request-id'
import { xssProtectionWithExclusions } from './middleware/xss-protection.js'
import {
  createAttachmentRouter,
  createShareRouter,
} from './routes/attachments.js'
import { createAccountLockRoutes } from './routes/auth-account-lock.js'
import { createEmailVerificationRoutes } from './routes/auth-email-verification.js'
import { createIpRestrictionRoutes } from './routes/auth-ip-restriction.js'
import { createPasswordChangeRoutes } from './routes/auth-password-change.js'
import { createPasswordResetRoutes } from './routes/auth-password-reset.js'
import { createSessionRoutes } from './routes/auth-session.js'
import { createTwoFactorRoutes } from './routes/auth-two-factor.js'
import { createAuthRoutes } from './routes/auth.js'
import { createCustomerRoutes } from './routes/customers.js'
import { healthRouter } from './routes/health.js'
import { createReservationRoutes } from './routes/reservations.js'
import { createReviewRoutes } from './routes/reviews.js'
import { createSalonRoutes } from './routes/salons.js'
import { createProductionEmailService } from './services/email-adapter.service.js'
import { createEmailServiceWrappers } from './services/email.service.js'
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

  // Sentryの初期化
  const { createSentryService } = require('./services/sentry.service.js')
  const sentryService = createSentryService()
  const sentryInit = sentryService.init()
  if (sentryInit.type === 'err') {
    console.warn('Failed to initialize Sentry:', sentryInit.error.message)
  }

  // 暗号化サービスの初期化（機密情報の保護）
  const encryptionKey =
    process.env.ENCRYPTION_MASTER_KEY ||
    'your-32-character-encryption-key-here-change-me!'
  if (encryptionKey.length < 32) {
    console.warn(
      'WARNING: Encryption master key should be at least 32 characters long'
    )
  }
  initializeEncryptionService(encryptionKey)

  // ミドルウェアの設定

  // HTTPS強制（本番環境のみ）
  app.use(
    httpsRedirect({
      trustProxy: true,
      excludePaths: ['/health', '/metrics'],
    })
  )

  // セキュアクッキー設定の強制
  app.use(enforceSecureCookies)

  // セキュリティヘッダーの設定
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"], // 必要に応じて調整
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
          frameAncestors: ["'none'"], // クリックジャッキング対策
          formAction: ["'self'"],
          upgradeInsecureRequests: [], // HTTPSへの自動アップグレード
        },
      },
      crossOriginEmbedderPolicy: true,
      crossOriginOpenerPolicy: true,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      dnsPrefetchControl: true,
      frameguard: { action: 'deny' }, // X-Frame-Options: DENY
      hidePoweredBy: true,
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
      ieNoOpen: true,
      noSniff: true, // X-Content-Type-Options: nosniff
      originAgentCluster: true,
      permittedCrossDomainPolicies: false,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      xssFilter: true, // X-XSS-Protection: 1; mode=block
    })
  )
  app.use(
    cors({
      origin: process.env.FRONTEND_URL || 'http://localhost:3001',
      credentials: true, // Cookie/セッションを許可
    })
  )
  app.use(compression())
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))
  app.use(requestId)

  // セッション設定（CSRF保護に必要）
  app.use(
    session({
      secret: process.env.SESSION_SECRET || 'your-session-secret-key',
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === 'production', // HTTPSでのみ送信
        httpOnly: true, // XSS対策
        maxAge: 24 * 60 * 60 * 1000, // 24時間
        sameSite: 'strict', // CSRF対策
      },
      name: 'sessionId', // デフォルトの'connect.sid'から変更
    })
  )

  // XSS保護（パスワードなどの特定フィールドを除外）
  app.use(
    xssProtectionWithExclusions([
      'password',
      'newPassword',
      'currentPassword',
      'passwordHash',
    ])
  )

  // CSRF保護
  app.use(
    csrfProtection({
      excludePaths: [
        '/api/v1/auth/login',
        '/api/v1/auth/register',
        '/api/v1/auth/refresh',
        '/api/v1/auth/forgot-password',
        '/health',
      ],
    })
  )

  // グローバルレートリミット（すべてのAPIエンドポイントに適用）
  app.use('/api/', generalRateLimiter)

  // Structured logging middleware
  app.use(loggingMiddleware)

  if (logger) {
    app.use(pinoHttp({ logger }))
  }

  // Metrics middleware
  app.use(metricsMiddleware)

  // ヘルスチェック
  app.use('/health', healthRouter)

  // Prometheusメトリクスエンドポイント
  app.get('/metrics', metricsHandler)

  // CSRFトークン取得エンドポイント
  app.get('/api/v1/csrf-token', csrfTokenHandler)

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
  const emailService = createProductionEmailService()
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

  // Attachment routes
  app.use('/api/v1/attachments', createAttachmentRouter({ authConfig }))
  app.use('/api/v1/share', createShareRouter())
  app.use(
    '/api/v1/reservations',
    createReservationRoutes({ reservationRepository, authConfig })
  )
  app.use(
    '/api/v1/reviews',
    createReviewRoutes({ reviewRepository, reservationRepository, authConfig })
  )

  // エラーロギング（エラーハンドラーの前に設定）
  app.use(errorLoggingMiddleware)

  // エラーハンドリング（最後に設定）
  app.use(errorHandler)

  return app
}

// Export structured logging utilities
export {
  createStructuredLogger,
  StructuredLogger,
} from './utils/structured-logger.js'
export type {
  LogEvent,
  SecurityEvent,
  DatabaseOperation,
  EmailEvent,
  StorageEvent,
} from './utils/structured-logger.js'

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
