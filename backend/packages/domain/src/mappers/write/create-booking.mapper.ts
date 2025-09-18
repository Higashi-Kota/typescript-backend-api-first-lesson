/**
 * Create Booking Mapper (Write Operation)
 * API Request -> Domain Model -> Database Entity
 */

import type { bookings } from '@beauty-salon-backend/database'
import type { components } from '@beauty-salon-backend/generated'
import { match } from 'ts-pattern'
import type {
  Booking,
  BookingId,
  BookingOperationResult,
  CustomerId,
  SalonId,
} from '../../models/booking'
import { validateBooking } from '../../models/booking'
import type { ReservationId } from '../../models/reservation'
import {
  brandBookingId,
  brandCustomerId,
  brandReservationId,
  brandSalonId,
} from '../../shared/brand-utils'
import type { Result } from '../../shared/result'
import { err, ok } from '../../shared/result'
import { generateId } from '../../shared/utils'

// Type aliases for clarity
type CreateBookingRequest = components['schemas']['Models.CreateBookingRequest']
type BookingDbInsert = typeof bookings.$inferInsert

/**
 * Map API Create Request to Domain Model
 */
export const mapCreateBookingApiToDomain = (
  request: CreateBookingRequest
): Result<Partial<Booking>, BookingOperationResult> => {
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

    // Map reservation IDs with validation
    const reservationIds: ReservationId[] = []
    if (request.reservationIds) {
      for (const id of request.reservationIds) {
        const brandedIdResult = brandReservationId(id)
        if (brandedIdResult.type === 'err') {
          return err({
            type: 'validation_failed',
            errors: [brandedIdResult.error],
          })
        }
        reservationIds.push(brandedIdResult.value as ReservationId)
      }
    }

    const domainBooking: Partial<Booking> = {
      salonId: salonIdResult.value as SalonId,
      customerId: customerIdResult.value as CustomerId,
      reservationIds,
      status: request.status ?? 'confirmed',
      totalAmount: request.totalAmount,
      finalAmount: request.finalAmount ?? request.totalAmount,
      additionalServices: request.additionalServices,
      notes: request.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    // Validate the domain model
    const validationResult = validateBooking(domainBooking)
    if (validationResult.type === 'err') {
      return err({
        type: 'validation_failed',
        errors: validationResult.error,
      })
    }

    return ok(domainBooking)
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
export const mapCreateBookingDomainToDb = (
  booking: Partial<Booking>
): BookingDbInsert => {
  // Generate default values for required DB fields
  const now = new Date()
  const bookingDate = now.toISOString().split('T')[0]
  const startTime = now.toISOString()
  const endTime = new Date(now.getTime() + 60 * 60 * 1000).toISOString() // 1 hour later

  return {
    id: booking.id ?? generateId('bkg'),
    bookingNumber: `BK${Date.now()}`, // Generate booking number
    salonId: booking.salonId!,
    customerId: booking.customerId!,
    staffId: booking.staffId ?? booking.salonId!, // Use salon ID as fallback
    bookingDate,
    startTime,
    endTime,
    duration: 60, // Default 60 minutes
    status: booking.status ?? 'pending',
    bookingStatePayload: {},
    subtotal: booking.totalAmount ?? 0,
    discountAmount: 0,
    taxAmount: 0,
    totalAmount: booking.totalAmount ?? 0,
    depositAmount: 0,
    pointsUsed: 0,
    pointsEarned: 0,
    customerRequest: booking.notes ?? null,
    internalNotes: null,
    reminderSent: false,
    reminderSentAt: null,
    cancelledAt: null,
    cancelledBy: null,
    cancellationReason: null,
    cancellationFee: 0,
    completedAt: null,
    actualStartTime: null,
    actualEndTime: null,
    source: 'web',
    ipAddress: null,
    userAgent: null,
    createdAt: booking.createdAt ?? now.toISOString(),
    updatedAt: booking.updatedAt ?? now.toISOString(),
  }
}

/**
 * Complete flow: API → Domain → DB
 */
export const createBookingWriteFlow = (
  request: CreateBookingRequest
): Result<BookingDbInsert, BookingOperationResult> => {
  // Step 1: Map API to Domain
  const domainResult = mapCreateBookingApiToDomain(request)
  if (domainResult.type === 'err') {
    return domainResult
  }

  // Step 2: Add ID using brand utility
  const bookingIdResult = brandBookingId(generateId('bkg'))
  if (bookingIdResult.type === 'err') {
    return err({
      type: 'error',
      error: {
        type: 'system',
        message: `Failed to generate booking ID: ${bookingIdResult.error.message}`,
      },
    })
  }

  const bookingWithId: Partial<Booking> = {
    ...domainResult.value,
    id: bookingIdResult.value as BookingId,
  }

  // Step 3: Map Domain to Database
  try {
    const dbInsert = mapCreateBookingDomainToDb(bookingWithId)
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
export const handleCreateBookingResult = (
  result: BookingOperationResult
): string => {
  return match(result)
    .with(
      { type: 'created' },
      ({ booking }) => `Booking ${booking.id} created successfully`
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
      { type: 'reservation_not_found' },
      ({ reservationId }) => `Reservation with ID ${reservationId} not found`
    )
    .with(
      { type: 'already_exists' },
      ({ reservationId }) =>
        `Booking already exists for reservation ${reservationId}`
    )
    .with(
      { type: 'invalid_state' },
      ({ currentState, attemptedAction }) =>
        `Invalid state transition: Cannot ${attemptedAction} from state ${currentState}`
    )
    .with(
      { type: 'payment_failed' },
      ({ reason }) => `Payment failed: ${reason}`
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
