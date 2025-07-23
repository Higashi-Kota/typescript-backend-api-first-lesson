/**
 * Review Mapping Utilities
 * ドメインとAPIレスポンス間の型変換ヘルパー
 */

import type { Review } from '@beauty-salon-backend/domain'
import type { components } from '@beauty-salon-backend/types/api'
import { match } from 'ts-pattern'

/**
 * ドメインのReviewをAPIのReviewResponseに変換
 */
export function toReviewResponse(
  review: Review
): components['schemas']['Models.Review'] {
  return match(review)
    .with(
      { type: 'draft' },
      { type: 'published' },
      { type: 'hidden' },
      { type: 'deleted' },
      ({ data }) => ({
        id: data.id,
        salonId: data.salonId,
        customerId: data.customerId,
        reservationId: data.reservationId,
        staffId: data.staffId ?? null,
        rating: data.rating,
        comment: data.comment ?? null,
        serviceRating: data.serviceRating ?? null,
        staffRating: data.staffRating ?? null,
        atmosphereRating: data.atmosphereRating ?? null,
        images: data.images ?? null,
        isVerified: data.isVerified,
        helpfulCount: data.helpfulCount,
        createdAt: data.createdAt.toISOString(),
        createdBy: data.createdBy ?? null,
        updatedAt: data.updatedAt.toISOString(),
        updatedBy: data.updatedBy ?? null,
      })
    )
    .exhaustive()
}

/**
 * ReviewDetailをAPIレスポンスに変換
 */
export function toReviewDetailResponse(
  detail: import('@beauty-salon-backend/domain').ReviewDetail
): components['schemas']['Models.Review'] {
  return toReviewResponse(detail.review)
}

/**
 * CreateReviewRequestをドメイン用に正規化
 */
export function normalizeCreateReviewRequest(
  request: components['schemas']['Models.CreateReviewRequest']
): Parameters<
  typeof import('@beauty-salon-backend/usecase').mapCreateReviewRequest
>[0] {
  return {
    salonId: request.salonId,
    customerId: request.customerId,
    reservationId: request.reservationId,
    staffId: request.staffId,
    rating: request.rating,
    comment: request.comment,
    serviceRating: request.serviceRating,
    staffRating: request.staffRating,
    atmosphereRating: request.atmosphereRating,
    images: request.images,
  }
}

/**
 * UpdateReviewRequestをドメイン用に正規化
 */
export function normalizeUpdateReviewRequest(
  request: components['schemas']['Models.UpdateReviewRequest']
) {
  return {
    rating: request.rating,
    comment: request.comment,
    serviceRating: request.serviceRating,
    staffRating: request.staffRating,
    atmosphereRating: request.atmosphereRating,
    images: request.images,
  }
}
