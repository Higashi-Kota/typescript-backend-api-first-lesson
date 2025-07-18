/**
 * Get Reservation Use Cases
 * 予約取得のビジネスロジック
 * CLAUDEガイドラインに準拠した実装
 */

import type {
  AvailableSlot,
  CustomerId,
  PaginatedResult,
  PaginationParams,
  RepositoryError,
  Reservation,
  ReservationDetail,
  ReservationId,
  ReservationRepository,
  ReservationSearchCriteria,
  ReservationStatus,
  Result,
  SalonId,
  ServiceId,
  StaffId,
} from '@beauty-salon-backend/domain'
import {
  createCustomerIdSafe,
  createReservationIdSafe,
  createSalonIdSafe,
  createServiceIdSafe,
  createStaffIdSafe,
} from '@beauty-salon-backend/domain'
import { err, ok } from '@beauty-salon-backend/domain'
import type { components } from '@beauty-salon-backend/types/api'
import { mapReservationToResponse } from './create-reservation.usecase.js'

// UseCase エラー型
export type GetReservationUseCaseError = RepositoryError

// 個別予約取得
export type GetReservationByIdInput = {
  id: ReservationId
}

export type GetReservationByIdOutput = Result<
  Reservation,
  GetReservationUseCaseError
>

export type GetReservationByIdDeps = {
  reservationRepository: ReservationRepository
}

export const getReservationByIdUseCase = async (
  input: GetReservationByIdInput,
  deps: GetReservationByIdDeps
): Promise<GetReservationByIdOutput> => {
  return deps.reservationRepository.findById(input.id)
}

// 予約詳細取得
export type GetReservationDetailByIdInput = {
  id: ReservationId
}

export type GetReservationDetailByIdOutput = Result<
  ReservationDetail,
  GetReservationUseCaseError
>

export type GetReservationDetailByIdDeps = {
  reservationRepository: ReservationRepository
}

export const getReservationDetailByIdUseCase = async (
  input: GetReservationDetailByIdInput,
  deps: GetReservationDetailByIdDeps
): Promise<GetReservationDetailByIdOutput> => {
  return deps.reservationRepository.findDetailById(input.id)
}

// 予約一覧取得
export type ListReservationsInput = {
  salonId?: SalonId
  customerId?: CustomerId
  staffId?: StaffId
  serviceId?: ServiceId
  status?: ReservationStatus
  startDate?: Date
  endDate?: Date
  isPaid?: boolean
  limit: number
  offset: number
}

export type ListReservationsOutput = Result<
  PaginatedResult<Reservation>,
  GetReservationUseCaseError
>

export type ListReservationsDeps = {
  reservationRepository: ReservationRepository
}

export const listReservationsUseCase = async (
  input: ListReservationsInput,
  deps: ListReservationsDeps
): Promise<ListReservationsOutput> => {
  const criteria: ReservationSearchCriteria = {
    salonId: input.salonId,
    customerId: input.customerId,
    staffId: input.staffId,
    serviceId: input.serviceId,
    status: input.status,
    startDate: input.startDate,
    endDate: input.endDate,
    isPaid: input.isPaid,
  }

  const pagination: PaginationParams = {
    limit: input.limit,
    offset: input.offset,
  }

  return deps.reservationRepository.search(criteria, pagination)
}

// 顧客の予約履歴取得
export type GetCustomerReservationsInput = {
  customerId: CustomerId
  limit: number
  offset: number
}

export type GetCustomerReservationsOutput = Result<
  PaginatedResult<Reservation>,
  GetReservationUseCaseError
>

export type GetCustomerReservationsDeps = {
  reservationRepository: ReservationRepository
}

export const getCustomerReservationsUseCase = async (
  input: GetCustomerReservationsInput,
  deps: GetCustomerReservationsDeps
): Promise<GetCustomerReservationsOutput> => {
  const pagination: PaginationParams = {
    limit: input.limit,
    offset: input.offset,
  }

  return deps.reservationRepository.findByCustomer(input.customerId, pagination)
}

// 利用可能スロット検索
export type FindAvailableSlotsInput = {
  salonId: SalonId
  serviceId: string
  date: Date
  duration: number
}

export type FindAvailableSlotsOutput = Result<
  AvailableSlot[],
  GetReservationUseCaseError
>

export type FindAvailableSlotsDeps = {
  reservationRepository: ReservationRepository
}

export const findAvailableSlotsUseCase = async (
  input: FindAvailableSlotsInput,
  deps: FindAvailableSlotsDeps
): Promise<FindAvailableSlotsOutput> => {
  return deps.reservationRepository.findAvailableSlots(
    input.salonId,
    input.serviceId,
    input.date,
    input.duration
  )
}

/**
 * パラメータからUseCaseInputへの変換
 */
export const mapGetReservationByIdRequest = (
  id: string
): Result<GetReservationByIdInput, { type: 'invalidId'; message: string }> => {
  const reservationIdResult = createReservationIdSafe(id)
  if (reservationIdResult.type === 'err') {
    return err({
      type: 'invalidId',
      message: reservationIdResult.error.message,
    })
  }
  return ok({
    id: reservationIdResult.value,
  })
}

