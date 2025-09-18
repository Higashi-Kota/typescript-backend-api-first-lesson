/**
 * Create Customer Mapper (Write Operation)
 * API Request -> Domain Model -> Database Entity
 */

import type { customers } from '@beauty-salon-backend/database'
import type { components } from '@beauty-salon-backend/generated'
import type { Customer, CustomerOperationResult } from '../../models/customer'
import { validateEmail, validatePhoneNumber } from '../../models/customer'
import type { ValidationError } from '../../shared/errors'
import type { Result } from '../../shared/result'
import { err, ok } from '../../shared/result'

// ============================================================================
// Type Definitions
// ============================================================================

type CreateCustomerRequest =
  components['schemas']['Models.CreateCustomerRequest']
type CustomerDbInsert = typeof customers.$inferInsert

// ============================================================================
// API to Domain Mapping
// ============================================================================

export const mapCreateApiToDomain = (
  request: CreateCustomerRequest
): Result<Partial<Customer>, ValidationError[]> => {
  const errors: ValidationError[] = []

  // Validate required fields
  if (!request.name) {
    errors.push({
      field: 'name',
      message: 'Name is required',
      code: 'required',
    })
  }

  if (!request.contactInfo) {
    errors.push({
      field: 'contactInfo',
      message: 'Contact info is required',
      code: 'required',
    })
  }

  // Validate email if present
  if (request.contactInfo?.email) {
    const emailResult = validateEmail(request.contactInfo.email)
    if (emailResult.type === 'err') {
      errors.push(emailResult.error)
    }
  } else {
    errors.push({
      field: 'contactInfo.email',
      message: 'Email is required',
      code: 'required',
    })
  }

  // Validate phone if present
  if (request.contactInfo?.phoneNumber) {
    const phoneResult = validatePhoneNumber(request.contactInfo.phoneNumber)
    if (phoneResult.type === 'err') {
      errors.push(phoneResult.error)
    }
  } else {
    errors.push({
      field: 'contactInfo.phoneNumber',
      message: 'Phone is required',
      code: 'required',
    })
  }

  // Validate birth date format if present
  if (request.birthDate) {
    const birthDate = new Date(request.birthDate)
    if (Number.isNaN(birthDate.getTime())) {
      errors.push({
        field: 'birthDate',
        message: 'Invalid date format',
        code: 'format',
      })
    }
    if (birthDate > new Date()) {
      errors.push({
        field: 'birthDate',
        message: 'Birth date cannot be in the future',
        code: 'invalid',
      })
    }
  }

  if (errors.length > 0) {
    return err(errors)
  }

  // Map to domain model (partial because ID will be generated)
  const domainCustomer: Partial<Customer> = {
    name: request.name.trim(),
    contactInfo: {
      email: request.contactInfo?.email?.toLowerCase(),
      phoneNumber: request.contactInfo?.phoneNumber!,
      alternativePhone: request.contactInfo?.alternativePhone,
    },
    preferences: request.preferences,
    notes: request.notes,
    tags: request.tags,
    birthDate: request.birthDate,
    isActive: true, // New customers are active by default
    loyaltyPoints: 0, // Start with 0 points
    registrationSource: 'online', // Default source
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  return ok(domainCustomer)
}

// ============================================================================
// Domain to Database Mapping
// ============================================================================

export const mapCreateDomainToDb = (
  domain: Partial<Customer>
): Result<CustomerDbInsert, string> => {
  // Parse name into first and last name
  const nameParts = domain.name?.split(' ') ?? []
  const firstName = nameParts[0] ?? ''
  const lastName = nameParts.slice(1).join(' ') || (nameParts[0] ?? '')

  // Map domain model to database schema
  const dbCustomer: CustomerDbInsert = {
    // Names
    firstName,
    lastName,
    firstNameKana: null, // Will be updated later if provided
    lastNameKana: null,

    // Contact info
    email: domain.contactInfo?.email ?? '',
    phoneNumber: domain.contactInfo?.phoneNumber ?? '',
    alternativePhone: domain.contactInfo?.alternativePhone ?? null,

    // Address (from domain.address not contactInfo)
    postalCode: domain.address?.postalCode ?? null,
    prefecture: domain.address?.state ?? null,
    city: domain.address?.city ?? null,
    address: domain.address?.street ?? null,
    building: null,

    // Personal info
    birthDate: domain.birthDate
      ? new Date(domain.birthDate).toISOString().split('T')[0]
      : null,
    gender: domain.gender ?? null,
    occupation: null,

    // Membership
    membershipTier: (domain.membershipLevel ?? 'regular') as
      | 'regular'
      | 'silver'
      | 'gold'
      | 'platinum'
      | 'vip',
    loyaltyPoints: domain.loyaltyPoints ?? 0,
    lifetimeValue: 0,

    // Preferences and notes
    preferences: domain.preferences
      ? JSON.parse(JSON.stringify({ general: domain.preferences }))
      : {},
    notes: domain.notes ?? null,
    internalNotes: null,
    tags: domain.tags ? JSON.parse(JSON.stringify(domain.tags)) : [],

    // Referral
    referredBy: domain.referredBy ? domain.referredBy.toString() : null,
    referralCode: null, // Will be generated if needed

    // Marketing preferences
    allowMarketing: true,
    allowSms: true,
    allowEmail: true,

    // Visit tracking
    firstVisitDate: null, // Will be set on first booking
    lastVisitDate: null,
    visitCount: 0,
    noShowCount: 0,
    cancellationCount: 0,

    // Status
    isActive: domain.isActive ?? true,
    deletedAt: null,

    // Timestamps
    createdAt: domain.createdAt ?? new Date().toISOString(),
    updatedAt: domain.updatedAt ?? new Date().toISOString(),
  }

  return ok(dbCustomer)
}

// ============================================================================
// Complete Write Flow
// ============================================================================

export const createCustomerWriteFlow = (
  request: CreateCustomerRequest
): Result<CustomerDbInsert, CustomerOperationResult> => {
  // Step 1: API to Domain
  const domainResult = mapCreateApiToDomain(request)
  if (domainResult.type === 'err') {
    return err({
      type: 'validationError',
      errors: domainResult.error,
    })
  }

  // Step 2: Domain to Database
  const dbResult = mapCreateDomainToDb(domainResult.value)
  if (dbResult.type === 'err') {
    return err({
      type: 'systemError',
      message: dbResult.error,
    })
  }

  return ok(dbResult.value)
}

// ============================================================================
// Helper Functions
// ============================================================================

export const generateReferralCode = (customerId: string): string => {
  const prefix = 'REF'
  const timestamp = Date.now().toString(36).toUpperCase()
  const idPart = customerId.substring(0, 4).toUpperCase()
  return `${prefix}-${idPart}-${timestamp}`
}

export const parseFullName = (
  fullName: string
): { firstName: string; lastName: string } => {
  const parts = fullName.trim().split(/\s+/)
  if (parts.length === 1) {
    return { firstName: parts[0]!, lastName: '' }
  }
  return {
    firstName: parts[0]!,
    lastName: parts.slice(1).join(' '),
  }
}

export const formatPhoneForDb = (phone: string): string => {
  // Remove all non-numeric characters
  return phone.replace(/\D/g, '')
}
