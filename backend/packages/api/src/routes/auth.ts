/**
 * Auth API Routes
 * 認証関連のAPIエンドポイント
 * OpenAPI型定義を使用したAPI First開発
 */

import type { UserId } from '@beauty-salon-backend/domain'
import bcrypt from 'bcrypt'
import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'
import { authenticate } from '../middleware/auth.middleware.js'
import type { UserRole } from '../middleware/auth.middleware.js'
import { authRateLimiter } from '../middleware/rate-limit.js'
import type { JwtService } from '../services/jwt.service.js'
import type {
  ErrorResponse,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  TokenRefreshRequest,
} from '../utils/openapi-types.js'
import {
  checkPasswordStrength,
  commonSchemas,
  formatValidationErrors,
} from '../utils/validation-helpers.js'

// ユーザー情報の型（仮実装用 - DBモデルの代替）
export type UserDbModel = {
  id: string
  email: string
  name: string
  passwordHash: string
  role: UserRole
  status: 'active' | 'suspended' | 'deleted'
  emailVerified: boolean
  createdAt: Date
  updatedAt: Date
}

// バリデーションスキーマ (OpenAPI型に合わせて調整)
const loginSchema = z.object({
  email: commonSchemas.email,
  password: z.string().min(1), // ログイン時は最小長のみチェック
  rememberMe: z.boolean().optional().default(false),
  twoFactorCode: z.string().optional(),
})

const registerSchema = z.object({
  email: commonSchemas.email,
  password: commonSchemas.password,
  name: commonSchemas.name,
  role: z.enum(['customer', 'staff', 'admin']).optional().default('customer'),
})

const refreshTokenSchema = z.object({
  refreshToken: z.string(),
})

// 依存関係の注入用の型
export type AuthRouteDeps = {
  jwtService: JwtService
  userRepository: {
    findByEmail: (email: string) => Promise<UserDbModel | null>
    create: (
      user: Omit<UserDbModel, 'id' | 'createdAt' | 'updatedAt'>
    ) => Promise<UserDbModel>
    findById: (id: UserId) => Promise<UserDbModel | null>
  }
  authConfig: {
    jwtSecret: string
  }
}

