/**
 * Update Customer Mapper (Write Operation)
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

type UpdateCustomerRequest =
  components['schemas']['Models.UpdateCustomerRequest']
type UpdateCustomerRequestWithReset =
  components['schemas']['Models.UpdateCustomerRequestWithReset']
type CustomerDbUpdate = Partial<typeof customers.$inferInsert>

// ============================================================================
// API to Domain Mapping (Partial Update)
// ============================================================================

export const mapUpdateApiToDomain = (
  request: UpdateCustomerRequest
): Result<Partial<Customer>, ValidationError[]> => {
  const errors: ValidationError[] = []

  // Validate email if being updated
  if (request.contactInfo?.email !== undefined) {
    const emailResult = validateEmail(request.contactInfo.email)
    if (emailResult.type === 'err') {
      errors.push(emailResult.error)
    }
  }

  // Validate phone if being updated
  if (request.contactInfo?.phoneNumber !== undefined) {
    const phoneResult = validatePhoneNumber(request.contactInfo.phoneNumber)
    if (phoneResult.type === 'err') {
      errors.push(phoneResult.error)
    }
  }

  // Validate birth date if being updated
  if (request.birthDate !== undefined) {
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

  // Build partial domain model with only provided fields
  const domainUpdate: Partial<Customer> = {}

  if (request.name !== undefined) {
    domainUpdate.name = request.name.trim()
  }

  if (request.contactInfo !== undefined) {
    domainUpdate.contactInfo = {
      email: request.contactInfo.email?.toLowerCase(),
      phoneNumber: request.contactInfo.phoneNumber,
      alternativePhone: request.contactInfo.alternativePhone,
    }
  }

  if (request.preferences !== undefined) {
    domainUpdate.preferences = request.preferences
  }

  if (request.notes !== undefined) {
    domainUpdate.notes = request.notes
  }

  if (request.tags !== undefined) {
    domainUpdate.tags = request.tags
  }

  if (request.birthDate !== undefined) {
    domainUpdate.birthDate = request.birthDate
  }

  domainUpdate.updatedAt = new Date().toISOString()

  return ok(domainUpdate)
}

// ============================================================================
// API to Domain Mapping (With Reset Capability)
// ============================================================================

export const mapUpdateApiToDomainWithReset = (
  request: UpdateCustomerRequestWithReset
): Result<Partial<Customer>, ValidationError[]> => {
  const errors: ValidationError[] = []

  // Validate email if being updated (not null)
  if (
    request.contactInfo?.email !== undefined &&
    request.contactInfo.email !== null
  ) {
    const emailResult = validateEmail(request.contactInfo.email)
    if (emailResult.type === 'err') {
      errors.push(emailResult.error)
    }
  }

  // Validate phone if being updated (not null)
  if (
    request.contactInfo?.phoneNumber !== undefined &&
    request.contactInfo.phoneNumber !== null
  ) {
    const phoneResult = validatePhoneNumber(request.contactInfo.phoneNumber)
    if (phoneResult.type === 'err') {
      errors.push(phoneResult.error)
    }
  }

  // Validate birth date if being updated (not null)
  if (request.birthDate !== undefined && request.birthDate !== null) {
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

  // Build partial domain model, null values mean reset/clear
  const domainUpdate: Partial<Customer> = {}

  if (request.name !== undefined) {
    domainUpdate.name = request.name === null ? '' : request.name.trim()
  }

  if (request.contactInfo !== undefined) {
    if (request.contactInfo === null) {
      // Reset entire contact info (shouldn't happen in practice)
      domainUpdate.contactInfo = undefined as any
    } else {
      domainUpdate.contactInfo = {
        email:
          (request.contactInfo.email === null
            ? ''
            : request.contactInfo.email?.toLowerCase()) ?? '',
        phoneNumber:
          (request.contactInfo.phoneNumber === null
            ? ''
            : request.contactInfo.phoneNumber) ?? '',
        alternativePhone:
          request.contactInfo.alternativePhone === null
            ? undefined
            : request.contactInfo.alternativePhone,
      }
    }
  }

  if (request.preferences !== undefined) {
    domainUpdate.preferences =
      request.preferences === null ? undefined : request.preferences
  }

  if (request.notes !== undefined) {
    domainUpdate.notes = request.notes === null ? undefined : request.notes
  }

  if (request.tags !== undefined) {
    domainUpdate.tags = request.tags === null ? [] : request.tags
  }

  if (request.birthDate !== undefined) {
    domainUpdate.birthDate =
      request.birthDate === null ? undefined : request.birthDate
  }

  domainUpdate.updatedAt = new Date().toISOString()

  return ok(domainUpdate)
}

// ============================================================================
// Domain to Database Mapping
// ============================================================================

export const mapUpdateDomainToDb = (
  domain: Partial<Customer>
): Result<CustomerDbUpdate, string> => {
  const dbUpdate: CustomerDbUpdate = {}

  // Update name fields if name is provided
  if (domain.name !== undefined) {
    const nameParts = domain.name.split(' ')
    dbUpdate.firstName = nameParts[0] ?? ''
    dbUpdate.lastName = nameParts.slice(1).join(' ') || (nameParts[0] ?? '')
  }

  // Update contact info fields
  if (domain.contactInfo) {
    if (domain.contactInfo.email !== undefined) {
      dbUpdate.email = domain.contactInfo.email ?? ''
    }
    if (domain.contactInfo.phoneNumber !== undefined) {
      dbUpdate.phoneNumber = domain.contactInfo.phoneNumber ?? ''
    }
    if (domain.contactInfo.alternativePhone !== undefined) {
      dbUpdate.alternativePhone = domain.contactInfo.alternativePhone ?? null
    }
    // Handle address updates from domain.address, not contactInfo
    // ContactInfo doesn't have address property in the generated types
  }

  // Update preferences and notes
  if (domain.preferences !== undefined) {
    dbUpdate.preferences = domain.preferences
      ? JSON.parse(JSON.stringify({ general: domain.preferences }))
      : {}
  }

  if (domain.notes !== undefined) {
    dbUpdate.notes = domain.notes ?? null
  }

  if (domain.tags !== undefined) {
    dbUpdate.tags = domain.tags ? JSON.parse(JSON.stringify(domain.tags)) : []
  }

  // Update birth date
  if (domain.birthDate !== undefined) {
    dbUpdate.birthDate = domain.birthDate
      ? new Date(domain.birthDate).toISOString().split('T')[0]
      : null
  }

  // Update timestamps
  dbUpdate.updatedAt = domain.updatedAt ?? new Date().toISOString()

  return ok(dbUpdate)
}

// ============================================================================
// Complete Update Flow
// ============================================================================

export const updateCustomerWriteFlow = (
  request: UpdateCustomerRequest,
  withReset = false
): Result<CustomerDbUpdate, CustomerOperationResult> => {
  // Step 1: API to Domain
  const domainResult =
    withReset && 'preferences' in request && request.preferences === null
      ? mapUpdateApiToDomainWithReset(request as UpdateCustomerRequestWithReset)
      : mapUpdateApiToDomain(request)

  if (domainResult.type === 'err') {
    return err({
      type: 'validationError',
      errors: domainResult.error,
    })
  }

  // Step 2: Domain to Database
  const dbResult = mapUpdateDomainToDb(domainResult.value)
  if (dbResult.type === 'err') {
    return err({
      type: 'systemError',
      message: dbResult.error,
    })
  }

  return ok(dbResult.value)
}

// ============================================================================
// Merge Customer Mapper
// ============================================================================

export const mergeCustomersWriteFlow = (
  _primaryId: string,
  _secondaryId: string
): Result<CustomerDbUpdate, CustomerOperationResult> => {
  // This would handle merging logic
  // For now, return a placeholder
  const dbUpdate: CustomerDbUpdate = {
    updatedAt: new Date().toISOString(),
  }

  return ok(dbUpdate)
}

// ============================================================================
// Helper Functions
// ============================================================================

export const buildPartialUpdate = <T extends Record<string, any>>(
  source: T,
  fields: Array<keyof T>
): Partial<T> => {
  const result: Partial<T> = {}
  for (const field of fields) {
    if (source[field] !== undefined) {
      result[field] = source[field]
    }
  }
  return result
}

export const sanitizeUpdateFields = (
  update: CustomerDbUpdate
): CustomerDbUpdate => {
  // Remove undefined values
  const sanitized: CustomerDbUpdate = {}
  for (const [key, value] of Object.entries(update)) {
    if (value !== undefined) {
      ;(sanitized as any)[key] = value
    }
  }
  return sanitized
}
