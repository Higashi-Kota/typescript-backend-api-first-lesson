/**
 * Update Salon Mapper (Write Operation)
 * API Request -> Domain Model -> Database Entity
 */

import { match } from 'ts-pattern'
import type {
  Salon,
  SalonId,
  SalonOperationResult,
  UpdateSalonRequest,
} from '../../models/salon'
import type { ValidationError } from '../../shared/errors'
import type { Result } from '../../shared/result'
import { err, ok } from '../../shared/result'

// Type aliases for clarity
type ApiUpdateRequest = UpdateSalonRequest
type DomainSalon = Salon
type DbSalonUpdate = {
  name?: string
  description?: string | null
  phoneNumber?: string | null
  email?: string | null
  address?: any
  openingHours?: any
  images?: string[] | null
  tags?: string[] | null
  updatedAt: Date
}

/**
 * Map API Update Request to Domain Model (partial update)
 */
export const mapUpdateSalonApiToDomain = (
  request: ApiUpdateRequest,
  _existingSalon: DomainSalon
): Result<Partial<DomainSalon>, ValidationError[]> => {
  try {
    const updates: Partial<DomainSalon> = {}

    if (request.name !== undefined) {
      updates.name = request.name
    }

    if (request.description !== undefined) {
      updates.description = request.description
    }

    if (request.phoneNumber !== undefined) {
      updates.phoneNumber = request.phoneNumber
    }

    if (request.email !== undefined) {
      updates.email = request.email
    }

    if (request.address !== undefined) {
      updates.address = request.address
    }

    if (request.openingHours !== undefined) {
      updates.openingHours = request.openingHours
    }

    if (request.images !== undefined) {
      updates.images = request.images
    }

    if (request.tags !== undefined) {
      updates.tags = request.tags
    }

    updates.updatedAt = new Date().toISOString()

    // Validate updates
    const errors: ValidationError[] = []

    if (updates.name !== undefined && updates.name.trim().length === 0) {
      errors.push({ field: 'name', message: 'Salon name cannot be empty' })
    }

    if (updates.email !== undefined && updates.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(updates.email)) {
        errors.push({ field: 'email', message: 'Invalid email format' })
      }
    }

    if (updates.phoneNumber !== undefined && updates.phoneNumber) {
      // Japanese phone number validation
      const phoneRegex =
        /^(0[0-9]{1,4}-?[0-9]{1,4}-?[0-9]{3,4}|0[789]0-?[0-9]{4}-?[0-9]{4})$/
      if (!phoneRegex.test(updates.phoneNumber.replace(/-/g, ''))) {
        errors.push({
          field: 'phoneNumber',
          message: 'Invalid phone number format',
        })
      }
    }

    if (errors.length > 0) {
      return err(errors)
    }

    return ok(updates)
  } catch (error) {
    return err([{ field: 'general', message: `Mapping error: ${error}` }])
  }
}

/**
 * Map Domain Model updates to Database Update
 */
export const mapUpdateSalonDomainToDb = (
  updates: Partial<DomainSalon>,
  _updatedBy?: string
): DbSalonUpdate => {
  const dbUpdate: DbSalonUpdate = {
    updatedAt: new Date(updates.updatedAt || new Date().toISOString()),
  }

  if (updates.name !== undefined) {
    dbUpdate.name = updates.name
  }

  if (updates.description !== undefined) {
    dbUpdate.description = updates.description ?? null
  }

  if (updates.phoneNumber !== undefined) {
    dbUpdate.phoneNumber = updates.phoneNumber ?? null
  }

  if (updates.email !== undefined) {
    dbUpdate.email = updates.email ?? null
  }

  if (updates.address !== undefined) {
    dbUpdate.address = updates.address
  }

  if (updates.openingHours !== undefined) {
    dbUpdate.openingHours = updates.openingHours
  }

  if (updates.images !== undefined) {
    dbUpdate.images = updates.images ?? null
  }

  if (updates.tags !== undefined) {
    dbUpdate.tags = updates.tags ?? null
  }

  return dbUpdate
}

/**
 * Complete flow: API → Domain → DB
 */
export const updateSalonWriteFlow = (
  _salonId: SalonId,
  request: ApiUpdateRequest,
  existingSalon: DomainSalon
): Result<DbSalonUpdate, SalonOperationResult> => {
  // Step 1: Map API to Domain
  const domainResult = mapUpdateSalonApiToDomain(request, existingSalon)

  if (domainResult.type === 'err') {
    return err({ type: 'validationError', errors: domainResult.error })
  }

  // Step 2: Map Domain to DB
  try {
    const dbUpdate = mapUpdateSalonDomainToDb(domainResult.value)
    return ok(dbUpdate)
  } catch (error) {
    return err({
      type: 'systemError',
      message: `Failed to map to database format: ${error}`,
    })
  }
}

/**
 * Track changes for audit
 */
export const trackSalonChanges = (
  oldSalon: DomainSalon,
  newSalon: Partial<DomainSalon>
): Record<string, any> => {
  const changes: Record<string, any> = {}

  if (newSalon.name && newSalon.name !== oldSalon.name) {
    changes.name = { from: oldSalon.name, to: newSalon.name }
  }

  if (newSalon.description !== oldSalon.description) {
    changes.description = {
      from: oldSalon.description,
      to: newSalon.description,
    }
  }

  if (newSalon.phoneNumber !== oldSalon.phoneNumber) {
    changes.phoneNumber = {
      from: oldSalon.phoneNumber,
      to: newSalon.phoneNumber,
    }
  }

  if (newSalon.email !== oldSalon.email) {
    changes.email = { from: oldSalon.email, to: newSalon.email }
  }

  return changes
}

/**
 * Handle update operation result
 */
export const handleUpdateSalonResult = (
  result: SalonOperationResult
): string => {
  return match(result)
    .with(
      { type: 'success' },
      ({ salon }) => `Salon ${salon.id} updated successfully`
    )
    .with(
      { type: 'validationError' },
      ({ errors }) =>
        `Validation failed: ${errors.map((e) => `${e.field}: ${e.message}`).join(', ')}`
    )
    .with(
      { type: 'notFound' },
      ({ salonId }) => `Salon with ID ${salonId} not found`
    )
    .with(
      { type: 'duplicateName' },
      ({ name }) => `Salon with name "${name}" already exists`
    )
    .with(
      { type: 'businessRuleViolation' },
      ({ rule, message }) => `Business rule violation (${rule}): ${message}`
    )
    .with({ type: 'systemError' }, ({ message }) => `System error: ${message}`)
    .exhaustive()
}
