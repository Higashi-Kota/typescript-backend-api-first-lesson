// Database connection
export { getDb } from './database/index'

// Repository implementations
export { DrizzleCustomerRepository } from './repositories/customer.repository.impl'
export { DrizzleSalonRepository } from './repositories/salon.repository.impl'
export { DrizzleReservationRepository } from './repositories/reservation.repository.impl'
export { DrizzleReviewRepository } from './repositories/review.repository.impl'
export { DrizzleServiceRepository } from './repositories/service.repository.impl'
export { DrizzleUserRepository } from './repositories/user.repository'
export { DrizzleSessionRepository } from './repositories/session.repository'
export { AttachmentRepositoryImpl } from './repositories/attachment.repository.impl'

// Auth repositories
export { DrizzlePasswordResetTokenRepository } from './repositories/password-reset.repository'
export type { PasswordResetTokenRepository } from './repositories/password-reset.repository'
export { DrizzleEmailVerificationTokenRepository } from './repositories/email-verification.repository'
export type { EmailVerificationTokenRepository } from './repositories/email-verification.repository'
export { DrizzleAuthAuditRepository } from './repositories/auth-audit.repository'
export type {
  AuthAuditRepository,
  AuthEventType,
  AuditLogEntry,
} from './repositories/auth-audit.repository'
export { DrizzleFailedLoginRepository } from './repositories/failed-login.repository'
export type { FailedLoginRepository } from './repositories/failed-login.repository'

// Services
export { initializeEncryptionService } from './services/encryption.service'
export { getEmailService } from './services/email/index'
export {
  createStorageService,
  createStorageServiceWithDefaults,
} from './services/storage/index'

// Email templates
export * from './services/email/templates'

// Database schema types
export type {
  PasswordResetToken,
  EmailVerificationToken,
  UserSession,
  User2FASecret,
  FailedLoginAttempt,
  AuthAuditLog,
  TrustedIpAddress,
} from './database/schema'
