// Export branded types from generated files
export {
  // Brand type utilities
  brand,
  type Brand,
  // ID types
  type BookingId,
  type CategoryId,
  type CustomerId,
  type ReservationId,
  type ReviewId,
  type SalonId,
  type ServiceId,
  type StaffId,
  // ID creators
  createBookingId,
  createCategoryId,
  createCustomerId,
  createReservationId,
  createReviewId,
  createSalonId,
  createServiceId,
  createStaffId,
} from './generated/brand-types'

// Export API types
export * from './api'
