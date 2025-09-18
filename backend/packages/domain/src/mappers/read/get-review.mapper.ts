/**
 * Get Review Mapper (Read Operation)
 * Database Entity -> Domain Model -> API Response
 */

import type { reviews } from '@beauty-salon-backend/database'
import type { components } from '@beauty-salon-backend/generated'
import type { Review, ReviewOperationResult } from '../../models/review'
import type { Result } from '../../shared/result'
import { err, ok } from '../../shared/result'

// Type aliases for clarity
type ReviewDbRecord = typeof reviews.$inferSelect
type ReviewApiResponse = components['schemas']['Models.Review']

/**
 * Map Database Record to Domain Model
 * Handles field name differences between DB and API:
 * - DB overallRating -> API rating
 * - DB bookingId -> API reservationId (we use bookingId as reservationId)
 * - DB imageUrls -> API images
 */
export const mapGetReviewDbToDomain = (
  record: ReviewDbRecord
): Result<Review, ReviewOperationResult> => {
  try {
    const domainReview: Review = {
      id: record.id as any, // Will be branded
      salonId: record.salonId as any,
      customerId: record.customerId as any,
      bookingId: record.bookingId as any, // Now correctly mapped
      staffId: record.staffId ? (record.staffId as any) : undefined,
      overallRating: record.overallRating, // Now correctly mapped
      title: record.title ?? undefined,
      comment: record.comment ?? undefined,
      serviceRating: record.serviceRating ?? undefined,
      staffRating: record.staffRating ?? undefined,
      cleanlinessRating: record.cleanlinessRating ?? undefined, // Now correctly mapped
      valueRating: record.valueRating ?? undefined, // Now correctly mapped
      imageUrls: (record.imageUrls as string[]) ?? undefined, // Now correctly mapped
      isVerified: record.isVerified,
      helpfulCount: record.helpfulCount,
      reportCount: record.reportCount,
      ownerResponse: record.ownerResponse ?? undefined,
      ownerRespondedAt: record.ownerRespondedAt ?? undefined,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    }

    return ok(domainReview)
  } catch (error) {
    return err({
      type: 'error',
      error: {
        type: 'system',
        message: `Failed to map database record: ${error}`,
      },
    })
  }
}

/**
 * Map Domain Model to API Response
 */
export const mapGetReviewDomainToApi = (review: Review): ReviewApiResponse => {
  return {
    id: review.id,
    salonId: review.salonId,
    customerId: review.customerId,
    reservationId: review.reservationId,
    staffId: review.staffId,
    rating: review.rating,
    comment: review.comment,
    serviceRating: review.serviceRating,
    staffRating: review.staffRating,
    atmosphereRating: review.atmosphereRating,
    images: review.images,
    isVerified: review.isVerified,
    helpfulCount: review.helpfulCount,
    createdAt: review.createdAt,
    createdBy: review.createdBy,
    updatedAt: review.updatedAt,
    updatedBy: review.updatedBy,
  }
}

/**
 * Complete flow: DB → Domain → API
 */
export const getReviewReadFlow = (
  record: ReviewDbRecord | null
): Result<ReviewApiResponse, ReviewOperationResult> => {
  // Handle not found case
  if (!record) {
    return err({
      type: 'not_found',
      reviewId: 'unknown' as any,
    })
  }

  // Step 1: Map DB to Domain
  const domainResult = mapGetReviewDbToDomain(record)
  if (domainResult.type === 'err') {
    return domainResult
  }

  // Step 2: Map Domain to API
  try {
    const apiResponse = mapGetReviewDomainToApi(domainResult.value)
    return ok(apiResponse)
  } catch (error) {
    return err({
      type: 'error',
      error: {
        type: 'system',
        message: `Failed to map to API response: ${error}`,
      },
    })
  }
}

/**
 * Map multiple reviews for list operations
 */
export const mapReviewListDbToDomain = (
  records: ReviewDbRecord[]
): Result<Review[], ReviewOperationResult> => {
  try {
    const reviews: Review[] = []

    for (const record of records) {
      const result = mapGetReviewDbToDomain(record)
      if (result.type === 'err') {
        return result
      }
      reviews.push(result.value)
    }

    return ok(reviews)
  } catch (error) {
    return err({
      type: 'error',
      error: { type: 'system', message: `Failed to map review list: ${error}` },
    })
  }
}

/**
 * Map review list to API response
 */
export const mapReviewListDomainToApi = (
  reviews: Review[]
): ReviewApiResponse[] => {
  return reviews.map(mapGetReviewDomainToApi)
}

/**
 * Complete flow for list operations
 */
export const getReviewListReadFlow = (
  records: ReviewDbRecord[]
): Result<ReviewApiResponse[], ReviewOperationResult> => {
  // Step 1: Map DB to Domain
  const domainResult = mapReviewListDbToDomain(records)
  if (domainResult.type === 'err') {
    return domainResult
  }

  // Step 2: Map Domain to API
  try {
    const apiResponses = mapReviewListDomainToApi(domainResult.value)
    return ok(apiResponses)
  } catch (error) {
    return err({
      type: 'error',
      error: {
        type: 'system',
        message: `Failed to map to API response: ${error}`,
      },
    })
  }
}

/**
 * Map ReviewSummary for aggregated views
 */
export const mapReviewSummaryDbToApi = (
  _salonId: string,
  reviews: ReviewDbRecord[]
): components['schemas']['Models.ReviewSummary'] => {
  const ratingDistribution: components['schemas']['Models.ReviewSummary']['ratingDistribution'] =
    {
      '1': 0,
      '2': 0,
      '3': 0,
      '4': 0,
      '5': 0,
    }

  let totalRating = 0

  for (const review of reviews) {
    totalRating += review.overallRating
    const rating = review.overallRating.toString()
    if (rating in ratingDistribution) {
      const key = rating as keyof typeof ratingDistribution
      ratingDistribution[key] = (ratingDistribution[key] ?? 0) + 1
    }
  }

  const reviewCount = reviews.length

  return {
    averageRating:
      reviewCount > 0 ? Math.round((totalRating / reviewCount) * 10) / 10 : 0,
    totalReviews: reviewCount,
    ratingDistribution,
  }
}
