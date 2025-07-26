/**
 * Cancel Reservation Use Case
 * 予約キャンセルのビジネスロジック
 * CLAUDEガイドラインに準拠した実装
 */

import type {
  Reservation,
  ReservationError,
  ReservationId,
  ReservationRepository,
} from '@beauty-salon-backend/domain'
import {
  canBeCancelled,
  createReservationIdSafe,
} from '@beauty-salon-backend/domain'
import type { RepositoryError, Result } from '@beauty-salon-backend/domain'
import { err, ok } from '@beauty-salon-backend/domain'
import { match } from 'ts-pattern'

// UseCase 入力型
export type CancelReservationUseCaseInput = {
  id: ReservationId
  reason: string
  cancelledBy: string
}

// UseCase 出力型
export type CancelReservationUseCaseOutput = Result<
  Reservation,
  CancelReservationUseCaseError
>

// UseCase エラー型
export type CancelReservationUseCaseError = ReservationError | RepositoryError

// UseCase 依存関係
export type CancelReservationDeps = {
  reservationRepository: ReservationRepository
}

/**
 * 予約キャンセルユースケース
 * 1. 既存予約の存在確認
 * 2. キャンセル可能状態のチェック
 * 3. 予約のキャンセル
 */
export const cancelReservationUseCase = async (
  input: CancelReservationUseCaseInput,
  deps: CancelReservationDeps
): Promise<CancelReservationUseCaseOutput> => {
  // 1. 既存予約の存在確認
  const existingResult = await deps.reservationRepository.findById(input.id)
  if (existingResult.type === 'err') {
    return existingResult
  }

  // 2. キャンセル可能状態のチェック
  if (!canBeCancelled(existingResult.value)) {
    return err({
      type: 'cannotCancel',
      message: `Cannot cancel reservation in ${existingResult.value.type} status or too close to start time`,
    })
  }

  // 3. 予約のキャンセル
  return deps.reservationRepository.cancel(
    input.id,
    input.reason,
    input.cancelledBy
  )
}

// 予約確定ユースケース
export type ConfirmReservationUseCaseInput = {
  id: ReservationId
  confirmedBy: string
}

export type ConfirmReservationUseCaseOutput = Result<
  Reservation,
  ConfirmReservationUseCaseError
>

export type ConfirmReservationUseCaseError =
  | RepositoryError
  | { type: 'invalidStatus'; message: string }

export type ConfirmReservationDeps = {
  reservationRepository: ReservationRepository
}

export const confirmReservationUseCase = async (
  input: ConfirmReservationUseCaseInput,
  deps: ConfirmReservationDeps
): Promise<ConfirmReservationUseCaseOutput> => {
  const existingResult = await deps.reservationRepository.findById(input.id)
  if (existingResult.type === 'err') {
    return existingResult
  }

  if (existingResult.value.type !== 'pending') {
    return err({
      type: 'invalidStatus',
      message: `Cannot confirm reservation in ${existingResult.value.type} status`,
    })
  }

  return deps.reservationRepository.confirm(input.id, input.confirmedBy)
}

// 予約完了ユースケース
export type CompleteReservationUseCaseInput = {
  id: ReservationId
  completedBy: string
}

export type CompleteReservationUseCaseOutput = Result<
  Reservation,
  CompleteReservationUseCaseError
>

export type CompleteReservationUseCaseError =
  | RepositoryError
  | { type: 'invalidStatus'; message: string }

export type CompleteReservationDeps = {
  reservationRepository: ReservationRepository
}

export const completeReservationUseCase = async (
  input: CompleteReservationUseCaseInput,
  deps: CompleteReservationDeps
): Promise<CompleteReservationUseCaseOutput> => {
  const existingResult = await deps.reservationRepository.findById(input.id)
  if (existingResult.type === 'err') {
    return existingResult
  }

  if (existingResult.value.type !== 'confirmed') {
    return err({
      type: 'invalidStatus',
      message: `Cannot complete reservation in ${existingResult.value.type} status`,
    })
  }

  return deps.reservationRepository.complete(input.id, input.completedBy)
}

// No-showマークユースケース
export type MarkAsNoShowUseCaseInput = {
  id: ReservationId
  markedBy: string
}

export type MarkAsNoShowUseCaseOutput = Result<
  Reservation,
  MarkAsNoShowUseCaseError
>

export type MarkAsNoShowUseCaseError =
  | RepositoryError
  | { type: 'invalidStatus'; message: string }

export type MarkAsNoShowDeps = {
  reservationRepository: ReservationRepository
}

