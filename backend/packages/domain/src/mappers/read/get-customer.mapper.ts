/**
 * Get Customer Mapper (Read Operation)
 * Database Entity -> Domain Model -> API Response
 */

import type { customers } from '@beauty-salon-backend/database'
import type { components } from '@beauty-salon-backend/generated'
import type {
  Customer,
  CustomerId,
  CustomerProfile,
} from '../../models/customer'
import type { Result } from '../../shared/result'
import { err, ok } from '../../shared/result'

// ============================================================================
// Type Definitions
// ============================================================================

type CustomerDb = typeof customers.$inferSelect
type CustomerApiResponse = components['schemas']['Models.Customer']
type CustomerProfileApiResponse =
  components['schemas']['Models.CustomerProfile']

// ============================================================================
// Database to Domain Mapping
// ============================================================================

export const mapGetCustomerDbToDomain = (
  dbCustomer: CustomerDb
): Result<Customer, string> => {
  if (!dbCustomer) {
    return err('Customer not found in database')
  }

  try {
    // Map database entity to domain model
    const domainCustomer: Customer = {
      id: dbCustomer.id as CustomerId,
      name: `${dbCustomer.firstName} ${dbCustomer.lastName}`.trim(),
      contactInfo: {
        email: dbCustomer.email,
        phoneNumber: dbCustomer.phoneNumber,
        alternativePhone: dbCustomer.alternativePhone ?? undefined,
      },
      gender: dbCustomer.gender as
        | components['schemas']['Models.CustomerGender']
        | undefined,
      birthDate: dbCustomer.birthDate ?? undefined,
      address:
        dbCustomer.postalCode ||
        dbCustomer.prefecture ||
        dbCustomer.city ||
        dbCustomer.address
          ? {
              street: dbCustomer.address ?? '',
              city: dbCustomer.city ?? '',
              state: dbCustomer.prefecture ?? '',
              postalCode: dbCustomer.postalCode ?? '',
              country: 'Japan',
            }
          : undefined,
      preferences:
        typeof dbCustomer.preferences === 'object' &&
        dbCustomer.preferences !== null
          ? ((dbCustomer.preferences as any).general ?? undefined)
          : undefined,
      notes: dbCustomer.notes ?? undefined,
      tags: Array.isArray(dbCustomer.tags)
        ? (dbCustomer.tags as string[])
        : undefined,
      loyaltyPoints: dbCustomer.loyaltyPoints,
      membershipLevel: dbCustomer.membershipTier as
        | components['schemas']['Models.MembershipLevel']
        | undefined,
      membershipLevelId: undefined, // Not used in current implementation
      notificationSettings: {
        types: [
          ...(dbCustomer.allowEmail ? ['email' as const] : []),
          ...(dbCustomer.allowSms ? ['sms' as const] : []),
        ],
        reminderTimings: ['one_day_before' as const],
        enabled: true,
      },
      medicalChartId: undefined, // Will be implemented when medical charts are added
      isActive: dbCustomer.isActive,
      registrationSource: 'online' as const, // Default for now
      referredBy: dbCustomer.referredBy
        ? (dbCustomer.referredBy as CustomerId)
        : undefined,
      createdAt: dbCustomer.createdAt,
      createdBy: undefined, // Not tracked in current DB schema
      updatedAt: dbCustomer.updatedAt,
      updatedBy: undefined, // Not tracked in current DB schema
    }

    return ok(domainCustomer)
  } catch (error) {
    return err(`Failed to map database entity to domain: ${error}`)
  }
}

// ============================================================================
// Domain to API Mapping
// ============================================================================

export const mapGetCustomerDomainToApi = (
  domain: Customer
): Result<CustomerApiResponse, string> => {
  try {
    // Map domain model to API response
    const apiResponse: CustomerApiResponse = {
      id: domain.id,
      name: domain.name,
      contactInfo: domain.contactInfo,
      gender: domain.gender,
      birthDate: domain.birthDate,
      address: domain.address,
      preferences: domain.preferences,
      notes: domain.notes,
      tags: domain.tags,
      loyaltyPoints: domain.loyaltyPoints,
      membershipLevel: domain.membershipLevel,
      membershipLevelId: domain.membershipLevelId,
      notificationSettings: domain.notificationSettings,
      medicalChartId: domain.medicalChartId,
      isActive: domain.isActive,
      registrationSource: domain.registrationSource,
      referredBy: domain.referredBy,
      createdAt: domain.createdAt,
      createdBy: domain.createdBy,
      updatedAt: domain.updatedAt,
      updatedBy: domain.updatedBy,
    }

    return ok(apiResponse)
  } catch (error) {
    return err(`Failed to map domain to API response: ${error}`)
  }
}

