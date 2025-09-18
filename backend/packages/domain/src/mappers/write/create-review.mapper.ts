/**
 * Create Review Mapper (Write Operation)
 * API Request -> Domain Model -> Database Entity
 */

import type { reviews } from '@beauty-salon-backend/database'
import type { components } from '@beauty-salon-backend/generated'
import { match } from 'ts-pattern'
import type {
  Review,
  ReviewId,
  ReviewOperationResult,
} from '../../models/review'
import { brandReviewId } from '../../shared/brand-utils'
import type { ValidationError } from '../../shared/errors'
import type { Result } from '../../shared/result'
import { err, ok } from '../../shared/result'
import { generateId } from '../../shared/utils'

// Type aliases for clarity
type CreateReviewRequest = components['schemas']['Models.CreateReviewRequest']
type ReviewDbInsert = typeof reviews.$inferInsert

/**
 * Map API Create Request to Domain Model
 */
export const mapCreateReviewApiToDomain = (
  request: CreateReviewRequest
): Result<Partial<Review>, ReviewOperationResult> => {
  try {
    const review: Partial<Review> = {
      salonId: request.salonId,
      customerId: request.customerId,
      bookingId: request.bookingId, // Now correctly mapped
      staffId: request.staffId,
      overallRating: request.overallRating, // Now correctly mapped
      title: request.title,
      comment: request.comment,
      serviceRating: request.serviceRating,
      staffRating: request.staffRating,
      cleanlinessRating: request.cleanlinessRating, // Now correctly mapped
      valueRating: request.valueRating, // Now correctly mapped
      imageUrls: request.imageUrls, // Now correctly mapped
      isVerified: false,
      helpfulCount: 0,
      reportCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    // Validate required fields
    const errors: ValidationError[] = []

    if (!review.salonId) {
      errors.push({ field: 'salonId', message: 'Salon ID is required' })
    }

    if (!review.customerId) {
      errors.push({ field: 'customerId', message: 'Customer ID is required' })
    }

    if (!review.bookingId) {
      errors.push({ field: 'bookingId', message: 'Booking ID is required' })
    }

    if (!review.overallRating) {
      errors.push({
        field: 'overallRating',
        message: 'Overall rating is required',
      })
    }

    // Validate rating values
    const validateRating = (rating: number | undefined, field: string) => {
      if (rating !== undefined && (rating < 1 || rating > 5)) {
        errors.push({ field, message: `${field} must be between 1 and 5` })
      }
    }

    validateRating(review.overallRating, 'overallRating')
    validateRating(review.serviceRating, 'serviceRating')
    validateRating(review.staffRating, 'staffRating')
    validateRating(review.cleanlinessRating, 'cleanlinessRating')
    validateRating(review.valueRating, 'valueRating')

    // Validate comment length
    if (review.comment && review.comment.length > 2000) {
      errors.push({
        field: 'comment',
        message: 'Comment must not exceed 2000 characters',
      })
    }

    if (review.title && review.title.length > 255) {
      errors.push({
        field: 'title',
        message: 'Title must not exceed 255 characters',
      })
    }

    if (errors.length > 0) {
      return err({
        type: 'validation_failed',
        errors,
      })
    }

    return ok(review)
  } catch (error) {
    return err({
      type: 'error',
      error: { type: 'system', message: `Mapping error: ${error}` },
    })
  }
}

/**
 * Map Domain Model to Database Entity
 * Handles field name differences:
 * - API rating -> DB overallRating
 * - API reservationId -> DB bookingId
 * - API images -> DB imageUrls
 */
export const mapCreateReviewDomainToDb = (
  review: Partial<Review>
): ReviewDbInsert => {
  return {
    id: review.id,
    salonId: review.salonId!,
    customerId: review.customerId!,
    bookingId: review.bookingId!, // Now correctly mapped
    staffId: review.staffId ?? null,
    overallRating: review.overallRating!, // Now correctly mapped
    serviceRating: review.serviceRating ?? null,
    staffRating: review.staffRating ?? null,
    cleanlinessRating: review.cleanlinessRating ?? null, // Now correctly mapped
    valueRating: review.valueRating ?? null, // Now correctly mapped
    atmosphereRating: null, // Not in API but exists in DB
    title: review.title ?? null,
    comment: review.comment ?? null,
    imageUrls: review.imageUrls ?? [], // Now correctly mapped
    isVerified: review.isVerified ?? false,
    helpfulCount: review.helpfulCount ?? 0,
    reportCount: review.reportCount ?? 0,
    ownerResponse: review.ownerResponse ?? null,
    ownerRespondedAt: review.ownerRespondedAt ?? null,
    createdAt: review.createdAt || new Date().toISOString(),
    updatedAt: review.updatedAt || new Date().toISOString(),
  }
}

/**
 * Complete flow: API → Domain → DB
 */
export const createReviewWriteFlow = (
  request: CreateReviewRequest
): Result<ReviewDbInsert, ReviewOperationResult> => {
  // Step 1: Map API to Domain
  const domainResult = mapCreateReviewApiToDomain(request)
  if (domainResult.type === 'err') {
    return domainResult
  }

  // Step 2: Add ID using brand utility
  const reviewIdResult = brandReviewId(generateId('rev'))
  if (reviewIdResult.type === 'err') {
    return err({
      type: 'error',
      error: {
        type: 'system',
        message: `Failed to generate review ID: ${reviewIdResult.error.message}`,
      },
    })
  }

  const reviewWithId: Partial<Review> = {
    ...domainResult.value,
    id: reviewIdResult.value as ReviewId,
  }

  // Step 3: Map Domain to Database
  try {
    const dbInsert = mapCreateReviewDomainToDb(reviewWithId)
    return ok(dbInsert)
  } catch (error) {
    return err({
      type: 'error',
      error: {
        type: 'system',
        message: `Failed to map to database format: ${error}`,
      },
    })
  }
}

/**
 * Handle create operation result
 */
export const handleCreateReviewResult = (
  result: ReviewOperationResult
): string => {
  return match(result)
    .with(
      { type: 'created' },
      ({ review }) => `Review ${review.id} created successfully`
    )
    .with(
      { type: 'validation_failed' },
      ({ errors }) =>
        `Validation failed: ${errors.map((e) => `${e.field}: ${e.message}`).join(', ')}`
    )
    .with(
      { type: 'not_found' },
      ({ reviewId }) => `Review with ID ${reviewId} not found`
    )
    .with(
      { type: 'duplicate' },
      ({ customerId, reservationId }) =>
        `Customer ${customerId} has already reviewed reservation ${reservationId}`
    )
    .with({ type: 'unauthorized' }, ({ action }) => `Unauthorized to ${action}`)
    .with({ type: 'error' }, ({ error }) =>
      match(error)
        .with({ type: 'system' }, ({ message }) => `System error: ${message}`)
        .with(
          { type: 'validation' },
          ({ errors }) =>
            `Validation errors: ${errors.map((e) => e.message).join(', ')}`
        )
        .with(
          { type: 'businessRule' },
          ({ message }) => `Business rule: ${message}`
        )
        .otherwise(() => 'Unknown error')
    )
    .otherwise(() => 'Unknown error occurred')
}
