// Generated from TypeSpec/OpenAPI
// DO NOT EDIT MANUALLY
// Last generated: 2025-09-18T21:33:00.000Z

// Main API types and utilities from the latest generated version
export * from './generated/api-types'

// Zod validation schemas and database enum mappings
export * from './generated/schemas'

// Re-export commonly used types for convenience
export type {
  // API types
  components,
  paths,
  operations,
} from './generated/api-types'

// Legacy compatibility exports (uppercase)
export type {
  components as Components,
  operations as Operations,
  paths as Paths,
} from './generated/api-types'

// Export schemas type
export type { components as Schemas } from './generated/api-types'

// Export branded ID types
export type {
  Brand,
  UserId,
  SessionId,
  SalonId,
  StaffId,
  ServiceId,
  CustomerId,
  ReservationId,
  BookingId,
  ReviewId,
  CategoryId,
  InventoryId,
  OrderId,
  PaymentId,
  TreatmentRecordId,
  MedicalChartId,
  AttachmentId,
  RoleId,
  PermissionId,
  PointTransactionId,
  MembershipLevelId,
  RefundId,
} from './generated/api-types'

// Export brand bridge utilities and type guards
export * from './brand-bridge'
