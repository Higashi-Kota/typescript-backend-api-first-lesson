/**
 * Update Service Mapper (Write Operation)
 * API Request -> Domain Model -> Database Entity
 */

import { match } from 'ts-pattern'
import type {
  Service,
  ServiceChanges,
  ServiceId,
  ServiceOperationResult,
  UpdateServiceRequest,
  UpdateServiceRequestWithReset,
} from '../../models/service'
import type { ValidationError } from '../../shared/errors'
import type { Result } from '../../shared/result'
import { err, ok } from '../../shared/result'

// Type aliases for clarity
type ApiUpdateRequest = UpdateServiceRequest
type ApiUpdateRequestWithReset = UpdateServiceRequestWithReset
type DomainService = Service
type DbServiceUpdate = {
  name?: string
  description?: string
  duration?: number
  price?: number
  category?: string
  categoryId?: string | null
  imageUrl?: string | null
  requiredStaffLevel?: number | null
  isActive?: boolean
  updatedAt: Date
  updatedBy?: string | null
}

/**
 * Map API Update Request to Domain Model (partial update)
 */
export const mapUpdateServiceApiToDomain = (
  request: ApiUpdateRequest,
  _existingService: DomainService
): Result<Partial<DomainService>, ValidationError[]> => {
  try {
    const updates: Partial<DomainService> = {}

    if (request.name !== undefined) {
      updates.name = request.name
    }

    if (request.description !== undefined) {
      updates.description = request.description
    }

    if (request.duration !== undefined) {
      updates.duration = request.duration
    }

    if (request.price !== undefined) {
      updates.price = request.price
    }

    if (request.category !== undefined) {
      updates.category = request.category
    }

    if (request.categoryId !== undefined) {
      updates.categoryId = request.categoryId as any
    }

    if (request.imageUrl !== undefined) {
      updates.imageUrl = request.imageUrl
    }

    if (request.requiredStaffLevel !== undefined) {
      updates.requiredStaffLevel = request.requiredStaffLevel
    }

    if (request.isActive !== undefined) {
      updates.isActive = request.isActive
    }

    updates.updatedAt = new Date().toISOString()

    // Validate only the fields being updated
    const errors: ValidationError[] = []

    if (
      updates.name !== undefined &&
      (!updates.name || updates.name.trim().length === 0)
    ) {
      errors.push({ field: 'name', message: 'Service name cannot be empty' })
    }

    if (
      updates.description !== undefined &&
      (!updates.description || updates.description.trim().length === 0)
    ) {
      errors.push({
        field: 'description',
        message: 'Description cannot be empty',
      })
    }

    if (updates.duration !== undefined && updates.duration <= 0) {
      errors.push({
        field: 'duration',
        message: 'Duration must be greater than 0',
      })
    }

    if (updates.price !== undefined && updates.price < 0) {
      errors.push({ field: 'price', message: 'Price cannot be negative' })
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
 * Map API Update Request with Reset to Domain Model
 * Handles null values for field resets
 */
export const mapUpdateServiceWithResetApiToDomain = (
  request: ApiUpdateRequestWithReset,
  _existingService: DomainService
): Result<Partial<DomainService>, ValidationError[]> => {
  try {
    const updates: Partial<DomainService> = {}

    if (request.name !== undefined) {
      updates.name = request.name
    }

    if (request.description !== undefined) {
      updates.description = request.description
    }

    if (request.duration !== undefined) {
      updates.duration = request.duration
    }

    if (request.price !== undefined) {
      updates.price = request.price
    }

    if (request.category !== undefined) {
      updates.category = request.category
    }

    // Handle nullable fields (can be reset to null)
    if (request.categoryId !== undefined) {
      updates.categoryId =
        request.categoryId === null ? undefined : (request.categoryId as any)
    }

    if (request.imageUrl !== undefined) {
      updates.imageUrl =
        request.imageUrl === null ? undefined : request.imageUrl
    }

    if (request.requiredStaffLevel !== undefined) {
      updates.requiredStaffLevel =
        request.requiredStaffLevel === null
          ? undefined
          : request.requiredStaffLevel
    }

    if (request.isActive !== undefined) {
      updates.isActive = request.isActive
    }

    updates.updatedAt = new Date().toISOString()

    // Validate (similar to regular update)
    const errors: ValidationError[] = []

    if (
      updates.name !== undefined &&
      (!updates.name || updates.name.trim().length === 0)
    ) {
      errors.push({ field: 'name', message: 'Service name cannot be empty' })
    }

    if (
      updates.description !== undefined &&
      (!updates.description || updates.description.trim().length === 0)
    ) {
      errors.push({
        field: 'description',
        message: 'Description cannot be empty',
      })
    }

    if (updates.duration !== undefined && updates.duration <= 0) {
      errors.push({
        field: 'duration',
        message: 'Duration must be greater than 0',
      })
    }

    if (updates.price !== undefined && updates.price < 0) {
      errors.push({ field: 'price', message: 'Price cannot be negative' })
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
export const mapUpdateServiceDomainToDb = (
  updates: Partial<DomainService>,
  updatedBy?: string
): DbServiceUpdate => {
  const dbUpdate: DbServiceUpdate = {
    updatedAt: new Date(updates.updatedAt || new Date().toISOString()),
    updatedBy: updatedBy ?? null,
  }

  if (updates.name !== undefined) {
    dbUpdate.name = updates.name
  }

  if (updates.description !== undefined) {
    dbUpdate.description = updates.description
  }

  if (updates.duration !== undefined) {
    dbUpdate.duration = updates.duration
  }

  if (updates.price !== undefined) {
    dbUpdate.price = updates.price
  }

  if (updates.category !== undefined) {
    dbUpdate.category = updates.category
  }

  if (updates.categoryId !== undefined) {
    dbUpdate.categoryId = updates.categoryId ?? null
  }

  if (updates.imageUrl !== undefined) {
    dbUpdate.imageUrl = updates.imageUrl ?? null
  }

  if (updates.requiredStaffLevel !== undefined) {
    dbUpdate.requiredStaffLevel = updates.requiredStaffLevel ?? null
  }

  if (updates.isActive !== undefined) {
    dbUpdate.isActive = updates.isActive
  }

  return dbUpdate
}

/**
 * Complete flow: API → Domain → DB
 */
export const updateServiceWriteFlow = (
  _serviceId: ServiceId,
  request: ApiUpdateRequest | ApiUpdateRequestWithReset,
  existingService: DomainService,
  isResetRequest = false
): Result<DbServiceUpdate, ServiceOperationResult> => {
  // Step 1: Map API to Domain
  const domainResult = isResetRequest
    ? mapUpdateServiceWithResetApiToDomain(
        request as ApiUpdateRequestWithReset,
        existingService
      )
    : mapUpdateServiceApiToDomain(request as ApiUpdateRequest, existingService)

  if (domainResult.type === 'err') {
    return err({ type: 'validation_failed', errors: domainResult.error })
  }

  // Step 2: Map Domain to DB
  try {
    const dbUpdate = mapUpdateServiceDomainToDb(domainResult.value)
    return ok(dbUpdate)
  } catch (error) {
    return err({
      type: 'error',
      error: {
        type: 'system',
        message: `Failed to map to database format: ${error}`,
      },
    })
  }
}

/**
 * Track changes for audit
 */
export const trackServiceChanges = (
  oldService: DomainService,
  newService: Partial<DomainService>
): ServiceChanges => {
  const changes: ServiceChanges = {}

  if (newService.name && newService.name !== oldService.name) {
    changes.name = { from: oldService.name, to: newService.name }
  }

  if (
    newService.description &&
    newService.description !== oldService.description
  ) {
    changes.description = {
      from: oldService.description,
      to: newService.description,
    }
  }

  if (newService.price !== undefined && newService.price !== oldService.price) {
    changes.price = { from: oldService.price, to: newService.price }
  }

  if (
    newService.duration !== undefined &&
    newService.duration !== oldService.duration
  ) {
    changes.duration = { from: oldService.duration, to: newService.duration }
  }

  if (newService.category && newService.category !== oldService.category) {
    changes.category = { from: oldService.category, to: newService.category }
  }

  if (newService.requiredStaffLevel !== oldService.requiredStaffLevel) {
    changes.requiredStaffLevel = {
      from: oldService.requiredStaffLevel,
      to: newService.requiredStaffLevel,
    }
  }

  if (
    newService.isActive !== undefined &&
    newService.isActive !== oldService.isActive
  ) {
    changes.isActive = { from: oldService.isActive, to: newService.isActive }
  }

  return changes
}

/**
 * Handle update operation result
 */
export const handleUpdateServiceResult = (
  result: ServiceOperationResult
): string => {
  return match(result)
    .with(
      { type: 'updated' },
      ({ service, changes }) =>
        `Service ${service.name} updated successfully. Changes: ${changes.join(', ')}`
    )
    .with(
      { type: 'validation_failed' },
      ({ errors }) =>
        `Validation failed: ${errors.map((e) => `${e.field}: ${e.message}`).join(', ')}`
    )
    .with(
      { type: 'not_found' },
      ({ serviceId }) => `Service with ID ${serviceId} not found`
    )
    .with(
      { type: 'duplicate' },
      ({ name, salonId }) =>
        `Service with name ${name} already exists in salon ${salonId}`
    )
    .with({ type: 'error' }, ({ error }) =>
      match(error)
        .with({ type: 'system' }, ({ message }) => `System error: ${message}`)
        .with(
          { type: 'validation' },
          ({ errors }) =>
            `Validation errors: ${errors.map((e) => e.message).join(', ')}`
        )
        .with(
          { type: 'businessRule' },
          ({ message }) => `Business rule: ${message}`
        )
        .otherwise(() => 'Unknown error')
    )
    .otherwise(() => 'Unknown error occurred')
}
