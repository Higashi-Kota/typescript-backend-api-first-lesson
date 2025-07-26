/**
 * Suspend/Reactivate Salon Use Cases
 * サロン一時停止・再開のビジネスロジック
 * CLAUDEガイドラインに準拠した実装
 */

import type {
  Salon,
  SalonId,
  SalonRepository,
} from '@beauty-salon-backend/domain'
import { createSalonIdSafe } from '@beauty-salon-backend/domain'
import type { RepositoryError, Result } from '@beauty-salon-backend/domain'
import { err, ok } from '@beauty-salon-backend/domain'
import { match } from 'ts-pattern'

// 一時停止UseCase
export type SuspendSalonUseCaseInput = {
  id: SalonId
  reason: string
  suspendedBy: string
}

export type SuspendSalonUseCaseOutput = Result<Salon, SuspendSalonUseCaseError>

export type SuspendSalonUseCaseError = RepositoryError

export type SuspendSalonDeps = {
  salonRepository: SalonRepository
}

/**
 * サロン一時停止ユースケース
 * 1. 既存サロンの存在確認
 * 2. ステータスチェック（アクティブなサロンのみ停止可能）
 * 3. リポジトリでの一時停止処理
 */
export const suspendSalonUseCase = async (
  input: SuspendSalonUseCaseInput,
  deps: SuspendSalonDeps
): Promise<SuspendSalonUseCaseOutput> => {
  // 1. 既存サロンの存在確認
  const existingResult = await deps.salonRepository.findById(input.id)
  if (existingResult.type === 'err') {
    return existingResult
  }

  // 2. ステータスチェック
  const salon = existingResult.value
  if (salon.type !== 'active') {
    return err({
      type: 'constraintViolation',
      constraint: 'salon_status',
      message: `Cannot suspend salon in ${salon.type} status`,
    })
  }

  // 3. リポジトリで一時停止
  return deps.salonRepository.suspend(input.id, input.reason, input.suspendedBy)
}

// 再開UseCase
export type ReactivateSalonUseCaseInput = {
  id: SalonId
  reactivatedBy: string
}

export type ReactivateSalonUseCaseOutput = Result<
  Salon,
  ReactivateSalonUseCaseError
>

export type ReactivateSalonUseCaseError = RepositoryError

export type ReactivateSalonDeps = {
  salonRepository: SalonRepository
}

/**
 * サロン再開ユースケース
 * 1. 既存サロンの存在確認
 * 2. ステータスチェック（停止中のサロンのみ再開可能）
 * 3. リポジトリでの再開処理
 */
export const reactivateSalonUseCase = async (
  input: ReactivateSalonUseCaseInput,
  deps: ReactivateSalonDeps
): Promise<ReactivateSalonUseCaseOutput> => {
  // 1. 既存サロンの存在確認
  const existingResult = await deps.salonRepository.findById(input.id)
  if (existingResult.type === 'err') {
    return existingResult
  }

  // 2. ステータスチェック
  const salon = existingResult.value
  if (salon.type !== 'suspended') {
    return err({
      type: 'constraintViolation',
      constraint: 'salon_status',
      message: `Cannot reactivate salon in ${salon.type} status`,
    })
  }

  // 3. リポジトリで再開
  return deps.salonRepository.reactivate(input.id, input.reactivatedBy)
}

/**
 * パラメータからUseCaseInputへの変換
 */
export const mapSuspendSalonRequest = (
  id: string,
  reason: string,
  suspendedBy: string
): Result<SuspendSalonUseCaseInput, { type: 'invalidId'; message: string }> => {
  const salonIdResult = createSalonIdSafe(id)
  if (salonIdResult.type === 'err') {
    return err({
      type: 'invalidId',
      message: salonIdResult.error.message,
    })
  }
  return ok({
    id: salonIdResult.value,
    reason,
    suspendedBy,
  })
}

export const mapReactivateSalonRequest = (
  id: string,
  reactivatedBy: string
): Result<
  ReactivateSalonUseCaseInput,
  { type: 'invalidId'; message: string }
> => {
  const salonIdResult = createSalonIdSafe(id)
  if (salonIdResult.type === 'err') {
    return err({
      type: 'invalidId',
      message: salonIdResult.error.message,
    })
  }
  return ok({
    id: salonIdResult.value,
    reactivatedBy,
  })
}

/**
 * エラーレスポンスの作成
 */
export const createSuspendReactivateErrorResponse = (
  error: RepositoryError
): { code: string; message: string } => {
  return (
    match(error)
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
export { mapSalonToResponse } from './create-salon.usecase.js'
