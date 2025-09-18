import type { EmailService } from '@beauty-salon-backend/domain'
import { emailConfig } from '../../config/index'
import { DevelopmentEmailProvider } from './providers/development.provider'
import { MailgunEmailProvider } from './providers/mailgun.provider'
import { MailhogEmailProvider } from './providers/mailhog.provider'

export type EmailProvider = 'development' | 'mailhog' | 'mailgun'

export function createEmailService(provider?: EmailProvider): EmailService {
  const selectedProvider = provider ?? emailConfig.provider

  switch (selectedProvider) {
    case 'development':
      return new DevelopmentEmailProvider()

    case 'mailhog':
      if (!(emailConfig.mailhog.host && emailConfig.mailhog.port)) {
        throw new Error('MailHog configuration is missing')
      }
      return new MailhogEmailProvider({
        host: emailConfig.mailhog.host,
        port: emailConfig.mailhog.port,
      })

    case 'mailgun':
      if (!(emailConfig.mailgun.apiKey && emailConfig.mailgun.domain)) {
        throw new Error('Mailgun configuration is missing')
      }
      return new MailgunEmailProvider({
        apiKey: emailConfig.mailgun.apiKey,
        domain: emailConfig.mailgun.domain,
      })

    default:
      throw new Error(`Unknown email provider: ${selectedProvider}`)
  }
}

export function createEmailServiceWithFallback(): EmailService {
  try {
    return createEmailService()
  } catch (error) {
    console.warn(
      'Failed to create configured email provider, falling back to development:',
      error
    )
    return new DevelopmentEmailProvider()
  }
}
