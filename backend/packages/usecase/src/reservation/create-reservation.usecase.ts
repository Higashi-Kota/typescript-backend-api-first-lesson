/**
 * Create Reservation Use Case
 * 予約作成のビジネスロジック
 * CLAUDEガイドラインに準拠した実装
 */

import type {
  CreateReservationRequest,
  CustomerId,
  Reservation,
  ReservationError,
  ReservationRepository,
  SalonId,
  ServiceId,
  StaffId,
} from '@beauty-salon-backend/domain'
import {
  createCustomerIdSafe,
  createSalonIdSafe,
  createServiceIdSafe,
  createStaffIdSafe,
  validateAmount,
  validateDepositAmount,
  validateTimeRange,
} from '@beauty-salon-backend/domain'
import type { RepositoryError, Result } from '@beauty-salon-backend/domain'
import { err, ok } from '@beauty-salon-backend/domain'
import type { components } from '@beauty-salon-backend/types/api'
import { match } from 'ts-pattern'

// UseCase 入力型
export type CreateReservationUseCaseInput = {
  salonId: SalonId
  customerId: CustomerId
  staffId: StaffId
  serviceId: ServiceId
  startTime: Date
  endTime: Date
  notes?: string
  totalAmount: number
  depositAmount?: number
  createdBy?: string
}

// UseCase 出力型
export type CreateReservationUseCaseOutput = Result<
  Reservation,
  CreateReservationUseCaseError
>

// UseCase エラー型
export type CreateReservationUseCaseError =
  | ReservationError
  | RepositoryError
  | { type: 'slotConflict'; message: string }

// UseCase 依存関係
export type CreateReservationDeps = {
  reservationRepository: ReservationRepository
}

/**
 * 予約作成ユースケース
 * 1. 時間範囲のバリデーション
 * 2. 金額のバリデーション
 * 3. スロットの重複チェック
 * 4. 予約の作成
 */
export const createReservationUseCase = async (
  input: CreateReservationUseCaseInput,
  deps: CreateReservationDeps
): Promise<CreateReservationUseCaseOutput> => {
  // 1. 時間範囲のバリデーション
  const timeRangeResult = validateTimeRange(input.startTime, input.endTime)
  if (timeRangeResult.type === 'err') {
    return timeRangeResult
  }

  // 2. 金額のバリデーション
  const amountResult = validateAmount(input.totalAmount)
  if (amountResult.type === 'err') {
    return amountResult
  }

  const depositResult = validateDepositAmount(
    input.depositAmount,
    input.totalAmount
  )
  if (depositResult.type === 'err') {
    return depositResult
  }

  // 3. スロットの重複チェック
  const conflictResult = await deps.reservationRepository.checkTimeSlotConflict(
    input.staffId,
    input.startTime,
    input.endTime
  )
  if (conflictResult.type === 'err') {
    return conflictResult
  }
  if (conflictResult.value) {
    return err({
      type: 'slotConflict',
      message: 'The selected time slot is not available',
    })
  }

  // 4. 予約の作成
  const createRequest: CreateReservationRequest = {
    salonId: input.salonId,
    customerId: input.customerId,
    staffId: input.staffId,
    serviceId: input.serviceId,
    startTime: timeRangeResult.value.startTime,
    endTime: timeRangeResult.value.endTime,
    notes: input.notes,
    totalAmount: amountResult.value,
    depositAmount: depositResult.value,
    createdBy: input.createdBy,
  }

  return deps.reservationRepository.create(createRequest)
}

/**
 * OpenAPIリクエストからUseCaseInputへの変換
 */
export const mapCreateReservationRequest = (
  request: components['schemas']['Models.CreateReservationRequest'],
  createdBy?: string
): Result<
  CreateReservationUseCaseInput,
  { type: 'invalidId'; message: string }
> => {
  const salonIdResult = createSalonIdSafe(request.salonId)
  if (salonIdResult.type === 'err') {
    return err({
      type: 'invalidId',
      message: `Invalid salon ID: ${salonIdResult.error.message}`,
    })
  }

  const customerIdResult = createCustomerIdSafe(request.customerId)
  if (customerIdResult.type === 'err') {
    return err({
      type: 'invalidId',
      message: `Invalid customer ID: ${customerIdResult.error.message}`,
    })
  }

  const staffIdResult = createStaffIdSafe(request.staffId)
  if (staffIdResult.type === 'err') {
    return err({
      type: 'invalidId',
      message: `Invalid staff ID: ${staffIdResult.error.message}`,
    })
  }

  const serviceIdResult = createServiceIdSafe(request.serviceId)
  if (serviceIdResult.type === 'err') {
    return err({
      type: 'invalidId',
      message: `Invalid service ID: ${serviceIdResult.error.message}`,
    })
  }

  return ok({
    salonId: salonIdResult.value,
    customerId: customerIdResult.value,
    staffId: staffIdResult.value,
    serviceId: serviceIdResult.value,
    startTime: new Date(request.startTime),
    endTime: new Date(request.endTime),
    notes: request.notes,
    totalAmount: request.totalAmount,
    depositAmount: request.depositAmount,
    createdBy,
  })
}

/**
 * ReservationからOpenAPIレスポンスへの変換
 */
export const mapReservationToResponse = (
  reservation: Reservation
): components['schemas']['Models.Reservation'] => {
  const { data } = reservation

  return {
    id: data.id,
    salonId: data.salonId,
    customerId: data.customerId,
    staffId: data.staffId,
    serviceId: data.serviceId,
    startTime: data.startTime.toISOString(),
    endTime: data.endTime.toISOString(),
    status: reservation.type,
    notes: data.notes,
    totalAmount: data.totalAmount,
    depositAmount: data.depositAmount,
    isPaid: data.isPaid,
    createdAt: data.createdAt.toISOString(),
    createdBy: data.createdBy,
    updatedAt: data.updatedAt.toISOString(),
    updatedBy: data.updatedBy,
  }
}

/**
 * エラーレスポンスの作成
 */
export const createReservationErrorResponse = (
  error: CreateReservationUseCaseError
): { code: string; message: string } => {
  return match(error)
    .with({ type: 'invalidTimeRange' }, (e) => ({
      code: 'INVALID_TIME_RANGE',
      message: e.message,
    }))
    .with({ type: 'slotNotAvailable' }, (e) => ({
      code: 'SLOT_NOT_AVAILABLE',
      message: e.message,
    }))
    .with({ type: 'invalidAmount' }, (e) => ({
      code: 'INVALID_AMOUNT',
      message: e.message,
    }))
    .with({ type: 'pastTimeNotAllowed' }, (e) => ({
      code: 'PAST_TIME_NOT_ALLOWED',
      message: e.message,
    }))
    .with({ type: 'slotConflict' }, (e) => ({
      code: 'SLOT_CONFLICT',
      message: e.message,
    }))
    .with({ type: 'databaseError' }, (e) => ({
      code: 'DATABASE_ERROR',
      message: e.message,
    }))
    .with({ type: 'notFound' }, (e) => ({
      code: 'NOT_FOUND',
      message: `Entity ${e.entity} not found with id ${e.id}`,
    }))
    .with({ type: 'constraintViolation' }, (e) => ({
      code: 'CONSTRAINT_VIOLATION',
      message: e.message,
    }))
    .with({ type: 'connectionError' }, (e) => ({
      code: 'CONNECTION_ERROR',
      message: e.message,
    }))
    .otherwise(() => ({
      code: 'UNKNOWN_ERROR',
      message: 'An unknown error occurred',
    }))
}
