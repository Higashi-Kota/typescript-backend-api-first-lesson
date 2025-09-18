/**
 * Create Staff Write Mapper
 * Maps API request to domain model and domain model to database
 */

import { match } from 'ts-pattern'
import type {
  CreateStaffRequest,
  SalonId,
  Staff,
  StaffId,
  StaffOperationResult,
} from '../../models/staff'
import { validateStaff } from '../../models/staff'
import type { ValidationError } from '../../shared/errors'
// import type { components } from '@beauty-salon-backend/generated' // Not needed here
import type { Result } from '../../shared/result'
import { err, ok } from '../../shared/result'

// Type aliases for clarity
type ApiCreateRequest = CreateStaffRequest
type DomainStaff = Staff
type DbStaffInsert = {
  id: string
  salonId: string
  name: string
  email: string
  phoneNumber: string
  specialties: string[]
  imageUrl?: string | null
  bio?: string | null
  yearsOfExperience?: number | null
  certifications?: string[] | null
  qualifications?: any | null // JSON field
  schedules?: any | null // JSON field
  permissions?: any | null // JSON field
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  createdBy?: string | null
  updatedBy?: string | null
}

/**
 * Map API Create Request to Domain Model
 */
export const mapCreateStaffApiToDomain = (
  request: ApiCreateRequest
): Result<Partial<DomainStaff>, ValidationError[]> => {
  try {
    const domainStaff: Partial<DomainStaff> = {
      salonId: request.salonId as SalonId,
      name: request.name,
      contactInfo: {
        email: request.contactInfo.email,
        phoneNumber: request.contactInfo.phoneNumber,
        alternativePhone: request.contactInfo.alternativePhone,
      },
      specialties: request.specialties,
      imageUrl: request.imageUrl,
      bio: request.bio,
      yearsOfExperience: request.yearsOfExperience,
      certifications: request.certifications,
      // These optional fields may come from CreateStaffRequest extension
      ...((request as any).qualifications && {
        qualifications: (request as any).qualifications,
      }),
      ...((request as any).schedules && {
        schedules: (request as any).schedules,
      }),
      ...((request as any).permissions && {
        permissions: (request as any).permissions,
      }),
      isActive: true, // Default to active for new staff
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    // Validate the domain model
    return validateStaff(domainStaff)
  } catch (error) {
    return err([
      { field: 'general', message: `Mapping error: ${error}` },
    ] as ValidationError[])
  }
}

/**
 * Map Domain Model to Database Insert
 */
export const mapCreateStaffDomainToDb = (staff: DomainStaff): DbStaffInsert => {
  return {
    id: staff.id,
    salonId: staff.salonId,
    name: staff.name,
    email: staff.contactInfo.email,
    phoneNumber: staff.contactInfo.phoneNumber,
    specialties: staff.specialties,
    imageUrl: staff.imageUrl ?? null,
    bio: staff.bio ?? null,
    yearsOfExperience: staff.yearsOfExperience ?? null,
    certifications: staff.certifications ?? null,
    qualifications: staff.qualifications
      ? JSON.stringify(staff.qualifications)
      : null,
    schedules: staff.schedules ? JSON.stringify(staff.schedules) : null,
    permissions: staff.permissions ? JSON.stringify(staff.permissions) : null,
    isActive: staff.isActive,
    createdAt: new Date(staff.createdAt),
    updatedAt: new Date(staff.updatedAt),
    createdBy: staff.createdBy ?? null,
    updatedBy: staff.updatedBy ?? null,
  }
}

/**
 * Complete flow: API → Domain → DB
 */
export const createStaffWriteFlow = (
  request: ApiCreateRequest
): Result<DbStaffInsert, StaffOperationResult> => {
  // Step 1: Map API to Domain
  const domainResult = mapCreateStaffApiToDomain(request)

  if (domainResult.type === 'err') {
    return err({
      type: 'validation_failed',
      errors: domainResult.error,
    } as StaffOperationResult)
  }

  // Step 2: Generate ID
  const staffWithId: DomainStaff = {
    ...domainResult.value,
    id: `staff_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` as StaffId,
  } as DomainStaff

  // Step 3: Map Domain to DB
  try {
    const dbInsert = mapCreateStaffDomainToDb(staffWithId)
    return ok(dbInsert)
  } catch (error) {
    return err({
      type: 'error',
      error: {
        type: 'system',
        message: `Failed to map to database format: ${error}`,
      },
    } as StaffOperationResult)
  }
}

/**
 * Handle create operation result
 */
export const handleCreateStaffResult = (
  result: StaffOperationResult
): string => {
  return match(result)
    .with(
      { type: 'created' },
      ({ staff }) =>
        `Staff member ${staff.name} created successfully with ID ${staff.id}`
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
    .with({ type: 'conflict' }, ({ message }) => `Conflict: ${message}`)
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
