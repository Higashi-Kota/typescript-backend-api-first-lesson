/**
 * Service Domain Model
 * Implements state management and business logic for services
 */

import type { components } from '@beauty-salon-backend/generated'
import { match } from 'ts-pattern'
import type { Brand } from '../shared/brand'
import type { DomainError, ValidationError } from '../shared/errors'
import type { Result } from '../shared/result'
import { err, ok } from '../shared/result'

// Brand the ID types for type safety
export type ServiceId = Brand<
  components['schemas']['Models.ServiceId'],
  'ServiceId'
>
export type SalonId = Brand<components['schemas']['Models.SalonId'], 'SalonId'>
export type CategoryId = Brand<
  components['schemas']['Models.CategoryId'],
  'CategoryId'
>

// Domain Service Model - extends generated type
export interface Service
  extends Omit<
    components['schemas']['Models.Service'],
    'id' | 'salonId' | 'categoryId'
  > {
  id: ServiceId
  salonId: SalonId
  categoryId?: CategoryId
}

// Service State Management (Sum Type)
export type ServiceState =
  | { type: 'active'; service: Service }
  | { type: 'inactive'; service: Service; reason: string }
  | {
      type: 'seasonal'
      service: Service
      availableFrom: string
      availableUntil: string
    }
  | { type: 'discontinued'; serviceId: ServiceId; discontinuedAt: string }

// Service Operation Results (Sum Type)
export type ServiceOperationResult =
  | { type: 'created'; service: Service }
  | { type: 'updated'; service: Service; changes: string[] }
  | { type: 'activated'; service: Service }
  | { type: 'deactivated'; service: Service; reason: string }
  | { type: 'discontinued'; serviceId: ServiceId }
  | { type: 'validation_failed'; errors: ValidationError[] }
  | { type: 'not_found'; serviceId: ServiceId }
  | { type: 'salon_not_found'; salonId: SalonId }
  | { type: 'duplicate'; name: string; salonId: SalonId }
  | { type: 'error'; error: DomainError }

// Service Search Result
export type ServiceSearchResult =
  | { type: 'found'; services: Service[]; totalCount: number }
  | { type: 'empty'; query: ServiceSearchQuery }
  | { type: 'error'; error: DomainError }

export interface ServiceSearchQuery {
  salonId?: SalonId
  category?: string
  priceMin?: number
  priceMax?: number
  durationMin?: number
  durationMax?: number
  isActive?: boolean
  searchTerm?: string
}

// Service Events for audit/tracking
export type ServiceEvent =
  | {
      type: 'service_created'
      service: Service
      createdBy: string
      timestamp: string
    }
  | {
      type: 'service_updated'
      serviceId: ServiceId
      changes: ServiceChanges
      updatedBy: string
      timestamp: string
    }
  | {
      type: 'service_activated'
      serviceId: ServiceId
      activatedBy: string
      timestamp: string
    }
  | {
      type: 'service_deactivated'
      serviceId: ServiceId
      reason: string
      deactivatedBy: string
      timestamp: string
    }
  | {
      type: 'price_changed'
      serviceId: ServiceId
      oldPrice: number
      newPrice: number
      changedBy: string
      timestamp: string
    }
  | {
      type: 'category_changed'
      serviceId: ServiceId
      oldCategory: string
      newCategory: string
      changedBy: string
      timestamp: string
    }

export interface ServiceChanges {
  name?: { from: string; to: string }
  description?: { from: string; to: string }
  price?: { from: number; to: number }
  duration?: { from: number; to: number }
  category?: { from: string; to: string }
  requiredStaffLevel?: { from: number | undefined; to: number | undefined }
  isActive?: { from: boolean; to: boolean }
}

// Re-export related types from generated schemas
export type ServiceCategory = components['schemas']['Models.ServiceCategory']
export type ServiceCategoryModel =
  components['schemas']['Models.ServiceCategoryModel']
export type CreateServiceRequest =
  components['schemas']['Models.CreateServiceRequest']
export type UpdateServiceRequest =
  components['schemas']['Models.UpdateServiceRequest']
export type UpdateServiceRequestWithReset =
  components['schemas']['Models.UpdateServiceRequestWithReset']

// Business Logic Functions

/**
 * Validate service data
 */
