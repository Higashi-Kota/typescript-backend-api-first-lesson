import type {
  EmailSendResult,
  EmailService,
  EmailServiceError,
  EmailTemplateService,
  Result,
  SendEmailInput,
} from '@beauty-salon-backend/domain'
import { ok } from '@beauty-salon-backend/domain'
import { emailConfig } from '../../config/index.js'
import { DefaultEmailTemplateService } from './email-template.service.js'
import { createEmailServiceWithFallback } from './email.factory.js'

/**
 * Email service wrapper that provides non-blocking email sending
 * and handles failures gracefully
 */
export class EmailWrapperService implements EmailService {
  private readonly emailService: EmailService
  private readonly templateService: EmailTemplateService

  constructor(
    emailService?: EmailService,
    templateService?: EmailTemplateService
  ) {
    this.emailService = emailService || createEmailServiceWithFallback()
    this.templateService = templateService || new DefaultEmailTemplateService()
  }

  /**
   * Send email with non-blocking error handling
   * Logs errors but doesn't fail the main operation
   */
  async sendNonBlocking(input: SendEmailInput): Promise<void> {
    try {
      // Add default from address if not provided
      const emailInput: SendEmailInput = {
        ...input,
        from: input.from || emailConfig.from,
      }

      const result = await this.emailService.send(emailInput)

      if (result.type === 'err') {
        console.error('Failed to send email:', {
          error: result.error,
          to: input.to,
          subject: input.content.subject,
        })
      } else {
        console.log('Email sent successfully:', {
          messageId: result.value.messageId,
          provider: result.value.provider,
          to: input.to,
          subject: input.content.subject,
        })
      }
    } catch (error) {
      // Catch any unexpected errors
      console.error('Unexpected error while sending email:', error)
    }
  }

  /**
   * Send email with result handling
   * Returns the result for cases where error handling is needed
   */
  async send(
    input: SendEmailInput
  ): Promise<Result<EmailSendResult, EmailServiceError>> {
    // Add default from address if not provided
    const emailInput: SendEmailInput = {
      ...input,
      from: input.from || emailConfig.from,
    }

    // In development mode, just log
    if (emailConfig.developmentMode) {
      console.log('📧 Email Development Mode - Would send:', {
        to: input.to,
        subject: input.content.subject,
        provider: this.emailService.getProvider(),
      })

      return ok({
        messageId: `dev-mode-${Date.now()}`,
        provider: 'development-mode',
        timestamp: new Date(),
      })
    }

    return this.emailService.send(emailInput)
  }

  getProvider(): string {
    return this.emailService.getProvider()
  }

  async isHealthy(): Promise<boolean> {
    return this.emailService.isHealthy()
  }

  // Template service proxy methods
  getTemplateService(): EmailTemplateService {
    return this.templateService
  }
}

// Singleton instance
let emailServiceInstance: EmailWrapperService | null = null

export const getEmailService = (): EmailWrapperService => {
  if (!emailServiceInstance) {
    emailServiceInstance = new EmailWrapperService()
  }
  return emailServiceInstance
}
