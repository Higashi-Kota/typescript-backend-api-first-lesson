/**
 * Update Review Mapper (Write Operation)
 * API Request -> Domain Model -> Database Entity
 */

import { match } from 'ts-pattern'
import type {
  Review,
  ReviewChanges,
  ReviewId,
  ReviewOperationResult,
  UpdateReviewRequest,
} from '../../models/review'
import type { ValidationError } from '../../shared/errors'
import type { Result } from '../../shared/result'
import { err, ok } from '../../shared/result'

// Type aliases for clarity
type ApiUpdateRequest = UpdateReviewRequest
type DomainReview = Review
type DbReviewUpdate = {
  overallRating?: number
  title?: string | null
  comment?: string | null
  serviceRating?: number | null
  staffRating?: number | null
  atmosphereRating?: number | null
  cleanlinessRating?: number | null
  valueRating?: number | null
  imageUrls?: any // jsonb field
  updatedAt: Date
}

/**
 * Map API Update Request to Domain Model (partial update)
 */
export const mapUpdateReviewApiToDomain = (
  request: ApiUpdateRequest,
  _existingReview: DomainReview
): Result<Partial<DomainReview>, ValidationError[]> => {
  try {
    const updates: Partial<DomainReview> = {}

    if (request.rating !== undefined) {
      updates.rating = request.rating
    }

    if (request.comment !== undefined) {
      updates.comment = request.comment
    }

    if (request.serviceRating !== undefined) {
      updates.serviceRating = request.serviceRating
    }

    if (request.staffRating !== undefined) {
      updates.staffRating = request.staffRating
    }

    if (request.atmosphereRating !== undefined) {
      updates.atmosphereRating = request.atmosphereRating
    }

    if (request.images !== undefined) {
      updates.images = request.images
    }

    updates.updatedAt = new Date().toISOString()

    // Validate ratings
    const errors: ValidationError[] = []

    const validateRating = (value: number | undefined, field: string) => {
      if (value !== undefined && (value < 1 || value > 5)) {
        errors.push({ field, message: `${field} must be between 1 and 5` })
      }
    }

    validateRating(updates.rating, 'rating')
    validateRating(updates.serviceRating, 'serviceRating')
    validateRating(updates.staffRating, 'staffRating')
    validateRating(updates.atmosphereRating, 'atmosphereRating')

    if (updates.comment !== undefined && updates.comment.length > 5000) {
      errors.push({
        field: 'comment',
        message: 'Comment cannot exceed 5000 characters',
      })
    }

    if (errors.length > 0) {
      return err(errors)
    }

    return ok(updates)
  } catch (error) {
    return err([{ field: 'general', message: `Mapping error: ${error}` }])
  }
}

/**
 * Map Domain Model updates to Database Update
 */
export const mapUpdateReviewDomainToDb = (
  updates: Partial<DomainReview>,
  _updatedBy?: string
): DbReviewUpdate => {
  const dbUpdate: DbReviewUpdate = {
    updatedAt: new Date(updates.updatedAt || new Date().toISOString()),
  }

  if (updates.rating !== undefined) {
    dbUpdate.overallRating = updates.rating // Map rating to overallRating
  }

  if (updates.title !== undefined) {
    dbUpdate.title = updates.title ?? null
  }

  if (updates.comment !== undefined) {
    dbUpdate.comment = updates.comment ?? null
  }

  if (updates.serviceRating !== undefined) {
    dbUpdate.serviceRating = updates.serviceRating ?? null
  }

  if (updates.staffRating !== undefined) {
    dbUpdate.staffRating = updates.staffRating ?? null
  }

  if (updates.atmosphereRating !== undefined) {
    dbUpdate.atmosphereRating = updates.atmosphereRating ?? null
  }

  if (updates.cleanlinessRating !== undefined) {
    dbUpdate.cleanlinessRating = updates.cleanlinessRating ?? null
  }

  if (updates.valueRating !== undefined) {
    dbUpdate.valueRating = updates.valueRating ?? null
  }

  if (updates.images !== undefined) {
    dbUpdate.imageUrls = updates.images ?? [] // Map images to imageUrls
  }

  return dbUpdate
}

/**
 * Complete flow: API → Domain → DB
 */
export const updateReviewWriteFlow = (
  _reviewId: ReviewId,
  request: ApiUpdateRequest,
  existingReview: DomainReview
): Result<DbReviewUpdate, ReviewOperationResult> => {
  // Step 1: Map API to Domain
  const domainResult = mapUpdateReviewApiToDomain(request, existingReview)

  if (domainResult.type === 'err') {
    return err({ type: 'validation_failed', errors: domainResult.error })
  }

  // Step 2: Map Domain to DB
  try {
    const dbUpdate = mapUpdateReviewDomainToDb(domainResult.value)
    return ok(dbUpdate)
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
 * Track changes for audit
 */
export const trackReviewChanges = (
  oldReview: DomainReview,
  newReview: Partial<DomainReview>
): ReviewChanges => {
  const changes: ReviewChanges = {}

  if (newReview.rating !== undefined && newReview.rating !== oldReview.rating) {
    changes.rating = { from: oldReview.rating, to: newReview.rating }
  }

  if (newReview.comment !== oldReview.comment) {
    changes.comment = { from: oldReview.comment, to: newReview.comment }
  }

  if (newReview.serviceRating !== oldReview.serviceRating) {
    changes.serviceRating = {
      from: oldReview.serviceRating,
      to: newReview.serviceRating,
    }
  }

  if (newReview.staffRating !== oldReview.staffRating) {
    changes.staffRating = {
      from: oldReview.staffRating,
      to: newReview.staffRating,
    }
  }

  if (newReview.atmosphereRating !== oldReview.atmosphereRating) {
    changes.atmosphereRating = {
      from: oldReview.atmosphereRating,
      to: newReview.atmosphereRating,
    }
  }

  if (newReview.images) {
    const oldImages = oldReview.images || []
    const newImages = newReview.images || []
    const added = newImages.filter((img) => !oldImages.includes(img))
    const removed = oldImages.filter((img) => !newImages.includes(img))

    if (added.length > 0 || removed.length > 0) {
      changes.images = { added, removed }
    }
  }

  return changes
}

/**
 * Handle update operation result
 */
export const handleUpdateReviewResult = (
  result: ReviewOperationResult
): string => {
  return match(result)
    .with(
      { type: 'updated' },
      ({ review, changes }) =>
        `Review ${review.id} updated successfully. Changes: ${changes.join(', ')}`
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
