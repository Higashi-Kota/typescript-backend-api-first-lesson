/**
 * Password Reset Routes
 * パスワードリセット機能の実装
 * CLAUDEガイドラインに準拠
 */

import type {
  EmailService,
  SessionRepository,
  UserId,
  UserRepository,
} from '@beauty-salon-backend/domain'
import {
  passwordChangedTemplate,
  passwordResetTemplate,
} from '@beauty-salon-backend/infrastructure'
import type {
  AuthAuditRepository,
  PasswordResetTokenRepository,
} from '@beauty-salon-backend/infrastructure'
import bcrypt from 'bcrypt'
import { Router } from 'express'
import { z } from 'zod'
import { authRateLimiter } from '../middleware/rate-limit.js'
import {
  checkPasswordStrength,
  commonSchemas,
  formatValidationErrors,
} from '../utils/validation-helpers.js'

export interface PasswordResetRouteDeps {
  userRepository: UserRepository
  sessionRepository: SessionRepository
  passwordResetTokenRepository: PasswordResetTokenRepository
  authAuditRepository: AuthAuditRepository
  emailService: EmailService
  baseUrl: string
  resetTokenExpiryHours?: number
}

export const createPasswordResetRoutes = (
  deps: PasswordResetRouteDeps
): Router => {
  const router = Router()
  const {
    userRepository,
    sessionRepository,
    passwordResetTokenRepository,
    authAuditRepository,
    emailService,
    baseUrl,
    resetTokenExpiryHours = 1,
  } = deps

  /**
   * POST /auth/forgot-password - パスワードリセット要求
   */
  router.post('/forgot-password', authRateLimiter, async (req, res, next) => {
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

      // ユーザーの存在確認
      const userResult = await userRepository.findByEmail(email)

      if (userResult.type === 'ok' && userResult.value) {
        const user = userResult.value

        // リセットトークンを生成
        const tokenResult = await passwordResetTokenRepository.create(
          user.data.id,
          resetTokenExpiryHours
        )

        if (tokenResult.type === 'ok') {
          const token = tokenResult.value
          const resetUrl = `${baseUrl}/auth/reset-password?token=${token.token}`

          // メール送信
          const emailTemplate = passwordResetTemplate({
            name: user.data.name,
            resetUrl,
            expiresIn: `${resetTokenExpiryHours}時間`,
          })

          await emailService.send({
            to: [{ email: user.data.email }],
            content: {
              subject: emailTemplate.subject,
              text: emailTemplate.text,
              html: emailTemplate.html,
            },
            tags: { type: 'password-reset' },
          })

          // 監査ログ記録
          await authAuditRepository.log({
            userId: user.data.id,
            eventType: 'password_reset_requested',
            eventData: { email },
            ipAddress,
            userAgent,
            success: true,
          })
        }
      } else {
        // ユーザーが存在しない場合も監査ログに記録
        await authAuditRepository.log({
          eventType: 'password_reset_requested',
          eventData: { email },
          ipAddress,
          userAgent,
          success: false,
          errorMessage: 'User not found',
        })
      }

      // セキュリティのため、常に同じレスポンスを返す
      res.json({
        message: 'If the email exists, a password reset link has been sent',
      })
    } catch (error) {
      next(error)
    }
  })

  /**
   * POST /auth/reset-password - パスワードリセット実行
   */
  router.post('/reset-password', async (req, res, next) => {
    try {
      const schema = z.object({
        token: z.string(),
        newPassword: commonSchemas.password,
      })

      const parseResult = schema.safeParse(req.body)
      if (!parseResult.success) {
        return res.status(400).json(formatValidationErrors(parseResult.error))
      }

      const { token, newPassword } = parseResult.data
      const ipAddress = req.ip
      const userAgent = req.get('user-agent')

      // トークンの検証
      const tokenResult = await passwordResetTokenRepository.findByToken(token)
      if (tokenResult.type === 'err' || !tokenResult.value) {
        await authAuditRepository.log({
          eventType: 'password_reset_completed',
          eventData: { token: `${token.substring(0, 8)}...` },
          ipAddress,
          userAgent,
          success: false,
          errorMessage: 'Invalid or expired token',
        })

        return res.status(400).json({
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired password reset token',
        })
      }

      const resetToken = tokenResult.value

      // パスワード強度チェック
      const passwordStrength = checkPasswordStrength(newPassword)
      if (passwordStrength.score < 5) {
        return res.status(400).json({
          code: 'WEAK_PASSWORD',
          message: 'Password is too weak',
          details: passwordStrength.feedback,
        })
      }

      // ユーザー取得
      const userResult = await userRepository.findById(
        resetToken.userId as UserId
      )
      if (userResult.type === 'err' || !userResult.value) {
        return res.status(400).json({
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        })
      }

      const user = userResult.value

      // パスワード履歴チェック（同じパスワードの再利用防止）
      const passwordHistory = user.data.passwordHistory || []
      for (const oldHash of passwordHistory) {
        if (await bcrypt.compare(newPassword, oldHash)) {
          return res.status(400).json({
            code: 'PASSWORD_REUSED',
            message:
              'Password has been used recently. Please choose a different password.',
          })
        }
      }

      // 新しいパスワードのハッシュ化
      const passwordHash = await bcrypt.hash(newPassword, 10)

      // パスワード履歴の更新（最新5つを保持）
      const updatedPasswordHistory = [
        passwordHash,
        ...passwordHistory.slice(0, 4),
      ]

      // ユーザー情報の更新
      const updatedUser = {
        ...user,
        data: {
          ...user.data,
          passwordHash,
          passwordHistory: updatedPasswordHistory,
          passwordResetStatus: { type: 'none' as const },
        },
      }

      const updateResult = await userRepository.save(updatedUser)
      if (updateResult.type === 'err') {
        return res.status(500).json({
          code: 'UPDATE_FAILED',
          message: 'Failed to update password',
        })
      }

      // トークンを使用済みとしてマーク
      await passwordResetTokenRepository.markAsUsed(token)

      // 全セッションを無効化（セキュリティのため）
      await sessionRepository.deleteByUserId(user.data.id)

      // パスワード変更通知メールを送信
      const emailTemplate = passwordChangedTemplate({
        name: user.data.name,
        changedAt: new Date(),
        ipAddress,
      })

      await emailService.send({
        to: [{ email: user.data.email }],
        content: {
          subject: emailTemplate.subject,
          text: emailTemplate.text,
          html: emailTemplate.html,
        },
        tags: { type: 'password-changed' },
      })

      // 監査ログ記録
      await authAuditRepository.log({
        userId: user.data.id,
        eventType: 'password_reset_completed',
        ipAddress,
        userAgent,
        success: true,
      })

      res.json({
        message: 'Password has been reset successfully',
      })
    } catch (error) {
      next(error)
    }
  })

  /**
   * GET /auth/reset-password/validate - パスワードリセットトークンの検証
   */
  router.get('/reset-password/validate', async (req, res, next) => {
    try {
      const schema = z.object({
        token: z.string(),
      })

      const parseResult = schema.safeParse(req.query)
      if (!parseResult.success) {
        return res.status(400).json(formatValidationErrors(parseResult.error))
      }

      const { token } = parseResult.data

      // トークンの検証
      const tokenResult = await passwordResetTokenRepository.findByToken(token)
      if (tokenResult.type === 'err' || !tokenResult.value) {
        return res.status(400).json({
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired password reset token',
        })
      }

      res.json({
        valid: true,
        expiresAt: tokenResult.value.expiresAt,
      })
    } catch (error) {
      next(error)
    }
  })

  return router
}
