/**
 * Update Booking Mapper (Write Operation)
 * API Request -> Domain Model -> Database Entity
 */

import { match } from 'ts-pattern'
import type {
  Booking,
  BookingChanges,
  BookingId,
  BookingOperationResult,
  UpdateBookingRequest,
} from '../../models/booking'
import type { ValidationError } from '../../shared/errors'
import type { Result } from '../../shared/result'
import { err, ok } from '../../shared/result'

// Type aliases for clarity
type ApiUpdateRequest = UpdateBookingRequest
type DomainBooking = Booking
type DbBookingUpdate = {
  status?: string
  actualStartTime?: string | null
  actualEndTime?: string | null
  actualDuration?: number | null
  finalAmount?: number
  checkedInTime?: string | null
  paidAmount?: number
  additionalServices?: string[]
  notes?: string | null
  updatedAt: Date
}

/**
 * Map API Update Request to Domain Model (partial update)
 */
export const mapUpdateBookingApiToDomain = (
  request: ApiUpdateRequest,
  existingBooking: DomainBooking
): Result<Partial<DomainBooking>, ValidationError[]> => {
  try {
    const updates: Partial<DomainBooking> = {}

    if (request.status !== undefined) {
      updates.status = request.status
    }

    if (request.finalAmount !== undefined) {
      updates.finalAmount = request.finalAmount
    }

    if (request.additionalServices !== undefined) {
      updates.additionalServices = request.additionalServices
    }

    if (request.notes !== undefined) {
      updates.notes = request.notes
    }

    updates.updatedAt = new Date().toISOString()

    // Validate business rules
    const errors: ValidationError[] = []

    if (updates.finalAmount !== undefined && updates.finalAmount < 0) {
      errors.push({
        field: 'finalAmount',
        message: 'Final amount cannot be negative',
      })
    }

    // Validate state transitions
    if (updates.status && existingBooking.status === 'completed') {
      errors.push({
        field: 'status',
        message: 'Cannot change status of completed booking',
      })
    }

    if (
      updates.status === 'cancelled' &&
      existingBooking.status === 'in_progress'
    ) {
      errors.push({
        field: 'status',
        message: 'Cannot cancel booking that is in progress',
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
export const mapUpdateBookingDomainToDb = (
  updates: Partial<DomainBooking>,
  _updatedBy?: string
): DbBookingUpdate => {
  const dbUpdate: DbBookingUpdate = {
    updatedAt: new Date(updates.updatedAt || new Date().toISOString()),
  }

  if (updates.status !== undefined) {
    dbUpdate.status = updates.status
  }

  if (updates.actualStartTime !== undefined) {
    dbUpdate.actualStartTime = updates.actualStartTime ?? null
  }

  if (updates.actualEndTime !== undefined) {
    dbUpdate.actualEndTime = updates.actualEndTime ?? null
  }

  if (updates.actualDuration !== undefined) {
    dbUpdate.actualDuration = updates.actualDuration ?? null
  }

  if (updates.finalAmount !== undefined) {
    dbUpdate.finalAmount = updates.finalAmount
  }

  if (updates.checkedInTime !== undefined) {
    dbUpdate.checkedInTime = updates.checkedInTime ?? null
  }

  if (updates.paidAmount !== undefined) {
    dbUpdate.paidAmount = updates.paidAmount
  }

  if (updates.additionalServices !== undefined) {
    dbUpdate.additionalServices = updates.additionalServices
  }

  if (updates.notes !== undefined) {
    dbUpdate.notes = updates.notes ?? null
  }

  return dbUpdate
}

/**
 * Complete flow: API → Domain → DB
 */
export const updateBookingWriteFlow = (
  _bookingId: BookingId,
  request: ApiUpdateRequest,
  existingBooking: DomainBooking
): Result<DbBookingUpdate, BookingOperationResult> => {
  // Step 1: Map API to Domain
  const domainResult = mapUpdateBookingApiToDomain(request, existingBooking)

  if (domainResult.type === 'err') {
    return err({ type: 'validation_failed', errors: domainResult.error })
  }

  // Step 2: Map Domain to DB
  try {
    const dbUpdate = mapUpdateBookingDomainToDb(domainResult.value)
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
export const trackBookingChanges = (
  oldBooking: DomainBooking,
  newBooking: Partial<DomainBooking>
): BookingChanges => {
  const changes: BookingChanges = {}

  if (newBooking.actualStartTime !== oldBooking.actualStartTime) {
    changes.actualStartTime = {
      from: oldBooking.actualStartTime,
      to: newBooking.actualStartTime,
    }
  }

  if (newBooking.actualEndTime !== oldBooking.actualEndTime) {
    changes.actualEndTime = {
      from: oldBooking.actualEndTime,
      to: newBooking.actualEndTime,
    }
  }

  if (newBooking.actualDuration !== oldBooking.actualDuration) {
    changes.actualDuration = {
      from: oldBooking.actualDuration,
      to: newBooking.actualDuration,
    }
  }

  if (
    newBooking.finalAmount !== undefined &&
    newBooking.finalAmount !== oldBooking.finalAmount
  ) {
    changes.finalAmount = {
      from: oldBooking.finalAmount,
      to: newBooking.finalAmount,
    }
  }

  if (newBooking.additionalServices) {
    const oldServices = oldBooking.additionalServices || []
    const newServices = newBooking.additionalServices || []
    const added = newServices.filter((s) => !oldServices.includes(s)) as any[]
    const removed = oldServices.filter((s) => !newServices.includes(s)) as any[]

    if (added.length > 0 || removed.length > 0) {
      changes.additionalServices = { added, removed }
    }
  }

  if (newBooking.notes !== oldBooking.notes) {
    changes.notes = { from: oldBooking.notes, to: newBooking.notes }
  }

  return changes
}

/**
 * Handle update operation result
 */
export const handleUpdateBookingResult = (
  result: BookingOperationResult
): string => {
  return match(result)
    .with(
      { type: 'updated' },
      ({ booking, changes }) =>
        `Booking ${booking.id} updated successfully. Changes: ${changes.join(', ')}`
    )
    .with(
      { type: 'validation_failed' },
      ({ errors }) =>
        `Validation failed: ${errors.map((e) => `${e.field}: ${e.message}`).join(', ')}`
    )
    .with(
      { type: 'not_found' },
      ({ bookingId }) => `Booking with ID ${bookingId} not found`
    )
    .with(
      { type: 'invalid_state' },
      ({ currentState, attemptedAction }) =>
        `Invalid state transition: Cannot ${attemptedAction} from state ${currentState}`
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
