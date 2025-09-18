/**
 * Domain Package Exports
 * Clean architecture domain layer with generated types from specs
 */

// ============================================================================
// Shared Types and Utilities
// ============================================================================

// Result type for error handling
export * from './shared/result'

// Brand types for type-safe IDs
export * from './shared/brand'

// Pagination
export * from './shared/pagination'

// Errors
export * from './shared/errors'

// ============================================================================
// Domain Models (from generated specs)
// ============================================================================

// Core domain models and functions
export * from './models/attachment'
export * from './models/booking'
export * from './models/customer'
export * from './models/reservation'
export * from './models/review'
export * from './models/salon'
export * from './models/service'
export * from './models/staff'
export * from './models/user'

// ============================================================================
// Repositories (Interfaces)
// ============================================================================

export * from './repositories/attachment.repository'
export * from './repositories/booking.repository'
export * from './repositories/customer.repository'
export * from './repositories/reservation.repository'
export * from './repositories/review.repository'
export * from './repositories/salon.repository'
export * from './repositories/service.repository'
export * from './repositories/staff.repository'
export * from './repositories/user.repository'

// ============================================================================
// Services (Interfaces)
// ============================================================================

export * from './services'

// ============================================================================
// Mappers (Data transformation)
// ============================================================================

export * from './mappers'

// ============================================================================
// Business Logic (Use Cases)
// ============================================================================

export * from './business-logic'
