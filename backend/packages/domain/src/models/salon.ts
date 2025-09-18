/**
 * Salon Domain Model
 * Following the established pattern from Customer model
 */

import type { components } from '@beauty-salon-backend/generated'
import { match } from 'ts-pattern'
import type { Brand } from '../shared/brand'
import type { ValidationError } from '../shared/errors'
import type { BusinessHours } from '../shared/generated-types-shim'
import type { Result } from '../shared/result'
import { err, ok } from '../shared/result'

// ============================================================================
// Type Definitions
// ============================================================================

// Brand the ID types for type safety
export type SalonId = Brand<components['schemas']['Models.SalonId'], 'SalonId'>

// Domain Salon Model - extends generated type with additional business properties
export interface Salon
  extends Omit<components['schemas']['Models.Salon'], 'id'> {
  id: SalonId
  // Additional domain properties not in generated types
  businessHours?: BusinessHours[]
}

// Re-export related types from generated schemas
export type SalonSummary = components['schemas']['Models.SalonSummary']
export type CreateSalonRequest =
  components['schemas']['Models.CreateSalonRequest']
export type UpdateSalonRequest =
  components['schemas']['Models.UpdateSalonRequest']
export type SearchSalonRequest =
  components['schemas']['Models.SearchSalonRequest']
export type OpeningHours = components['schemas']['Models.OpeningHours']
export type { BusinessHours } from '../shared/generated-types-shim'
export type Address = components['schemas']['Models.Address']

// ============================================================================
// Sum Types (Discriminated Unions)
// ============================================================================

// Salon state management
export type SalonState =
  | { type: 'active'; salon: Salon }
  | { type: 'suspended'; salon: Salon; reason: string; suspendedAt: string }
  | { type: 'inactive'; salon: Salon; inactiveSince: string }
  | { type: 'pending'; salon: Partial<Salon> }
  | { type: 'deleted'; salonId: SalonId; deletedAt: string }

// Operation results
export type SalonOperationResult =
  | { type: 'success'; salon: Salon }
  | { type: 'validationError'; errors: ValidationError[] }
  | { type: 'notFound'; salonId: SalonId }
  | { type: 'duplicateName'; name: string }
  | { type: 'businessRuleViolation'; rule: string; message: string }
  | { type: 'systemError'; message: string }

// Search results
export type SalonSearchResult =
  | { type: 'found'; salons: Salon[]; total: number }
  | { type: 'empty'; query: SearchSalonRequest }
  | { type: 'error'; message: string }

// Events for event sourcing
export type SalonEvent =
  | {
      type: 'created'
      salonId: SalonId
      data: Salon
      createdBy: string
      timestamp: string
    }
  | {
      type: 'updated'
      salonId: SalonId
      changes: Partial<Salon>
      updatedBy: string
      timestamp: string
    }
  | {
      type: 'suspended'
      salonId: SalonId
      reason: string
      suspendedBy: string
      timestamp: string
    }
  | {
      type: 'activated'
      salonId: SalonId
      activatedBy: string
      timestamp: string
    }
  | { type: 'deleted'; salonId: SalonId; deletedBy: string; timestamp: string }

// ============================================================================
// Domain Logic Functions
// ============================================================================

// Validate salon data
export const validateSalon = (
  salon: Partial<Salon>
): Result<true, ValidationError[]> => {
  const errors: ValidationError[] = []

  if (!salon.name || salon.name.trim().length === 0) {
    errors.push({
      field: 'name',
      message: 'Salon name is required',
      code: 'required',
    })
  }

  if (!salon.description || salon.description.trim().length === 0) {
    errors.push({
      field: 'description',
      message: 'Description is required',
      code: 'required',
    })
  }

  if (!salon.address) {
    errors.push({
      field: 'address',
      message: 'Address is required',
      code: 'required',
    })
  }

  if (!salon.contactInfo?.email) {
    errors.push({
      field: 'contactInfo.email',
      message: 'Email is required',
      code: 'required',
    })
  }

  if (!salon.contactInfo?.phoneNumber) {
    errors.push({
      field: 'contactInfo.phoneNumber',
      message: 'Phone number is required',
      code: 'required',
    })
  }

  if (salon.openingHours && salon.openingHours.length === 0) {
    errors.push({
      field: 'openingHours',
      message: 'At least one opening hour schedule is required',
      code: 'required',
    })
  }

  if (errors.length > 0) {
    return err(errors)
  }

  return ok(true as const)
}

