/**
 * Email Verification Routes
 * メール検証機能の実装
 * CLAUDEガイドラインに準拠
 */

import type {
  EmailService,
  UserId,
  UserRepository,
} from '@beauty-salon-backend/domain'
import { emailVerificationTemplate } from '@beauty-salon-backend/infrastructure'
import type {
  AuthAuditRepository,
  EmailVerificationTokenRepository,
} from '@beauty-salon-backend/infrastructure'
import { Router } from 'express'
import { z } from 'zod'
import { authenticate } from '../middleware/auth.middleware.js'
import type { AuthConfig } from '../middleware/auth.middleware.js'
import { authRateLimiter } from '../middleware/rate-limit.js'
import type { TypedRequest, TypedResponse } from '../types/express.js'
import {
  commonSchemas,
  formatValidationErrors,
} from '../utils/validation-helpers.js'

// リクエスト/レスポンス型定義
type ConfirmEmailRequest = {
  token: string
}

type ResendEmailRequest = {
  email: string
}

type MessageResponse = {
  message: string
}

type ErrorResponse = {
  code: string
  message: string
}

type VerificationStatusResponse = {
  emailVerified: boolean
  email: string
}

export interface EmailVerificationRouteDeps {
  userRepository: UserRepository
  emailVerificationTokenRepository: EmailVerificationTokenRepository
  authAuditRepository: AuthAuditRepository
  emailService: EmailService
  authConfig: AuthConfig
  baseUrl: string
  verificationTokenExpiryDays?: number
}