export const mapGetReservationDetailByIdRequest = (
  id: string
): Result<
  GetReservationDetailByIdInput,
  { type: 'invalidId'; message: string }
> => {
  const reservationIdResult = createReservationIdSafe(id)
  if (reservationIdResult.type === 'err') {
    return err({
      type: 'invalidId',
      message: reservationIdResult.error.message,
    })
  }
  return ok({
    id: reservationIdResult.value,
  })
}

export const mapListReservationsRequest = (params: {
  salonId?: string
  customerId?: string
  staffId?: string
  serviceId?: string
  status?: ReservationStatus
  startDate?: Date
  endDate?: Date
  isPaid?: boolean
  limit: number
  offset: number
}): Result<ListReservationsInput, { type: 'invalidId'; message: string }> => {
  const input: ListReservationsInput = {
    status: params.status,
    startDate: params.startDate,
    endDate: params.endDate,
    isPaid: params.isPaid,
    limit: params.limit,
    offset: params.offset,
  }

  if (params.salonId) {
    const salonIdResult = createSalonIdSafe(params.salonId)
    if (salonIdResult.type === 'err') {
      return err({
        type: 'invalidId',
        message: `Invalid salon ID: ${salonIdResult.error.message}`,
      })
    }
    input.salonId = salonIdResult.value
  }

  if (params.customerId) {
    const customerIdResult = createCustomerIdSafe(params.customerId)
    if (customerIdResult.type === 'err') {
      return err({
        type: 'invalidId',
        message: `Invalid customer ID: ${customerIdResult.error.message}`,
      })
    }
    input.customerId = customerIdResult.value
  }

  if (params.staffId) {
    const staffIdResult = createStaffIdSafe(params.staffId)
    if (staffIdResult.type === 'err') {
      return err({
        type: 'invalidId',
        message: `Invalid staff ID: ${staffIdResult.error.message}`,
      })
    }
    input.staffId = staffIdResult.value
  }

  if (params.serviceId) {
    const serviceIdResult = createServiceIdSafe(params.serviceId)
    if (serviceIdResult.type === 'err') {
      return err({
        type: 'invalidId',
        message: `Invalid service ID: ${serviceIdResult.error.message}`,
      })
    }
    input.serviceId = serviceIdResult.value
  }

  return ok(input)
}

export const mapGetCustomerReservationsRequest = (
  customerId: string,
  limit: number,
  offset: number
): Result<
  GetCustomerReservationsInput,
  { type: 'invalidId'; message: string }
> => {
  const customerIdResult = createCustomerIdSafe(customerId)
  if (customerIdResult.type === 'err') {
    return err({
      type: 'invalidId',
      message: customerIdResult.error.message,
    })
  }
  return ok({
    customerId: customerIdResult.value,
    limit,
    offset,
  })
}

export const mapFindAvailableSlotsRequest = (
  salonId: string,
  serviceId: string,
  date: Date,
  duration: number
): Result<FindAvailableSlotsInput, { type: 'invalidId'; message: string }> => {
  const salonIdResult = createSalonIdSafe(salonId)
  if (salonIdResult.type === 'err') {
    return err({
      type: 'invalidId',
      message: salonIdResult.error.message,
    })
  }
  return ok({
    salonId: salonIdResult.value,
    serviceId,
    date,
    duration,
  })
}

/**
 * 予約詳細レスポンスへの変換
 */
export const mapReservationDetailToResponse = (
  detail: ReservationDetail
): components['schemas']['Models.ReservationDetail'] => {
  const base = mapReservationToResponse(detail.reservation)

  return {
    ...base,
    customerName: detail.customerName,
    staffName: detail.staffName,
    serviceName: detail.serviceName,
    serviceCategory: detail.serviceCategory,
    serviceDuration: detail.serviceDuration,
  }
}

/**
 * 予約一覧レスポンスへの変換
 */
export const mapReservationListToResponse = (
  result: PaginatedResult<Reservation>
): components['schemas']['Models.PaginationResponseModelsReservationDetail'] => {
  return {
    data: result.data.map((reservation) => {
      // 詳細情報がないため、基本情報のみでReservationDetailを構築
      // 実際のアプリケーションでは、詳細情報を含む別のメソッドを使用すべき
      const base = mapReservationToResponse(reservation)
      return {
        ...base,
        customerName: '',
        staffName: '',
        serviceName: '',
        serviceCategory: 'hair',
        serviceDuration: 60,
      }
    }),
    total: result.total,
    limit: result.limit,
    offset: result.offset,
  }
}

/**
 * 利用可能スロットレスポンスへの変換
 */
export const mapAvailableSlotsToResponse = (
  slots: AvailableSlot[]
): {
  slots: Array<{ staffId: string; startTime: string; endTime: string }>
} => {
  return {
    slots: slots.map((slot) => ({
      staffId: slot.staffId,
      startTime: slot.startTime.toISOString(),
      endTime: slot.endTime.toISOString(),
    })),
  }
}
