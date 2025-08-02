import { randomUUID } from 'node:crypto'
import type {
  EmailSendResult,
  EmailService,
  EmailServiceError,
  Result,
  SendEmailInput,
} from '@beauty-salon-backend/domain'
import { err, ok } from '@beauty-salon-backend/domain'
import nodemailer, { type Transporter } from 'nodemailer'

export interface MailhogConfig {
  host: string
  port: number
}

export class MailhogEmailProvider implements EmailService {
  private readonly provider = 'mailhog'
  private transporter: Transporter

  constructor(private readonly config: MailhogConfig) {
    // Create SMTP transporter for MailHog
    this.transporter = nodemailer.createTransport({
      host: this.config.host,
      port: this.config.port,
      secure: false,
      tls: {
        rejectUnauthorized: false,
      },
    })
  }

  async send(
    input: SendEmailInput
  ): Promise<Result<EmailSendResult, EmailServiceError>> {
    try {
      const toAddresses = Array.isArray(input.to) ? input.to : [input.to]

      const mailOptions = {
        from: input.from
          ? `"${input.from.name ?? ''}" <${input.from.email}>`
          : undefined,
        to: toAddresses
          .map((addr) => `"${addr.name ?? ''}" <${addr.email}>`)
          .join(', '),
        cc: input.cc
          ?.map((addr) => `"${addr.name ?? ''}" <${addr.email}>`)
          .join(', '),
        bcc: input.bcc
          ?.map((addr) => `"${addr.name ?? ''}" <${addr.email}>`)
          .join(', '),
        replyTo: input.replyTo
          ? `"${input.replyTo.name ?? ''}" <${input.replyTo.email}>`
          : undefined,
        subject: input.content.subject,
        text: input.content.text,
        html: input.content.html,
        attachments: input.attachments?.map((att) => ({
          filename: att.filename,
          content: att.content,
          contentType: att.contentType,
        })),
        headers: {
          ...input.tags,
          'X-Email-Provider': this.provider,
        },
      }

      const info = await this.transporter.sendMail(mailOptions)

      const result: EmailSendResult = {
        messageId: info.messageId || `mailhog-${randomUUID()}`,
        provider: this.provider,
        timestamp: new Date(),
      }

      return ok(result)
    } catch (error) {
      console.error('MailHog send error:', error)

      if (error instanceof Error) {
        if (error.message.includes('ECONNREFUSED')) {
          return err({
            type: 'networkError',
            message: `Cannot connect to MailHog at ${this.config.host}:${this.config.port}`,
          })
        }

        return err({
          type: 'providerError',
          provider: this.provider,
          message: error.message,
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
      await this.transporter.verify()
      return true
    } catch {
      return false
    }
  }
}
