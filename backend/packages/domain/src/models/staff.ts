/**
 * Staff Domain Model
 * Implements state management and business logic for staff members
 */

import type { components } from '@beauty-salon-backend/generated'
import { match } from 'ts-pattern'
import type { Brand } from '../shared/brand'
import type { DomainError, ValidationError } from '../shared/errors'
import type {
  StaffLevel,
  StaffPermission,
  StaffQualification,
  StaffSchedule,
} from '../shared/generated-types-shim'
import type { Result } from '../shared/result'
import { err, ok } from '../shared/result'

// Brand the ID types for type safety
export type StaffId = Brand<components['schemas']['Models.StaffId'], 'StaffId'>
export type SalonId = Brand<components['schemas']['Models.SalonId'], 'SalonId'>

// Domain Staff Model - extends generated type with additional business properties
export interface Staff
  extends Omit<components['schemas']['Models.Staff'], 'id' | 'salonId'> {
  id: StaffId
  salonId: SalonId
  // Additional domain properties not in generated types
  qualifications?: StaffQualification[]
  schedules?: StaffSchedule[]
  permissions?: StaffPermission[]
}

// Staff State Management (Sum Type)
export type StaffState =
  | { type: 'active'; staff: Staff }
  | {
      type: 'on_leave'
      staff: Staff
      leaveType: LeaveType
      returnDate?: string
    }
  | {
      type: 'training'
      staff: Staff
      trainingProgram: string
      completionDate: string
    }
  | { type: 'suspended'; staff: Staff; reason: string; until?: string }
  | {
      type: 'terminated'
      staffId: StaffId
      terminatedAt: string
      reason?: string
    }

export type LeaveType =
  | 'vacation'
  | 'sick'
  | 'maternity'
  | 'paternity'
  | 'personal'
  | 'sabbatical'

// Staff Operation Results (Sum Type for business operations)
export type StaffOperationResult =
  | { type: 'created'; staff: Staff }
  | { type: 'updated'; staff: Staff; changes: string[] }
  | { type: 'activated'; staff: Staff }
  | { type: 'deactivated'; staff: Staff; reason: string }
  | { type: 'leave_started'; staff: Staff; leaveType: LeaveType }
  | { type: 'returned_from_leave'; staff: Staff }
  | { type: 'schedule_updated'; staff: Staff; scheduleId: string }
  | { type: 'permissions_updated'; staff: Staff; permissions: string[] }
  | { type: 'terminated'; staffId: StaffId; terminatedAt: string }
  | { type: 'validation_failed'; errors: ValidationError[] }
  | { type: 'not_found'; staffId: StaffId }
  | { type: 'salon_not_found'; salonId: SalonId }
  | { type: 'conflict'; message: string }
  | { type: 'error'; error: DomainError }

// Staff Search and Filter Results
export type StaffSearchResult =
  | { type: 'found'; staff: Staff[]; totalCount: number }
  | { type: 'empty'; query: StaffSearchQuery }
  | { type: 'error'; error: DomainError }

export interface StaffSearchQuery {
  salonId?: SalonId
  specialties?: string[]
  isActive?: boolean
  level?: StaffLevel
  hasAvailability?: boolean
  searchTerm?: string
}

// Staff Events for audit/tracking
export type StaffEvent =
  | {
      type: 'staff_created'
      staff: Staff
      createdBy: string
      timestamp: string
    }
  | {
      type: 'staff_updated'
      staffId: StaffId
      changes: StaffChanges
      updatedBy: string
      timestamp: string
    }
  | {
      type: 'staff_activated'
      staffId: StaffId
      activatedBy: string
      timestamp: string
    }
  | {
      type: 'staff_deactivated'
      staffId: StaffId
      reason: string
      deactivatedBy: string
      timestamp: string
    }
  | {
      type: 'leave_requested'
      staffId: StaffId
      leaveType: LeaveType
      startDate: string
      endDate?: string
    }
  | {
      type: 'leave_approved'
      staffId: StaffId
      approvedBy: string
      timestamp: string
    }
  | {
      type: 'schedule_changed'
      staffId: StaffId
      newSchedule: StaffSchedule[]
      changedBy: string
    }
  | {
      type: 'certification_added'
      staffId: StaffId
      certification: string
      timestamp: string
    }
  | {
      type: 'performance_reviewed'
      staffId: StaffId
      rating: number
      reviewedBy: string
      timestamp: string
    }

export interface StaffChanges {
  name?: { from: string; to: string }
  contactInfo?: { from: any; to: any }
  specialties?: { added: string[]; removed: string[] }
  certifications?: { added: string[]; removed: string[] }
  schedules?: {
    from: StaffSchedule[]
    to: StaffSchedule[]
  }
  permissions?: { added: string[]; removed: string[] }
  isActive?: { from: boolean; to: boolean }
}

// Import types from generated schemas
export type CreateStaffRequest =
  components['schemas']['Models.CreateStaffRequest']
export type UpdateStaffRequest =
  components['schemas']['Models.UpdateStaffRequest']
export type UpdateStaffRequestWithReset =
  components['schemas']['Models.UpdateStaffRequestWithReset']
export type StaffAvailability =
  components['schemas']['Models.StaffAvailability']
export type StaffPerformance = components['schemas']['Models.StaffPerformance']

