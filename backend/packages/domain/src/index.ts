/**
 * @beauty-salon-backend/domain パッケージのエクスポート
 */

// Result型
export {
  type Result,
  type Ok,
  type Err,
  ok,
  err,
  isOk,
  isErr,
  map,
  mapErr,
  chain,
  flatMap,
  chainAsync,
  unwrap,
  unwrapOr,
  match,
  fromNullable,
  fromPromise,
  combine,
  pipe,
  type ResultAsync,
  tryCatch,
  tryCatchAsync,
} from './shared/result.js'

// Brand型
export {
  type Brand,
  type BrandError,
  isValidUuid,
  createBrand,
  createBrandSafe,
} from './shared/brand.js'

// Customer ドメインモデル
export {
  type ContactInfo,
  type CustomerData,
  type MembershipLevel,
  type Customer,
  type CreateCustomerInput,
  type UpdateCustomerInput,
  type CustomerError,
  type CustomerId,
  createCustomerId,
  createCustomerIdSafe,
  validateEmail,
  validatePhoneNumber,
  validateName,
  createCustomer,
  updateCustomer,
  suspendCustomer,
  reactivateCustomer,
  deleteCustomer,
  addLoyaltyPoints,
  calculateMembershipLevel,
  canMakeReservation,
  getCustomerDisplayName,
} from './models/customer.js'

// エラー型
export type { RepositoryError } from './shared/errors.js'

// ページネーション型
export type { PaginationParams, PaginatedResult } from './shared/pagination.js'

// Repository インターフェース
export type {
  CustomerSearchCriteria,
  CustomerRepository,
} from './repositories/customer.repository.js'

// Salon ドメインモデル
export {
  type Address,
  type ContactInfo as SalonContactInfo,
  type DayOfWeek,
  type OpeningHours,
  type AuditInfo,
  type SalonData,
  type Salon,
  type CreateSalonRequest,
  type UpdateSalonRequest,
  type SalonSearchCriteria,
  type SalonError,
  type SalonId,
  createSalonId,
  createSalonIdSafe,
  validateSalonName,
  validateEmail as validateSalonEmail,
  validatePhoneNumber as validateSalonPhoneNumber,
  validateOpeningHours,
  isActiveSalon,
  isSuspendedSalon,
  isDeletedSalon,
} from './models/salon.js'

// Salon Repository インターフェース
export type { SalonRepository } from './repositories/salon.repository.js'

// Staff ドメインモデル
export {
  type StaffData,
  type Staff,
  type CreateStaffRequest,
  type UpdateStaffRequest,
  type StaffAvailability,
  type StaffSearchCriteria,
  type StaffError,
  type StaffId,
  createStaffId,
  createStaffIdSafe,
  validateStaffName,
  validateSpecialties,
  validateYearsOfExperience,
  validateAvailability,
  isActiveStaff,
  isInactiveStaff,
  isTerminatedStaff,
  canProvideService,
} from './models/staff.js'

// Staff Repository インターフェース
export type { StaffRepository } from './repositories/staff.repository.js'

// Service ドメインモデル
export {
  type ServiceCategory,
  type ServiceData,
  type Service,
  type CreateServiceRequest,
  type UpdateServiceRequest,
  type ServiceSearchCriteria,
  type ServiceCategoryData,
  type ServiceError,
  type ServiceId,
  type CategoryId,
  createServiceId,
  createServiceIdSafe,
  createCategoryId,
  createCategoryIdSafe,
  validateServiceName,
  validateServiceDescription,
  validateDuration,
  validatePrice,
  validateRequiredStaffLevel,
  isActiveService,
  isInactiveService,
  isDiscontinuedService,
  canBeBooked,
  calculateTotalPrice,
  calculateTotalDuration,
} from './models/service.js'

// Service Repository インターフェース
export type { ServiceRepository } from './repositories/service.repository.js'

