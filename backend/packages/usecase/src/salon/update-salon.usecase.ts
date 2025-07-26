/**
 * Update Salon Use Case
 * サロン更新のビジネスロジック
 * CLAUDEガイドラインに準拠した実装
 */

import type {
  Salon,
  SalonError,
  SalonRepository,
  UpdateSalonRequest,
} from '@beauty-salon-backend/domain'
import {
  createSalonIdSafe,
  validateEmail,
  validateOpeningHours,
  validatePhoneNumber,
  validateSalonName,
} from '@beauty-salon-backend/domain'
import type { RepositoryError, Result } from '@beauty-salon-backend/domain'
import { err, ok } from '@beauty-salon-backend/domain'
import type { components } from '@beauty-salon-backend/types/api'
import { match } from 'ts-pattern'

// UseCase 入力型
export type UpdateSalonUseCaseInput = UpdateSalonRequest

// UseCase 出力型
export type UpdateSalonUseCaseOutput = Result<Salon, UpdateSalonUseCaseError>

// UseCase エラー型
export type UpdateSalonUseCaseError = SalonError | RepositoryError

// UseCase 依存関係
export type UpdateSalonDeps = {
  salonRepository: SalonRepository
}

/**
 * サロン更新ユースケース
 * 1. 既存サロンの存在確認
 * 2. 更新データのバリデーション
 * 3. リポジトリでの更新
 */
export const updateSalonUseCase = async (
  input: UpdateSalonUseCaseInput,
  deps: UpdateSalonDeps
): Promise<UpdateSalonUseCaseOutput> => {
  // 1. 既存サロンの存在確認
  const existingResult = await deps.salonRepository.findById(input.id)
  if (existingResult.type === 'err') {
    return existingResult
  }

  // 削除済みサロンは更新不可
  if (existingResult.value.type === 'deleted') {
    return err({
      type: 'notFound',
      entity: 'Salon',
      id: input.id,
    })
  }

  // 2. 更新データのバリデーション
  if (input.name !== undefined) {
    const nameResult = validateSalonName(input.name)
    if (nameResult.type === 'err') {
      return nameResult
    }
  }

  if (input.contactInfo?.email !== undefined) {
    const emailResult = validateEmail(input.contactInfo.email)
    if (emailResult.type === 'err') {
      return err({
        type: 'invalidEmail',
        message: 'Invalid email format',
      })
    }
  }

  if (input.contactInfo?.phoneNumber !== undefined) {
    const phoneResult = validatePhoneNumber(input.contactInfo.phoneNumber)
    if (phoneResult.type === 'err') {
      return err({
        type: 'invalidPhoneNumber',
        message: 'Invalid phone number format',
      })
    }
  }

  if (input.openingHours !== undefined) {
    const openingHoursResult = validateOpeningHours(input.openingHours)
    if (openingHoursResult.type === 'err') {
      return openingHoursResult
    }
  }

  // 3. リポジトリで更新
  return deps.salonRepository.update(input)
}

/**
 * OpenAPIリクエストからUseCaseInputへの変換
 */
export const mapUpdateSalonRequest = (
  id: string,
  request: components['schemas']['Models.UpdateSalonRequest'],
  updatedBy?: string
): Result<UpdateSalonUseCaseInput, { type: 'invalidId'; message: string }> => {
  const salonIdResult = createSalonIdSafe(id)
  if (salonIdResult.type === 'err') {
    return err({
      type: 'invalidId',
      message: salonIdResult.error.message,
    })
  }
  return ok({
    id: salonIdResult.value,
    name: request.name,
    description: request.description,
    address: request.address,
    contactInfo: request.contactInfo,
    openingHours: request.openingHours,
    imageUrls: request.imageUrls,
    features: request.features,
    updatedBy,
  })
}

/**
 * エラーレスポンスの作成
 */
export const createUpdateSalonErrorResponse = (
  error: UpdateSalonUseCaseError
): { code: string; message: string } => {
  return (
    match(error)
      .with({ type: 'invalidName' }, (e) => ({
        code: 'INVALID_NAME',
        message: e.message,
      }))
      .with({ type: 'invalidEmail' }, (e) => ({
        code: 'INVALID_EMAIL',
        message: e.message,
      }))
      .with({ type: 'invalidPhoneNumber' }, (e) => ({
        code: 'INVALID_PHONE_NUMBER',
        message: e.message,
      }))
      .with({ type: 'invalidOpeningHours' }, (e) => ({
        code: 'INVALID_OPENING_HOURS',
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

// Re-export response mapper from create-salon
export { mapSalonToResponse } from './create-salon.usecase.js'
