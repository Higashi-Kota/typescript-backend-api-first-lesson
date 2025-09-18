/**
 * Update Reservation Mapper (Write Operation)
 * API Request -> Domain Model -> Database Entity
 */

import { match } from 'ts-pattern'
import type {
  Reservation,
  ReservationChanges,
  ReservationId,
  ReservationOperationResult,
  StaffId,
  UpdateReservationRequest,
  UpdateReservationRequestWithReset,
} from '../../models/reservation'
import { brandStaffId } from '../../shared/brand-utils'
import type { ValidationError } from '../../shared/errors'
import type { Result } from '../../shared/result'
import { err, ok } from '../../shared/result'

// Type aliases for clarity
type ApiUpdateRequest = UpdateReservationRequest
type DomainReservation = Reservation
type DbReservationUpdate = {
  startTime?: string
  staffId?: string
  status?: string
  notes?: string | null
  updatedAt: Date
  cancelledAt?: string | null
  cancellationReason?: string | null
}

/**
 * Map API Update Request to Domain Model (partial update)
 */
export const mapUpdateReservationApiToDomain = (
  request: ApiUpdateRequest,
  existingReservation: DomainReservation
): Result<Partial<DomainReservation>, ValidationError[]> => {
  try {
    const updates: Partial<DomainReservation> = {}
    const errors: ValidationError[] = []

    if (request.startTime !== undefined) {
      updates.startTime = request.startTime
    }

    if (request.staffId !== undefined) {
      const staffIdResult = brandStaffId(request.staffId)
      if (staffIdResult.type === 'err') {
        errors.push(staffIdResult.error)
      } else {
        updates.staffId = staffIdResult.value as StaffId
      }
    }

    if (request.status !== undefined) {
      updates.status = request.status
    }

    if (request.notes !== undefined) {
      updates.notes = request.notes
    }

    updates.updatedAt = new Date().toISOString()

    // Validate time logic if times are being updated

    if (updates.startTime) {
      const start = new Date(updates.startTime)
      const existingEnd = new Date(existingReservation.endTime)

      if (start >= existingEnd) {
        errors.push({
          field: 'startTime',
          message: 'Start time must be before end time',
        })
      }

      if (start < new Date()) {
        errors.push({
          field: 'startTime',
          message: 'Cannot update reservation to a past time',
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
 * Map API Update Request with Reset to Domain Model
 * Handles null values for field resets
 */
export const mapUpdateReservationWithResetApiToDomain = (
  request: UpdateReservationRequestWithReset,
  existingReservation: DomainReservation
): Result<Partial<DomainReservation>, ValidationError[]> => {
  try {
    const updates: Partial<DomainReservation> = {}

    if (request.startTime !== undefined) {
      updates.startTime = request.startTime
    }

    if (request.staffId !== undefined) {
      const staffIdResult = brandStaffId(request.staffId)
      if (staffIdResult.type === 'err') {
        errors.push(staffIdResult.error)
      } else {
        updates.staffId = staffIdResult.value as StaffId
      }
    }

    if (request.status !== undefined) {
      updates.status = request.status
    }

    // Handle nullable fields (can be reset to null)
    if (request.notes !== undefined) {
      updates.notes = request.notes === null ? undefined : request.notes
    }

    updates.updatedAt = new Date().toISOString()

    // Validate (similar to regular update)
    const errors: ValidationError[] = []

    if (updates.startTime) {
      const start = new Date(updates.startTime)
      const existingEnd = new Date(existingReservation.endTime)

      if (start >= existingEnd) {
        errors.push({
          field: 'startTime',
          message: 'Start time must be before end time',
        })
      }

      if (start < new Date()) {
        errors.push({
          field: 'startTime',
          message: 'Cannot update reservation to a past time',
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
export const mapUpdateReservationDomainToDb = (
  updates: Partial<DomainReservation>,
  _updatedBy?: string
): DbReservationUpdate => {
  const dbUpdate: DbReservationUpdate = {
    updatedAt: new Date(updates.updatedAt || new Date().toISOString()),
  }

  if (updates.startTime !== undefined) {
    dbUpdate.startTime = updates.startTime
  }

  if (updates.staffId !== undefined) {
    dbUpdate.staffId = updates.staffId
  }

  if (updates.status !== undefined) {
    dbUpdate.status = updates.status
    // Handle cancellation fields
    if (updates.status === 'cancelled') {
      dbUpdate.cancelledAt = new Date().toISOString()
      dbUpdate.cancellationReason = updates.cancellationReason ?? null
    }
  }

  if (updates.notes !== undefined) {
    dbUpdate.notes = updates.notes ?? null
  }

  return dbUpdate
}

/**
 * Complete flow: API → Domain → DB
 */
export const updateReservationWriteFlow = (
  _reservationId: ReservationId,
  request: ApiUpdateRequest,
  existingReservation: DomainReservation
): Result<DbReservationUpdate, ReservationOperationResult> => {
  // Step 1: Map API to Domain
  const domainResult = mapUpdateReservationApiToDomain(
    request,
    existingReservation
  )

  if (domainResult.type === 'err') {
    return err({ type: 'validation_failed', errors: domainResult.error })
  }

  // Step 2: Map Domain to DB
  try {
    const dbUpdate = mapUpdateReservationDomainToDb(domainResult.value)
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
export const trackReservationChanges = (
  oldReservation: DomainReservation,
  newReservation: Partial<DomainReservation>
): ReservationChanges => {
  const changes: ReservationChanges = {}

  if (
    newReservation.startTime &&
    newReservation.startTime !== oldReservation.startTime
  ) {
    changes.startTime = {
      from: oldReservation.startTime,
      to: newReservation.startTime,
    }
  }

  if (
    newReservation.staffId &&
    newReservation.staffId !== oldReservation.staffId
  ) {
    changes.staffId = {
      from: oldReservation.staffId,
      to: newReservation.staffId,
    }
  }

  if (
    newReservation.status &&
    newReservation.status !== oldReservation.status
  ) {
    changes.status = { from: oldReservation.status, to: newReservation.status }
  }

  if (newReservation.notes !== oldReservation.notes) {
    changes.notes = { from: oldReservation.notes, to: newReservation.notes }
  }

  return changes
}

/**
 * Handle update operation result
 */
export const handleUpdateReservationResult = (
  result: ReservationOperationResult
): string => {
  return match(result)
    .with(
      { type: 'updated' },
      ({ reservation, changes }) =>
        `Reservation ${reservation.id} updated successfully. Changes: ${changes.join(', ')}`
    )
    .with(
      { type: 'validation_failed' },
      ({ errors }) =>
        `Validation failed: ${errors.map((e) => `${e.field}: ${e.message}`).join(', ')}`
    )
    .with(
      { type: 'not_found' },
      ({ reservationId }) => `Reservation with ID ${reservationId} not found`
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
