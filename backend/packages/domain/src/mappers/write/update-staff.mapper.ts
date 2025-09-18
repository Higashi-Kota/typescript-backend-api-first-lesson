import { match } from 'ts-pattern'
import type {
  Staff,
  StaffChanges,
  StaffId,
  StaffOperationResult,
  UpdateStaffRequest,
  UpdateStaffRequestWithReset,
} from '../../models/staff'
import type { ValidationError } from '../../shared/errors'
import type { Result } from '../../shared/result'
import { err, ok } from '../../shared/result'

// Type aliases for clarity
type ApiUpdateRequest = UpdateStaffRequest
type ApiUpdateRequestWithReset = UpdateStaffRequestWithReset
type DomainStaff = Staff
type DbStaffUpdate = {
  name?: string
  email?: string
  phoneNumber?: string
  specialties?: string[]
  imageUrl?: string | null
  bio?: string | null
  yearsOfExperience?: number | null
  certifications?: string[] | null
  qualifications?: any | null
  schedules?: any | null
  permissions?: any | null
  isActive?: boolean
  updatedAt: Date
  updatedBy?: string | null
}

/**
 * Map API Update Request to Domain Model (partial update)
 */
export const mapUpdateStaffApiToDomain = (
  request: ApiUpdateRequest,
  existingStaff: DomainStaff
): Result<Partial<DomainStaff>, ValidationError[]> => {
  try {
    const updates: Partial<DomainStaff> = {}

    if (request.name !== undefined) {
      updates.name = request.name
    }

    if (request.contactInfo !== undefined) {
      updates.contactInfo = {
        ...existingStaff.contactInfo,
        ...request.contactInfo,
      }
    }

    if (request.specialties !== undefined) {
      updates.specialties = request.specialties
    }

    if (request.imageUrl !== undefined) {
      updates.imageUrl = request.imageUrl
    }

    if (request.bio !== undefined) {
      updates.bio = request.bio
    }

    if (request.yearsOfExperience !== undefined) {
      updates.yearsOfExperience = request.yearsOfExperience
    }

    if (request.certifications !== undefined) {
      updates.certifications = request.certifications
    }

    // Handle optional domain-specific properties
    if ((request as any).qualifications !== undefined) {
      updates.qualifications = (request as any).qualifications
    }

    if ((request as any).schedules !== undefined) {
      updates.schedules = (request as any).schedules
    }

    if ((request as any).permissions !== undefined) {
      updates.permissions = (request as any).permissions
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
      errors.push({ field: 'name', message: 'Staff name cannot be empty' })
    }

    if (updates.specialties !== undefined && updates.specialties.length === 0) {
      errors.push({
        field: 'specialties',
        message: 'At least one specialty is required',
      })
    }

    if (
      updates.yearsOfExperience !== undefined &&
      updates.yearsOfExperience < 0
    ) {
      errors.push({
        field: 'yearsOfExperience',
        message: 'Years of experience cannot be negative',
      })
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
export const mapUpdateStaffWithResetApiToDomain = (
  request: ApiUpdateRequestWithReset,
  existingStaff: DomainStaff
): Result<Partial<DomainStaff>, ValidationError[]> => {
  try {
    const updates: Partial<DomainStaff> = {}

    if (request.name !== undefined) {
      updates.name = request.name
    }

    if (request.contactInfo !== undefined) {
      updates.contactInfo = {
        ...existingStaff.contactInfo,
        ...request.contactInfo,
      }
    }

    if (request.specialties !== undefined) {
      updates.specialties = request.specialties
    }

    // Handle nullable fields (can be reset to null)
    if (request.imageUrl !== undefined) {
      updates.imageUrl =
        request.imageUrl === null ? undefined : request.imageUrl
    }

    if (request.bio !== undefined) {
      updates.bio = request.bio === null ? undefined : request.bio
    }

    if (request.yearsOfExperience !== undefined) {
      updates.yearsOfExperience =
        request.yearsOfExperience === null
          ? undefined
          : request.yearsOfExperience
    }

    if (request.certifications !== undefined) {
      updates.certifications =
        request.certifications === null ? undefined : request.certifications
    }

    // Handle optional domain-specific properties with reset
    if ((request as any).qualifications !== undefined) {
      updates.qualifications =
        (request as any).qualifications === null
          ? undefined
          : (request as any).qualifications
    }

    if ((request as any).schedules !== undefined) {
      updates.schedules =
        (request as any).schedules === null
          ? undefined
          : (request as any).schedules
    }

    if ((request as any).permissions !== undefined) {
      updates.permissions =
        (request as any).permissions === null
          ? undefined
          : (request as any).permissions
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
      errors.push({ field: 'name', message: 'Staff name cannot be empty' })
    }

    if (updates.specialties !== undefined && updates.specialties.length === 0) {
      errors.push({
        field: 'specialties',
        message: 'At least one specialty is required',
      })
    }

    if (
      updates.yearsOfExperience !== undefined &&
      updates.yearsOfExperience < 0
    ) {
      errors.push({
        field: 'yearsOfExperience',
        message: 'Years of experience cannot be negative',
      })
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
export const mapUpdateStaffDomainToDb = (
  updates: Partial<DomainStaff>,
  updatedBy?: string
): DbStaffUpdate => {
  const dbUpdate: DbStaffUpdate = {
    updatedAt: new Date(updates.updatedAt || new Date().toISOString()),
    updatedBy: updatedBy ?? null,
  }

  if (updates.name !== undefined) {
    dbUpdate.name = updates.name
  }

  if (updates.contactInfo !== undefined) {
    if (updates.contactInfo.email !== undefined) {
      dbUpdate.email = updates.contactInfo.email
    }
    if (updates.contactInfo.phoneNumber !== undefined) {
      dbUpdate.phoneNumber = updates.contactInfo.phoneNumber
    }
  }

  if (updates.specialties !== undefined) {
    dbUpdate.specialties = updates.specialties
  }

  if (updates.imageUrl !== undefined) {
    dbUpdate.imageUrl = updates.imageUrl ?? null
  }

  if (updates.bio !== undefined) {
    dbUpdate.bio = updates.bio ?? null
  }

  if (updates.yearsOfExperience !== undefined) {
    dbUpdate.yearsOfExperience = updates.yearsOfExperience ?? null
  }

  if (updates.certifications !== undefined) {
    dbUpdate.certifications = updates.certifications ?? null
  }

  if (updates.qualifications !== undefined) {
    dbUpdate.qualifications = updates.qualifications
      ? JSON.stringify(updates.qualifications)
      : null
  }

  if (updates.schedules !== undefined) {
    dbUpdate.schedules = updates.schedules
      ? JSON.stringify(updates.schedules)
      : null
  }

  if (updates.permissions !== undefined) {
    dbUpdate.permissions = updates.permissions
      ? JSON.stringify(updates.permissions)
      : null
  }

  if (updates.isActive !== undefined) {
    dbUpdate.isActive = updates.isActive
  }

  return dbUpdate
}

/**
 * Complete flow: API → Domain → DB
 */
export const updateStaffWriteFlow = (
  _staffId: StaffId,
  request: ApiUpdateRequest | ApiUpdateRequestWithReset,
  existingStaff: DomainStaff,
  isResetRequest = false
): Result<DbStaffUpdate, StaffOperationResult> => {
  // Step 1: Map API to Domain
  const domainResult = isResetRequest
    ? mapUpdateStaffWithResetApiToDomain(
        request as ApiUpdateRequestWithReset,
        existingStaff
      )
    : mapUpdateStaffApiToDomain(request as ApiUpdateRequest, existingStaff)

  if (domainResult.type === 'err') {
    return err({ type: 'validation_failed', errors: domainResult.error })
  }

  // Step 2: Map Domain to DB
  try {
    const dbUpdate = mapUpdateStaffDomainToDb(domainResult.value)
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
export const trackStaffChanges = (
  oldStaff: DomainStaff,
  newStaff: Partial<DomainStaff>
): StaffChanges => {
  const changes: StaffChanges = {}

  if (newStaff.name && newStaff.name !== oldStaff.name) {
    changes.name = { from: oldStaff.name, to: newStaff.name }
  }

  if (
    newStaff.contactInfo &&
    JSON.stringify(newStaff.contactInfo) !==
      JSON.stringify(oldStaff.contactInfo)
  ) {
    changes.contactInfo = {
      from: oldStaff.contactInfo,
      to: newStaff.contactInfo,
    }
  }

  if (
    newStaff.specialties &&
    JSON.stringify(newStaff.specialties) !==
      JSON.stringify(oldStaff.specialties)
  ) {
    const added = newStaff.specialties?.filter(
      (s) => !oldStaff.specialties.includes(s)
    )
    const removed = oldStaff.specialties.filter(
      (s) => !newStaff.specialties?.includes(s)
    )
    changes.specialties = { added, removed }
  }

  if (
    newStaff.certifications &&
    JSON.stringify(newStaff.certifications) !==
      JSON.stringify(oldStaff.certifications)
  ) {
    const added = (newStaff.certifications || []).filter(
      (c) => !(oldStaff.certifications || []).includes(c)
    )
    const removed = (oldStaff.certifications || []).filter(
      (c) => !(newStaff.certifications || []).includes(c)
    )
    changes.certifications = { added, removed }
  }

  if (
    newStaff.isActive !== undefined &&
    newStaff.isActive !== oldStaff.isActive
  ) {
    changes.isActive = { from: oldStaff.isActive, to: newStaff.isActive }
  }

  return changes
}

/**
 * Handle update operation result
 */
export const handleUpdateStaffResult = (
  result: StaffOperationResult
): string => {
  return match(result)
    .with(
      { type: 'updated' },
      ({ staff, changes }) =>
        `Staff member ${staff.name} updated successfully. Changes: ${changes.join(', ')}`
    )
    .with(
      { type: 'validation_failed' },
      ({ errors }) =>
        `Validation failed: ${errors.map((e) => `${e.field}: ${e.message}`).join(', ')}`
    )
    .with(
      { type: 'not_found' },
      ({ staffId }) => `Staff member with ID ${staffId} not found`
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
