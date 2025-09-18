/**
 * Email Adapter Service
 * Creates the appropriate email service based on environment
 */

import {
  type EmailService,
  getEmailService,
} from '@beauty-salon-backend/infrastructure'

export function createProductionEmailService(): EmailService {
  // Get email service from infrastructure with environment-based configuration
  return getEmailService({
    provider: process.env.EMAIL_PROVIDER ?? 'console',
    from: process.env.EMAIL_FROM ?? 'noreply@beauty-salon.com',
    config: {
      // Provider-specific configuration from environment variables
      apiKey: process.env.EMAIL_API_KEY,
      domain: process.env.EMAIL_DOMAIN,
      region: process.env.EMAIL_REGION,
      // Add other provider-specific config as needed
    },
  })
}
