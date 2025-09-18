/**
 * Reservation Domain Model
 * Implements state management and business logic for reservations
 */

import type { components } from '@beauty-salon-backend/generated'
import { match } from 'ts-pattern'
import type { Brand } from '../shared/brand'
import type { DomainError, ValidationError } from '../shared/errors'
import type { Result } from '../shared/result'
import { err, ok } from '../shared/result'

// Brand the ID types for type safety
export type ReservationId = Brand<
  components['schemas']['Models.ReservationId'],
  'ReservationId'
>
export type BookingId = Brand<
  components['schemas']['Models.BookingId'],
  'BookingId'
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

// Domain Reservation Model - extends generated type
export interface Reservation
  extends Omit<
    components['schemas']['Models.Reservation'],
    'id' | 'salonId' | 'customerId' | 'staffId' | 'serviceId'
  > {
  id: ReservationId
  salonId: SalonId
  customerId: CustomerId
  staffId: StaffId
  serviceId: ServiceId
  // Additional fields that exist in DB but not in API
  bookingId?: BookingId
  duration?: number
  paymentMethod?: string
  reminderSent?: boolean
}

// Reservation State Management (Sum Type)
export type ReservationState =
  | { type: 'pending'; reservation: Reservation }
  | { type: 'confirmed'; reservation: Reservation; confirmedAt: string }
  | { type: 'in_progress'; reservation: Reservation; startedAt: string }
  | { type: 'completed'; reservation: Reservation; completedAt: string }
  | {
      type: 'cancelled'
      reservation: Reservation
      cancelledAt: string
      reason: string
    }
  | { type: 'no_show'; reservation: Reservation; markedAt: string }

// Reservation Operation Results (Sum Type)
export type ReservationOperationResult =
  | { type: 'created'; reservation: Reservation }
  | { type: 'updated'; reservation: Reservation; changes: string[] }
  | { type: 'confirmed'; reservation: Reservation }
  | { type: 'started'; reservation: Reservation }
  | { type: 'completed'; reservation: Reservation }
  | { type: 'cancelled'; reservation: Reservation; reason: string }
  | { type: 'marked_no_show'; reservation: Reservation }
  | { type: 'validation_failed'; errors: ValidationError[] }
  | { type: 'not_found'; reservationId: ReservationId }
  | { type: 'conflict'; message: string }
  | { type: 'time_slot_unavailable'; startTime: string; endTime: string }
  | { type: 'staff_unavailable'; staffId: StaffId; time: string }
  | { type: 'error'; error: DomainError }

// Reservation Search Result
export type ReservationSearchResult =
  | { type: 'found'; reservations: Reservation[]; totalCount: number }
  | { type: 'empty'; query: ReservationSearchQuery }
  | { type: 'error'; error: DomainError }

export interface ReservationSearchQuery {
  salonId?: SalonId
  customerId?: CustomerId
  staffId?: StaffId
  serviceId?: ServiceId
  status?: string
  dateFrom?: string
  dateTo?: string
  isPaid?: boolean
}

// Reservation Events for audit/tracking
export type ReservationEvent =
  | {
      type: 'reservation_created'
      reservation: Reservation
      createdBy: string
      timestamp: string
    }
  | {
      type: 'reservation_updated'
      reservationId: ReservationId
      changes: ReservationChanges
      updatedBy: string
      timestamp: string
    }
  | {
      type: 'reservation_confirmed'
      reservationId: ReservationId
      confirmedBy: string
      timestamp: string
    }
  | {
      type: 'reservation_started'
      reservationId: ReservationId
      startedBy: string
      timestamp: string
    }
  | {
      type: 'reservation_completed'
      reservationId: ReservationId
      completedBy: string
      timestamp: string
    }
  | {
      type: 'reservation_cancelled'
      reservationId: ReservationId
      reason: string
      cancelledBy: string
      timestamp: string
    }
  | {
      type: 'reservation_no_show'
      reservationId: ReservationId
      markedBy: string
      timestamp: string
    }
  | {
      type: 'payment_received'
      reservationId: ReservationId
      amount: number
      paymentMethod: string
      timestamp: string
    }

export interface ReservationChanges {
  startTime?: { from: string; to: string }
  endTime?: { from: string; to: string }
  staffId?: { from: StaffId; to: StaffId }
  serviceId?: { from: ServiceId; to: ServiceId }
  status?: { from: string; to: string }
  notes?: { from: string | undefined; to: string | undefined }
  totalAmount?: { from: number; to: number }
}

// Re-export related types from generated schemas
export type ReservationStatus =
  components['schemas']['Models.ReservationStatus']
export type ReservationDetail =
  components['schemas']['Models.ReservationDetail']
export type CreateReservationRequest =
  components['schemas']['Models.CreateReservationRequest']
export type UpdateReservationRequest =
  components['schemas']['Models.UpdateReservationRequest']
export type UpdateReservationRequestWithReset =
  components['schemas']['Models.UpdateReservationRequestWithReset']

// Business Logic Functions

/**
 * Validate reservation data
 */
