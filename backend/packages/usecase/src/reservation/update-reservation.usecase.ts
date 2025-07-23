/**
 * Update Reservation Use Case
 * 予約更新のビジネスロジック
 * CLAUDEガイドラインに準拠した実装
 */

import type {
  Reservation,
  ReservationError,
  ReservationId,
  ReservationRepository,
  StaffId,
  UpdateReservationRequest,
} from '@beauty-salon-backend/domain'
import {
  canBeModified,
  createReservationIdSafe,
  createStaffIdSafe,
  validateTimeRange,
} from '@beauty-salon-backend/domain'
import type { RepositoryError, Result } from '@beauty-salon-backend/domain'
import { err, ok } from '@beauty-salon-backend/domain'
import type { components } from '@beauty-salon-backend/types/api'
import { match } from 'ts-pattern'

// UseCase 入力型
export type UpdateReservationUseCaseInput = {
  id: ReservationId
  startTime?: Date
  endTime?: Date
  staffId?: StaffId
  notes?: string
  updatedBy?: string
}

// UseCase 出力型
export type UpdateReservationUseCaseOutput = Result<
  Reservation,
  UpdateReservationUseCaseError
>

// UseCase エラー型
export type UpdateReservationUseCaseError =
  | ReservationError
  | RepositoryError
  | { type: 'cannotModify'; message: string }
  | { type: 'slotConflict'; message: string }

// UseCase 依存関係
export type UpdateReservationDeps = {
  reservationRepository: ReservationRepository
}

/**
 * 予約更新ユースケース
 * 1. 既存予約の存在確認
 * 2. 更新可能状態のチェック
 * 3. 時間変更の場合のバリデーションとスロットチェック
 * 4. 予約の更新
 */
export const updateReservationUseCase = async (
  input: UpdateReservationUseCaseInput,
  deps: UpdateReservationDeps
): Promise<UpdateReservationUseCaseOutput> => {
  // 1. 既存予約の存在確認
  const existingResult = await deps.reservationRepository.findById(input.id)
  if (existingResult.type === 'err') {
    return existingResult
  }

  // 2. 更新可能状態のチェック
  if (!canBeModified(existingResult.value)) {
    return err({
      type: 'cannotModify',
      message: `Cannot modify reservation in ${existingResult.value.type} status`,
    })
  }

  // 3. 時間変更の場合のバリデーションとスロットチェック
  const startTime = input.startTime ?? existingResult.value.data.startTime
  const endTime = input.endTime ?? existingResult.value.data.endTime

  if (input.startTime !== undefined || input.endTime !== undefined) {
    const timeRangeResult = validateTimeRange(startTime, endTime)
    if (timeRangeResult.type === 'err') {
      return timeRangeResult
    }

    // スタッフが変更される場合、または時間が変更される場合はスロットチェック
    const staffId = input.staffId ?? existingResult.value.data.staffId

    const conflictResult =
      await deps.reservationRepository.checkTimeSlotConflict(
        staffId,
        startTime,
        endTime,
        input.id
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
  }

  // 4. 予約の更新
  const updateRequest: UpdateReservationRequest = {
    id: input.id,
    startTime: input.startTime,
    endTime: input.endTime,
    staffId: input.staffId,
    notes: input.notes,
    updatedBy: input.updatedBy,
  }

  return deps.reservationRepository.update(updateRequest)
}

/**
 * OpenAPIリクエストからUseCaseInputへの変換
 */
export const mapUpdateReservationRequest = (
  id: string,
  request: components['schemas']['Models.UpdateReservationRequest'],
  updatedBy?: string
): Result<
  UpdateReservationUseCaseInput,
  { type: 'invalidId'; message: string }
> => {
  const reservationIdResult = createReservationIdSafe(id)
  if (reservationIdResult.type === 'err') {
    return err({
      type: 'invalidId',
      message: reservationIdResult.error.message,
    })
  }

  let staffId: StaffId | undefined
  if (request.staffId) {
    const staffIdResult = createStaffIdSafe(request.staffId)
    if (staffIdResult.type === 'err') {
      return err({
        type: 'invalidId',
        message: `Invalid staff ID: ${staffIdResult.error.message}`,
      })
    }
    staffId = staffIdResult.value
  }

  return ok({
    id: reservationIdResult.value,
    startTime: request.startTime ? new Date(request.startTime) : undefined,
    staffId,
    notes: request.notes,
    updatedBy,
  })
}

/**
 * エラーレスポンスの作成
 */
export const createUpdateReservationErrorResponse = (
  error: UpdateReservationUseCaseError
): { code: string; message: string } => {
  return match(error)
    .with({ type: 'invalidTimeRange' }, (e) => ({
      code: 'INVALID_TIME_RANGE',
      message: e.message,
    }))
    .with({ type: 'pastTimeNotAllowed' }, (e) => ({
      code: 'PAST_TIME_NOT_ALLOWED',
      message: e.message,
    }))
    .with({ type: 'cannotModify' }, (e) => ({
      code: 'CANNOT_MODIFY',
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

// Re-export response mapper
export { mapReservationToResponse } from './create-reservation.usecase.js'
