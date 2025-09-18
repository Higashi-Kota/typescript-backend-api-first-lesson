/**
 * Create Salon Mapper (Write Operation)
 * API Request -> Domain Model -> Database Entity
 */

import type { salons } from '@beauty-salon-backend/database'
import type { components } from '@beauty-salon-backend/generated'
import type { Salon, SalonOperationResult } from '../../models/salon'
import { validateSalon } from '../../models/salon'
import type { ValidationError } from '../../shared/errors'
import type { Result } from '../../shared/result'
import { err, ok } from '../../shared/result'

// ============================================================================
// Type Definitions
// ============================================================================

type CreateSalonRequest = components['schemas']['Models.CreateSalonRequest']
type SalonDbInsert = typeof salons.$inferInsert

// ============================================================================
// API to Domain Mapping
// ============================================================================

export const mapCreateSalonApiToDomain = (
  request: CreateSalonRequest
): Result<Partial<Salon>, ValidationError[]> => {
  const errors: ValidationError[] = []

  // Validate required fields
  if (!request.name || request.name.trim().length === 0) {
    errors.push({
      field: 'name',
      message: 'Name is required',
      code: 'required',
    })
  }

  if (!request.description || request.description.trim().length === 0) {
    errors.push({
      field: 'description',
      message: 'Description is required',
      code: 'required',
    })
  }

  if (!request.address) {
    errors.push({
      field: 'address',
      message: 'Address is required',
      code: 'required',
    })
  }

  if (request.contactInfo) {
    if (!request.contactInfo.email) {
      errors.push({
        field: 'contactInfo.email',
        message: 'Email is required',
        code: 'required',
      })
    }
    if (!request.contactInfo.phoneNumber) {
      errors.push({
        field: 'contactInfo.phoneNumber',
        message: 'Phone is required',
        code: 'required',
      })
    }
  } else {
    errors.push({
      field: 'contactInfo',
      message: 'Contact info is required',
      code: 'required',
    })
  }

  if (!request.openingHours || request.openingHours.length === 0) {
    errors.push({
      field: 'openingHours',
      message: 'Opening hours are required',
      code: 'required',
    })
  }

  // Validate email format
  if (request.contactInfo?.email && !request.contactInfo.email.includes('@')) {
    errors.push({
      field: 'contactInfo.email',
      message: 'Invalid email format',
      code: 'format',
    })
  }

  // Validate opening hours
  if (request.openingHours) {
    for (let i = 0; i < request.openingHours.length; i++) {
      const hours = request.openingHours[i]
      if (!hours) {
        continue
      }

      if (!hours.dayOfWeek) {
        errors.push({
          field: `openingHours[${i}].dayOfWeek`,
          message: 'Day is required',
          code: 'required',
        })
      }
      if (!hours.openTime) {
        errors.push({
          field: `openingHours[${i}].openTime`,
          message: 'Open time is required',
          code: 'required',
        })
      }
      if (!hours.closeTime) {
        errors.push({
          field: `openingHours[${i}].closeTime`,
          message: 'Close time is required',
          code: 'required',
        })
      }
      if (
        hours.openTime &&
        hours.closeTime &&
        hours.openTime >= hours.closeTime
      ) {
        errors.push({
          field: `openingHours[${i}]`,
          message: 'Close time must be after open time',
          code: 'invalid',
        })
      }
    }
  }

  if (errors.length > 0) {
    return err(errors)
  }

  // Map to domain model
  const domainSalon: Partial<Salon> = {
    name: request.name.trim(),
    description: request.description.trim(),
    address: request.address,
    contactInfo: {
      email: request.contactInfo?.email?.toLowerCase(),
      phoneNumber: request.contactInfo?.phoneNumber!,
      alternativePhone: request.contactInfo?.alternativePhone,
    },
    openingHours: request.openingHours!,
    // businessHours handled separately if needed
    imageUrls: request.imageUrls,
    features: request.features,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  return ok(domainSalon)
}

// ============================================================================
// Domain to Database Mapping
// ============================================================================

export const mapCreateSalonDomainToDb = (
  domain: Partial<Salon>
): Result<SalonDbInsert, string> => {
  try {
    // Map domain model to database schema
    const dbSalon: SalonDbInsert = {
      // Basic info
      name: domain.name ?? '',
      description: domain.description ?? '',

      // Address
      postalCode: domain.address?.postalCode ?? '',
      prefecture: domain.address?.state ?? '',
      city: domain.address?.city ?? '',
      address: domain.address?.street ?? '',
      building: null,

      // Contact
      email: domain.contactInfo?.email ?? '',
      phoneNumber: domain.contactInfo?.phoneNumber ?? '',
      alternativePhone: domain.contactInfo?.alternativePhone ?? null,

      // Opening hours would typically be stored in a separate table or JSON field
      // For now, these could be stored in amenities or features JSON fields
      // TODO: Add proper opening hours storage

      // Features and images
      features: domain.features
        ? JSON.parse(JSON.stringify(domain.features))
        : [],
      imageUrls: domain.imageUrls
        ? JSON.parse(JSON.stringify(domain.imageUrls))
        : [],

      // Metadata
      isActive: true,
      deletedAt: null,

      // Timestamps
      createdAt: domain.createdAt ?? new Date().toISOString(),
      updatedAt: domain.updatedAt ?? new Date().toISOString(),
    }

    return ok(dbSalon)
  } catch (error) {
    return err(`Failed to map domain to database: ${error}`)
  }
}

// ============================================================================
// Complete Write Flow
// ============================================================================

export const createSalonWriteFlow = (
  request: CreateSalonRequest
): Result<SalonDbInsert, SalonOperationResult> => {
  // Step 1: API to Domain
  const domainResult = mapCreateSalonApiToDomain(request)
  if (domainResult.type === 'err') {
    return err({
      type: 'validationError',
      errors: domainResult.error,
    })
  }

  // Step 2: Additional domain validation
  const validationResult = validateSalon(domainResult.value)
  if (validationResult.type === 'err') {
    return err({
      type: 'validationError',
      errors: validationResult.error,
    })
  }

  // Step 3: Domain to Database
  const dbResult = mapCreateSalonDomainToDb(domainResult.value)
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

export const formatAddress = (
  address: components['schemas']['Models.Address']
): string => {
  const parts = [
    address.street,
    address.city,
    address.state,
    address.postalCode,
    address.country,
  ].filter(Boolean)

  return parts.join(', ')
}

export const normalizePhoneNumber = (phone: string): string => {
  // Remove all non-numeric characters
  return phone.replace(/\D/g, '')
}

// Business hours validation removed - use OpeningHours from generated types instead
