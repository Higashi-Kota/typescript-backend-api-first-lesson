/**
 * Get Service Mapper (Read Operation)
 * Database Entity -> Domain Model -> API Response
 */

import type { services } from '@beauty-salon-backend/database'
import type { components } from '@beauty-salon-backend/generated'
import type { Service, ServiceOperationResult } from '../../models/service'
import type { Result } from '../../shared/result'
import { err, ok } from '../../shared/result'

// Type aliases for clarity
type ServiceDbRecord = typeof services.$inferSelect
type ServiceApiResponse = components['schemas']['Models.Service']

/**
 * Convert staff level enum to number for API
 */
const mapStaffLevelToNumber = (
  level:
    | 'junior'
    | 'stylist'
    | 'senior'
    | 'expert'
    | 'director'
    | null
    | undefined
): number | undefined => {
  if (!level) {
    return undefined
  }

  const levelMap: Record<string, number> = {
    junior: 1,
    stylist: 2,
    senior: 3,
    expert: 4,
    director: 5,
  }

  return levelMap[level] ?? undefined
}

/**
 * Map Database Record to Domain Model
 */
export const mapGetServiceDbToDomain = (
  record: ServiceDbRecord
): Result<Service, ServiceOperationResult> => {
  try {
    const domainService: Service = {
      id: record.id as any, // Will be branded
      salonId: record.salonId as any, // Will be branded
      name: record.name,
      description: record.description ?? '', // Handle null from DB
      duration: record.duration,
      price: record.price,
      // Category will need to be populated from a join or separate lookup
      category: 'general' as any, // TODO: Fetch from categories table
      categoryId: record.categoryId ? (record.categoryId as any) : undefined,
      imageUrl: record.imageUrl ?? undefined,
      // Convert staff level enum to number if needed, or keep as is
      requiredStaffLevel: mapStaffLevelToNumber(record.requiredStaffLevel),
      isActive: record.isActive,
      createdAt: record.createdAt,
      createdBy: undefined, // Not in DB schema
      updatedAt: record.updatedAt,
      updatedBy: undefined, // Not in DB schema
    }

    return ok(domainService)
  } catch (error) {
    return err({
      type: 'error',
      error: {
        type: 'system',
        message: `Failed to map database record: ${error}`,
      },
    })
  }
}

/**
 * Map Domain Model to API Response
 */
export const mapGetServiceDomainToApi = (
  service: Service
): ServiceApiResponse => {
  return {
    id: service.id,
    salonId: service.salonId,
    name: service.name,
    description: service.description,
    duration: service.duration,
    price: service.price,
    category: service.category,
    categoryId: service.categoryId,
    imageUrl: service.imageUrl,
    requiredStaffLevel: service.requiredStaffLevel,
    isActive: service.isActive,
    createdAt: service.createdAt,
    createdBy: service.createdBy,
    updatedAt: service.updatedAt,
    updatedBy: service.updatedBy,
  }
}

/**
 * Complete flow: DB → Domain → API
 */
export const getServiceReadFlow = (
  record: ServiceDbRecord | null
): Result<ServiceApiResponse, ServiceOperationResult> => {
  // Handle not found case
  if (!record) {
    return err({
      type: 'not_found',
      serviceId: 'unknown' as any,
    })
  }

  // Step 1: Map DB to Domain
  const domainResult = mapGetServiceDbToDomain(record)
  if (domainResult.type === 'err') {
    return domainResult
  }

  // Step 2: Map Domain to API
  try {
    const apiResponse = mapGetServiceDomainToApi(domainResult.value)
    return ok(apiResponse)
  } catch (error) {
    return err({
      type: 'error',
      error: {
        type: 'system',
        message: `Failed to map to API response: ${error}`,
      },
    })
  }
}

/**
 * Map multiple services for list operations
 */
export const mapServiceListDbToDomain = (
  records: ServiceDbRecord[]
): Result<Service[], ServiceOperationResult> => {
  try {
    const services: Service[] = []

    for (const record of records) {
      const result = mapGetServiceDbToDomain(record)
      if (result.type === 'err') {
        return result
      }
      services.push(result.value)
    }

    return ok(services)
  } catch (error) {
    return err({
      type: 'error',
      error: {
        type: 'system',
        message: `Failed to map service list: ${error}`,
      },
    })
  }
}

/**
 * Map service list to API response
 */
export const mapServiceListDomainToApi = (
  services: Service[]
): ServiceApiResponse[] => {
  return services.map(mapGetServiceDomainToApi)
}

/**
 * Complete flow for list operations
 */
export const getServiceListReadFlow = (
  records: ServiceDbRecord[]
): Result<ServiceApiResponse[], ServiceOperationResult> => {
  // Step 1: Map DB to Domain
  const domainResult = mapServiceListDbToDomain(records)
  if (domainResult.type === 'err') {
    return domainResult
  }

  // Step 2: Map Domain to API
  try {
    const apiResponses = mapServiceListDomainToApi(domainResult.value)
    return ok(apiResponses)
  } catch (error) {
    return err({
      type: 'error',
      error: {
        type: 'system',
        message: `Failed to map to API response: ${error}`,
      },
    })
  }
}