export const markAsNoShowUseCase = async (
  input: MarkAsNoShowUseCaseInput,
  deps: MarkAsNoShowDeps
): Promise<MarkAsNoShowUseCaseOutput> => {
  const existingResult = await deps.reservationRepository.findById(input.id)
  if (existingResult.type === 'err') {
    return existingResult
  }

  if (existingResult.value.type !== 'confirmed') {
    return err({
      type: 'invalidStatus',
      message: `Cannot mark as no-show for reservation in ${existingResult.value.type} status`,
    })
  }

  // 予約時間を過ぎているかチェック
  const now = new Date()
  if (now < existingResult.value.data.endTime) {
    return err({
      type: 'invalidStatus',
      message: 'Cannot mark as no-show before reservation end time',
    })
  }

  return deps.reservationRepository.markAsNoShow(input.id, input.markedBy)
}

/**
 * パラメータからUseCaseInputへの変換
 */
export const mapCancelReservationRequest = (
  id: string,
  reason: string,
  cancelledBy: string
): Result<
  CancelReservationUseCaseInput,
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
    reason,
    cancelledBy,
  })
}

export const mapConfirmReservationRequest = (
  id: string,
  confirmedBy: string
): Result<
  ConfirmReservationUseCaseInput,
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
    confirmedBy,
  })
}

export const mapCompleteReservationRequest = (
  id: string,
  completedBy: string
): Result<
  CompleteReservationUseCaseInput,
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
    completedBy,
  })
}

export const mapMarkAsNoShowRequest = (
  id: string,
  markedBy: string
): Result<MarkAsNoShowUseCaseInput, { type: 'invalidId'; message: string }> => {
  const reservationIdResult = createReservationIdSafe(id)
  if (reservationIdResult.type === 'err') {
    return err({
      type: 'invalidId',
      message: reservationIdResult.error.message,
    })
  }
  return ok({
    id: reservationIdResult.value,
    markedBy,
  })
}

/**
 * エラーレスポンスの作成
 */
export const createCancelReservationErrorResponse = (
  error: CancelReservationUseCaseError
): { code: string; message: string } => {
  return match(error)
    .with({ type: 'cannotCancel' }, (e) => ({
      code: 'CANNOT_CANCEL',
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

export const createStatusChangeErrorResponse = (
  error:
    | ConfirmReservationUseCaseError
    | CompleteReservationUseCaseError
    | MarkAsNoShowUseCaseError
): { code: string; message: string } => {
  return (
    match(error)
      .with({ type: 'invalidStatus' }, (e) => ({
        code: 'INVALID_STATUS',
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
      // Review specific errors
      .with({ type: 'invalidRating' }, (e) => ({
        code: 'INVALID_RATING',
        message: e.message,
      }))
      .with({ type: 'duplicateReview' }, (e) => ({
        code: 'DUPLICATE_REVIEW',
        message: e.message,
      }))
      .with({ type: 'reviewAlreadyHidden' }, (e) => ({
        code: 'REVIEW_ALREADY_HIDDEN',
        message: e.message,
      }))
      .with({ type: 'reviewUpdateExpired' }, (e) => ({
        code: 'REVIEW_UPDATE_EXPIRED',
        message: e.message,
      }))
      .with({ type: 'reservationNotFound' }, (e) => ({
        code: 'RESERVATION_NOT_FOUND',
        message: e.message,
      }))
      // Reservation specific errors
      .with({ type: 'invalidTimeRange' }, (e) => ({
        code: 'INVALID_TIME_RANGE',
        message: e.message,
      }))
      .with({ type: 'slotNotAvailable' }, (e) => ({
        code: 'SLOT_NOT_AVAILABLE',
        message: e.message,
      }))
      .with({ type: 'reservationNotModifiable' }, (e) => ({
        code: 'RESERVATION_NOT_MODIFIABLE',
        message: e.message,
      }))
      .with({ type: 'reservationAlreadyConfirmed' }, (e) => ({
        code: 'RESERVATION_ALREADY_CONFIRMED',
        message: e.message,
      }))
      .with({ type: 'invalidReservationStatus' }, (e) => ({
        code: 'INVALID_RESERVATION_STATUS',
        message: e.message,
      }))
      .with({ type: 'reservationAlreadyCancelled' }, (e) => ({
        code: 'RESERVATION_ALREADY_CANCELLED',
        message: e.message,
      }))
      .with({ type: 'reservationNotConfirmed' }, (e) => ({
        code: 'RESERVATION_NOT_CONFIRMED',
        message: e.message,
      }))
      .with({ type: 'reservationNotYetPassed' }, (e) => ({
        code: 'RESERVATION_NOT_YET_PASSED',
        message: e.message,
      }))
      .exhaustive()
  )
}

// Re-export response mapper
export { mapReservationToResponse } from './create-reservation.usecase.js'
