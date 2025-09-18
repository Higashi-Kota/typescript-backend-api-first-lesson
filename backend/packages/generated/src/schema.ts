/**
 * Schema definitions and database enum mappings
 * This file provides type-safe mappings between database enums and domain models
 */

import type * as db from '@beauty-salon-backend/database'
import { z } from 'zod'

// ============================================================================
// Database Enum Type Extractions
// ============================================================================

// Extract types from database enums
type DbAccountStatus = (typeof db.accountStatus.enumValues)[number]
type DbAllergyType = (typeof db.allergyType.enumValues)[number]
type DbBookingStatus = (typeof db.bookingStatus.enumValues)[number]
type DbDayOfWeek = (typeof db.dayOfWeek.enumValues)[number]
type DbInventoryTransactionType =
  (typeof db.inventoryTransactionType.enumValues)[number]
type DbMembershipTier = (typeof db.membershipTier.enumValues)[number]
type DbNotificationType = (typeof db.notificationType.enumValues)[number]
type DbPaymentMethod = (typeof db.paymentMethod.enumValues)[number]
type DbPaymentStatus = (typeof db.paymentStatus.enumValues)[number]
type DbPointTransactionType =
  (typeof db.pointTransactionType.enumValues)[number]
type DbServiceCategory = (typeof db.serviceCategory.enumValues)[number]
type DbStaffLevel = (typeof db.staffLevel.enumValues)[number]
type DbUserRole = (typeof db.userRole.enumValues)[number]

// ============================================================================
// Account Status
// ============================================================================

export const AccountStatusSchema = z.enum([
  'active',
  'inactive',
  'suspended',
  'deleted',
])
export type AccountStatus = z.infer<typeof AccountStatusSchema>

export const accountStatusMapping = {
  active: 'active',
  inactive: 'inactive',
  suspended: 'suspended',
  deleted: 'deleted',
} as const satisfies Record<AccountStatus, DbAccountStatus>

export const accountStatusReverseMapping = {
  active: 'active',
  inactive: 'inactive',
  suspended: 'suspended',
  deleted: 'deleted',
} as const satisfies Record<DbAccountStatus, AccountStatus>

// ============================================================================
// Allergy Type
// ============================================================================

export const AllergyTypeSchema = z.enum([
  'chemical',
  'fragrance',
  'metal',
  'latex',
  'plant',
  'other',
])
export type AllergyType = z.infer<typeof AllergyTypeSchema>

export const allergyTypeMapping = {
  chemical: 'chemical',
  fragrance: 'fragrance',
  metal: 'metal',
  latex: 'latex',
  plant: 'plant',
  other: 'other',
} as const satisfies Record<AllergyType, DbAllergyType>

export const allergyTypeReverseMapping = {
  chemical: 'chemical',
  fragrance: 'fragrance',
  metal: 'metal',
  latex: 'latex',
  plant: 'plant',
  other: 'other',
} as const satisfies Record<DbAllergyType, AllergyType>

// ============================================================================
// Booking Status
// ============================================================================

export const BookingStatusSchema = z.enum([
  'draft',
  'pending',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
  'no_show',
])
export type BookingStatus = z.infer<typeof BookingStatusSchema>

// Mapping from domain to database (note: draft doesn't exist in DB)
export const bookingStatusToDb = (
  status: BookingStatus
): DbBookingStatus | null => {
  const mapping: Record<BookingStatus, DbBookingStatus | null> = {
    draft: null, // No DB equivalent
    pending: 'pending',
    confirmed: 'confirmed',
    in_progress: 'in_progress',
    completed: 'completed',
    cancelled: 'cancelled',
    no_show: 'no_show',
  }
  return mapping[status]
}

// Mapping from database to domain
export const bookingStatusFromDb = (status: DbBookingStatus): BookingStatus => {
  const mapping: Record<DbBookingStatus, BookingStatus> = {
    draft: 'draft',
    pending: 'pending',
    confirmed: 'confirmed',
    in_progress: 'in_progress',
    completed: 'completed',
    cancelled: 'cancelled',
    no_show: 'no_show',
  }
  return mapping[status]
}

// ============================================================================
// Customer Gender
// ============================================================================

export const CustomerGenderSchema = z.enum([
  'male',
  'female',
  'other',
  'prefer_not_to_say',
])
export type CustomerGender = z.infer<typeof CustomerGenderSchema>

// ============================================================================
// Day of Week
// ============================================================================