// Import missing types from shim (temporary workaround)
export type {
  StaffSchedule,
  StaffQualification,
  StaffPermission,
  StaffLevel,
} from '../shared/generated-types-shim'

// Business Logic Functions

/**
 * Check if a staff member is available for bookings
 */
export const isStaffAvailable = (state: StaffState): boolean => {
  return match(state)
    .with({ type: 'active' }, () => true)
    .with({ type: 'training' }, () => false)
    .with({ type: 'on_leave' }, () => false)
    .with({ type: 'suspended' }, () => false)
    .with({ type: 'terminated' }, () => false)
    .exhaustive()
}

/**
 * Check if a staff member can perform a specific service
 */
export const canPerformService = (
  staff: Staff,
  serviceCategory: string,
  requiredLevel?: StaffLevel
): boolean => {
  // Check if staff has the required specialty
  const hasSpecialty = staff.specialties.includes(serviceCategory)

  // If a level is required, check staff qualifications
  if (requiredLevel && staff.qualifications) {
    const hasRequiredLevel = staff.qualifications.some(
      (q: any) =>
        q.type === 'level' &&
        compareStaffLevels(q.value as StaffLevel, requiredLevel) >= 0
    )
    return hasSpecialty && hasRequiredLevel
  }

  return hasSpecialty
}

/**
 * Compare staff levels (returns positive if level1 > level2)
 */
const compareStaffLevels = (level1: StaffLevel, level2: StaffLevel): number => {
  const levels: StaffLevel[] = [
    'junior',
    'stylist',
    'senior',
    'expert',
    'director',
  ]
  return levels.indexOf(level1) - levels.indexOf(level2)
}

/**
 * Calculate staff utilization rate
 */
export const calculateUtilization = (
  schedules: StaffSchedule[],
  actualHoursWorked: number
): number => {
  const totalScheduledHours = schedules.reduce((total, _schedule) => {
    // Simple calculation - would need proper time parsing in production
    return total + 8 // Assuming 8-hour shifts
  }, 0)

  return totalScheduledHours > 0
    ? (actualHoursWorked / totalScheduledHours) * 100
    : 0
}

/**
 * Validate staff data
 */
export const validateStaff = (
  staff: Partial<Staff>
): Result<Staff, ValidationError[]> => {
  const errors: ValidationError[] = []

  if (!staff.name || staff.name.trim().length === 0) {
    errors.push({ field: 'name', message: 'Staff name is required' })
  }

  if (!staff.salonId) {
    errors.push({ field: 'salonId', message: 'Salon ID is required' })
  }

  if (!(staff.contactInfo?.email && staff.contactInfo?.phoneNumber)) {
    errors.push({
      field: 'contactInfo',
      message: 'Email and phone number are required',
    })
  }

  if (!staff.specialties || staff.specialties.length === 0) {
    errors.push({
      field: 'specialties',
      message: 'At least one specialty is required',
    })
  }

  if (staff.yearsOfExperience && staff.yearsOfExperience < 0) {
    errors.push({
      field: 'yearsOfExperience',
      message: 'Years of experience cannot be negative',
    })
  }

  if (errors.length > 0) {
    return err(errors)
  }

  return ok(staff as Staff)
}

/**
 * Check if staff has required permissions
 */
export const hasPermission = (
  staff: Staff,
  resource: string,
  action: string
): boolean => {
  if (!staff.permissions) {
    return false
  }

  return staff.permissions.some((permission: any) => {
    // Check if permission has expired
    if (permission.expiresAt && new Date(permission.expiresAt) < new Date()) {
      return false
    }

    // Check resource and action match
    return (
      permission.resource === resource && permission.actions.includes(action)
    )
  })
}

/**
 * Get staff availability for a specific day
 */
export const getAvailabilityForDay = (
  staff: Staff,
  dayOfWeek: string
): StaffAvailability | undefined => {
  if (!staff.schedules) {
    return undefined
  }

  // Find schedule for the specific day
  const schedule = staff.schedules.find(
    (s: any) => s.dayOfWeek === dayOfWeek && s.isActive
  )

  if (!schedule) {
    return undefined
  }

  return {
    staffId: staff.id,
    dayOfWeek: schedule.dayOfWeek,
    startTime: schedule.startTime,
    endTime: schedule.endTime,
    breakStart: schedule.breakStart,
    breakEnd: schedule.breakEnd,
  } as StaffAvailability
}

/**
 * Transform staff state for different contexts
 */
export const getStaffDisplayInfo = (state: StaffState) => {
  return match(state)
    .with({ type: 'active' }, ({ staff }) => ({
      ...staff,
      status: 'Available',
      statusColor: 'green',
    }))
    .with({ type: 'on_leave' }, ({ staff, leaveType }) => ({
      ...staff,
      status: `On ${leaveType} leave`,
      statusColor: 'yellow',
    }))
    .with({ type: 'training' }, ({ staff, trainingProgram }) => ({
      ...staff,
      status: `In training: ${trainingProgram}`,
      statusColor: 'blue',
    }))
    .with({ type: 'suspended' }, ({ staff, reason }) => ({
      ...staff,
      status: `Suspended: ${reason}`,
      statusColor: 'red',
    }))
    .with({ type: 'terminated' }, ({ staffId }) => ({
      id: staffId,
      status: 'Terminated',
      statusColor: 'gray',
    }))
    .exhaustive()
}