export const createEmailVerificationRoutes = (
  deps: EmailVerificationRouteDeps
): Router => {
  const router = Router()
  const {
    userRepository,
    emailVerificationTokenRepository,
    authAuditRepository,
    emailService,
    authConfig,
    baseUrl,
    verificationTokenExpiryDays = 7,
  } = deps

  /**
   * POST /auth/verify-email/send - メール確認リンク送信
   */
  router.post(
    '/verify-email/send',
    authenticate(authConfig),
    authRateLimiter,
    async (
      req: TypedRequest,
      res: TypedResponse<MessageResponse | ErrorResponse>,
      next
    ) => {
      try {
        if (!req.user) {
          return res.status(401).json({
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          })
        }

        const ipAddress = req.ip
        const userAgent = req.get('user-agent')

        // ユーザー情報を取得
        const userResult = await userRepository.findById(req.user.id)
        if (userResult.type === 'err' || !userResult.value) {
          return res.status(404).json({
            code: 'USER_NOT_FOUND',
            message: 'User not found',
          })
        }

        const user = userResult.value

        // 既に検証済みかチェック
        if (user.data.emailVerified) {
          await authAuditRepository.log({
            userId: user.data.id,
            eventType: 'email_verification_sent',
            eventData: { alreadyVerified: true },
            ipAddress,
            userAgent,
            success: false,
            errorMessage: 'Email already verified',
          })

          return res.status(400).json({
            code: 'ALREADY_VERIFIED',
            message: 'Email address is already verified',
          })
        }

        // 検証トークンを生成
        const tokenResult = await emailVerificationTokenRepository.create(
          user.data.id,
          user.data.email,
          verificationTokenExpiryDays
        )

        if (tokenResult.type === 'err') {
          return res.status(500).json({
            code: 'TOKEN_GENERATION_FAILED',
            message: 'Failed to generate verification token',
          })
        }

        const token = tokenResult.value
        const verifyUrl = `${baseUrl}/auth/verify-email?token=${token.token}`

        // メール送信
        const emailTemplate = emailVerificationTemplate({
          name: user.data.name,
          verifyUrl,
          expiresIn: `${verificationTokenExpiryDays}日間`,
        })

        const sendResult = await emailService.send({
          to: [{ email: user.data.email }],
          content: {
            subject: emailTemplate.subject,
            text: emailTemplate.text,
            html: emailTemplate.html,
          },
          tags: { type: 'email-verification' },
        })

        if (sendResult.type === 'err') {
          await authAuditRepository.log({
            userId: user.data.id,
            eventType: 'email_verification_sent',
            eventData: { email: user.data.email },
            ipAddress,
            userAgent,
            success: false,
            errorMessage: 'Failed to send email',
          })

          return res.status(500).json({
            code: 'EMAIL_SEND_FAILED',
            message: 'Failed to send verification email',
          })
        }

        // 監査ログ記録
        await authAuditRepository.log({
          userId: user.data.id,
          eventType: 'email_verification_sent',
          eventData: { email: user.data.email },
          ipAddress,
          userAgent,
          success: true,
        })

        res.json({
          message: 'Verification email sent',
        })
      } catch (error) {
        next(error)
      }
    }
  )

  /**
   * POST /auth/verify-email/confirm - メール確認実行
   */
  router.post(
    '/verify-email/confirm',
    async (
      req: TypedRequest<ConfirmEmailRequest>,
      res: TypedResponse<MessageResponse | ErrorResponse>,
      next
    ) => {
      try {
        const schema = z.object({
          token: z.string(),
        })

        const parseResult = schema.safeParse(req.body)
        if (!parseResult.success) {
          return res.status(400).json(formatValidationErrors(parseResult.error))
        }

        const { token } = parseResult.data
        const ipAddress = req.ip
        const userAgent = req.get('user-agent')

        // トークンの検証
        const tokenResult =
          await emailVerificationTokenRepository.findByToken(token)
        if (tokenResult.type === 'err' || !tokenResult.value) {
          await authAuditRepository.log({
            eventType: 'email_verified',
            eventData: { token: `${token.substring(0, 8)}...` },
            ipAddress,
            userAgent,
            success: false,
            errorMessage: 'Invalid or expired token',
          })

          return res.status(400).json({
            code: 'INVALID_TOKEN',
            message: 'Invalid or expired verification token',
          })
        }

        const verificationToken = tokenResult.value

        // ユーザー取得
        const userResult = await userRepository.findById(
          verificationToken.userId as UserId
        )
        if (userResult.type === 'err' || !userResult.value) {
          return res.status(404).json({
            code: 'USER_NOT_FOUND',
            message: 'User not found',
          })
        }

        const user = userResult.value

        // 既に検証済みかチェック
        if (user.data.emailVerified) {
          await authAuditRepository.log({
            userId: user.data.id,
            eventType: 'email_verified',
            eventData: { alreadyVerified: true },
            ipAddress,
            userAgent,
            success: false,
            errorMessage: 'Email already verified',
          })

          return res.status(400).json({
            code: 'ALREADY_VERIFIED',
            message: 'Email address is already verified',
          })
        }

        // メールアドレスが一致するかチェック
        if (user.data.email !== verificationToken.email) {
          await authAuditRepository.log({
            userId: user.data.id,
            eventType: 'email_verified',
            eventData: {
              expectedEmail: verificationToken.email,
              actualEmail: user.data.email,
            },
            ipAddress,
            userAgent,
            success: false,
            errorMessage: 'Email mismatch',
          })

          return res.status(400).json({
            code: 'EMAIL_MISMATCH',
            message: 'Email address does not match',
          })
        }

        // ユーザー情報の更新
        const updatedUser = {
          ...user,
          status:
            user.status.type === 'unverified'
              ? { type: 'active' as const }
              : user.status,
          data: {
            ...user.data,
            emailVerified: true,
          },
        }

        const updateResult = await userRepository.save(updatedUser)
        if (updateResult.type === 'err') {
          return res.status(500).json({
            code: 'UPDATE_FAILED',
            message: 'Failed to update user',
          })
        }

        // トークンを検証済みとしてマーク
        await emailVerificationTokenRepository.markAsVerified(token)

        // 監査ログ記録
        await authAuditRepository.log({
          userId: user.data.id,
          eventType: 'email_verified',
          eventData: { email: user.data.email },
          ipAddress,
          userAgent,
          success: true,
        })

        res.json({
          message: 'Email verified successfully',
        })
      } catch (error) {
        next(error)
      }
    }
  )

  /**
   * GET /auth/verify-email/status - メール検証状態の確認
   */
  router.get(
    '/verify-email/status',
    authenticate(authConfig),
    async (
      req: TypedRequest,
      res: TypedResponse<VerificationStatusResponse | ErrorResponse>,
      next
    ) => {
      try {
        if (!req.user) {
          return res.status(401).json({
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          })
        }

        // ユーザー情報を取得
        const userResult = await userRepository.findById(req.user.id)
        if (userResult.type === 'err' || !userResult.value) {
          return res.status(404).json({
            code: 'USER_NOT_FOUND',
            message: 'User not found',
          })
        }

        const user = userResult.value

        res.json({
          emailVerified: user.data.emailVerified,
          email: user.data.email,
        })
      } catch (error) {
        next(error)
      }
    }
  )

  /**
   * POST /auth/verify-email/resend - メール確認リンク再送信
   */
  router.post(
    '/verify-email/resend',
    authRateLimiter,
    async (
      req: TypedRequest<ResendEmailRequest>,
      res: TypedResponse<MessageResponse | ErrorResponse>,
      next
    ) => {
      try {
        const schema = z.object({
          email: commonSchemas.email,
        })

        const parseResult = schema.safeParse(req.body)
        if (!parseResult.success) {
          return res.status(400).json(formatValidationErrors(parseResult.error))
        }

        const { email } = parseResult.data
        const ipAddress = req.ip
        const userAgent = req.get('user-agent')

        // ユーザーの存在確認（セキュリティのため、存在しなくても同じレスポンスを返す）
        const userResult = await userRepository.findByEmail(email)

        if (userResult.type === 'ok' && userResult.value) {
          const user = userResult.value

          if (!user.data.emailVerified) {
            // 新しい検証トークンを生成
            const tokenResult = await emailVerificationTokenRepository.create(
              user.data.id,
              user.data.email,
              verificationTokenExpiryDays
            )

            if (tokenResult.type === 'ok') {
              const token = tokenResult.value
              const verifyUrl = `${baseUrl}/auth/verify-email?token=${token.token}`

              // メール送信
              const emailTemplate = emailVerificationTemplate({
                name: user.data.name,
                verifyUrl,
                expiresIn: `${verificationTokenExpiryDays}日間`,
              })

              await emailService.send({
                to: [{ email: user.data.email }],
                content: {
                  subject: emailTemplate.subject,
                  text: emailTemplate.text,
                  html: emailTemplate.html,
                },
                tags: { type: 'email-verification-resend' },
              })

              // 監査ログ記録
              await authAuditRepository.log({
                userId: user.data.id,
                eventType: 'email_verification_sent',
                eventData: { email, resend: true },
                ipAddress,
                userAgent,
                success: true,
              })
            }
          }
        }

        // セキュリティのため、常に同じレスポンスを返す
        res.json({
          message:
            'If the email exists and is not verified, a verification link has been sent',
        })
      } catch (error) {
        next(error)
      }
    }
  )

  return router
}