export const createAuthRoutes = (deps: AuthRouteDeps): Router => {
  const router = Router()
  const { jwtService, userRepository, authConfig } = deps

  /**
   * POST /auth/login - ログイン
   * OpenAPI Operation: AuthOperations_login
   */
  router.post(
    '/login',
    authRateLimiter,
    async (
      req: Request<unknown, unknown, LoginRequest>,
      res: Response<LoginResponse | ErrorResponse>,
      next
    ) => {
      try {
        // リクエストボディのバリデーション
        const parseResult = loginSchema.safeParse(req.body)
        if (!parseResult.success) {
          const errorResponse: ErrorResponse = {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: {
              errors: formatValidationErrors(parseResult.error).errors,
            },
          }
          return res.status(400).json(errorResponse)
        }

        const requestData: LoginRequest = parseResult.data

        // ユーザーの取得
        const user = await userRepository.findByEmail(requestData.email)
        if (user == null) {
          const errorResponse: ErrorResponse = {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password',
          }
          return res.status(401).json(errorResponse)
        }

        // パスワードの検証
        const isPasswordValid = await bcrypt.compare(
          requestData.password,
          user.passwordHash
        )
        if (!isPasswordValid) {
          const errorResponse: ErrorResponse = {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password',
          }
          return res.status(401).json(errorResponse)
        }

        // アカウントステータスチェック
        if (user.status !== 'active') {
          const errorResponse: ErrorResponse = {
            code: 'ACCOUNT_SUSPENDED',
            message: 'Account is not active',
          }
          return res.status(403).json(errorResponse)
        }

        // トークンの生成
        const tokenResult = jwtService.generateTokens({
          userId: user.id,
          email: user.email,
          role: user.role,
        })

        if (tokenResult.type === 'err') {
          const errorResponse: ErrorResponse = {
            code: 'TOKEN_GENERATION_FAILED',
            message: 'Failed to generate authentication token',
          }
          return res.status(500).json(errorResponse)
        }

        // OpenAPI準拠のレスポンス
        const response: LoginResponse = {
          accessToken: tokenResult.value.accessToken,
          refreshToken: tokenResult.value.refreshToken,
          tokenType: 'Bearer',
          expiresIn: tokenResult.value.expiresIn,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            status: user.status,
            emailVerified: user.emailVerified,
            twoFactorStatus: 'disabled',
            failedLoginAttempts: 0,
            createdAt: user.createdAt.toISOString(),
            updatedAt: user.updatedAt.toISOString(),
          },
        }

        res.json(response)
      } catch (error) {
        next(error)
      }
    }
  )

  /**
   * POST /auth/register - ユーザー登録
   * OpenAPI Operation: AuthOperations_register
   * Note: Returns LoginResponse for auto-login after registration
   */
  router.post(
    '/register',
    authRateLimiter,
    async (
      req: Request<unknown, unknown, RegisterRequest>,
      res: Response<LoginResponse | ErrorResponse>,
      next
    ) => {
      try {
        // リクエストボディのバリデーション
        const parseResult = registerSchema.safeParse(req.body)
        if (!parseResult.success) {
          const errorResponse: ErrorResponse = {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: {
              errors: formatValidationErrors(parseResult.error).errors,
            },
          }
          return res.status(400).json(errorResponse)
        }

        const requestData: RegisterRequest = parseResult.data

        // パスワード強度チェック
        const passwordStrength = checkPasswordStrength(requestData.password)
        if (passwordStrength.score < 5) {
          const errorResponse: ErrorResponse = {
            code: 'WEAK_PASSWORD',
            message: 'Password is too weak',
            details: { feedback: passwordStrength.feedback },
          }
          return res.status(400).json(errorResponse)
        }

        // 既存ユーザーのチェック
        const existingUser = await userRepository.findByEmail(requestData.email)
        if (existingUser) {
          const errorResponse: ErrorResponse = {
            code: 'EMAIL_ALREADY_EXISTS',
            message: 'Email already registered',
          }
          return res.status(409).json(errorResponse)
        }

        // パスワードのハッシュ化
        const passwordHash = await bcrypt.hash(requestData.password, 10)

        // ユーザーの作成
        const newUser = await userRepository.create({
          email: requestData.email,
          name: requestData.name,
          passwordHash,
          role: requestData.role || 'customer',
          status: 'active',
          emailVerified: false,
        })

        // Generate tokens for auto-login after registration
        const tokenResult = jwtService.generateTokens({
          userId: newUser.id,
          email: newUser.email,
          role: newUser.role,
        })

        if (tokenResult.type === 'err') {
          const errorResponse: ErrorResponse = {
            code: 'TOKEN_GENERATION_FAILED',
            message: 'Failed to generate authentication token',
          }
          return res.status(500).json(errorResponse)
        }

        // Return LoginResponse for auto-login experience
        const response: LoginResponse = {
          accessToken: tokenResult.value.accessToken,
          refreshToken: tokenResult.value.refreshToken,
          tokenType: 'Bearer',
          expiresIn: tokenResult.value.expiresIn,
          user: {
            id: newUser.id,
            email: newUser.email,
            name: newUser.name,
            role: newUser.role,
            status: newUser.status,
            emailVerified: newUser.emailVerified,
            twoFactorStatus: 'disabled',
            failedLoginAttempts: 0,
            createdAt: newUser.createdAt.toISOString(),
            updatedAt: newUser.updatedAt.toISOString(),
          },
        }

        res.status(201).json(response)
      } catch (error) {
        next(error)
      }
    }
  )

  /**
   * POST /auth/refresh - トークンリフレッシュ
   * OpenAPI Operation: AuthOperations_refreshToken
   */
  router.post(
    '/refresh',
    async (
      req: Request<unknown, unknown, TokenRefreshRequest>,
      res: Response<LoginResponse | ErrorResponse>,
      next
    ) => {
      try {
        // リクエストボディのバリデーション
        const parseResult = refreshTokenSchema.safeParse(req.body)
        if (!parseResult.success) {
          const errorResponse: ErrorResponse = {
            code: 'INVALID_REQUEST',
            message: 'Refresh token is required',
          }
          return res.status(400).json(errorResponse)
        }

        const { refreshToken } = parseResult.data

        // First verify the refresh token and get the user ID
        const verifyResult = jwtService.verifyRefreshToken(refreshToken)
        if (verifyResult.type === 'err') {
          const errorResponse: ErrorResponse = {
            code: 'INVALID_REFRESH_TOKEN',
            message: 'Invalid or expired refresh token',
          }
          return res.status(401).json(errorResponse)
        }

        // Get the user data
        const user = await userRepository.findById(
          verifyResult.value.userId as UserId
        )
        if (user == null) {
          const errorResponse: ErrorResponse = {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
          }
          return res.status(404).json(errorResponse)
        }

        // Generate new tokens
        const tokenResult = jwtService.generateTokens({
          userId: user.id,
          email: user.email,
          role: user.role,
        })

        if (tokenResult.type === 'err') {
          const errorResponse: ErrorResponse = {
            code: 'TOKEN_GENERATION_FAILED',
            message: 'Failed to generate new tokens',
          }
          return res.status(500).json(errorResponse)
        }

        // トークンリフレッシュのレスポンス
        const response: LoginResponse = {
          accessToken: tokenResult.value.accessToken,
          refreshToken: tokenResult.value.refreshToken,
          tokenType: 'Bearer',
          expiresIn: tokenResult.value.expiresIn,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            status: user.status,
            emailVerified: user.emailVerified,
            twoFactorStatus: 'disabled',
            failedLoginAttempts: 0,
            createdAt: user.createdAt.toISOString(),
            updatedAt: user.updatedAt.toISOString(),
          },
        }
        res.json(response)
      } catch (error) {
        next(error)
      }
    }
  )

  /**
   * POST /auth/logout - ログアウト
   */
  router.post('/logout', authenticate(authConfig), async (_req, res, next) => {
    try {
      // 実際のアプリケーションでは、リフレッシュトークンを無効化する処理を実装
      // 例: refreshTokenをブラックリストに追加、またはDBから削除

      res.json({
        message: 'Logged out successfully',
      })
    } catch (error) {
      next(error)
    }
  })

  /**
   * GET /auth/me - 現在のユーザー情報取得
   */
  router.get('/me', authenticate(authConfig), async (req, res, next) => {
    try {
      if (req.user == null) {
        return res.status(401).json({
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        })
      }

      const user = await userRepository.findById(req.user.id as UserId)
      if (user == null) {
        return res.status(404).json({
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        })
      }

      res.json({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      })
    } catch (error) {
      next(error)
    }
  })

  return router
}
