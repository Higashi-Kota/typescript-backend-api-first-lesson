/**
 * Get Booking Mapper (Read Operation)
 * Database Entity -> Domain Model -> API Response
 */

import type { bookings } from '@beauty-salon-backend/database'
import type { components } from '@beauty-salon-backend/generated'
import type { Booking, BookingOperationResult } from '../../models/booking'
import {
  unsafeBrandBookingId,
  unsafeBrandCustomerId,
  unsafeBrandSalonId,
  unsafeBrandServiceId,
  unsafeBrandStaffId,
} from '../../shared/brand-utils'
import type { Result } from '../../shared/result'
import { err, ok } from '../../shared/result'

// Type aliases for clarity
type BookingDbRecord = typeof bookings.$inferSelect
type BookingApiResponse = components['schemas']['Models.Booking']
type BookingDetailApiResponse = components['schemas']['Models.BookingDetail']

/**
 * Map Database Record to Domain Model
 */
export const mapGetBookingDbToDomain = (
  record: BookingDbRecord
): Result<Booking, BookingOperationResult> => {
  try {
    const domainBooking: Booking = {
      id: unsafeBrandBookingId(record.id),
      salonId: unsafeBrandSalonId(record.salonId),
      customerId: unsafeBrandCustomerId(record.customerId),
      reservationIds: [], // Would need to be fetched from junction table
      status: record.status as Booking['status'],
      totalAmount: record.totalAmount,
      finalAmount: record.finalAmount,
      additionalServices: record.additionalServices ?? undefined,
      notes: record.notes ?? undefined,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      // Additional DB fields
      staffId: record.staffId ? unsafeBrandStaffId(record.staffId) : undefined,
      serviceId: record.serviceId
        ? unsafeBrandServiceId(record.serviceId)
        : undefined,
      scheduledStartTime: record.scheduledStartTime ?? undefined,
      scheduledEndTime: record.scheduledEndTime ?? undefined,
      actualStartTime: record.actualStartTime ?? undefined,
      actualEndTime: record.actualEndTime ?? undefined,
      actualDuration: record.actualDuration ?? undefined,
      checkedInTime: record.checkedInTime ?? undefined,
      paidAmount: record.paidAmount ?? undefined,
    }

    return ok(domainBooking)
  } catch (error) {
    return err({
      type: 'error',
      error: {
        type: 'system',
        message: `Failed to map database record: ${error}`,
      },
    })
  }
}

/**
 * Map Domain Model to API Response
 */
export const mapGetBookingDomainToApi = (
  booking: Booking
): BookingApiResponse => {
  return {
    id: booking.id,
    salonId: booking.salonId,
    customerId: booking.customerId,
    reservationIds: booking.reservationIds,
    status: booking.status,
    totalAmount: booking.totalAmount,
    finalAmount: booking.finalAmount,
    additionalServices: booking.additionalServices,
    notes: booking.notes,
    createdAt: booking.createdAt,
    updatedAt: booking.updatedAt,
  }
}

/**
 * Complete flow: DB → Domain → API
 */
export const getBookingReadFlow = (
  record: BookingDbRecord | null
): Result<BookingApiResponse, BookingOperationResult> => {
  // Handle not found case
  if (!record) {
    return err({
      type: 'not_found',
      bookingId: unsafeBrandBookingId('unknown'),
    })
  }

  // Step 1: Map DB to Domain
  const domainResult = mapGetBookingDbToDomain(record)
  if (domainResult.type === 'err') {
    return domainResult
  }

  // Step 2: Map Domain to API
  try {
    const apiResponse = mapGetBookingDomainToApi(domainResult.value)
    return ok(apiResponse)
  } catch (error) {
    return err({
      type: 'error',
      error: {
        type: 'system',
        message: `Failed to map to API response: ${error}`,
      },
    })
  }
}

/**
 * Map multiple bookings for list operations
 */
export const mapBookingListDbToDomain = (
  records: BookingDbRecord[]
): Result<Booking[], BookingOperationResult> => {
  try {
    const bookings: Booking[] = []

    for (const record of records) {
      const result = mapGetBookingDbToDomain(record)
      if (result.type === 'err') {
        return result
      }
      bookings.push(result.value)
    }

    return ok(bookings)
  } catch (error) {
    return err({
      type: 'error',
      error: {
        type: 'system',
        message: `Failed to map booking list: ${error}`,
      },
    })
  }
}

/**
 * Map booking list to API response
 */
export const mapBookingListDomainToApi = (
  bookings: Booking[]
): BookingApiResponse[] => {
  return bookings.map(mapGetBookingDomainToApi)
}

/**
 * Complete flow for list operations
 */
export const getBookingListReadFlow = (
  records: BookingDbRecord[]
): Result<BookingApiResponse[], BookingOperationResult> => {
  // Step 1: Map DB to Domain
  const domainResult = mapBookingListDbToDomain(records)
  if (domainResult.type === 'err') {
    return domainResult
  }

  // Step 2: Map Domain to API
  try {
    const apiResponses = mapBookingListDomainToApi(domainResult.value)
    return ok(apiResponses)
  } catch (error) {
    return err({
      type: 'error',
      error: {
        type: 'system',
        message: `Failed to map to API response: ${error}`,
      },
    })
  }
}

/**
 * Map BookingDetail for detailed views with related data
 */
export const mapBookingDetailDbToDomain = (
  record: BookingDbRecord,
  customer?: any,
  salon?: any,
  reservations?: any[]
): Result<BookingDetailApiResponse, BookingOperationResult> => {
  try {
    const domainResult = mapGetBookingDbToDomain(record)
    if (domainResult.type === 'err') {
      return domainResult
    }

    const bookingDetail: BookingDetailApiResponse = {
      ...mapGetBookingDomainToApi(domainResult.value),
      customerName: customer?.name ?? '',
      customerEmail: customer?.email ?? '',
      salonName: salon?.name ?? '',
      reservationDetails: reservations ?? [],
    }

    return ok(bookingDetail)
  } catch (error) {
    return err({
      type: 'error',
      error: {
        type: 'system',
        message: `Failed to map booking detail: ${error}`,
      },
    })
  }
}
