/**
 * Booking Domain Model
 * Represents a completed or confirmed reservation with additional details
 */

import type { components } from '@beauty-salon-backend/generated'
import { match } from 'ts-pattern'
import type { Brand } from '../shared/brand'
import type { DomainError, ValidationError } from '../shared/errors'
import type { Result } from '../shared/result'
import { err, ok } from '../shared/result'

// Brand the ID types for type safety
export type BookingId = Brand<
  components['schemas']['Models.BookingId'],
  'BookingId'
>
export type ReservationId = Brand<
  components['schemas']['Models.ReservationId'],
  'ReservationId'
>
export type SalonId = Brand<components['schemas']['Models.SalonId'], 'SalonId'>
export type CustomerId = Brand<
  components['schemas']['Models.CustomerId'],
  'CustomerId'
>
export type StaffId = Brand<components['schemas']['Models.StaffId'], 'StaffId'>
export type ServiceId = Brand<
  components['schemas']['Models.ServiceId'],
  'ServiceId'
>

// Domain Booking Model - extends generated type
export interface Booking
  extends Omit<
    components['schemas']['Models.Booking'],
    'id' | 'salonId' | 'customerId' | 'reservationIds'
  > {
  id: BookingId
  salonId: SalonId
  customerId: CustomerId
  reservationIds: ReservationId[]
  // Additional fields from DB that aren't in API
  staffId?: StaffId
  serviceId?: ServiceId
  scheduledStartTime?: string
  scheduledEndTime?: string
  actualStartTime?: string
  actualEndTime?: string
  actualDuration?: number
  checkedInTime?: string
  paidAmount?: number
}

// Booking State Management (Sum Type)
export type BookingState =
  | { type: 'scheduled'; booking: Booking }
  | { type: 'checked_in'; booking: Booking; checkedInAt: string }
  | { type: 'in_service'; booking: Booking; startedAt: string }
  | {
      type: 'completed'
      booking: Booking
      completedAt: string
      feedback?: string
    }
  | { type: 'no_show'; booking: Booking; markedAt: string }
  | {
      type: 'cancelled'
      booking: Booking
      cancelledAt: string
      refundAmount: number
    }

// Booking Operation Results (Sum Type)
export type BookingOperationResult =
  | { type: 'created'; booking: Booking }
  | { type: 'updated'; booking: Booking; changes: string[] }
  | { type: 'checked_in'; booking: Booking }
  | { type: 'service_started'; booking: Booking }
  | { type: 'completed'; booking: Booking; totalCharged: number }
  | { type: 'cancelled'; booking: Booking; refundAmount: number }
  | { type: 'marked_no_show'; booking: Booking }
  | { type: 'validation_failed'; errors: ValidationError[] }
  | { type: 'not_found'; bookingId: BookingId }
  | { type: 'reservation_not_found'; reservationId: ReservationId }
  | { type: 'already_exists'; reservationId: ReservationId }
  | { type: 'invalid_state'; currentState: string; attemptedAction: string }
  | { type: 'payment_failed'; reason: string }
  | { type: 'error'; error: DomainError }

// Booking Search Result
export type BookingSearchResult =
  | { type: 'found'; bookings: Booking[]; totalCount: number }
  | { type: 'empty'; query: BookingSearchQuery }
  | { type: 'error'; error: DomainError }

export interface BookingSearchQuery {
  salonId?: SalonId
  customerId?: CustomerId
  staffId?: StaffId
  serviceId?: ServiceId
  status?: string
  dateFrom?: string
  dateTo?: string
  checkedIn?: boolean
  completed?: boolean
}

