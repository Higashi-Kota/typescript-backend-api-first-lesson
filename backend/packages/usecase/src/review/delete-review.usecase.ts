/**
 * Delete/Hide/Publish Review Use Cases
 * レビュー削除・非表示・公開のビジネスロジック
 * CLAUDEガイドラインに準拠した実装
 */

import type {
  Review,
  ReviewId,
  ReviewRepository,
} from '@beauty-salon-backend/domain'
import {
  canBeDeleted,
  canBeHidden,
  canBePublished,
  createReviewIdSafe,
} from '@beauty-salon-backend/domain'
import type { RepositoryError, Result } from '@beauty-salon-backend/domain'
import { err, ok } from '@beauty-salon-backend/domain'
import { match } from 'ts-pattern'

// 削除UseCase
export type DeleteReviewUseCaseInput = {
  id: ReviewId
  reason: string
  deletedBy: string
}

export type DeleteReviewUseCaseOutput = Result<Review, DeleteReviewUseCaseError>

export type DeleteReviewUseCaseError =
  | RepositoryError
  | { type: 'cannotDelete'; message: string }

export type DeleteReviewDeps = {
  reviewRepository: ReviewRepository
}

export const deleteReviewUseCase = async (
  input: DeleteReviewUseCaseInput,
  deps: DeleteReviewDeps
): Promise<DeleteReviewUseCaseOutput> => {
  const existingResult = await deps.reviewRepository.findById(input.id)
  if (existingResult.type === 'err') {
    return existingResult
  }

  if (!canBeDeleted(existingResult.value)) {
    return err({
      type: 'cannotDelete',
      message: 'Review has already been deleted',
    })
  }

  return deps.reviewRepository.delete(input.id, input.reason, input.deletedBy)
}

// 公開UseCase
export type PublishReviewUseCaseInput = {
  id: ReviewId
  publishedBy: string
}

export type PublishReviewUseCaseOutput = Result<
  Review,
  PublishReviewUseCaseError
>

export type PublishReviewUseCaseError =
  | RepositoryError
  | { type: 'cannotPublish'; message: string }

export type PublishReviewDeps = {
  reviewRepository: ReviewRepository
}

export const publishReviewUseCase = async (
  input: PublishReviewUseCaseInput,
  deps: PublishReviewDeps
): Promise<PublishReviewUseCaseOutput> => {
  const existingResult = await deps.reviewRepository.findById(input.id)
  if (existingResult.type === 'err') {
    return existingResult
  }

  if (!canBePublished(existingResult.value)) {
    return err({
      type: 'cannotPublish',
      message: `Cannot publish review in ${existingResult.value.type} status`,
    })
  }

  return deps.reviewRepository.publish(input.id, input.publishedBy)
}

// 非表示UseCase
export type HideReviewUseCaseInput = {
  id: ReviewId
  reason: string
  hiddenBy: string
}

export type HideReviewUseCaseOutput = Result<Review, HideReviewUseCaseError>

export type HideReviewUseCaseError =
  | RepositoryError
  | { type: 'cannotHide'; message: string }

export type HideReviewDeps = {
  reviewRepository: ReviewRepository
}

export const hideReviewUseCase = async (
  input: HideReviewUseCaseInput,
  deps: HideReviewDeps
): Promise<HideReviewUseCaseOutput> => {
  const existingResult = await deps.reviewRepository.findById(input.id)
  if (existingResult.type === 'err') {
    return existingResult
  }

  if (!canBeHidden(existingResult.value)) {
    return err({
      type: 'cannotHide',
      message: `Cannot hide review in ${existingResult.value.type} status`,
    })
  }

  return deps.reviewRepository.hide(input.id, input.reason, input.hiddenBy)
}

// 役立ち数増加UseCase
export type IncrementHelpfulCountUseCaseInput = {
  id: ReviewId
}

export type IncrementHelpfulCountUseCaseOutput = Result<
  Review,
  IncrementHelpfulCountUseCaseError
>

export type IncrementHelpfulCountUseCaseError = RepositoryError

export type IncrementHelpfulCountDeps = {
  reviewRepository: ReviewRepository
}

export const incrementHelpfulCountUseCase = async (
  input: IncrementHelpfulCountUseCaseInput,
  deps: IncrementHelpfulCountDeps
): Promise<IncrementHelpfulCountUseCaseOutput> => {
  return deps.reviewRepository.incrementHelpfulCount(input.id)
}

/**
 * パラメータからUseCaseInputへの変換
 */
export const mapDeleteReviewRequest = (
  id: string,
  reason: string,
  deletedBy: string
): Result<DeleteReviewUseCaseInput, { type: 'invalidId'; message: string }> => {
  const reviewIdResult = createReviewIdSafe(id)
  if (reviewIdResult.type === 'err') {
    return err({
      type: 'invalidId',
      message: reviewIdResult.error.message,
    })
  }
  return ok({
    id: reviewIdResult.value,
    reason,
    deletedBy,
  })
}

export const mapPublishReviewRequest = (
  id: string,
  publishedBy: string
): Result<
  PublishReviewUseCaseInput,
  { type: 'invalidId'; message: string }
> => {
  const reviewIdResult = createReviewIdSafe(id)
  if (reviewIdResult.type === 'err') {
    return err({
      type: 'invalidId',
      message: reviewIdResult.error.message,
    })
  }
  return ok({
    id: reviewIdResult.value,
    publishedBy,
  })
}

export const mapHideReviewRequest = (
  id: string,
  reason: string,
  hiddenBy: string
): Result<HideReviewUseCaseInput, { type: 'invalidId'; message: string }> => {
  const reviewIdResult = createReviewIdSafe(id)
  if (reviewIdResult.type === 'err') {
    return err({
      type: 'invalidId',
      message: reviewIdResult.error.message,
    })
  }
  return ok({
    id: reviewIdResult.value,
    reason,
    hiddenBy,
  })
}

export const mapIncrementHelpfulCountRequest = (
  id: string
): Result<
  IncrementHelpfulCountUseCaseInput,
  { type: 'invalidId'; message: string }
> => {
  const reviewIdResult = createReviewIdSafe(id)
  if (reviewIdResult.type === 'err') {
    return err({
      type: 'invalidId',
      message: reviewIdResult.error.message,
    })
  }
  return ok({
    id: reviewIdResult.value,
  })
}

/**
 * エラーレスポンスの作成
 */
export const createDeleteReviewErrorResponse = (
  error: DeleteReviewUseCaseError
): { code: string; message: string } => {
  return match(error)
    .with({ type: 'cannotDelete' }, (e) => ({
      code: 'CANNOT_DELETE',
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

export const createReviewStatusChangeErrorResponse = (
  error: PublishReviewUseCaseError | HideReviewUseCaseError
): { code: string; message: string } => {
  return match(error)
    .with({ type: 'cannotPublish' }, (e) => ({
      code: 'CANNOT_PUBLISH',
      message: e.message,
    }))
    .with({ type: 'cannotHide' }, (e) => ({
      code: 'CANNOT_HIDE',
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

// Re-export response mapper
export { mapReviewToResponse } from './create-review.usecase.js'
