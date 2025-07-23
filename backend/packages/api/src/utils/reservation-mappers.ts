/**
 * Reservation Mapping Utilities
 * ドメインとAPIレスポンス間の型変換ヘルパー
 */

import type { Reservation } from '@beauty-salon-backend/domain'
import type { components } from '@beauty-salon-backend/types/api'
import { match } from 'ts-pattern'

/**
 * ドメインのReservationをAPIのReservationResponseに変換
 */
export function toReservationResponse(
  reservation: Reservation
): components['schemas']['Models.Reservation'] {
  return match(reservation)
    .with(
      { type: 'pending' },
      { type: 'confirmed' },
      { type: 'cancelled' },
      { type: 'completed' },
      { type: 'no_show' },
      ({ type, data }) => {
        const status = type
        return {
          id: data.id,
          salonId: data.salonId,
          customerId: data.customerId,
          staffId: data.staffId,
          serviceId: data.serviceId,
          startTime: data.startTime.toISOString(),
          endTime: data.endTime.toISOString(),
          status: status as components['schemas']['Models.ReservationStatus'],
          notes: data.notes,
          totalAmount: data.totalAmount,
          depositAmount: data.depositAmount,
          isPaid: data.isPaid,
          cancellationReason:
            type === 'cancelled'
              ? (reservation as Extract<Reservation, { type: 'cancelled' }>)
                  .cancellationReason
              : undefined,
          createdAt: data.createdAt.toISOString(),
          createdBy: data.createdBy || undefined,
          updatedAt: data.updatedAt.toISOString(),
          updatedBy: data.updatedBy || undefined,
        }
      }
    )
    .exhaustive()
}

/**
 * ReservationDetailをAPIのReservationDetailResponseに変換
 */
export function toReservationDetailResponse(
  detail: import('@beauty-salon-backend/domain').ReservationDetail
): components['schemas']['Models.ReservationDetail'] {
  const baseResponse = toReservationResponse(detail.reservation)

  return {
    ...baseResponse,
    customerName: detail.customerName,
    staffName: detail.staffName,
    serviceName: detail.serviceName,
    serviceCategory: detail.serviceCategory,
    serviceDuration: detail.serviceDuration,
  }
}

/**
 * CreateReservationRequestをドメイン用に正規化
 */
export function normalizeCreateReservationRequest(
  request: components['schemas']['Models.CreateReservationRequest']
): Parameters<
  typeof import('@beauty-salon-backend/usecase').mapCreateReservationRequest
>[0] {
  return {
    salonId: request.salonId,
    customerId: request.customerId,
    staffId: request.staffId,
    serviceId: request.serviceId,
    startTime: request.startTime,
    notes: request.notes,
  }
}

/**
 * UpdateReservationRequestをドメイン用に正規化
 */
export function normalizeUpdateReservationRequest(
  request: components['schemas']['Models.UpdateReservationRequest']
) {
  return {
    status: request.status,
    notes: request.notes,
    startTime: request.startTime,
    staffId: request.staffId,
  }
}