// Booking Events for audit/tracking
export type BookingEvent =
  | {
      type: 'booking_created'
      booking: Booking
      createdBy: string
      timestamp: string
    }
  | {
      type: 'booking_updated'
      bookingId: BookingId
      changes: BookingChanges
      updatedBy: string
      timestamp: string
    }
  | {
      type: 'customer_checked_in'
      bookingId: BookingId
      checkedInBy: string
      timestamp: string
    }
  | {
      type: 'service_started'
      bookingId: BookingId
      startedBy: string
      timestamp: string
    }
  | {
      type: 'service_completed'
      bookingId: BookingId
      completedBy: string
      totalCharged: number
      timestamp: string
    }
  | {
      type: 'booking_cancelled'
      bookingId: BookingId
      cancelledBy: string
      refundAmount: number
      timestamp: string
    }
  | {
      type: 'customer_no_show'
      bookingId: BookingId
      markedBy: string
      timestamp: string
    }
  | {
      type: 'payment_processed'
      bookingId: BookingId
      amount: number
      paymentMethod: string
      timestamp: string
    }
  | {
      type: 'refund_issued'
      bookingId: BookingId
      refundAmount: number
      reason: string
      timestamp: string
    }

export interface BookingChanges {
  actualStartTime?: { from: string | undefined; to: string | undefined }
  actualEndTime?: { from: string | undefined; to: string | undefined }
  actualDuration?: { from: number | undefined; to: number | undefined }
  finalAmount?: { from: number; to: number }
  additionalServices?: { added: ServiceId[]; removed: ServiceId[] }
  notes?: { from: string | undefined; to: string | undefined }
}

// Re-export related types from generated schemas
export type BookingStatus = components['schemas']['Models.BookingStatus']
export type BookingDetail = components['schemas']['Models.BookingDetail']
export type CreateBookingRequest =
  components['schemas']['Models.CreateBookingRequest']
export type UpdateBookingRequest =
  components['schemas']['Models.UpdateBookingRequest']
export type UpdateBookingRequestWithReset =
  components['schemas']['Models.UpdateBookingRequestWithReset']

// Business Logic Functions

/**
 * Validate booking data
 */
export const validateBooking = (
  booking: Partial<Booking>
): Result<Booking, ValidationError[]> => {
  const errors: ValidationError[] = []

  if (!booking.salonId) {
    errors.push({ field: 'salonId', message: 'Salon ID is required' })
  }

  if (!booking.customerId) {
    errors.push({ field: 'customerId', message: 'Customer ID is required' })
  }

  if (!booking.reservationIds || booking.reservationIds.length === 0) {
    errors.push({
      field: 'reservationIds',
      message: 'At least one reservation ID is required',
    })
  }

  if (booking.totalAmount !== undefined && booking.totalAmount < 0) {
    errors.push({
      field: 'totalAmount',
      message: 'Total amount cannot be negative',
    })
  }

  if (booking.finalAmount !== undefined && booking.finalAmount < 0) {
    errors.push({
      field: 'finalAmount',
      message: 'Final amount cannot be negative',
    })
  }

  if (errors.length > 0) {
    return err(errors)
  }

  return ok(booking as Booking)
}

/**
 * Check if booking can transition to a new state
 */
export const canTransitionBookingState = (
  currentState: BookingState,
  targetState: string
): boolean => {
  return match(currentState)
    .with({ type: 'scheduled' }, () =>
      ['checked_in', 'cancelled', 'no_show'].includes(targetState)
    )
    .with({ type: 'checked_in' }, () =>
      ['in_service', 'cancelled', 'no_show'].includes(targetState)
    )
    .with({ type: 'in_service' }, () =>
      ['completed', 'cancelled'].includes(targetState)
    )
    .with({ type: 'completed' }, () => false) // Terminal state
    .with({ type: 'no_show' }, () => false) // Terminal state
    .with({ type: 'cancelled' }, () => false) // Terminal state
    .exhaustive()
}

/**
 * Calculate booking duration in minutes
 */
export const calculateBookingDuration = (booking: Booking): number => {
  if (booking.actualStartTime && booking.actualEndTime) {
    const start = new Date(booking.actualStartTime)
    const end = new Date(booking.actualEndTime)
    return Math.floor((end.getTime() - start.getTime()) / (1000 * 60))
  }

  if (booking.scheduledStartTime && booking.scheduledEndTime) {
    const start = new Date(booking.scheduledStartTime)
    const end = new Date(booking.scheduledEndTime)
    return Math.floor((end.getTime() - start.getTime()) / (1000 * 60))
  }

  // Default duration if no times available
  return 60
}

/**
 * Calculate overtime charges if service runs longer than scheduled
 */