export const validateService = (
  service: Partial<Service>
): Result<Service, ValidationError[]> => {
  const errors: ValidationError[] = []

  if (!service.name || service.name.trim().length === 0) {
    errors.push({ field: 'name', message: 'Service name is required' })
  }

  if (!service.salonId) {
    errors.push({ field: 'salonId', message: 'Salon ID is required' })
  }

  if (!service.description || service.description.trim().length === 0) {
    errors.push({ field: 'description', message: 'Description is required' })
  }

  if (!service.duration || service.duration <= 0) {
    errors.push({
      field: 'duration',
      message: 'Duration must be greater than 0',
    })
  }

  if (!service.price || service.price < 0) {
    errors.push({
      field: 'price',
      message: 'Price cannot be negative',
    })
  }

  if (!service.category) {
    errors.push({ field: 'category', message: 'Category is required' })
  }

  if (errors.length > 0) {
    return err(errors)
  }

  return ok(service as Service)
}

/**
 * Check if service is available
 */
export const isServiceAvailable = (state: ServiceState): boolean => {
  const now = new Date()

  return match(state)
    .with({ type: 'active' }, () => true)
    .with({ type: 'seasonal' }, ({ availableFrom, availableUntil }) => {
      const from = new Date(availableFrom)
      const until = new Date(availableUntil)
      return now >= from && now <= until
    })
    .with({ type: 'inactive' }, () => false)
    .with({ type: 'discontinued' }, () => false)
    .exhaustive()
}

/**
 * Calculate service price with discounts
 */
export const calculateServicePrice = (
  service: Service,
  discountPercentage = 0,
  additionalCharges = 0
): number => {
  const basePrice = service.price
  const discount = basePrice * (discountPercentage / 100)
  return Math.max(0, basePrice - discount + additionalCharges)
}

/**
 * Check if staff can perform service
 */
export const canStaffPerformService = (
  service: Service,
  staffLevel: number
): boolean => {
  if (!service.requiredStaffLevel) {
    return true // No level requirement
  }
  return staffLevel >= service.requiredStaffLevel
}

/**
 * Get service status display
 */
export const getServiceDisplayInfo = (state: ServiceState) => {
  return match(state)
    .with({ type: 'active' }, ({ service }) => ({
      ...service,
      status: 'Available',
      statusColor: 'green',
    }))
    .with({ type: 'inactive' }, ({ service, reason }) => ({
      ...service,
      status: `Inactive: ${reason}`,
      statusColor: 'gray',
    }))
    .with(
      { type: 'seasonal' },
      ({ service, availableFrom, availableUntil }) => ({
        ...service,
        status: `Seasonal (${availableFrom} - ${availableUntil})`,
        statusColor: 'blue',
      })
    )
    .with({ type: 'discontinued' }, ({ serviceId }) => ({
      id: serviceId,
      status: 'Discontinued',
      statusColor: 'red',
    }))
    .exhaustive()
}

/**
 * Group services by category
 */
export const groupServicesByCategory = (
  services: Service[]
): Record<string, Service[]> => {
  return services.reduce(
    (acc, service) => {
      const category = service.category
      if (!acc[category]) {
        acc[category] = []
      }
      acc[category].push(service)
      return acc
    },
    {} as Record<string, Service[]>
  )
}

/**
 * Calculate total duration for multiple services
 */
export const calculateTotalDuration = (services: Service[]): number => {
  return services.reduce((total, service) => total + service.duration, 0)
}

/**
 * Calculate total price for multiple services
 */
export const calculateTotalPrice = (services: Service[]): number => {
  return services.reduce((total, service) => total + service.price, 0)
}

/**
 * Format duration for display (minutes to hours/minutes)
 */
export const formatDuration = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes} minutes`
  }
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  if (remainingMinutes === 0) {
    return `${hours} hour${hours > 1 ? 's' : ''}`
  }
  return `${hours} hour${hours > 1 ? 's' : ''} ${remainingMinutes} minutes`
}

/**
 * Check if service requires special equipment
 */
export const requiresSpecialEquipment = (category: string): boolean => {
  const equipmentCategories = [
    'hair_coloring',
    'hair_treatment',
    'nail_art',
    'eyelash_extension',
    'body_treatment',
  ]
  return equipmentCategories.includes(category.toLowerCase())
}
