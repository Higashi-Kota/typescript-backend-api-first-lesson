import { randomUUID } from 'node:crypto'
import type {
  EmailSendResult,
  EmailService,
  EmailServiceError,
  Result,
  SendEmailInput,
} from '@beauty-salon-backend/domain'
import { ok } from '@beauty-salon-backend/domain'

export class DevelopmentEmailProvider implements EmailService {
  private readonly provider = 'development'

  async send(
    input: SendEmailInput
  ): Promise<Result<EmailSendResult, EmailServiceError>> {
    // Development mode: just log the email
    console.log('='.repeat(80))
    console.log('📧 Development Email Provider - Email Details:')
    console.log('='.repeat(80))

    const toAddresses = Array.isArray(input.to) ? input.to : [input.to]
    console.log(
      'To:',
      toAddresses.map((addr) => `${addr.name || ''} <${addr.email}>`).join(', ')
    )

    if (input.from) {
      console.log('From:', `${input.from.name || ''} <${input.from.email}>`)
    }

    if (input.cc && input.cc.length > 0) {
      console.log(
        'CC:',
        input.cc.map((addr) => `${addr.name || ''} <${addr.email}>`).join(', ')
      )
    }

    if (input.bcc && input.bcc.length > 0) {
      console.log(
        'BCC:',
        input.bcc.map((addr) => `${addr.name || ''} <${addr.email}>`).join(', ')
      )
    }

    if (input.replyTo) {
      console.log(
        'Reply-To:',
        `${input.replyTo.name || ''} <${input.replyTo.email}>`
      )
    }

    console.log('Subject:', input.content.subject)
    console.log('-'.repeat(80))
    console.log('Text Content:')
    console.log(input.content.text)

    if (input.content.html) {
      console.log('-'.repeat(80))
      console.log('HTML Content Preview:')
      // Strip HTML tags for console preview
      const textPreview = input.content.html
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]*>/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 500)
      console.log(textPreview + (textPreview.length >= 500 ? '...' : ''))
    }

    if (input.attachments && input.attachments.length > 0) {
      console.log('-'.repeat(80))
      console.log('Attachments:')
      input.attachments.forEach((att, idx) => {
        console.log(
          `  ${idx + 1}. ${att.filename} (${att.contentType || 'application/octet-stream'})`
        )
      })
    }

    if (input.tags && Object.keys(input.tags).length > 0) {
      console.log('-'.repeat(80))
      console.log('Tags:', JSON.stringify(input.tags, null, 2))
    }

    if (input.metadata && Object.keys(input.metadata).length > 0) {
      console.log('-'.repeat(80))
      console.log('Metadata:', JSON.stringify(input.metadata, null, 2))
    }

    console.log('='.repeat(80))

    // Return success with mock message ID
    const result: EmailSendResult = {
      messageId: `dev-${randomUUID()}`,
      provider: this.provider,
      timestamp: new Date(),
    }

    return ok(result)
  }

  getProvider(): string {
    return this.provider
  }

  async isHealthy(): Promise<boolean> {
    return true
  }
}
