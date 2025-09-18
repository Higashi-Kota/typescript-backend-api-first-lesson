/**
 * Get Reservation Mapper (Read Operation)
 * Database Entity -> Domain Model -> API Response
 */

import type { reservations } from '@beauty-salon-backend/database'
import type { components } from '@beauty-salon-backend/generated'
import type {
  Reservation,
  ReservationOperationResult,
} from '../../models/reservation'
import type { Result } from '../../shared/result'
import { err, ok } from '../../shared/result'

// Type aliases for clarity
type ReservationDbRecord = typeof reservations.$inferSelect
type ReservationApiResponse = components['schemas']['Models.Reservation']

/**
 * Map Database Record to Domain Model
 */
export const mapGetReservationDbToDomain = (
  record: ReservationDbRecord
): Result<Reservation, ReservationOperationResult> => {
  try {
    const domainReservation: Reservation = {
      id: record.id as any, // Will be branded
      salonId: record.salonId as any,
      customerId: record.customerId as any,
      staffId: record.staffId as any,
      serviceId: record.serviceId as any,
      bookingId: record.bookingId ? (record.bookingId as any) : undefined,
      startTime: record.startTime,
      endTime: record.endTime,
      duration: record.duration,
      status: record.status as any, // Cast string to specific union type
      totalAmount: record.amount, // DB has 'amount', API has 'totalAmount'
      depositAmount: 0, // Not in DB, default to 0
      isPaid: false, // Not in DB, default to false
      paymentMethod: undefined, // Not in DB
      notes: record.notes ?? undefined,
      reminderSent: false, // Not in DB, default to false
      cancellationReason: record.cancellationReason ?? undefined,
      createdAt: record.createdAt,
      createdBy: undefined, // Not in DB schema
      updatedAt: record.updatedAt,
      updatedBy: undefined, // Not in DB schema
    }

    return ok(domainReservation)
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
export const mapGetReservationDomainToApi = (
  reservation: Reservation
): ReservationApiResponse => {
  return {
    id: reservation.id,
    salonId: reservation.salonId,
    customerId: reservation.customerId,
    staffId: reservation.staffId,
    serviceId: reservation.serviceId,
    startTime: reservation.startTime,
    endTime: reservation.endTime,
    status: reservation.status,
    totalAmount: reservation.totalAmount,
    depositAmount: reservation.depositAmount,
    isPaid: reservation.isPaid,
    notes: reservation.notes,
    cancellationReason: reservation.cancellationReason,
    createdAt: reservation.createdAt,
    createdBy: reservation.createdBy,
    updatedAt: reservation.updatedAt,
    updatedBy: reservation.updatedBy,
  }
}

/**
 * Complete flow: DB → Domain → API
 */
export const getReservationReadFlow = (
  record: ReservationDbRecord | null
): Result<ReservationApiResponse, ReservationOperationResult> => {
  // Handle not found case
  if (!record) {
    return err({
      type: 'not_found',
      reservationId: 'unknown' as any,
    })
  }

  // Step 1: Map DB to Domain
  const domainResult = mapGetReservationDbToDomain(record)
  if (domainResult.type === 'err') {
    return domainResult
  }

  // Step 2: Map Domain to API
  try {
    const apiResponse = mapGetReservationDomainToApi(domainResult.value)
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
 * Map multiple reservations for list operations
 */
export const mapReservationListDbToDomain = (
  records: ReservationDbRecord[]
): Result<Reservation[], ReservationOperationResult> => {
  try {
    const reservations: Reservation[] = []

    for (const record of records) {
      const result = mapGetReservationDbToDomain(record)
      if (result.type === 'err') {
        return result
      }
      reservations.push(result.value)
    }

    return ok(reservations)
  } catch (error) {
    return err({
      type: 'error',
      error: {
        type: 'system',
        message: `Failed to map reservation list: ${error}`,
      },
    })
  }
}

/**
 * Map reservation list to API response
 */
export const mapReservationListDomainToApi = (
  reservations: Reservation[]
): ReservationApiResponse[] => {
  return reservations.map(mapGetReservationDomainToApi)
}

/**
 * Complete flow for list operations
 */
export const getReservationListReadFlow = (
  records: ReservationDbRecord[]
): Result<ReservationApiResponse[], ReservationOperationResult> => {
  // Step 1: Map DB to Domain
  const domainResult = mapReservationListDbToDomain(records)
  if (domainResult.type === 'err') {
    return domainResult
  }

  // Step 2: Map Domain to API
  try {
    const apiResponses = mapReservationListDomainToApi(domainResult.value)
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
 * Map ReservationDetail for detailed views
 */
export const mapReservationDetailDbToDomain = (
  record: ReservationDbRecord,
  customer?: any,
  staff?: any,
  service?: any
): Result<
  components['schemas']['Models.ReservationDetail'],
  ReservationOperationResult
> => {
  try {
    const domainResult = mapGetReservationDbToDomain(record)
    if (domainResult.type === 'err') {
      return domainResult
    }

    const reservationDetail: components['schemas']['Models.ReservationDetail'] =
      {
        ...mapGetReservationDomainToApi(domainResult.value),
        customerName: customer?.name ?? '',
        staffName: staff?.name ?? '',
        serviceName: service?.name ?? '',
        serviceCategory: service?.category ?? 'other',
        serviceDuration: service?.duration ?? 0,
      }

    return ok(reservationDetail)
  } catch (error) {
    return err({
      type: 'error',
      error: {
        type: 'system',
        message: `Failed to map reservation detail: ${error}`,
      },
    })
  }
}
