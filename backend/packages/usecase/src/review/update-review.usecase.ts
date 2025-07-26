/**
 * Update Review Use Case
 * レビュー更新のビジネスロジック
 * CLAUDEガイドラインに準拠した実装
 */

import type {
  Review,
  ReviewError,
  ReviewId,
  ReviewRepository,
  UpdateReviewRequest,
} from '@beauty-salon-backend/domain'
import {
  canBeEdited,
  createReviewIdSafe,
  validateComment,
  validateImages,
  validateRating,
} from '@beauty-salon-backend/domain'
import type { RepositoryError, Result } from '@beauty-salon-backend/domain'
import { err, ok } from '@beauty-salon-backend/domain'
import type { components } from '@beauty-salon-backend/types/api'
import { match } from 'ts-pattern'

// UseCase 入力型
export type UpdateReviewUseCaseInput = {
  id: ReviewId
  rating?: number
  comment?: string
  serviceRating?: number
  staffRating?: number
  atmosphereRating?: number
  images?: string[]
  updatedBy?: string
}

// UseCase 出力型
export type UpdateReviewUseCaseOutput = Result<Review, UpdateReviewUseCaseError>

// UseCase エラー型
export type UpdateReviewUseCaseError =
  | ReviewError
  | RepositoryError
  | { type: 'cannotEdit'; message: string }

// UseCase 依存関係
export type UpdateReviewDeps = {
  reviewRepository: ReviewRepository
}

/**
 * レビュー更新ユースケース
 * 1. 既存レビューの存在確認
 * 2. 編集可能状態のチェック
 * 3. 更新データのバリデーション
 * 4. レビューの更新
 */
export const updateReviewUseCase = async (
  input: UpdateReviewUseCaseInput,
  deps: UpdateReviewDeps
): Promise<UpdateReviewUseCaseOutput> => {
  // 1. 既存レビューの存在確認
  const existingResult = await deps.reviewRepository.findById(input.id)
  if (existingResult.type === 'err') {
    return existingResult
  }

  // 2. 編集可能状態のチェック
  if (!canBeEdited(existingResult.value)) {
    return err({
      type: 'cannotEdit',
      message: (() => {
        if (existingResult.value.type === 'hidden') {
          return 'Review cannot be edited because it is hidden'
        }
        if (existingResult.value.type === 'deleted') {
          return 'Review cannot be edited because it is deleted'
        }
        return `Review cannot be edited in ${existingResult.value.type} status`
      })(),
    })
  }

  // 3. 更新データのバリデーション
  if (input.rating !== undefined) {
    const ratingResult = validateRating(input.rating)
    if (ratingResult.type === 'err') {
      return ratingResult
    }
  }

  if (input.comment !== undefined) {
    const commentResult = validateComment(input.comment)
    if (commentResult.type === 'err') {
      return commentResult
    }
  }

  if (input.images !== undefined) {
    const imagesResult = validateImages(input.images)
    if (imagesResult.type === 'err') {
      return imagesResult
    }
  }

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

  // 4. レビューの更新
  const updateRequest: UpdateReviewRequest = {
    id: input.id,
    rating: input.rating,
    comment: input.comment,
    serviceRating: input.serviceRating,
    staffRating: input.staffRating,
    atmosphereRating: input.atmosphereRating,
    images: input.images,
    updatedBy: input.updatedBy,
  }

  return deps.reviewRepository.update(updateRequest)
}

/**
 * OpenAPIリクエストからUseCaseInputへの変換
 */
export const mapUpdateReviewRequest = (
  id: string,
  request: components['schemas']['Models.UpdateReviewRequest'],
  updatedBy?: string
): Result<UpdateReviewUseCaseInput, { type: 'invalidId'; message: string }> => {
  const reviewIdResult = createReviewIdSafe(id)
  if (reviewIdResult.type === 'err') {
    return err({
      type: 'invalidId',
      message: reviewIdResult.error.message,
    })
  }
  return ok({
    id: reviewIdResult.value,
    rating: request.rating,
    comment: request.comment,
    serviceRating: request.serviceRating,
    staffRating: request.staffRating,
    atmosphereRating: request.atmosphereRating,
    images: request.images,
    updatedBy,
  })
}

/**
 * エラーレスポンスの作成
 */
export const createUpdateReviewErrorResponse = (
  error: UpdateReviewUseCaseError
): { code: string; message: string } => {
  return match(error)
    .with({ type: 'invalidRating' }, (e) => ({
      code: 'INVALID_RATING',
      message: e.message,
    }))
    .with({ type: 'commentTooLong' }, (e) => ({
      code: 'COMMENT_TOO_LONG',
      message: e.message,
    }))
    .with({ type: 'tooManyImages' }, (e) => ({
      code: 'TOO_MANY_IMAGES',
      message: e.message,
    }))
    .with({ type: 'cannotEdit' }, (e) => ({
      code: 'CANNOT_EDIT',
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
export { mapReviewToResponse } from './create-review.usecase.js'
