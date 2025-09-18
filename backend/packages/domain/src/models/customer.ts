/**
 * Customer Domain Model
 *
 * Generated types from specs with Sum types for state management
 * All types are derived from TypeSpec/OpenAPI specifications
 */

import type { components } from '@beauty-salon-backend/generated'
import { match } from 'ts-pattern'
import type { Brand } from '../shared/brand'
import type { ValidationError } from '../shared/errors'
import type { Result } from '../shared/result'
import { err, ok } from '../shared/result'

// ============================================================================
// Type Aliases - Re-export generated types with branding
// ============================================================================

// Brand the ID types for type safety
export type CustomerId = Brand<
  components['schemas']['Models.CustomerId'],
  'CustomerId'
>
export type SalonId = Brand<components['schemas']['Models.SalonId'], 'SalonId'>
export type StaffId = Brand<components['schemas']['Models.StaffId'], 'StaffId'>
export type BookingId = Brand<
  components['schemas']['Models.BookingId'],
  'BookingId'
>
export type ReservationId = Brand<
  components['schemas']['Models.ReservationId'],
  'ReservationId'
>
export type MedicalChartId = Brand<
  components['schemas']['Models.MedicalChartId'],
  'MedicalChartId'
>
export type MembershipLevelId = Brand<
  components['schemas']['Models.MembershipLevelId'],
  'MembershipLevelId'
>

// Domain Customer Model - extends generated type with domain-specific fields
export interface Customer
  extends Omit<components['schemas']['Models.Customer'], 'id' | 'referredBy'> {
  id: CustomerId
  referredBy?: CustomerId
}

// Customer Profile with computed fields
export interface CustomerProfile
  extends Omit<components['schemas']['Models.CustomerProfile'], 'id'> {
  id: CustomerId
}

// Re-export generated types
export type CustomerGender = components['schemas']['Models.CustomerGender']
export type ContactInfo = components['schemas']['Models.ContactInfo']
export type Address = components['schemas']['Models.Address']
export type NotificationSettings =
  components['schemas']['Models.NotificationSettings']
export type MembershipLevel = components['schemas']['Models.MembershipLevel']

// Request types
export type CreateCustomerRequest =
  components['schemas']['Models.CreateCustomerRequest']
export type UpdateCustomerRequest =
  components['schemas']['Models.UpdateCustomerRequest']
export type UpdateCustomerRequestWithReset =
  components['schemas']['Models.UpdateCustomerRequestWithReset']
export type SearchCustomerRequest =
  components['schemas']['Models.SearchCustomerRequest']
export type GetCustomerBookingsRequest =
  components['schemas']['Models.GetCustomerBookingsRequest']
export type GetCustomerReservationsRequest =
  components['schemas']['Models.GetCustomerReservationsRequest']

// ============================================================================
// Sum Types for State Management
// ============================================================================

// Customer state with Sum types
export type CustomerState =
  | { type: 'active'; customer: Customer }
  | {
      type: 'inactive'
      customer: Customer
      inactivatedAt: string
      reason?: string
    }
  | {
      type: 'suspended'
      customer: Customer
      suspendedAt: string
      reason: string
      until?: string
    }
  | {
      type: 'deleted'
      customerId: CustomerId
      deletedAt: string
      deletedBy?: string
    }

// Customer operation results
export type CustomerOperationResult<T = Customer> =
  | { type: 'success'; data: T }
  | { type: 'notFound'; customerId: CustomerId }
  | { type: 'validationError'; errors: ValidationError[] }
  | { type: 'duplicateEmail'; email: string }
  | { type: 'duplicatePhone'; phone: string }
  | { type: 'businessRuleViolation'; rule: string; message: string }
  | { type: 'systemError'; message: string }