// Reservation ドメインモデル
export {
  type ReservationStatus,
  type ReservationData,
  type Reservation,
  type CreateReservationRequest,
  type UpdateReservationRequest,
  type ReservationDetail,
  type AvailableSlot,
  type ReservationSearchCriteria,
  type ReservationError,
  type ReservationId,
  createReservationId,
  createReservationIdSafe,
  validateTimeRange,
  validateAmount,
  validateDepositAmount,
  isPendingReservation,
  isConfirmedReservation,
  isCancelledReservation,
  isCompletedReservation,
  isNoShowReservation,
  canBeCancelled,
  canBeModified,
  getReservationStatus,
  calculateRefundAmount,
} from './models/reservation.js'

// Reservation Repository インターフェース
export type { ReservationRepository } from './repositories/reservation.repository.js'

// Booking ドメインモデル
export {
  type BookingStatus,
  type PaymentStatus,
  type PaymentMethod,
  type BookingData,
  type Booking,
  type CreateBookingRequest,
  type UpdateBookingRequest,
  type BookingDetail,
  type BookingSearchCriteria,
  type BookingError,
  type BookingId,
  createBookingId,
  createBookingIdSafe,
  validateAmount as validateBookingAmount,
  validateFinalAmount,
  validateReservationIds,
  isDraftBooking,
  isConfirmedBooking,
  isCancelledBooking,
  isCompletedBooking,
  isNoShowBooking,
  canBeCancelled as canBookingBeCancelled,
  canBeCompleted,
  canBeUpdated,
  getBookingStatus,
  calculateRefundAmount as calculateBookingRefundAmount,
  isFullyPaid,
  hasReservations,
  sortByCreatedAt,
} from './models/booking.js'

// Booking Repository インターフェース
export type { BookingRepository } from './repositories/booking.repository.js'

// Review ドメインモデル
export {
  type ReviewStatus,
  type RatingCategory,
  type ReviewData,
  type Review,
  type CreateReviewRequest,
  type UpdateReviewRequest,
  type ReviewDetail,
  type ReviewSearchCriteria,
  type ReviewSummary,
  type ReviewError,
  type ReviewId,
  createReviewId,
  createReviewIdSafe,
  validateRating,
  validateComment,
  validateImages,
  isDraftReview,
  isPublishedReview,
  isHiddenReview,
  isDeletedReview,
  canBePublished,
  canBeEdited,
  canBeHidden,
  canBeDeleted,
  getReviewStatus,
  isVisible,
  calculateAverageRating,
  hasAllRatings,
  sortByMostRecent,
  sortByMostHelpful,
  sortByRating,
} from './models/review.js'

// Review Repository インターフェース
export type { ReviewRepository } from './repositories/review.repository.js'

// User ドメインモデル
export {
  type UserId,
  type SessionId,
  type UserRole,
  type UserAccountStatus,
  type TwoFactorStatus,
  type PasswordResetStatus,
  type UserData,
  type User,
  type Session,
  type UserError,
  createUserId,
  createUserIdSafe,
  createSessionId,
  createSessionIdSafe,
  validatePassword,
  validateEmail as validateUserEmail,
  isPasswordReused,
  isAccountLocked,
  isEmailVerified,
  isTwoFactorEnabled,
  getAccountLockDuration,
  getPasswordResetTokenExpiry,
  getEmailVerificationTokenExpiry,
  generateBackupCodes,
} from './models/user.js'

// User Repository インターフェース
export type {
  UserRepositoryError,
  SessionRepositoryError,
  UserSearchCriteria,
  UserRepository,
  SessionRepository,
} from './repositories/user.repository.js'

// Service exports
export * from './services/index.js'

// Branded types exports
export {
  AttachmentId,
  ShareLinkId,
  ShareToken,
} from './shared/branded-types.js'

// Attachment Repository インターフェース
export type {
  AttachmentStatus,
  AttachmentData,
  CreateAttachmentInput,
  UpdateAttachmentInput,
  ShareLinkData,
  CreateShareLinkInput,
  DownloadLogData,
  CreateDownloadLogInput,
  AttachmentSearchCriteria,
  AttachmentRepository,
} from './repositories/attachment.repository.js'
