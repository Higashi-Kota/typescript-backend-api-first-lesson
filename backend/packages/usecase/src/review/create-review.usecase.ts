/**
 * Create Review Use Case
 * レビュー作成のビジネスロジック
 * CLAUDEガイドラインに準拠した実装
 */

import type {
  CreateReviewRequest,
  CustomerId,
  ReservationId,
  ReservationRepository,
  Review,
  ReviewError,
  ReviewRepository,
  SalonId,
  StaffId,
} from '@beauty-salon-backend/domain'
import {
  createCustomerIdSafe,
  createReservationIdSafe,
  createSalonIdSafe,
  createStaffIdSafe,
  validateComment,
  validateImages,
  validateRating,
} from '@beauty-salon-backend/domain'
import type { RepositoryError, Result } from '@beauty-salon-backend/domain'
import { err, ok } from '@beauty-salon-backend/domain'
import type { components } from '@beauty-salon-backend/types/api'
import { match } from 'ts-pattern'

// UseCase 入力型
export type CreateReviewUseCaseInput = {
  salonId: SalonId
  customerId: CustomerId
  reservationId: ReservationId
  staffId?: StaffId
  rating: number
  comment?: string
  serviceRating?: number
  staffRating?: number
  atmosphereRating?: number
  images?: string[]
  createdBy?: string
}

// UseCase 出力型
export type CreateReviewUseCaseOutput = Result<Review, CreateReviewUseCaseError>

// UseCase エラー型
export type CreateReviewUseCaseError = ReviewError | RepositoryError

// UseCase 依存関係
export type CreateReviewDeps = {
  reviewRepository: ReviewRepository
  reservationRepository: ReservationRepository
}

/**
 * レビュー作成ユースケース
 * 1. 予約の存在・完了状態確認
 * 2. 重複レビューチェック
 * 3. バリデーション（評価、コメント、画像）
 * 4. レビューの作成
 */
export const createReviewUseCase = async (
  input: CreateReviewUseCaseInput,
  deps: CreateReviewDeps
): Promise<CreateReviewUseCaseOutput> => {
  // 1. 予約の存在・完了状態確認
  const reservationResult = await deps.reservationRepository.findById(
    input.reservationId
  )
  if (reservationResult.type === 'err') {
    return reservationResult
  }

  if (reservationResult.value.type !== 'completed') {
    return err({
      type: 'reservationNotCompleted',
      message: 'Cannot create review for uncompleted reservation',
    })
  }

  // 2. 重複レビューチェック
  const existingReviewResult = await deps.reviewRepository.findByReservationId(
    input.reservationId
  )
  if (existingReviewResult.type === 'err') {
    return existingReviewResult
  }
  if (existingReviewResult.value !== null) {
    return err({
      type: 'duplicateReview',
      message: 'Review already exists for this reservation',
    })
  }

  // 3. バリデーション
  const ratingResult = validateRating(input.rating)
  if (ratingResult.type === 'err') {
    return ratingResult
  }

  const commentResult = validateComment(input.comment)
  if (commentResult.type === 'err') {
    return commentResult
  }

  const imagesResult = validateImages(input.images)
  if (imagesResult.type === 'err') {
    return imagesResult
  }

  // オプショナル評価のバリデーション
  if (input.serviceRating !== undefined) {
    const serviceRatingResult = validateRating(input.serviceRating, 'service')
    if (serviceRatingResult.type === 'err') {
      return serviceRatingResult
    }
  }

  if (input.staffRating !== undefined) {
    const staffRatingResult = validateRating(input.staffRating, 'staff')
    if (staffRatingResult.type === 'err') {
      return staffRatingResult
    }
  }

  if (input.atmosphereRating !== undefined) {
    const atmosphereRatingResult = validateRating(
      input.atmosphereRating,
      'atmosphere'
    )
    if (atmosphereRatingResult.type === 'err') {
      return atmosphereRatingResult
    }
  }

  // 4. レビューの作成
  const createRequest: CreateReviewRequest = {
    salonId: input.salonId,
    customerId: input.customerId,
    reservationId: input.reservationId,
    staffId: input.staffId,
    rating: ratingResult.value,
    comment: commentResult.value,
    serviceRating: input.serviceRating,
    staffRating: input.staffRating,
    atmosphereRating: input.atmosphereRating,
    images: imagesResult.value,
    createdBy: input.createdBy,
  }

  return deps.reviewRepository.create(createRequest)
}

/**
 * OpenAPIリクエストからUseCaseInputへの変換
 */
export const mapCreateReviewRequest = (
  request: components['schemas']['Models.CreateReviewRequest'],
  createdBy?: string
): Result<CreateReviewUseCaseInput, { type: 'invalidId'; message: string }> => {
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

  const reservationIdResult = createReservationIdSafe(request.reservationId)
  if (reservationIdResult.type === 'err') {
    return err({
      type: 'invalidId',
      message: `Invalid reservation ID: ${reservationIdResult.error.message}`,
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
    salonId: salonIdResult.value,
    customerId: customerIdResult.value,
    reservationId: reservationIdResult.value,
    staffId,
    rating: request.rating,
    comment: request.comment,
    serviceRating: request.serviceRating,
    staffRating: request.staffRating,
    atmosphereRating: request.atmosphereRating,
    images: request.images,
    createdBy,
  })
}

/**
 * ReviewからOpenAPIレスポンスへの変換
 */
export const mapReviewToResponse = (
  review: Review
): components['schemas']['Models.Review'] => {
  const { data } = review

  return {
    id: data.id,
    salonId: data.salonId,
    customerId: data.customerId,
    reservationId: data.reservationId,
    staffId: data.staffId,
    rating: data.rating,
    comment: data.comment,
    serviceRating: data.serviceRating,
    staffRating: data.staffRating,
    atmosphereRating: data.atmosphereRating,
    images: data.images || [],
    isVerified: data.isVerified,
    helpfulCount: data.helpfulCount,
    createdAt: data.createdAt.toISOString(),
    createdBy: data.createdBy,
    updatedAt: data.updatedAt.toISOString(),
    updatedBy: data.updatedBy,
  }
}

/**
 * エラーレスポンスの作成
 */
export const createReviewErrorResponse = (
  error: CreateReviewUseCaseError
): { code: string; message: string } => {
  return match(error)
    .with({ type: 'invalidRating' }, (e) => ({
      code: 'INVALID_RATING',
      message: e.message,
    }))
    .with({ type: 'duplicateReview' }, (e) => ({
      code: 'DUPLICATE_REVIEW',
      message: e.message,
    }))
    .with({ type: 'reservationNotCompleted' }, (e) => ({
      code: 'RESERVATION_NOT_COMPLETED',
      message: e.message,
    }))
    .with({ type: 'tooManyImages' }, (e) => ({
      code: 'TOO_MANY_IMAGES',
      message: e.message,
    }))
    .with({ type: 'commentTooLong' }, (e) => ({
      code: 'COMMENT_TOO_LONG',
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
    .exhaustive()
}
