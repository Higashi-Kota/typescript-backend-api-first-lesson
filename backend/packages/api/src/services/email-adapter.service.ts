/**
 * Email Service Adapter
 * 新しいメールサービス実装と既存のインターフェースを統合
 * CLAUDEガイドラインに準拠
 */

import type { Result } from '@beauty-salon-backend/domain'
import { err, ok } from '@beauty-salon-backend/domain'
import type { EmailTemplateService } from '@beauty-salon-backend/domain'
import { getEmailService } from '@beauty-salon-backend/infrastructure'
import type {
  AccountLockedEmailData,
  EmailService,
  EmailServiceError,
  EmailVerificationData,
  LoginAlertEmailData,
  PasswordChangedEmailData,
  PasswordResetEmailData,
  TwoFactorEnabledEmailData,
} from './email.service.js'

export class EmailServiceAdapter implements EmailService {
  private readonly templateService: EmailTemplateService

  constructor() {
    const wrapperService = getEmailService()
    this.templateService = wrapperService.getTemplateService()
  }

  async sendPasswordResetEmail(
    data: PasswordResetEmailData
  ): Promise<Result<void, EmailServiceError>> {
    try {
      // テンプレートでメール内容を生成
      const emailContent = this.templateService.renderPasswordResetEmail({
        userName: data.recipientName,
        resetUrl: data.resetUrl,
        expiresIn: '15分',
      })

      // 非ブロッキングでメール送信
      await getEmailService().sendNonBlocking({
        to: {
          email: data.recipientEmail,
          name: data.recipientName,
        },
        content: emailContent,
        tags: {
          type: 'password-reset',
          token: data.resetToken,
        },
      })

      return ok(undefined)
    } catch (error) {
      console.error('Failed to send password reset email:', error)
      return err({
        type: 'emailServiceError',
        message: 'Failed to send password reset email',
      })
    }
  }

  async sendPasswordChangedEmail(
    data: PasswordChangedEmailData
  ): Promise<Result<void, EmailServiceError>> {
    try {
      // セキュリティ通知メールとして送信
      const emailContent = this.templateService.renderSecurityNotificationEmail(
        {
          userName: data.recipientName,
          action: 'パスワードが変更されました',
          ipAddress: 'N/A',
          userAgent: 'N/A',
          timestamp: new Date(),
        }
      )

      await getEmailService().sendNonBlocking({
        to: {
          email: data.recipientEmail,
          name: data.recipientName,
        },
        content: emailContent,
        tags: {
          type: 'password-changed',
        },
      })

      return ok(undefined)
    } catch (error) {
      console.error('Failed to send password changed email:', error)
      return err({
        type: 'emailServiceError',
        message: 'Failed to send password changed email',
      })
    }
  }

  async sendEmailVerification(
    data: EmailVerificationData
  ): Promise<Result<void, EmailServiceError>> {
    try {
      // ウェルカムメールとして送信
      const emailContent = this.templateService.renderWelcomeEmail({
        userName: data.recipientName,
        verificationUrl: data.verificationUrl,
      })

      await getEmailService().sendNonBlocking({
        to: {
          email: data.recipientEmail,
          name: data.recipientName,
        },
        content: emailContent,
        tags: {
          type: 'email-verification',
          token: data.verificationToken,
        },
      })

      return ok(undefined)
    } catch (error) {
      console.error('Failed to send email verification:', error)
      return err({
        type: 'emailServiceError',
        message: 'Failed to send email verification',
      })
    }
  }

  async sendAccountLockedEmail(
    data: AccountLockedEmailData
  ): Promise<Result<void, EmailServiceError>> {
    try {
      const emailContent = this.templateService.renderAccountLockedEmail({
        userName: data.recipientName,
        reason: data.lockReason,
        // アンロックURLは現在未実装
        unlockUrl: undefined,
      })

      await getEmailService().sendNonBlocking({
        to: {
          email: data.recipientEmail,
          name: data.recipientName,
        },
        content: emailContent,
        tags: {
          type: 'account-locked',
        },
        metadata: {
          unlockTime: data.unlockTime?.toISOString(),
        },
      })

      return ok(undefined)
    } catch (error) {
      console.error('Failed to send account locked email:', error)
      return err({
        type: 'emailServiceError',
        message: 'Failed to send account locked email',
      })
    }
  }

  async sendTwoFactorEnabledEmail(
    data: TwoFactorEnabledEmailData
  ): Promise<Result<void, EmailServiceError>> {
    try {
      // バックアップコードは別途生成される想定
      const emailContent = this.templateService.renderTwoFactorEnabledEmail({
        userName: data.recipientName,
        backupCodes: [], // バックアップコードは別メールで送信する方が安全
      })

      await getEmailService().sendNonBlocking({
        to: {
          email: data.recipientEmail,
          name: data.recipientName,
        },
        content: emailContent,
        tags: {
          type: '2fa-enabled',
        },
      })

      return ok(undefined)
    } catch (error) {
      console.error('Failed to send 2FA enabled email:', error)
      return err({
        type: 'emailServiceError',
        message: 'Failed to send 2FA enabled email',
      })
    }
  }

  async sendLoginAlertEmail(
    data: LoginAlertEmailData
  ): Promise<Result<void, EmailServiceError>> {
    try {
      const emailContent = this.templateService.renderSecurityNotificationEmail(
        {
          userName: data.recipientName,
          action: '新しいデバイスからのログイン',
          ipAddress: data.loginIp,
          userAgent: data.userAgent,
          timestamp: data.loginTime,
        }
      )

      await getEmailService().sendNonBlocking({
        to: {
          email: data.recipientEmail,
          name: data.recipientName,
        },
        content: emailContent,
        tags: {
          type: 'login-alert',
        },
        metadata: {
          loginIp: data.loginIp,
          userAgent: data.userAgent,
        },
      })

      return ok(undefined)
    } catch (error) {
      console.error('Failed to send login alert email:', error)
      return err({
        type: 'emailServiceError',
        message: 'Failed to send login alert email',
      })
    }
  }
}

// Factory function for backward compatibility
export const createProductionEmailService = (): EmailService => {
  return new EmailServiceAdapter()
}