// ============================================================================
// Database to Domain to API (Customer Profile)
// ============================================================================

export const mapGetCustomerDbToProfile = (
  dbCustomer: CustomerDb,
  stats?: {
    visitCount: number
    lastVisitDate?: string
    favoriteStaffIds?: string[]
    totalSpent?: number
    averageRating?: number
  }
): Result<CustomerProfile, string> => {
  // First map to domain
  const domainResult = mapGetCustomerDbToDomain(dbCustomer)
  if (domainResult.type === 'err') {
    return err(domainResult.error)
  }

  const domain = domainResult.value

  try {
    // Create customer profile with additional computed fields
    const profile: CustomerProfile = {
      ...domain,
      visitCount: stats?.visitCount ?? dbCustomer.visitCount,
      lastVisitDate:
        stats?.lastVisitDate ?? dbCustomer.lastVisitDate ?? undefined,
      favoriteStaffIds: stats?.favoriteStaffIds,
      totalSpent: stats?.totalSpent ?? 0,
    }

    return ok(profile)
  } catch (error) {
    return err(`Failed to create customer profile: ${error}`)
  }
}

export const mapGetCustomerProfileToApi = (
  domain: Customer,
  profile: CustomerProfile
): Result<CustomerProfileApiResponse, string> => {
  try {
    // Combine customer and profile data
    const apiResponse: CustomerProfileApiResponse = {
      // All customer fields
      ...domain,
      // Profile-specific fields
      visitCount: profile.visitCount,
      lastVisitDate: profile.lastVisitDate,
      favoriteStaffIds: profile.favoriteStaffIds,
      totalSpent: profile.totalSpent,
    } as CustomerProfileApiResponse

    return ok(apiResponse)
  } catch (error) {
    return err(`Failed to map profile to API response: ${error}`)
  }
}

// ============================================================================
// Complete Read Flow
// ============================================================================

export const getCustomerReadFlow = (
  dbCustomer: CustomerDb
): Result<CustomerApiResponse, string> => {
  // Step 1: Database to Domain
  const domainResult = mapGetCustomerDbToDomain(dbCustomer)
  if (domainResult.type === 'err') {
    return err(domainResult.error)
  }

  // Step 2: Domain to API
  return mapGetCustomerDomainToApi(domainResult.value)
}

export const getCustomerProfileReadFlow = (
  dbCustomer: CustomerDb,
  stats?: {
    visitCount: number
    lastVisitDate?: string
    favoriteStaffIds?: string[]
    totalSpent?: number
    averageRating?: number
  }
): Result<CustomerProfileApiResponse, string> => {
  // Step 1: Database to Domain
  const domainResult = mapGetCustomerDbToDomain(dbCustomer)
  if (domainResult.type === 'err') {
    return err(domainResult.error)
  }

  // Step 2: Create Profile
  const profileResult = mapGetCustomerDbToProfile(dbCustomer, stats)
  if (profileResult.type === 'err') {
    return err(profileResult.error)
  }

  // Step 3: Combine and map to API
  return mapGetCustomerProfileToApi(domainResult.value, profileResult.value)
}

// ============================================================================
// Helper Functions
// ============================================================================

export const formatFullName = (firstName: string, lastName: string): string => {
  return `${firstName} ${lastName}`.trim()
}

export const parsePreferences = (preferences: unknown): string | undefined => {
  if (!preferences || typeof preferences !== 'object') {
    return undefined
  }

  const prefs = preferences as Record<string, any>
  return prefs.general ?? undefined
}

export const isCustomerActive = (dbCustomer: CustomerDb): boolean => {
  return dbCustomer.isActive && !dbCustomer.deletedAt
}

export const hasValidContactInfo = (dbCustomer: CustomerDb): boolean => {
  return Boolean(dbCustomer.email && dbCustomer.phoneNumber)
}