// Customer events for audit trail
export type CustomerEvent =
  | {
      type: 'created'
      customer: Customer
      createdBy?: string
      timestamp: string
    }
  | {
      type: 'updated'
      customerId: CustomerId
      changes: Record<string, unknown>
      updatedBy: string
      timestamp: string
    }
  | {
      type: 'deleted'
      customerId: CustomerId
      deletedBy: string
      timestamp: string
    }
  | {
      type: 'merged'
      primaryId: CustomerId
      secondaryId: CustomerId
      mergedBy: string
      timestamp: string
    }
  | {
      type: 'statusChanged'
      customerId: CustomerId
      from: CustomerState['type']
      to: CustomerState['type']
      changedBy: string
      timestamp: string
    }
  | {
      type: 'pointsAdded'
      customerId: CustomerId
      points: number
      reason: string
      timestamp: string
    }
  | {
      type: 'pointsUsed'
      customerId: CustomerId
      points: number
      reason: string
      timestamp: string
    }
  | {
      type: 'membershipChanged'
      customerId: CustomerId
      from?: MembershipLevel
      to: MembershipLevel
      timestamp: string
    }

// Customer search results
export type CustomerSearchResult =
  | {
      type: 'found'
      customers: Customer[]
      total: number
      page: number
      limit: number
    }
  | { type: 'empty'; query: SearchCustomerRequest }
  | { type: 'error'; message: string }

// Customer merge operation
export type CustomerMergeOperation =
  | {
      type: 'canMerge'
      primary: Customer
      secondary: Customer
      conflicts: MergeConflict[]
    }
  | {
      type: 'cannotMerge'
      reason: 'sameCustomer' | 'bothHaveUsers' | 'invalidState'
    }
  | { type: 'merged'; result: Customer; mergedFields: string[] }

export type MergeConflict = {
  field: string
  primaryValue: unknown
  secondaryValue: unknown
  resolution: 'usePrimary' | 'useSecondary' | 'combine'
}

// ============================================================================
// Business Rules
// ============================================================================

// Loyalty points calculation
export type LoyaltyPointsCalculation =
  | { type: 'purchase'; amount: number; multiplier: number; points: number }
  | { type: 'referral'; referredCustomerId: CustomerId; points: number }
  | { type: 'birthday'; points: number }
  | { type: 'review'; reviewId: string; points: number }
  | { type: 'milestone'; visits: number; points: number }

// Membership tier rules
export type MembershipTierRule =
  | { type: 'pointsBased'; minPoints: number; tier: MembershipLevel }
  | {
      type: 'spendingBased'
      minSpending: number
      period: 'monthly' | 'yearly'
      tier: MembershipLevel
    }
  | {
      type: 'visitsBased'
      minVisits: number
      period: 'monthly' | 'yearly'
      tier: MembershipLevel
    }
  | { type: 'manual'; tier: MembershipLevel; reason: string }

// ============================================================================
// Domain Functions
// ============================================================================

// Validate email format
export const validateEmail = (
  email: string
): Result<string, ValidationError> => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

  if (!email) {
    return err({
      field: 'email',
      message: 'Email is required',
      code: 'required',
    })
  }

  if (!emailRegex.test(email)) {
    return err({
      field: 'email',
      message: 'Invalid email format',
      code: 'format',
    })
  }

  return ok(email.toLowerCase())
}

// Validate phone number (Japanese format)
export const validatePhoneNumber = (
  phone: string
): Result<string, ValidationError> => {
  const cleanedNumber = phone.replace(/[\s\-()]/g, '')
  const phoneRegex = /^(\+81|0)[0-9]{9,10}$/

  if (!phone) {
    return err({
      field: 'phoneNumber',
      message: 'Phone number is required',
      code: 'required',
    })
  }

  if (!phoneRegex.test(cleanedNumber)) {
    return err({
      field: 'phoneNumber',
      message: 'Invalid phone number format',
      code: 'format',
    })
  }

  return ok(cleanedNumber)
}

// Check if customer can make bookings
export const canMakeBooking = (state: CustomerState): Result<true, string> => {
  return match(state)
    .with({ type: 'active' }, () => ok(true as const))
    .with({ type: 'inactive' }, ({ reason }) =>
      err(`Customer is inactive${reason ? `: ${reason}` : ''}`)
    )
    .with({ type: 'suspended' }, ({ reason }) =>
      err(`Customer is suspended: ${reason}`)
    )
    .with({ type: 'deleted' }, () => err('Customer has been deleted'))
    .exhaustive()
}

