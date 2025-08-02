/**
 * Auth API Routes
 * 認証関連のAPIエンドポイント
 * CLAUDEガイドラインに準拠
 */

import type { UserId } from '@beauty-salon-backend/domain'
import bcrypt from 'bcrypt'
import { Router } from 'express'
import { z } from 'zod'
import { authenticate } from '../middleware/auth.middleware.js'
import type { UserRole } from '../middleware/auth.middleware.js'
import { authRateLimiter } from '../middleware/rate-limit.js'
import type { JwtService } from '../services/jwt.service.js'
import {
  checkPasswordStrength,
  commonSchemas,
  formatValidationErrors,
} from '../utils/validation-helpers.js'

// 認証関連の型定義
export type LoginRequest = {
  email: string
  password: string
}

export type RegisterRequest = {
  email: string
  password: string
  name: string
  phoneNumber: string
  role?: UserRole
}

export type AuthResponse = {
  accessToken: string
  refreshToken: string
  expiresIn: number
  user: {
    id: string
    email: string
    name: string
    role: UserRole
  }
}

// ユーザー情報の型（仮実装用）
export type User = {
  id: string
  email: string
  name: string
  passwordHash: string
  role: UserRole
  createdAt: Date
}

// バリデーションスキーマ
const loginSchema = z.object({
  email: commonSchemas.email,
  password: z.string().min(1), // ログイン時は最小長のみチェック
})

const registerSchema = z.object({
  email: commonSchemas.email,
  password: commonSchemas.password,
  name: commonSchemas.name,
  phoneNumber: commonSchemas.phoneNumber,
  role: z.enum(['customer', 'staff', 'admin']).optional(),
})

const refreshTokenSchema = z.object({
  refreshToken: z.string(),
})

// 依存関係の注入用の型
export type AuthRouteDeps = {
  jwtService: JwtService
  userRepository: {
    findByEmail: (email: string) => Promise<User | null>
    create: (user: Omit<User, 'id' | 'createdAt'>) => Promise<User>
    findById: (id: UserId) => Promise<User | null>
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
   */
  router.post('/login', authRateLimiter, async (req, res, next) => {
    try {
      // リクエストボディのバリデーション
      const parseResult = loginSchema.safeParse(req.body)
      if (!parseResult.success) {
        return res.status(400).json(formatValidationErrors(parseResult.error))
      }

      const { email, password } = parseResult.data

      // ユーザーの取得
      const user = await userRepository.findByEmail(email)
      if (user == null) {
        return res.status(401).json({
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
        })
      }

      // パスワードの検証
      const isPasswordValid = await bcrypt.compare(password, user.passwordHash)
      if (!isPasswordValid) {
        return res.status(401).json({
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
        })
      }

      // トークンの生成
      const tokenResult = jwtService.generateTokens({
        userId: user.id,
        email: user.email,
        role: user.role,
      })

      if (tokenResult.type === 'err') {
        return res.status(500).json({
          code: 'TOKEN_GENERATION_FAILED',
          message: 'Failed to generate authentication token',
        })
      }

      // レスポンス
      const response: AuthResponse = {
        ...tokenResult.value,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      }

      res.json(response)
    } catch (error) {
      next(error)
    }
  })

  /**
   * POST /auth/register - ユーザー登録
   */
  router.post('/register', authRateLimiter, async (req, res, next) => {
    try {
      // リクエストボディのバリデーション
      const parseResult = registerSchema.safeParse(req.body)
      if (!parseResult.success) {
        return res.status(400).json(formatValidationErrors(parseResult.error))
      }

      const { email, password, name, role = 'customer' } = parseResult.data

      // パスワード強度チェック
      const passwordStrength = checkPasswordStrength(password)
      if (passwordStrength.score < 5) {
        return res.status(400).json({
          code: 'WEAK_PASSWORD',
          message: 'Password is too weak',
          details: passwordStrength.feedback,
        })
      }

      // 既存ユーザーのチェック
      const existingUser = await userRepository.findByEmail(email)
      if (existingUser) {
        return res.status(409).json({
          code: 'EMAIL_ALREADY_EXISTS',
          message: 'Email already registered',
        })
      }

      // パスワードのハッシュ化
      const passwordHash = await bcrypt.hash(password, 10)

      // ユーザーの作成
      const newUser = await userRepository.create({
        email,
        name,
        passwordHash,
        role,
      })

      // トークンの生成
      const tokenResult = jwtService.generateTokens({
        userId: newUser.id,
        email: newUser.email,
        role: newUser.role,
      })

      if (tokenResult.type === 'err') {
        return res.status(500).json({
          code: 'TOKEN_GENERATION_FAILED',
          message: 'Failed to generate authentication token',
        })
      }

      // レスポンス
      const response: AuthResponse = {
        ...tokenResult.value,
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          role: newUser.role,
        },
      }

      res.status(201).json(response)
    } catch (error) {
      next(error)
    }
  })

  /**
   * POST /auth/refresh - トークンリフレッシュ
   */
  router.post('/refresh', async (req, res, next) => {
    try {
      // リクエストボディのバリデーション
      const parseResult = refreshTokenSchema.safeParse(req.body)
      if (!parseResult.success) {
        return res.status(400).json({
          code: 'INVALID_REQUEST',
          message: 'Refresh token is required',
        })
      }

      const { refreshToken } = parseResult.data

      // トークンのリフレッシュ
      const tokenResult = await jwtService.refreshTokens(
        refreshToken,
        async (userId) => {
          const user = await userRepository.findById(userId as UserId)
          if (user == null) return null
          return {
            userId: user.id,
            email: user.email,
            role: user.role,
          }
        }
      )

      if (tokenResult.type === 'err') {
        return res.status(401).json({
          code: 'INVALID_REFRESH_TOKEN',
          message: 'Invalid or expired refresh token',
        })
      }

      res.json(tokenResult.value)
    } catch (error) {
      next(error)
    }
  })

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
