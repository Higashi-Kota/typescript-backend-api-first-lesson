// Database connection
export { getDb } from './database/index'

// Repository implementations
export { DrizzleCustomerRepository } from './repositories/customer.repository.impl'
export { DrizzleSalonRepository } from './repositories/salon.repository.impl'
export { DrizzleReservationRepository } from './repositories/reservation.repository.impl'
export { DrizzleReviewRepository } from './repositories/review.repository.impl'
export { DrizzleUserRepository } from './repositories/user.repository'
export { DrizzleSessionRepository } from './repositories/session.repository'
export { AttachmentRepositoryImpl } from './repositories/attachment.repository.impl'

// Services
export { initializeEncryptionService } from './services/encryption.service'
export { getEmailService } from './services/email/index'
export {
  createStorageService,
  createStorageServiceWithDefaults,
} from './services/storage/index'