export const calculateOvertimeCharge = (
  booking: Booking,
  overtimeRatePerMinute: number
): number => {
  if (!(booking.actualEndTime && booking.scheduledEndTime)) {
    return 0
  }

  const scheduledEnd = new Date(booking.scheduledEndTime)
  const actualEnd = new Date(booking.actualEndTime)

  if (actualEnd <= scheduledEnd) {
    return 0
  }

  const overtimeMinutes = Math.floor(
    (actualEnd.getTime() - scheduledEnd.getTime()) / (1000 * 60)
  )

  return overtimeMinutes * overtimeRatePerMinute
}

/**
 * Calculate refund amount based on cancellation policy
 */
export const calculateRefundAmount = (
  booking: Booking,
  hoursBeforeCancellation: number
): number => {
  const paidAmount = booking.paidAmount || 0

  if (hoursBeforeCancellation >= 48) {
    return paidAmount // Full refund
  }
  if (hoursBeforeCancellation >= 24) {
    return Math.floor(paidAmount * 0.7) // 70% refund
  }
  if (hoursBeforeCancellation >= 12) {
    return Math.floor(paidAmount * 0.5) // 50% refund
  }
  return 0 // No refund
}

/**
 * Check if booking is eligible for check-in
 */
export const canCheckIn = (
  booking: Booking,
  maxEarlyCheckInMinutes = 30
): boolean => {
  if (!booking.scheduledStartTime) {
    return false
  }

  const now = new Date()
  const scheduledStart = new Date(booking.scheduledStartTime)
  const minutesUntilStart =
    (scheduledStart.getTime() - now.getTime()) / (1000 * 60)

  // Can check in if within the early check-in window
  return minutesUntilStart <= maxEarlyCheckInMinutes && minutesUntilStart >= -15
}

/**
 * Get booking status display
 */
export const getBookingDisplayInfo = (state: BookingState) => {
  return match(state)
    .with({ type: 'scheduled' }, ({ booking }) => ({
      ...booking,
      status: 'Scheduled',
      statusColor: 'blue',
    }))
    .with({ type: 'checked_in' }, ({ booking, checkedInAt }) => ({
      ...booking,
      status: `Checked in at ${checkedInAt}`,
      statusColor: 'yellow',
    }))
    .with({ type: 'in_service' }, ({ booking, startedAt }) => ({
      ...booking,
      status: `In service since ${startedAt}`,
      statusColor: 'green',
    }))
    .with({ type: 'completed' }, ({ booking, completedAt }) => ({
      ...booking,
      status: `Completed at ${completedAt}`,
      statusColor: 'gray',
    }))
    .with({ type: 'no_show' }, ({ booking, markedAt }) => ({
      ...booking,
      status: `No Show (${markedAt})`,
      statusColor: 'orange',
    }))
    .with({ type: 'cancelled' }, ({ booking, refundAmount }) => ({
      ...booking,
      status: `Cancelled (Refund: ${refundAmount})`,
      statusColor: 'red',
    }))
    .exhaustive()
}

/**
 * Calculate the wait time for a booking
 */
export const calculateWaitTime = (booking: Booking): number | null => {
  if (!(booking.checkedInTime && booking.actualStartTime)) {
    return null
  }

  const checkedIn = new Date(booking.checkedInTime)
  const started = new Date(booking.actualStartTime)

  return Math.floor((started.getTime() - checkedIn.getTime()) / (1000 * 60))
}

/**
 * Format booking time slot for display
 */
export const formatBookingTimeSlot = (booking: Booking): string => {
  if (!(booking.scheduledStartTime && booking.scheduledEndTime)) {
    return 'Time not available'
  }

  const start = new Date(booking.scheduledStartTime)
  const end = new Date(booking.scheduledEndTime)

  const formatTime = (date: Date) => {
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    return `${hours}:${minutes}`
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  }

  // Same day
  if (start.toDateString() === end.toDateString()) {
    return `${formatDate(start)} ${formatTime(start)}-${formatTime(end)}`
  }

  // Different days (shouldn't happen for bookings, but handle it)
  return `${formatDate(start)} ${formatTime(start)} - ${formatDate(end)} ${formatTime(end)}`
}
