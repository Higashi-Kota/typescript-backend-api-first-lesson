/**
 * Password Change API Routes
 * パスワード変更関連のAPIエンドポイント
 * CLAUDEガイドラインに準拠
 */

import type { UserId, UserRepository } from '@beauty-salon-backend/domain'
import type { ChangePasswordDeps } from '@beauty-salon-backend/domain/business-logic'
import { changePasswordUseCase } from '@beauty-salon-backend/domain/business-logic'
import type { components } from '@beauty-salon-backend/generated'
import { Router } from 'express'
import { match } from 'ts-pattern'
import { z } from 'zod'
import { authenticate } from '../middleware/auth.middleware'
import type { AuthConfig } from '../middleware/auth.middleware'
import { authRateLimiter } from '../middleware/rate-limit'

// バリデーションスキーマ
const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(12).max(128),
})

// 依存関係の注入用の型
export type PasswordChangeRouteDeps = {
  userRepository: UserRepository
  sendPasswordChangedEmail: ChangePasswordDeps['sendPasswordChangedEmail']
  authConfig: AuthConfig
}

export const createPasswordChangeRoutes = (
  deps: PasswordChangeRouteDeps
): Router => {
  const router = Router()
  const { userRepository, sendPasswordChangedEmail, authConfig } = deps

  /**
   * POST /auth/change-password - パスワード変更
   */
  router.post(
    '/change-password',
    authRateLimiter,
    authenticate(authConfig),
    async (req, res, next) => {
      try {
        if (!req.user) {
          const error: components['schemas']['Models.Error'] = {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          }
          return res.status(401).json(error)
        }

        // リクエストボディのバリデーション
        const parseResult = passwordChangeSchema.safeParse(req.body)
        if (!parseResult.success) {
          const error: components['schemas']['Models.Error'] = {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: parseResult.error.flatten(),
          }
          return res.status(400).json(error)
        }

        const { currentPassword, newPassword } = parseResult.data

        // パスワード変更処理
        const result = await changePasswordUseCase(
          {
            userId: req.user.id as UserId,
            currentPassword,
            newPassword,
          },
          { userRepository, sendPasswordChangedEmail }
        )

        // パターンマッチングでレスポンス
        return match(result)
          .with({ type: 'ok' }, () => {
            const response: components['schemas']['Models.AuthSuccessResponse'] =
              {
                message: 'Password has been changed successfully',
              }
            res.status(200).json(response)
          })
          .with({ type: 'err', error: { type: 'userNotFound' } }, () => {
            const error: components['schemas']['Models.Error'] = {
              code: 'USER_NOT_FOUND',
              message: 'User not found',
            }
            res.status(404).json(error)
          })
          .with({ type: 'err', error: { type: 'invalidPassword' } }, () => {
            const error: components['schemas']['Models.Error'] = {
              code: 'INVALID_PASSWORD',
              message: 'Current password is incorrect',
            }
            res.status(400).json(error)
          })
          .with(
            { type: 'err', error: { type: 'weakPassword' } },
            ({ error }) => {
              const errorResponse: components['schemas']['Models.Error'] = {
                code: 'WEAK_PASSWORD',
                message: 'New password does not meet security requirements',
                details: { reason: error.reason },
              }
              res.status(400).json(errorResponse)
            }
          )
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
              message: 'An error occurred while changing password',
            }
            res.status(500).json(error)
          })
          .exhaustive()
      } catch (error) {
        next(error)
      }
    }
  )

  return router
}