// Check if salon is operational
export const isSalonOperational = (salon: Salon): boolean => {
  const now = new Date()
  const currentDay = now
    .toLocaleDateString('en-US', { weekday: 'long' })
    .toLowerCase()
  const currentTime = now.toTimeString().slice(0, 5) // HH:MM format

  return salon.openingHours.some((hours) => {
    if (hours.dayOfWeek.toLowerCase() !== currentDay) {
      return false
    }
    return hours.openTime <= currentTime && hours.closeTime >= currentTime
  })
}

// Calculate salon capacity based on staff and services
export const calculateSalonCapacity = (
  staffCount: number,
  averageServiceDuration: number
): number => {
  const hoursPerDay = 8
  const minutesPerHour = 60
  const totalMinutesPerDay = hoursPerDay * minutesPerHour
  const servicesPerStaff = Math.floor(
    totalMinutesPerDay / averageServiceDuration
  )

  return staffCount * servicesPerStaff
}

// Get salon status
export const getSalonStatus = (state: SalonState): string => {
  return match(state)
    .with({ type: 'active' }, () => 'Active')
    .with({ type: 'suspended' }, () => 'Suspended')
    .with({ type: 'inactive' }, () => 'Inactive')
    .with({ type: 'pending' }, () => 'Pending')
    .with({ type: 'deleted' }, () => 'Deleted')
    .exhaustive()
}

// Business rules
export const canAcceptReservations = (
  salon: Salon,
  state: SalonState
): boolean => {
  return match(state)
    .with({ type: 'active' }, () => isSalonOperational(salon))
    .otherwise(() => false)
}

export const canUpdateSalon = (state: SalonState): boolean => {
  return match(state)
    .with({ type: 'active' }, () => true)
    .with({ type: 'suspended' }, () => true)
    .with({ type: 'inactive' }, () => true)
    .otherwise(() => false)
}

// Format salon for display
export const formatSalonSummary = (salon: Salon): SalonSummary => {
  return {
    id: salon.id,
    name: salon.name,
    address: salon.address,
    rating: undefined, // Will be populated from reviews
    reviewCount: undefined, // Will be populated from reviews
  }
}

// Check for schedule conflicts
export const hasScheduleConflict = (
  schedule1: OpeningHours,
  schedule2: OpeningHours
): boolean => {
  if (schedule1.dayOfWeek !== schedule2.dayOfWeek) {
    return false
  }

  const start1 = schedule1.openTime
  const end1 = schedule1.closeTime
  const start2 = schedule2.openTime
  const end2 = schedule2.closeTime

  return !(end1 <= start2 || end2 <= start1)
}

// Merge opening hours
export const mergeOpeningHours = (
  existingHours: OpeningHours[],
  newHours: OpeningHours[]
): Result<OpeningHours[], string> => {
  const merged = [...existingHours]

  for (const newSchedule of newHours) {
    const conflictIndex = merged.findIndex((existing) =>
      hasScheduleConflict(existing, newSchedule)
    )

    if (conflictIndex !== -1) {
      // Replace conflicting schedule
      merged[conflictIndex] = newSchedule
    } else {
      merged.push(newSchedule)
    }
  }

  return ok(merged)
}

// Feature management
export const addFeature = (
  salon: Salon,
  feature: string
): Result<Salon, string> => {
  if (salon.features?.includes(feature)) {
    return err('Feature already exists')
  }

  return ok({
    ...salon,
    features: [...(salon.features ?? []), feature],
  })
}

export const removeFeature = (
  salon: Salon,
  feature: string
): Result<Salon, string> => {
  if (!salon.features?.includes(feature)) {
    return err('Feature not found')
  }

  return ok({
    ...salon,
    features: salon.features.filter((f) => f !== feature),
  })
}
