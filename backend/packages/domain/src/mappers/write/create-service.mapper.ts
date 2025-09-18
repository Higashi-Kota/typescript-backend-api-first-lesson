/**
 * Create Service Mapper (Write Operation)
 * API Request -> Domain Model -> Database Entity
 */

import type { services } from '@beauty-salon-backend/database'
import type { components } from '@beauty-salon-backend/generated'
import { match } from 'ts-pattern'
import type {
  CategoryId,
  SalonId,
  Service,
  ServiceId,
  ServiceOperationResult,
} from '../../models/service'
import { validateService } from '../../models/service'
import {
  brandCategoryId,
  brandSalonId,
  brandServiceId,
} from '../../shared/brand-utils'
import type { Result } from '../../shared/result'
import { err, ok } from '../../shared/result'
import { generateId } from '../../shared/utils'

// Type aliases for clarity
type CreateServiceRequest = components['schemas']['Models.CreateServiceRequest']
type ServiceDbInsert = typeof services.$inferInsert

/**
 * Convert number to staff level enum for DB
 */
const mapNumberToStaffLevel = (
  level: number | undefined
): 'junior' | 'stylist' | 'senior' | 'expert' | 'director' | null => {
  if (!level) {
    return null
  }

  const levelMap: Record<
    number,
    'junior' | 'stylist' | 'senior' | 'expert' | 'director'
  > = {
    1: 'junior',
    2: 'stylist',
    3: 'senior',
    4: 'expert',
    5: 'director',
  }

  return levelMap[level] ?? null
}

/**
 * Map API Create Request to Domain Model
 */
export const mapCreateServiceApiToDomain = (
  request: CreateServiceRequest
): Result<Partial<Service>, ServiceOperationResult> => {
  try {
    // Validate and brand the salon ID
    const salonIdResult = brandSalonId(request.salonId)
    if (salonIdResult.type === 'err') {
      return err({
        type: 'validation_failed',
        errors: [salonIdResult.error],
      })
    }

    // Validate and brand the category ID if provided
    let categoryId: CategoryId | undefined
    if (request.categoryId) {
      const categoryIdResult = brandCategoryId(request.categoryId)
      if (categoryIdResult.type === 'err') {
        return err({
          type: 'validation_failed',
          errors: [categoryIdResult.error],
        })
      }
      categoryId = categoryIdResult.value as CategoryId
    }

    const domainService: Partial<Service> = {
      salonId: salonIdResult.value as SalonId,
      name: request.name.trim(),
      description: request.description.trim(),
      duration: request.duration,
      price: request.price,
      category: request.category,
      categoryId,
      imageUrl: request.imageUrl,
      requiredStaffLevel: request.requiredStaffLevel,
      isActive: true, // Default to active for new services
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    // Validate the domain model
    const validationResult = validateService(domainService)
    if (validationResult.type === 'err') {
      return err({
        type: 'validation_failed',
        errors: validationResult.error,
      })
    }

    return ok(domainService)
  } catch (error) {
    return err({
      type: 'error',
      error: { type: 'system', message: `Mapping error: ${error}` },
    })
  }
}

/**
 * Map Domain Model to Database Entity
 */
export const mapCreateServiceDomainToDb = (
  service: Partial<Service>
): ServiceDbInsert => {
  return {
    id: service.id ?? generateId('srv'),
    salonId: service.salonId!,
    name: service.name!,
    description: service.description,
    duration: service.duration!,
    price: service.price!,
    // Note: category is not in DB, only categoryId
    categoryId: service.categoryId ?? null,
    imageUrl: service.imageUrl ?? null,
    requiredStaffLevel: mapNumberToStaffLevel(service.requiredStaffLevel),
    isActive: service.isActive ?? true,
    createdAt: service.createdAt ?? new Date().toISOString(),
    updatedAt: service.updatedAt ?? new Date().toISOString(),
  }
}

/**
 * Complete flow: API → Domain → DB
 */
export const createServiceWriteFlow = (
  request: CreateServiceRequest
): Result<ServiceDbInsert, ServiceOperationResult> => {
  // Step 1: Map API to Domain
  const domainResult = mapCreateServiceApiToDomain(request)
  if (domainResult.type === 'err') {
    return domainResult
  }

  // Step 2: Add ID using brand utility
  const serviceIdResult = brandServiceId(generateId('srv'))
  if (serviceIdResult.type === 'err') {
    return err({
      type: 'error',
      error: {
        type: 'system',
        message: `Failed to generate service ID: ${serviceIdResult.error.message}`,
      },
    })
  }

  const serviceWithId: Partial<Service> = {
    ...domainResult.value,
    id: serviceIdResult.value as ServiceId,
  }

  // Step 3: Map Domain to Database
  try {
    const dbInsert = mapCreateServiceDomainToDb(serviceWithId)
    return ok(dbInsert)
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
 * Handle create operation result
 */
export const handleCreateServiceResult = (
  result: ServiceOperationResult
): string => {
  return match(result)
    .with(
      { type: 'created' },
      ({ service }) => `Service ${service.name} created successfully`
    )
    .with(
      { type: 'validation_failed' },
      ({ errors }) =>
        `Validation failed: ${errors.map((e) => `${e.field}: ${e.message}`).join(', ')}`
    )
    .with(
      { type: 'salon_not_found' },
      ({ salonId }) => `Salon with ID ${salonId} not found`
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