export const DayOfWeekSchema = z.enum([
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
])
export type DayOfWeek = z.infer<typeof DayOfWeekSchema>

export const dayOfWeekMapping = {
  monday: 'monday',
  tuesday: 'tuesday',
  wednesday: 'wednesday',
  thursday: 'thursday',
  friday: 'friday',
  saturday: 'saturday',
  sunday: 'sunday',
} as const satisfies Record<DayOfWeek, DbDayOfWeek>

export const dayOfWeekReverseMapping = {
  monday: 'monday',
  tuesday: 'tuesday',
  wednesday: 'wednesday',
  thursday: 'thursday',
  friday: 'friday',
  saturday: 'saturday',
  sunday: 'sunday',
} as const satisfies Record<DbDayOfWeek, DayOfWeek>

// ============================================================================
// File Type
// ============================================================================

export const FileTypeSchema = z.enum(['image', 'document', 'other'])
export type FileType = z.infer<typeof FileTypeSchema>

// ============================================================================
// Inventory Status
// ============================================================================

export const InventoryStatusSchema = z.enum([
  'in_stock',
  'low_stock',
  'out_of_stock',
  'ordered',
  'discontinued',
])
export type InventoryStatus = z.infer<typeof InventoryStatusSchema>

// ============================================================================
// Inventory Transaction Type
// ============================================================================

export const InventoryTransactionTypeSchema = z.enum([
  'purchase',
  'sale',
  'use',
  'adjustment',
  'return',
  'disposal',
  'transfer',
])
export type InventoryTransactionType = z.infer<
  typeof InventoryTransactionTypeSchema
>

export const inventoryTransactionTypeMapping = {
  purchase: 'in',
  sale: 'out',
  use: 'out',
  adjustment: 'adjustment',
  return: 'in',
  disposal: 'out',
  transfer: 'transfer',
} as const satisfies Record<
  InventoryTransactionType,
  DbInventoryTransactionType
>

export const inventoryTransactionTypeReverseMapping = {
  in: 'purchase',
  out: 'sale',
  adjustment: 'adjustment',
  transfer: 'transfer',
} as const satisfies Record<
  DbInventoryTransactionType,
  InventoryTransactionType
>

// ============================================================================
// Membership Level/Tier
// ============================================================================

export const MembershipLevelSchema = z.enum([
  'bronze',
  'silver',
  'gold',
  'platinum',
  'diamond',
])
export type MembershipLevel = z.infer<typeof MembershipLevelSchema>

// Map domain membership levels to database tiers
export const membershipLevelToDb = (
  level: MembershipLevel
): DbMembershipTier => {
  const mapping: Record<MembershipLevel, DbMembershipTier> = {
    bronze: 'regular',
    silver: 'silver',
    gold: 'gold',
    platinum: 'platinum',
    diamond: 'vip',
  }
  return mapping[level]
}

// Map database tiers to domain membership levels
export const membershipLevelFromDb = (
  tier: DbMembershipTier
): MembershipLevel => {
  const mapping: Record<DbMembershipTier, MembershipLevel> = {
    regular: 'bronze',
    silver: 'silver',
    gold: 'gold',
    platinum: 'platinum',
    vip: 'diamond',
  }
  return mapping[tier]
}

// ============================================================================
// Notification Type
// ============================================================================

export const NotificationTypeSchema = z.enum([
  'booking_reminder',
  'booking_confirmation',
  'booking_change',
  'promotion',
  'birthday',
  'points_expiry',
  'review_request',
])
export type NotificationType = z.infer<typeof NotificationTypeSchema>

export const notificationTypeMapping = {
  booking_reminder: 'booking_reminder',
  booking_confirmation: 'booking_confirmation',
  booking_change: 'booking_change',
  promotion: 'promotion',
  birthday: 'birthday',
  points_expiry: 'points_expiry',
  review_request: 'review_request',
} as const satisfies Record<NotificationType, DbNotificationType>

export const notificationTypeReverseMapping = {
  booking_reminder: 'booking_reminder',
  booking_confirmation: 'booking_confirmation',
  booking_change: 'booking_change',
  promotion: 'promotion',
  birthday: 'birthday',
  points_expiry: 'points_expiry',
  review_request: 'review_request',
} as const satisfies Record<DbNotificationType, NotificationType>

// ============================================================================
// Payment Method
// ============================================================================

