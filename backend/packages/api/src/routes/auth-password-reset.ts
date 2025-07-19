/**
 * Password Reset API Routes
 * パスワードリセット関連のAPIエンドポイント
 * CLAUDEガイドラインに準拠
 */

import type {
  SessionRepository,
  UserRepository,
} from '@beauty-salon-backend/domain'
import type { components } from '@beauty-salon-backend/types/api'
import type { RequestPasswordResetDeps } from '@beauty-salon-backend/usecase'
import type { ResetPasswordDeps } from '@beauty-salon-backend/usecase'
import { requestPasswordResetUseCase } from '@beauty-salon-backend/usecase'
import { verifyResetTokenUseCase } from '@beauty-salon-backend/usecase'
import { resetPasswordUseCase } from '@beauty-salon-backend/usecase'
import { Router } from 'express'
import { match } from 'ts-pattern'
import { z } from 'zod'

// バリデーションスキーマ
const passwordResetRequestSchema = z.object({
  email: z.string().email(),
})

const passwordResetConfirmSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(12).max(128),
})

const verifyTokenSchema = z.object({
  token: z.string().min(1),
})

// 依存関係の注入用の型
export type PasswordResetRouteDeps = {
  userRepository: UserRepository
  sessionRepository: SessionRepository
  sendPasswordResetEmail: RequestPasswordResetDeps['sendPasswordResetEmail']
  sendPasswordChangedEmail: ResetPasswordDeps['sendPasswordChangedEmail']
}

export const createPasswordResetRoutes = (
  deps: PasswordResetRouteDeps
): Router => {
  const router = Router()
  const { userRepository, sendPasswordResetEmail, sendPasswordChangedEmail } =
    deps

  /**
   * POST /auth/forgot-password - パスワードリセット申請
   */
  router.post('/forgot-password', async (req, res, next) => {
    try {
      // リクエストボディのバリデーション
      const parseResult = passwordResetRequestSchema.safeParse(req.body)
      if (!parseResult.success) {
        const error: components['schemas']['Models.Error'] = {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: parseResult.error.flatten(),
        }
        return res.status(400).json(error)
      }

      const { email } = parseResult.data

      // パスワードリセット申請処理
      const result = await requestPasswordResetUseCase(
        { email },
        { userRepository, sendPasswordResetEmail }
      )

      // パターンマッチングでレスポンス
      return match(result)
        .with({ type: 'ok' }, () => {
          const response: components['schemas']['Models.AuthSuccessResponse'] =
            {
              message:
                'If an account exists with this email, a password reset link has been sent',
            }
          res.status(200).json(response)
        })
        .with({ type: 'err', error: { type: 'tooManyRequests' } }, () => {
          const error: components['schemas']['Models.Error'] = {
            code: 'TOO_MANY_REQUESTS',
            message: 'Too many password reset requests. Please try again later',
          }
          res.status(429).json(error)
        })
        .with(
          { type: 'err', error: { type: 'emailServiceError' } },
          ({ error }) => {
            const errorResponse: components['schemas']['Models.Error'] = {
              code: 'EMAIL_SERVICE_ERROR',
              message: error.message,
            }
            res.status(500).json(errorResponse)
          }
        )
        .with({ type: 'err' }, () => {
          // 他のエラーでも同じレスポンスを返す（セキュリティのため）
          const response: components['schemas']['Models.AuthSuccessResponse'] =
            {
              message:
                'If an account exists with this email, a password reset link has been sent',
            }
          res.status(200).json(response)
        })
        .exhaustive()
    } catch (error) {
      next(error)
    }
  })

  /**
   * GET /auth/reset-password/verify - パスワードリセットトークン検証
   */
  router.get('/reset-password/verify', async (req, res, next) => {
    try {
      // クエリパラメータのバリデーション
      const parseResult = verifyTokenSchema.safeParse(req.query)
      if (!parseResult.success) {
        const error: components['schemas']['Models.Error'] = {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: parseResult.error.flatten(),
        }
        return res.status(400).json(error)
      }

      const { token } = parseResult.data

      // トークン検証処理
      const result = await verifyResetTokenUseCase(
        { token },
        { userRepository }
      )

      // パターンマッチングでレスポンス
      return match(result)
        .with({ type: 'ok' }, () => {
          const response: components['schemas']['Models.AuthSuccessResponse'] =
            {
              message: 'Token is valid',
            }
          res.status(200).json(response)
        })
        .with({ type: 'err', error: { type: 'invalidToken' } }, () => {
          const error: components['schemas']['Models.Error'] = {
            code: 'INVALID_TOKEN',
            message: 'Invalid or expired reset token',
          }
          res.status(400).json(error)
        })
        .with({ type: 'err', error: { type: 'tokenExpired' } }, () => {
          const error: components['schemas']['Models.Error'] = {
            code: 'INVALID_TOKEN',
            message: 'Invalid or expired reset token',
          }
          res.status(400).json(error)
        })
        .with({ type: 'err' }, () => {
          const error: components['schemas']['Models.Error'] = {
            code: 'INVALID_TOKEN',
            message: 'Invalid or expired reset token',
          }
          res.status(400).json(error)
        })
        .exhaustive()
    } catch (error) {
      next(error)
    }
  })

  /**
   * POST /auth/reset-password - パスワードリセット実行
   */
  router.post('/reset-password', async (req, res, next) => {
    try {
      // リクエストボディのバリデーション
      const parseResult = passwordResetConfirmSchema.safeParse(req.body)
      if (!parseResult.success) {
        const error: components['schemas']['Models.Error'] = {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: parseResult.error.flatten(),
        }
        return res.status(400).json(error)
      }

      const { token, newPassword } = parseResult.data

      // パスワードリセット処理
      const result = await resetPasswordUseCase(
        { token, newPassword },
        { userRepository, sendPasswordChangedEmail }
      )

      // パターンマッチングでレスポンス
      return match(result)
        .with({ type: 'ok' }, () => {
          const response: components['schemas']['Models.AuthSuccessResponse'] =
            {
              message: 'Password has been reset successfully',
            }
          res.status(200).json(response)
        })
        .with({ type: 'err', error: { type: 'invalidToken' } }, () => {
          const error: components['schemas']['Models.Error'] = {
            code: 'INVALID_TOKEN',
            message: 'Invalid or expired reset token',
          }
          res.status(400).json(error)
        })
        .with({ type: 'err', error: { type: 'tokenExpired' } }, () => {
          const error: components['schemas']['Models.Error'] = {
            code: 'INVALID_TOKEN',
            message: 'Invalid or expired reset token',
          }
          res.status(400).json(error)
        })
        .with({ type: 'err', error: { type: 'weakPassword' } }, ({ error }) => {
          const errorResponse: components['schemas']['Models.Error'] = {
            code: 'WEAK_PASSWORD',
            message: 'Password does not meet security requirements',
            details: { reason: error.reason },
          }
          res.status(400).json(errorResponse)
        })
        .with({ type: 'err', error: { type: 'passwordReused' } }, () => {
          const error: components['schemas']['Models.Error'] = {
            code: 'PASSWORD_REUSED',
            message:
              'Password has been used recently. Please choose a different password',
          }
          res.status(400).json(error)
        })
        .with({ type: 'err' }, () => {
          const error: components['schemas']['Models.Error'] = {
            code: 'INTERNAL_ERROR',
            message: 'An error occurred while resetting password',
          }
          res.status(500).json(error)
        })
        .exhaustive()
    } catch (error) {
      next(error)
    }
  })

  return router
}
