/**
 * Email Verification API Routes
 * メールアドレス検証関連のAPIエンドポイント
 * CLAUDEガイドラインに準拠
 */

import type { UserId, UserRepository } from '@beauty-salon-backend/domain'
import type { SendEmailVerificationDeps } from '@beauty-salon-backend/domain/business-logic'
import { sendEmailVerificationUseCase } from '@beauty-salon-backend/domain/business-logic'
import { confirmEmailVerificationUseCase } from '@beauty-salon-backend/domain/business-logic'
import type { components } from '@beauty-salon-backend/generated'
import { Router } from 'express'
import { match } from 'ts-pattern'
import { z } from 'zod'
import { authenticate } from '../middleware/auth.middleware'
import type { AuthConfig } from '../middleware/auth.middleware'
import { authRateLimiter } from '../middleware/rate-limit'

// バリデーションスキーマ
const emailVerificationRequestSchema = z.object({
  token: z.string().min(1),
})

// 依存関係の注入用の型
export type EmailVerificationRouteDeps = {
  userRepository: UserRepository
  sendEmailVerification: SendEmailVerificationDeps['sendEmailVerification']
  authConfig: AuthConfig
}

export const createEmailVerificationRoutes = (
  deps: EmailVerificationRouteDeps
): Router => {
  const router = Router()
  const { userRepository, sendEmailVerification, authConfig } = deps

  /**
   * POST /auth/verify-email/send - メール検証リンク送信
   */
  router.post(
    '/verify-email/send',
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

        // メール検証送信処理
        const result = await sendEmailVerificationUseCase(
          { userId: req.user.id as UserId },
          { userRepository, sendEmailVerification }
        )

        // パターンマッチングでレスポンス
        return match(result)
          .with({ type: 'ok' }, () => {
            const response: components['schemas']['Models.AuthSuccessResponse'] =
              {
                message: 'Verification email has been sent',
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
          .with(
            { type: 'err', error: { type: 'emailAlreadyVerified' } },
            () => {
              const error: components['schemas']['Models.Error'] = {
                code: 'EMAIL_ALREADY_VERIFIED',
                message: 'Email is already verified',
              }
              res.status(400).json(error)
            }
          )
          .with({ type: 'err', error: { type: 'tooManyRequests' } }, () => {
            const error: components['schemas']['Models.Error'] = {
              code: 'TOO_MANY_REQUESTS',
              message: 'Too many verification requests. Please try again later',
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
            const error: components['schemas']['Models.Error'] = {
              code: 'INTERNAL_ERROR',
              message: 'An error occurred while sending verification email',
            }
            res.status(500).json(error)
          })
          .exhaustive()
      } catch (error) {
        next(error)
      }
    }
  )

  /**
   * POST /auth/verify-email/confirm - メール検証確認
   */
  router.post(
    '/verify-email/confirm',
    authRateLimiter,
    async (req, res, next) => {
      try {
        // リクエストボディのバリデーション
        const parseResult = emailVerificationRequestSchema.safeParse(req.body)
        if (!parseResult.success) {
          const error: components['schemas']['Models.Error'] = {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: parseResult.error.flatten(),
          }
          return res.status(400).json(error)
        }

        const { token } = parseResult.data

        // メール検証確認処理
        const result = await confirmEmailVerificationUseCase(
          { token },
          { userRepository }
        )

        // パターンマッチングでレスポンス
        return match(result)
          .with({ type: 'ok' }, () => {
            const response: components['schemas']['Models.AuthSuccessResponse'] =
              {
                message: 'Email has been verified successfully',
              }
            res.status(200).json(response)
          })
          .with({ type: 'err', error: { type: 'invalidToken' } }, () => {
            const error: components['schemas']['Models.Error'] = {
              code: 'INVALID_TOKEN',
              message: 'Invalid or expired verification token',
            }
            res.status(400).json(error)
          })
          .with({ type: 'err', error: { type: 'tokenExpired' } }, () => {
            const error: components['schemas']['Models.Error'] = {
              code: 'INVALID_TOKEN',
              message: 'Invalid or expired verification token',
            }
            res.status(400).json(error)
          })
          .with(
            { type: 'err', error: { type: 'emailAlreadyVerified' } },
            () => {
              const error: components['schemas']['Models.Error'] = {
                code: 'EMAIL_ALREADY_VERIFIED',
                message: 'Email is already verified',
              }
              res.status(400).json(error)
            }
          )
          .with({ type: 'err' }, () => {
            const error: components['schemas']['Models.Error'] = {
              code: 'INTERNAL_ERROR',
              message: 'An error occurred while verifying email',
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
