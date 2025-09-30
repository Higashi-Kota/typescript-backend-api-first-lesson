import type { ISalonRepository } from '../../../repositories/salon.repository'

/**
 * Dependencies required for salon use cases.
 * This interface defines all repositories and services needed by salon-related use cases.
 *
 * Using object-based dependency injection provides:
 * - Explicit declaration of all dependencies
 * - No concern about argument order when instantiating use cases
 * - Easy addition of new dependencies without breaking existing code
 * - Better testability with partial mocks
 */
export interface SalonUseCaseDependencies {
  salonRepository: ISalonRepository
  // Future dependencies can be added here:
  // userRepository?: IUserRepository
  // bookingRepository?: IBookingRepository
  // notificationService?: INotificationService
  // emailService?: IEmailService
}

/**
 * Type guard to validate that all required dependencies are provided
 */
export function validateDependencies(
  deps: Partial<SalonUseCaseDependencies>,
): deps is SalonUseCaseDependencies {
  return deps.salonRepository != null
}
