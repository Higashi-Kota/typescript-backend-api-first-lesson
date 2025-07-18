/**
 * Review Domain Model
 * CLAUDEガイドラインに準拠したSum型によるモデリング
 */

import type { Result } from '../shared/result.js'
import { err, ok } from '../shared/result.js'
import type { Brand } from '../shared/brand.js'
import { createBrand, createBrandSafe } from '../shared/brand.js'
import type { CustomerId } from './customer.js'
import type { SalonId } from './salon.js'
import type { StaffId } from './staff.js'
import type { ReservationId } from './reservation.js'

// Review固有のID型
export type ReviewId = Brand<string, 'ReviewId'>

// ReviewID作成関数
export const createReviewId = (value: string) =>
  createBrand(value, 'ReviewId')
export const createReviewIdSafe = (value: string) =>
  createBrandSafe(value, 'ReviewId')

// 監査情報（Salonと共通）
import type { AuditInfo } from './salon.js'

// レビューステータス
export type ReviewStatus = 'draft' | 'published' | 'hidden' | 'deleted'

// 評価項目
export type RatingCategory = 'overall' | 'service' | 'staff' | 'atmosphere'

// Reviewベースデータ
export type ReviewData = {
  id: ReviewId
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
  isVerified: boolean
  helpfulCount: number
} & AuditInfo

// Review Sum型（ステータスベース）
export type Review =
  | {
      type: 'draft'
      data: ReviewData
    }
  | {
      type: 'published'
      data: ReviewData
      publishedAt: Date
      publishedBy: string
    }
  | {
      type: 'hidden'
      data: ReviewData
      hiddenAt: Date
      hiddenBy: string
      hiddenReason: string
    }
  | {
      type: 'deleted'
      data: ReviewData
      deletedAt: Date
      deletedBy: string
      deletionReason: string
    }

// Review作成リクエスト
export type CreateReviewRequest = {
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

// Review更新リクエスト
export type UpdateReviewRequest = {
  id: ReviewId
  rating?: number
  comment?: string
  serviceRating?: number
  staffRating?: number
  atmosphereRating?: number
  images?: string[]
  updatedBy?: string
}

// Review詳細情報
export type ReviewDetail = {
  review: Review
  customerName: string
  salonName: string
  staffName?: string
  serviceName: string
  reservationDate: Date
}

// Review検索条件
export type ReviewSearchCriteria = {
  salonId?: SalonId
  customerId?: CustomerId
  staffId?: StaffId
  reservationId?: ReservationId
  status?: ReviewStatus
  isVerified?: boolean
  minRating?: number
  maxRating?: number
  startDate?: Date
  endDate?: Date
}

// Review集計結果
export type ReviewSummary = {
  salonId: SalonId
  totalReviews: number
  averageRating: number
  averageServiceRating?: number
  averageStaffRating?: number
  averageAtmosphereRating?: number
  ratingDistribution: Map<number, number>
}

// エラー型の定義
export type ReviewError =
  | { type: 'invalidRating'; message: string }
  | { type: 'duplicateReview'; message: string }
  | { type: 'reservationNotCompleted'; message: string }
  | { type: 'tooManyImages'; message: string }
  | { type: 'commentTooLong'; message: string }

// バリデーション関数
export const validateRating = (
  rating: number,
  category: RatingCategory = 'overall'
): Result<number, ReviewError> => {
  if (rating < 1 || rating > 5) {
    return err({
      type: 'invalidRating',
      message: `${category} rating must be between 1 and 5`,
    })
  }

  if (!Number.isInteger(rating)) {
    return err({
      type: 'invalidRating',
      message: `${category} rating must be an integer`,
    })
  }

  return ok(rating)
}

export const validateComment = (
  comment?: string
): Result<string | undefined, ReviewError> => {
  if (!comment) {
    return ok(undefined)
  }

  if (comment.length > 1000) {
    return err({
      type: 'commentTooLong',
      message: 'Comment must be 1000 characters or less',
    })
  }

  return ok(comment)
}

export const validateImages = (
  images?: string[]
): Result<string[] | undefined, ReviewError> => {
  if (!images || images.length === 0) {
    return ok(undefined)
  }

  if (images.length > 5) {
    return err({
      type: 'tooManyImages',
      message: 'Maximum 5 images allowed',
    })
  }

  return ok(images)
}

// 便利なヘルパー関数
export const isDraftReview = (
  review: Review
): review is Extract<Review, { type: 'draft' }> => review.type === 'draft'

export const isPublishedReview = (
  review: Review
): review is Extract<Review, { type: 'published' }> =>
  review.type === 'published'

export const isHiddenReview = (
  review: Review
): review is Extract<Review, { type: 'hidden' }> => review.type === 'hidden'

export const isDeletedReview = (
  review: Review
): review is Extract<Review, { type: 'deleted' }> => review.type === 'deleted'

export const canBePublished = (review: Review): boolean => {
  return review.type === 'draft'
}

export const canBeEdited = (review: Review): boolean => {
  return review.type === 'draft' || review.type === 'published'
}

export const canBeHidden = (review: Review): boolean => {
  return review.type === 'published'
}

export const canBeDeleted = (review: Review): boolean => {
  return review.type !== 'deleted'
}

export const getReviewStatus = (review: Review): ReviewStatus => {
  return review.type
}

export const isVisible = (review: Review): boolean => {
  return review.type === 'published'
}

export const calculateAverageRating = (reviews: Review[]): number => {
  const publishedReviews = reviews.filter(isPublishedReview)
  if (publishedReviews.length === 0) {
    return 0
  }

  const sum = publishedReviews.reduce(
    (acc, review) => acc + review.data.rating,
    0
  )
  return Math.round((sum / publishedReviews.length) * 10) / 10
}

export const hasAllRatings = (review: Review): boolean => {
  return !!(
    review.data.serviceRating &&
    review.data.staffRating &&
    review.data.atmosphereRating
  )
}

export const sortByMostRecent = (reviews: Review[]): Review[] => {
  return [...reviews].sort(
    (a, b) => b.data.createdAt.getTime() - a.data.createdAt.getTime()
  )
}

export const sortByMostHelpful = (reviews: Review[]): Review[] => {
  return [...reviews].sort((a, b) => b.data.helpfulCount - a.data.helpfulCount)
}

export const sortByRating = (
  reviews: Review[],
  descending = true
): Review[] => {
  return [...reviews].sort((a, b) =>
    descending ? b.data.rating - a.data.rating : a.data.rating - b.data.rating
  )
}
