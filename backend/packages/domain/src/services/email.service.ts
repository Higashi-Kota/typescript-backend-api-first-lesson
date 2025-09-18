import type { Result } from '../shared/result'

export type EmailAddress = {
  email: string
  name?: string
}

export type EmailContent = {
  subject: string
  text: string
  html?: string
}

export type EmailAttachment = {
  filename: string
  content: Buffer | string
  contentType?: string
}

export type SendEmailInput = {
  to: EmailAddress | EmailAddress[]
  from?: EmailAddress
  replyTo?: EmailAddress
  cc?: EmailAddress[]
  bcc?: EmailAddress[]
  content: EmailContent
  attachments?: EmailAttachment[]
  tags?: Record<string, string>
  metadata?: Record<string, unknown>
}

export type EmailServiceError =
  | { type: 'validationError'; field: string; message: string }
  | { type: 'providerError'; provider: string; message: string; code?: string }
  | { type: 'configurationError'; message: string }
  | { type: 'networkError'; message: string }
  | { type: 'rateLimitError'; retryAfter?: number }

export type EmailSendResult = {
  messageId: string
  provider: string
  timestamp: Date
}

export interface EmailService {
  send(
    input: SendEmailInput
  ): Promise<Result<EmailSendResult, EmailServiceError>>

  // Provider information
  getProvider(): string
  isHealthy(): Promise<boolean>
}

// Email templates
export type WelcomeEmailData = {
  userName: string
  verificationUrl?: string
}

export type PasswordResetEmailData = {
  userName: string
  resetUrl: string
  expiresIn: string
}

export type SecurityNotificationEmailData = {
  userName: string
  action: string
  ipAddress: string
  userAgent: string
  timestamp: Date
}

export type ReservationConfirmationEmailData = {
  customerName: string
  salonName: string
  serviceName: string
  staffName: string
  startTime: Date
  endTime: Date
  price: number
  reservationUrl: string
}

export type ReservationCancellationEmailData = {
  customerName: string
  salonName: string
  serviceName: string
  staffName: string
  originalStartTime: Date
  cancellationReason?: string
}

export type AccountLockedEmailData = {
  userName: string
  reason: string
  unlockUrl?: string
}

export type TwoFactorEnabledEmailData = {
  userName: string
  backupCodes: string[]
}

export interface EmailTemplateService {
  renderWelcomeEmail(data: WelcomeEmailData): EmailContent
  renderPasswordResetEmail(data: PasswordResetEmailData): EmailContent
  renderSecurityNotificationEmail(
    data: SecurityNotificationEmailData
  ): EmailContent
  renderReservationConfirmationEmail(
    data: ReservationConfirmationEmailData
  ): EmailContent
  renderReservationCancellationEmail(
    data: ReservationCancellationEmailData
  ): EmailContent
  renderAccountLockedEmail(data: AccountLockedEmailData): EmailContent
  renderTwoFactorEnabledEmail(data: TwoFactorEnabledEmailData): EmailContent
}