export const validateReservation = (
  reservation: Partial<Reservation>
): Result<Reservation, ValidationError[]> => {
  const errors: ValidationError[] = []

  if (!reservation.salonId) {
    errors.push({ field: 'salonId', message: 'Salon ID is required' })
  }

  if (!reservation.customerId) {
    errors.push({ field: 'customerId', message: 'Customer ID is required' })
  }

  if (!reservation.staffId) {
    errors.push({ field: 'staffId', message: 'Staff ID is required' })
  }

  if (!reservation.serviceId) {
    errors.push({ field: 'serviceId', message: 'Service ID is required' })
  }

  if (!reservation.startTime) {
    errors.push({ field: 'startTime', message: 'Start time is required' })
  }

  if (!reservation.endTime) {
    errors.push({ field: 'endTime', message: 'End time is required' })
  }

  // Validate time logic
  if (reservation.startTime && reservation.endTime) {
    const start = new Date(reservation.startTime)
    const end = new Date(reservation.endTime)

    if (start >= end) {
      errors.push({
        field: 'endTime',
        message: 'End time must be after start time',
      })
    }

    if (start < new Date()) {
      errors.push({
        field: 'startTime',
        message: 'Cannot create reservation in the past',
      })
    }
  }

  if (reservation.totalAmount !== undefined && reservation.totalAmount < 0) {
    errors.push({
      field: 'totalAmount',
      message: 'Total amount cannot be negative',
    })
  }

  if (errors.length > 0) {
    return err(errors)
  }

  return ok(reservation as Reservation)
}

/**
 * Check if reservation can be cancelled
 */
export const canCancelReservation = (
  reservation: Reservation,
  cancellationDeadlineHours = 24
): boolean => {
  const now = new Date()
  const startTime = new Date(reservation.startTime)
  const hoursUntilStart =
    (startTime.getTime() - now.getTime()) / (1000 * 60 * 60)

  // Can cancel if more than deadline hours before start
  return hoursUntilStart > cancellationDeadlineHours
}

/**
 * Check if reservation can be modified
 */
export const canModifyReservation = (
  state: ReservationState,
  modificationDeadlineHours = 12
): boolean => {
  return match(state)
    .with({ type: 'pending' }, ({ reservation }) => {
      const now = new Date()
      const startTime = new Date(reservation.startTime)
      const hoursUntilStart =
        (startTime.getTime() - now.getTime()) / (1000 * 60 * 60)
      return hoursUntilStart > modificationDeadlineHours
    })
    .with({ type: 'confirmed' }, ({ reservation }) => {
      const now = new Date()
      const startTime = new Date(reservation.startTime)
      const hoursUntilStart =
        (startTime.getTime() - now.getTime()) / (1000 * 60 * 60)
      return hoursUntilStart > modificationDeadlineHours
    })
    .otherwise(() => false)
}

/**
 * Calculate cancellation fee
 */
export const calculateCancellationFee = (
  reservation: Reservation,
  hoursBeforeStart: number
): number => {
  const totalAmount = reservation.totalAmount

  if (hoursBeforeStart >= 48) {
    return 0 // No fee if cancelled 48+ hours in advance
  }
  if (hoursBeforeStart >= 24) {
    return Math.floor(totalAmount * 0.3) // 30% fee
  }
  if (hoursBeforeStart >= 12) {
    return Math.floor(totalAmount * 0.5) // 50% fee
  }
  return totalAmount // 100% fee for last-minute cancellations
}

/**
 * Get reservation status display
 */
export const getReservationDisplayInfo = (state: ReservationState) => {
  return match(state)
    .with({ type: 'pending' }, ({ reservation }) => ({
      ...reservation,
      status: 'Pending Confirmation',
      statusColor: 'yellow',
    }))
    .with({ type: 'confirmed' }, ({ reservation, confirmedAt }) => ({
      ...reservation,
      status: `Confirmed at ${confirmedAt}`,
      statusColor: 'green',
    }))
    .with({ type: 'in_progress' }, ({ reservation, startedAt }) => ({
      ...reservation,
      status: `In Progress since ${startedAt}`,
      statusColor: 'blue',
    }))
    .with({ type: 'completed' }, ({ reservation, completedAt }) => ({
      ...reservation,
      status: `Completed at ${completedAt}`,
      statusColor: 'gray',
    }))
    .with({ type: 'cancelled' }, ({ reservation, reason }) => ({
      ...reservation,
      status: `Cancelled: ${reason}`,
      statusColor: 'red',
    }))
    .with({ type: 'no_show' }, ({ reservation, markedAt }) => ({
      ...reservation,
      status: `No Show (${markedAt})`,
      statusColor: 'orange',
    }))
    .exhaustive()
}

/**
 * Check for time slot conflicts
 */
export const hasTimeConflict = (
  reservation1: Partial<Reservation>,
  reservation2: Partial<Reservation>
): boolean => {
  if (
    !(
      reservation1.startTime &&
      reservation1.endTime &&
      reservation2.startTime &&
      reservation2.endTime
    )
  ) {
    return false
  }

  const start1 = new Date(reservation1.startTime)
  const end1 = new Date(reservation1.endTime)
  const start2 = new Date(reservation2.startTime)
  const end2 = new Date(reservation2.endTime)

  // Check if times overlap
  return !(end1 <= start2 || end2 <= start1)
}

/**
 * Calculate reservation duration in minutes
 */
export const calculateDuration = (reservation: Reservation): number => {
  const start = new Date(reservation.startTime)
  const end = new Date(reservation.endTime)
  return Math.floor((end.getTime() - start.getTime()) / (1000 * 60))
}

/**
 * Format reservation time slot for display
 */
export const formatTimeSlot = (reservation: Reservation): string => {
  const start = new Date(reservation.startTime)
  const end = new Date(reservation.endTime)

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

  // Different days (shouldn't happen for reservations, but handle it)
  return `${formatDate(start)} ${formatTime(start)} - ${formatDate(end)} ${formatTime(end)}`
}