export const PaymentMethodSchema = z.enum([
  'cash',
  'credit_card',
  'debit_card',
  'e_money',
  'qr_payment',
  'bank_transfer',
  'point',
])
export type PaymentMethod = z.infer<typeof PaymentMethodSchema>

export const paymentMethodMapping = {
  cash: 'cash',
  credit_card: 'credit_card',
  debit_card: 'debit_card',
  e_money: 'e_money',
  qr_payment: 'qr_payment',
  bank_transfer: 'bank_transfer',
  point: 'point',
} as const satisfies Record<PaymentMethod, DbPaymentMethod>

export const paymentMethodReverseMapping = {
  cash: 'cash',
  credit_card: 'credit_card',
  debit_card: 'debit_card',
  e_money: 'e_money',
  qr_payment: 'qr_payment',
  bank_transfer: 'bank_transfer',
  point: 'point',
} as const satisfies Record<DbPaymentMethod, PaymentMethod>

// ============================================================================
// Payment Status
// ============================================================================

export const PaymentStatusSchema = z.enum([
  'pending',
  'processing',
  'completed',
  'failed',
  'refunded',
  'partial_refund',
])
export type PaymentStatus = z.infer<typeof PaymentStatusSchema>

export const paymentStatusMapping = {
  pending: 'pending',
  processing: 'processing',
  completed: 'completed',
  failed: 'failed',
  refunded: 'refunded',
  partial_refund: 'partial_refund',
} as const satisfies Record<PaymentStatus, DbPaymentStatus>

export const paymentStatusReverseMapping = {
  pending: 'pending',
  processing: 'processing',
  completed: 'completed',
  failed: 'failed',
  refunded: 'refunded',
  partial_refund: 'partial_refund',
} as const satisfies Record<DbPaymentStatus, PaymentStatus>

// ============================================================================
// Point Transaction Type
// ============================================================================

export const PointTransactionTypeSchema = z.enum([
  'earned',
  'used',
  'expired',
  'adjusted',
  'transferred',
])
export type PointTransactionType = z.infer<typeof PointTransactionTypeSchema>

export const pointTransactionTypeMapping = {
  earned: 'earned',
  used: 'used',
  expired: 'expired',
  adjusted: 'adjusted',
  transferred: 'transferred',
} as const satisfies Record<PointTransactionType, DbPointTransactionType>

export const pointTransactionTypeReverseMapping = {
  earned: 'earned',
  used: 'used',
  expired: 'expired',
  adjusted: 'adjusted',
  transferred: 'transferred',
} as const satisfies Record<DbPointTransactionType, PointTransactionType>

// ============================================================================
// Reservation Status
// ============================================================================

export const ReservationStatusSchema = z.enum([
  'pending',
  'confirmed',
  'cancelled',
  'completed',
  'no_show',
])
export type ReservationStatus = z.infer<typeof ReservationStatusSchema>

// ============================================================================
// Service Category
// ============================================================================

export const ServiceCategorySchema = z.enum([
  'cut',
  'color',
  'perm',
  'treatment',
  'spa',
  'styling',
  'extension',
  'other',
])
export type ServiceCategory = z.infer<typeof ServiceCategorySchema>

export const serviceCategoryMapping = {
  cut: 'cut',
  color: 'color',
  perm: 'perm',
  treatment: 'treatment',
  spa: 'spa',
  styling: 'styling',
  extension: 'extension',
  other: 'other',
} as const satisfies Record<ServiceCategory, DbServiceCategory>

export const serviceCategoryReverseMapping = {
  cut: 'cut',
  color: 'color',
  perm: 'perm',
  treatment: 'treatment',
  spa: 'spa',
  styling: 'styling',
  extension: 'extension',
  other: 'other',
} as const satisfies Record<DbServiceCategory, ServiceCategory>

// ============================================================================
// Staff Level
// ============================================================================

export const StaffLevelSchema = z.enum([
  'junior',
  'stylist',
  'senior',
  'expert',
  'director',
])
export type StaffLevel = z.infer<typeof StaffLevelSchema>

export const staffLevelMapping = {
  junior: 'junior',
  stylist: 'stylist',
  senior: 'senior',
  expert: 'expert',
  director: 'director',
} as const satisfies Record<StaffLevel, DbStaffLevel>

export const staffLevelReverseMapping = {
  junior: 'junior',
  stylist: 'stylist',
  senior: 'senior',
  expert: 'expert',
  director: 'director',
} as const satisfies Record<DbStaffLevel, StaffLevel>

