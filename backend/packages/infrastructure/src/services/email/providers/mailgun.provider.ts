import type {
  EmailSendResult,
  EmailService,
  EmailServiceError,
  Result,
  SendEmailInput,
} from '@beauty-salon-backend/domain'
import { err, ok } from '@beauty-salon-backend/domain'
import FormData from 'form-data'
import Mailgun from 'mailgun.js'
import type { IMailgunClient } from 'mailgun.js/Interfaces'

export interface MailgunConfig {
  apiKey: string
  domain: string
  region?: 'US' | 'EU'
  testMode?: boolean
}

export class MailgunEmailProvider implements EmailService {
  private readonly provider = 'mailgun'
  private client: IMailgunClient

  constructor(private readonly config: MailgunConfig) {
    const mailgun = new Mailgun(FormData)
    this.client = mailgun.client({
      username: 'api',
      key: this.config.apiKey,
      url:
        this.config.region === 'EU'
          ? 'https://api.eu.mailgun.net'
          : 'https://api.mailgun.net',
    })
  }

  async send(
    input: SendEmailInput
  ): Promise<Result<EmailSendResult, EmailServiceError>> {
    try {
      const toAddresses = Array.isArray(input.to) ? input.to : [input.to]

      interface MailgunMessageData {
        from?: string
        to: string[]
        subject: string
        text?: string
        html?: string
        cc?: string[]
        bcc?: string[]
        'h:Reply-To'?: string
        'o:tag'?: string[]
        'o:testmode'?: boolean
        attachment?: Array<{
          filename: string
          data: Buffer | string
          contentType?: string
        }>
        [key: `v:${string}`]: string
      }

      const messageData: MailgunMessageData = {
        from: input.from
          ? `${input.from.name ?? ''} <${input.from.email}>`.trim()
          : undefined,
        to: toAddresses.map((addr) =>
          addr.name ? `${addr.name} <${addr.email}>` : addr.email
        ),
        subject: input.content.subject,
        text: input.content.text,
        html: input.content.html,
      }

      if (input.cc && input.cc.length > 0) {
        messageData.cc = input.cc.map((addr) =>
          addr.name ? `${addr.name} <${addr.email}>` : addr.email
        )
      }

      if (input.bcc && input.bcc.length > 0) {
        messageData.bcc = input.bcc.map((addr) =>
          addr.name ? `${addr.name} <${addr.email}>` : addr.email
        )
      }

      if (input.replyTo) {
        messageData['h:Reply-To'] = input.replyTo.name
          ? `${input.replyTo.name} <${input.replyTo.email}>`
          : input.replyTo.email
      }

      // Add custom tags
      if (input.tags) {
        for (const [key, value] of Object.entries(input.tags)) {
          messageData['o:tag'] = messageData['o:tag'] ?? []
          messageData['o:tag'].push(`${key}:${value}`)
        }
      }

      // Add metadata as custom variables
      if (input.metadata) {
        for (const [key, value] of Object.entries(input.metadata)) {
          messageData[`v:${key}`] = JSON.stringify(value)
        }
      }

      // Enable test mode if configured
      if (this.config.testMode) {
        messageData['o:testmode'] = true
      }

      // Handle attachments
      if (input.attachments && input.attachments.length > 0) {
        messageData.attachment = input.attachments.map((att) => ({
          filename: att.filename,
          data: att.content,
          contentType: att.contentType,
        }))
      }

      const response = await this.client.messages.create(
        this.config.domain,
        messageData as Parameters<typeof this.client.messages.create>[1]
      )

      const result: EmailSendResult = {
        messageId: response.id || `mailgun-${Date.now()}`,
        provider: this.provider,
        timestamp: new Date(),
      }

      return ok(result)
    } catch (error) {
      console.error('Mailgun send error:', error)

      if (error instanceof Error) {
        // Handle specific Mailgun errors
        if (error.message.includes('401')) {
          return err({
            type: 'configurationError',
            message: 'Invalid Mailgun API key',
          })
        }

        if (error.message.includes('404')) {
          return err({
            type: 'configurationError',
            message: 'Invalid Mailgun domain',
          })
        }

        if (error.message.includes('429')) {
          return err({
            type: 'rateLimitError',
            retryAfter: 60, // Default to 1 minute
          })
        }

        if (
          error.message.includes('ECONNREFUSED') ||
          error.message.includes('ETIMEDOUT')
        ) {
          return err({
            type: 'networkError',
            message: 'Cannot connect to Mailgun API',
          })
        }

        return err({
          type: 'providerError',
          provider: this.provider,
          message: error.message,
          code: (error as { status?: number }).status?.toString(),
        })
      }

      return err({
        type: 'providerError',
        provider: this.provider,
        message: 'Unknown error occurred while sending email',
      })
    }
  }

  getProvider(): string {
    return this.provider
  }

  async isHealthy(): Promise<boolean> {
    try {
      // Validate domain exists
      await this.client.domains.get(this.config.domain)
      return true
    } catch {
      return false
    }
  }
}
