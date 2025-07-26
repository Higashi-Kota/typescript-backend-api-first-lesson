/**
 * Create Salon Use Case
 * サロン作成のビジネスロジック
 * CLAUDEガイドラインに準拠した実装
 */

import type {
  CreateSalonRequest,
  Salon,
  SalonError,
  SalonRepository,
} from '@beauty-salon-backend/domain'
import {
  validateEmail,
  validateOpeningHours,
  validatePhoneNumber,
  validateSalonName,
} from '@beauty-salon-backend/domain'
import type { RepositoryError, Result } from '@beauty-salon-backend/domain'
import { err } from '@beauty-salon-backend/domain'
import type { components } from '@beauty-salon-backend/types/api'
import { match } from 'ts-pattern'

// UseCase 入力型
export type CreateSalonUseCaseInput = CreateSalonRequest

// UseCase 出力型
export type CreateSalonUseCaseOutput = Result<Salon, CreateSalonUseCaseError>

// UseCase エラー型
export type CreateSalonUseCaseError = SalonError | RepositoryError

// UseCase 依存関係
export type CreateSalonDeps = {
  salonRepository: SalonRepository
  generateId?: () => string
}

/**
 * サロン作成ユースケース
 * 1. バリデーション（名前、メール、電話番号、営業時間）
 * 2. ドメインモデルの作成
 * 3. リポジトリへの保存
 */
export const createSalonUseCase = async (
  input: CreateSalonUseCaseInput,
  deps: CreateSalonDeps
): Promise<CreateSalonUseCaseOutput> => {
  // 1. バリデーション
  const nameResult = validateSalonName(input.name)
  if (nameResult.type === 'err') {
    return nameResult
  }

  const emailResult = validateEmail(input.contactInfo.email)
  if (emailResult.type === 'err') {
    return err({
      type: 'invalidEmail',
      message: 'Invalid email format',
    })
  }

  const phoneResult = validatePhoneNumber(input.contactInfo.phoneNumber)
  if (phoneResult.type === 'err') {
    return err({
      type: 'invalidPhoneNumber',
      message: 'Invalid phone number format',
    })
  }

  const openingHoursResult = validateOpeningHours(input.openingHours)
  if (openingHoursResult.type === 'err') {
    return openingHoursResult
  }

  // 2. リポジトリに保存
  const createRequest: CreateSalonRequest = {
    ...input,
    name: nameResult.value,
    contactInfo: {
      ...input.contactInfo,
      email: emailResult.value,
      phoneNumber: phoneResult.value,
    },
    openingHours: openingHoursResult.value,
  }

  return deps.salonRepository.create(createRequest)
}

/**
 * OpenAPIリクエストからUseCaseInputへの変換
 */
export const mapCreateSalonRequest = (
  request: components['schemas']['Models.CreateSalonRequest'],
  createdBy?: string
): CreateSalonUseCaseInput => {
  return {
    name: request.name,
    description: request.description,
    address: request.address,
    contactInfo: request.contactInfo,
    openingHours: request.openingHours.map(
      (hours: components['schemas']['Models.OpeningHours']) => ({
        dayOfWeek: hours.dayOfWeek,
        openTime: hours.openTime,
        closeTime: hours.closeTime,
        isHoliday: hours.isHoliday,
      })
    ),
    imageUrls: request.imageUrls,
    features: request.features,
    createdBy,
  }
}

/**
 * SalonからOpenAPIレスポンスへの変換
 */
export const mapSalonToResponse = (
  salon: Salon
): components['schemas']['Models.Salon'] => {
  // すべてのステータスでベースデータは同じ構造
  const { data } = salon

  return {
    id: data.id,
    name: data.name,
    description: data.description,
    address: data.address,
    contactInfo: data.contactInfo,
    openingHours: data.openingHours,
    imageUrls: data.imageUrls ?? [],
    features: data.features ?? [],
    rating: data.rating,
    reviewCount: data.reviewCount,
    createdAt: data.createdAt.toISOString(),
    createdBy: data.createdBy,
    updatedAt: data.updatedAt.toISOString(),
    updatedBy: data.updatedBy,
  }
}

/**
 * エラーレスポンスの作成
 */
export const createSalonErrorResponse = (
  error: CreateSalonUseCaseError
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