// Calculate loyalty points from purchase
export const calculateLoyaltyPoints = (
  amount: number,
  membershipLevel?: MembershipLevel
): LoyaltyPointsCalculation => {
  // Default multiplier based on membership level
  const multiplier = match(membershipLevel)
    .with('platinum', () => 3)
    .with('gold', () => 2)
    .with('silver', () => 1.5)
    .with('bronze', () => 1)
    .with(undefined, () => 1)
    .otherwise(() => 1)

  const points = Math.floor(amount * 0.01 * multiplier) // 1% of amount * multiplier

  return {
    type: 'purchase',
    amount,
    multiplier,
    points,
  }
}

// Determine membership tier based on points
export const determineMembershipTier = (
  loyaltyPoints: number
): MembershipLevel => {
  if (loyaltyPoints >= 10000) {
    return 'platinum'
  }
  if (loyaltyPoints >= 5000) {
    return 'gold'
  }
  if (loyaltyPoints >= 1000) {
    return 'silver'
  }
  return 'bronze'
}

// Format customer name for display
export const formatCustomerName = (customer: Customer): string => {
  return customer.name
}

// Check if customer has birthday this month
export const hasBirthdayThisMonth = (customer: Customer): boolean => {
  if (!customer.birthDate) {
    return false
  }

  const birthDate = new Date(customer.birthDate)
  const today = new Date()

  return birthDate.getMonth() === today.getMonth()
}

// Calculate customer age
export const calculateAge = (birthDate?: string): number | null => {
  if (!birthDate) {
    return null
  }

  const birth = new Date(birthDate)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }

  return age
}

// Check if customer is eligible for referral bonus
export const isEligibleForReferralBonus = (
  referrer: Customer,
  referred: Customer
): Result<true, string> => {
  if (!referrer.isActive) {
    return err('Referrer must be an active customer')
  }

  if (referrer.id === referred.id) {
    return err('Cannot refer yourself')
  }

  if (referred.referredBy && referred.referredBy !== referrer.id) {
    return err('Customer was already referred by someone else')
  }

  return ok(true as const)
}

// Merge customer records
export const mergeCustomers = (
  primary: Customer,
  secondary: Customer
): CustomerMergeOperation => {
  if (primary.id === secondary.id) {
    return { type: 'cannotMerge', reason: 'sameCustomer' }
  }

  // Identify conflicts
  const conflicts: MergeConflict[] = []

  if (primary.contactInfo.email !== secondary.contactInfo.email) {
    conflicts.push({
      field: 'email',
      primaryValue: primary.contactInfo.email,
      secondaryValue: secondary.contactInfo.email,
      resolution: 'usePrimary',
    })
  }

  if (primary.contactInfo.phoneNumber !== secondary.contactInfo.phoneNumber) {
    conflicts.push({
      field: 'phoneNumber',
      primaryValue: primary.contactInfo.phoneNumber,
      secondaryValue: secondary.contactInfo.phoneNumber,
      resolution: 'usePrimary',
    })
  }

  return {
    type: 'canMerge',
    primary,
    secondary,
    conflicts,
  }
}

// ============================================================================
// Type Guards
// ============================================================================

export const isActiveCustomer = (
  state: CustomerState
): state is { type: 'active'; customer: Customer } => {
  return state.type === 'active'
}

export const isDeletedCustomer = (
  state: CustomerState
): state is { type: 'deleted'; customerId: CustomerId; deletedAt: string } => {
  return state.type === 'deleted'
}

export const hasLoyaltyPoints = (customer: Customer): boolean => {
  return (customer.loyaltyPoints ?? 0) > 0
}

export const hasMembershipLevel = (
  customer: Customer
): customer is Customer & { membershipLevel: MembershipLevel } => {
  return customer.membershipLevel !== undefined
}
