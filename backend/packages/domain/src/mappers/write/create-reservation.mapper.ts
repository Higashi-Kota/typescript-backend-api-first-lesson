/**
 * Create Reservation Mapper (Write Operation)
 * API Request -> Domain Model -> Database Entity
 */

import type { reservations } from '@beauty-salon-backend/database'
import type { components } from '@beauty-salon-backend/generated'
import { match } from 'ts-pattern'
import type {
  CustomerId,
  Reservation,
  ReservationId,
  ReservationOperationResult,
  SalonId,
  ServiceId,
  StaffId,
} from '../../models/reservation'
import { validateReservation } from '../../models/reservation'
import {
  brandCustomerId,
  brandReservationId,
  brandSalonId,
  brandServiceId,
  brandStaffId,
} from '../../shared/brand-utils'
import type { Result } from '../../shared/result'
import { err, ok } from '../../shared/result'
import { generateId } from '../../shared/utils'

// Type aliases for clarity
type CreateReservationRequest =
  components['schemas']['Models.CreateReservationRequest']
type ReservationDbInsert = typeof reservations.$inferInsert

/**
 * Map API Create Request to Domain Model
 */
export const mapCreateReservationApiToDomain = (
  request: CreateReservationRequest
): Result<Partial<Reservation>, ReservationOperationResult> => {
  try {
    // Validate and brand the salon ID
    const salonIdResult = brandSalonId(request.salonId)
    if (salonIdResult.type === 'err') {
      return err({
        type: 'validation_failed',
        errors: [salonIdResult.error],
      })
    }

    // Validate and brand the customer ID
    const customerIdResult = brandCustomerId(request.customerId)
    if (customerIdResult.type === 'err') {
      return err({
        type: 'validation_failed',
        errors: [customerIdResult.error],
      })
    }

    // Validate and brand the staff ID
    const staffIdResult = brandStaffId(request.staffId)
    if (staffIdResult.type === 'err') {
      return err({
        type: 'validation_failed',
        errors: [staffIdResult.error],
      })
    }

    // Validate and brand the service ID
    const serviceIdResult = brandServiceId(request.serviceId)
    if (serviceIdResult.type === 'err') {
      return err({
        type: 'validation_failed',
        errors: [serviceIdResult.error],
      })
    }

    // Calculate duration from start and end times
    const end = new Date(request.startTime) // Will be calculated based on service duration
    end.setMinutes(end.getMinutes() + 60) // Default 60 minutes, should be from service

    const domainReservation: Partial<Reservation> = {
      salonId: salonIdResult.value as SalonId,
      customerId: customerIdResult.value as CustomerId,
      staffId: staffIdResult.value as StaffId,
      serviceId: serviceIdResult.value as ServiceId,
      startTime: request.startTime,
      endTime: end.toISOString(), // Calculate from service duration
      duration: 60, // Should be fetched from service
      status: 'pending',
      totalAmount: 0, // Should be calculated from service price
      depositAmount: 0, // Default
      isPaid: false, // Default
      notes: request.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    // Validate the domain model
    const validationResult = validateReservation(domainReservation)
    if (validationResult.type === 'err') {
      return err({
        type: 'validation_failed',
        errors: validationResult.error,
      })
    }

    return ok(domainReservation)
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
export const mapCreateReservationDomainToDb = (
  reservation: Partial<Reservation>
): ReservationDbInsert => {
  return {
    id: reservation.id ?? generateId('rsv'),
    bookingId: reservation.bookingId ?? null,
    salonId: reservation.salonId!,
    customerId: reservation.customerId!,
    staffId: reservation.staffId!,
    serviceId: reservation.serviceId!,
    startTime: reservation.startTime!,
    endTime: reservation.endTime!,
    duration: reservation.duration ?? 60, // Default 60 minutes
    status: reservation.status ?? 'pending',
    amount: reservation.totalAmount ?? 0, // API has totalAmount, DB has amount
    notes: reservation.notes ?? null,
    createdAt: reservation.createdAt ?? new Date().toISOString(),
    updatedAt: reservation.updatedAt ?? new Date().toISOString(),
    cancelledAt: null,
    cancelledBy: null,
    cancellationReason: reservation.cancellationReason ?? null,
  }
}

/**
 * Complete flow: API → Domain → DB
 */
export const createReservationWriteFlow = (
  request: CreateReservationRequest
): Result<ReservationDbInsert, ReservationOperationResult> => {
  // Step 1: Map API to Domain
  const domainResult = mapCreateReservationApiToDomain(request)
  if (domainResult.type === 'err') {
    return domainResult
  }

  // Step 2: Add ID using brand utility
  const reservationIdResult = brandReservationId(generateId('rsv'))
  if (reservationIdResult.type === 'err') {
    return err({
      type: 'error',
      error: {
        type: 'system',
        message: `Failed to generate reservation ID: ${reservationIdResult.error.message}`,
      },
    })
  }

  const reservationWithId: Partial<Reservation> = {
    ...domainResult.value,
    id: reservationIdResult.value as ReservationId,
  }

  // Step 3: Map Domain to Database
  try {
    const dbInsert = mapCreateReservationDomainToDb(reservationWithId)
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
export const handleCreateReservationResult = (
  result: ReservationOperationResult
): string => {
  return match(result)
    .with(
      { type: 'created' },
      ({ reservation }) => `Reservation ${reservation.id} created successfully`
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
    .with(
      { type: 'time_slot_unavailable' },
      ({ startTime, endTime }) =>
        `Time slot ${startTime} to ${endTime} is not available`
    )
    .with(
      { type: 'staff_unavailable' },
      ({ staffId, time }) => `Staff ${staffId} is not available at ${time}`
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