// ============================================================================
// User Account Status
// ============================================================================

export const UserAccountStatusSchema = z.enum([
  'active',
  'inactive',
  'suspended',
  'deleted',
])
export type UserAccountStatus = z.infer<typeof UserAccountStatusSchema>

// ============================================================================
// User Role (Auth)
// ============================================================================

export const AuthUserRoleSchema = z.enum(['customer', 'staff', 'admin'])
export type AuthUserRole = z.infer<typeof AuthUserRoleSchema>

// ============================================================================
// User Role (Database)
// ============================================================================

export const UserRoleSchema = z.enum([
  'customer',
  'staff',
  'manager',
  'admin',
  'owner',
])
export type UserRole = z.infer<typeof UserRoleSchema>

export const userRoleMapping = {
  customer: 'customer',
  staff: 'staff',
  manager: 'manager',
  admin: 'admin',
  owner: 'owner',
} as const satisfies Record<UserRole, DbUserRole>

export const userRoleReverseMapping = {
  customer: 'customer',
  staff: 'staff',
  manager: 'manager',
  admin: 'admin',
  owner: 'owner',
} as const satisfies Record<DbUserRole, UserRole>

// ============================================================================
// Customer Registration Source
// ============================================================================

export const CustomerRegistrationSourceSchema = z.enum([
  'walk_in',
  'phone',
  'online',
  'referral',
  'social_media',
])
export type CustomerRegistrationSource = z.infer<
  typeof CustomerRegistrationSourceSchema
>

// ============================================================================
// Additional Domain-Only Schemas (not in database)
// ============================================================================

export const PermissionScopeSchema = z.enum(['global', 'salon', 'self'])
export type PermissionScope = z.infer<typeof PermissionScopeSchema>

export const PermissionStatusSchema = z.enum([
  'allowed',
  'denied',
  'conditional',
])
export type PermissionStatus = z.infer<typeof PermissionStatusSchema>

export const MembershipLevelIdSchema = z.string()
export type MembershipLevelId = z.infer<typeof MembershipLevelIdSchema>

export const OrderStatusSchema = z.enum([
  'pending',
  'confirmed',
  'shipped',
  'delivered',
  'cancelled',
])
export type OrderStatus = z.infer<typeof OrderStatusSchema>

// ============================================================================
// Helper Functions for Type Conversions
// ============================================================================

/**
 * Safely convert a database enum value to domain enum value
 */
export function convertDbToDomain<T extends string>(
  value: string,
  mapping: Record<string, T>
): T | undefined {
  return mapping[value]
}

/**
 * Safely convert a domain enum value to database enum value
 */
export function convertDomainToDb<T extends string>(
  value: string,
  mapping: Record<string, T>
): T | undefined {
  return mapping[value]
}

// ============================================================================
// Export all mappings for convenience
// ============================================================================

export const enumMappings = {
  accountStatus: {
    toDb: accountStatusMapping,
    fromDb: accountStatusReverseMapping,
  },
  allergyType: { toDb: allergyTypeMapping, fromDb: allergyTypeReverseMapping },
  bookingStatus: { toDb: bookingStatusToDb, fromDb: bookingStatusFromDb },
  dayOfWeek: { toDb: dayOfWeekMapping, fromDb: dayOfWeekReverseMapping },
  inventoryTransactionType: {
    toDb: inventoryTransactionTypeMapping,
    fromDb: inventoryTransactionTypeReverseMapping,
  },
  membershipLevel: { toDb: membershipLevelToDb, fromDb: membershipLevelFromDb },
  notificationType: {
    toDb: notificationTypeMapping,
    fromDb: notificationTypeReverseMapping,
  },
  paymentMethod: {
    toDb: paymentMethodMapping,
    fromDb: paymentMethodReverseMapping,
  },
  paymentStatus: {
    toDb: paymentStatusMapping,
    fromDb: paymentStatusReverseMapping,
  },
  pointTransactionType: {
    toDb: pointTransactionTypeMapping,
    fromDb: pointTransactionTypeReverseMapping,
  },
  serviceCategory: {
    toDb: serviceCategoryMapping,
    fromDb: serviceCategoryReverseMapping,
  },
  staffLevel: { toDb: staffLevelMapping, fromDb: staffLevelReverseMapping },
  userRole: { toDb: userRoleMapping, fromDb: userRoleReverseMapping },
} as const
