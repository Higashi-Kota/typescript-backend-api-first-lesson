/**
 * Review Domain Model
 * Customer feedback and ratings for services
 */

import type { components } from '@beauty-salon-backend/generated'
import { match } from 'ts-pattern'
import type { Brand } from '../shared/brand'
import type { DomainError, ValidationError } from '../shared/errors'
import type { Result } from '../shared/result'
import { err, ok } from '../shared/result'

// Brand the ID types for type safety
export type ReviewId = Brand<
  components['schemas']['Models.ReviewId'],
  'ReviewId'
>
export type SalonId = Brand<components['schemas']['Models.SalonId'], 'SalonId'>
export type CustomerId = Brand<
  components['schemas']['Models.CustomerId'],
  'CustomerId'
>
export type ReservationId = Brand<
  components['schemas']['Models.ReservationId'],
  'ReservationId'
>
export type StaffId = Brand<components['schemas']['Models.StaffId'], 'StaffId'>
export type BookingId = Brand<
  components['schemas']['Models.BookingId'],
  'BookingId'
>

// Domain Review Model - extends generated type with mapping from DB
export interface Review
  extends Omit<
    components['schemas']['Models.Review'],
    'id' | 'salonId' | 'customerId' | 'bookingId' | 'staffId'
  > {
  id: ReviewId
  salonId: SalonId
  customerId: CustomerId
  bookingId: BookingId // Fixed: now matches generated type
  staffId?: StaffId
}

// Review State Management (Sum Type)
export type ReviewState =
  | { type: 'draft'; review: Review }
  | { type: 'published'; review: Review; publishedAt: string }
  | { type: 'verified'; review: Review; verifiedAt: string; verifiedBy: string }
  | { type: 'flagged'; review: Review; flaggedAt: string; reason: string }
  | { type: 'hidden'; review: Review; hiddenAt: string; reason: string }
  | {
      type: 'deleted'
      reviewId: ReviewId
      deletedAt: string
      deletedBy: string
    }

// Review Operation Results (Sum Type)
export type ReviewOperationResult =
  | { type: 'created'; review: Review }
  | { type: 'updated'; review: Review; changes: string[] }
  | { type: 'published'; review: Review }
  | { type: 'verified'; review: Review }
  | { type: 'flagged'; review: Review; reason: string }
  | { type: 'hidden'; review: Review; reason: string }
  | { type: 'deleted'; reviewId: ReviewId }
  | { type: 'owner_responded'; review: Review; response: string }
  | { type: 'validation_failed'; errors: ValidationError[] }
  | { type: 'not_found'; reviewId: ReviewId }
  | { type: 'unauthorized'; action: string }
  | { type: 'duplicate'; customerId: CustomerId; reservationId: ReservationId }
  | { type: 'error'; error: DomainError }

// Review Search Result
export type ReviewSearchResult =
  | { type: 'found'; reviews: Review[]; totalCount: number }
  | { type: 'empty'; query: ReviewSearchQuery }
  | { type: 'error'; error: DomainError }

export interface ReviewSearchQuery {
  salonId?: SalonId
  customerId?: CustomerId
  staffId?: StaffId
  minRating?: number
  maxRating?: number
  isVerified?: boolean
  dateFrom?: string
  dateTo?: string
  hasImages?: boolean
}

// Review Events for audit/tracking
export type ReviewEvent =
  | {
      type: 'review_created'
      review: Review
      createdBy: string
      timestamp: string
    }
  | {
      type: 'review_updated'
      reviewId: ReviewId
      changes: ReviewChanges
      updatedBy: string
      timestamp: string
    }
  | {
      type: 'review_verified'
      reviewId: ReviewId
      verifiedBy: string
      timestamp: string
    }
  | {
      type: 'review_flagged'
      reviewId: ReviewId
      reason: string
      flaggedBy: string
      timestamp: string
    }
  | {
      type: 'review_hidden'
      reviewId: ReviewId
      reason: string
      hiddenBy: string
      timestamp: string
    }
  | {
      type: 'owner_responded'
      reviewId: ReviewId
      response: string
      respondedBy: string
      timestamp: string
    }
  | {
      type: 'marked_helpful'
      reviewId: ReviewId
      markedBy: string
      timestamp: string
    }

export interface ReviewChanges {
  rating?: { from: number; to: number }
  comment?: { from: string | undefined; to: string | undefined }
  serviceRating?: { from: number | undefined; to: number | undefined }
  staffRating?: { from: number | undefined; to: number | undefined }
  atmosphereRating?: { from: number | undefined; to: number | undefined }
  images?: { added: string[]; removed: string[] }
}

// Re-export related types from generated schemas
export type CreateReviewRequest =
  components['schemas']['Models.CreateReviewRequest']
export type UpdateReviewRequest =
  components['schemas']['Models.UpdateReviewRequest']
export type ReviewSummary = components['schemas']['Models.ReviewSummary']

// Business Logic Functions

/**
 * Validate review data
 */
export const validateReview = (
  review: Partial<Review>
): Result<Review, ValidationError[]> => {
  const errors: ValidationError[] = []

  if (!review.salonId) {
    errors.push({ field: 'salonId', message: 'Salon ID is required' })
  }

  if (!review.customerId) {
    errors.push({ field: 'customerId', message: 'Customer ID is required' })
  }

  if (!review.reservationId) {
    errors.push({
      field: 'reservationId',
      message: 'Reservation ID is required',
    })
  }

  if (review.rating === undefined || review.rating === null) {
    errors.push({ field: 'rating', message: 'Rating is required' })
  } else if (review.rating < 1 || review.rating > 5) {
    errors.push({ field: 'rating', message: 'Rating must be between 1 and 5' })
  }

  // Validate sub-ratings if provided
  const validateSubRating = (value: number | undefined, field: string) => {
    if (value !== undefined && (value < 1 || value > 5)) {
      errors.push({ field, message: `${field} must be between 1 and 5` })
    }
  }

  validateSubRating(review.serviceRating, 'serviceRating')
  validateSubRating(review.staffRating, 'staffRating')
  validateSubRating(review.atmosphereRating, 'atmosphereRating')
  validateSubRating(review.cleanlinessRating, 'cleanlinessRating')
  validateSubRating(review.valueRating, 'valueRating')

  if (review.comment && review.comment.length > 5000) {
    errors.push({
      field: 'comment',
      message: 'Comment cannot exceed 5000 characters',
    })
  }

  if (review.title && review.title.length > 255) {
    errors.push({
      field: 'title',
      message: 'Title cannot exceed 255 characters',
    })
  }

  if (errors.length > 0) {
    return err(errors)
  }

  return ok(review as Review)
}

/**
 * Calculate average rating from sub-ratings
 */
export const calculateAverageRating = (review: Review): number => {
  const ratings = [
    review.rating,
    review.serviceRating,
    review.staffRating,
    review.atmosphereRating,
    review.cleanlinessRating,
    review.valueRating,
  ].filter((r) => r !== undefined && r !== null) as number[]

  if (ratings.length === 0) {
    return 0
  }

  const sum = ratings.reduce((acc, rating) => acc + rating, 0)
  return Math.round((sum / ratings.length) * 10) / 10 // Round to 1 decimal
}

/**
 * Check if review can be edited
 */
export const canEditReview = (
  review: Review,
  userId: string,
  maxDaysAfterCreation = 30
): boolean => {
  // Check if user is the creator
  if (review.createdBy !== userId) {
    return false
  }

  // Check if within edit window
  const createdDate = new Date(review.createdAt)
  const now = new Date()
  const daysSinceCreation =
    (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)

  return daysSinceCreation <= maxDaysAfterCreation
}

/**
 * Check if review should be auto-verified
 */
export const shouldAutoVerify = (
  review: Review,
  customerReviewCount: number
): boolean => {
  // Auto-verify if customer has multiple verified reviews
  if (customerReviewCount >= 5) {
    return true
  }

  // Auto-verify if review has images
  if (review.images && review.images.length > 0) {
    return true
  }

  // Don't auto-verify low ratings or reports
  if (review.rating <= 2) {
    return false
  }

  return false
}

/**
 * Calculate review quality score for ranking
 */
export const calculateQualityScore = (review: Review): number => {
  let score = 0

  // Length of comment
  if (review.comment) {
    if (review.comment.length > 500) {
      score += 30
    } else if (review.comment.length > 200) {
      score += 20
    } else if (review.comment.length > 50) {
      score += 10
    }
  }

  // Has title
  if (review.title) {
    score += 10
  }

  // Has images
  if (review.images && review.images.length > 0) {
    score += review.images.length * 15
  }

  // Has sub-ratings
  if (review.serviceRating) {
    score += 5
  }
  if (review.staffRating) {
    score += 5
  }
  if (review.atmosphereRating) {
    score += 5
  }

  // Is verified
  if (review.isVerified) {
    score += 20
  }

  // Helpful count
  score += review.helpfulCount * 2

  // Penalize if reported
  if (review.reportCount && review.reportCount > 0) {
    score -= review.reportCount * 10
  }

  return Math.max(0, score)
}

/**
 * Check if review violates content policy
 */
export const checkContentViolation = (review: Review): string[] => {
  const violations: string[] = []
  const content = `${review.title || ''} ${review.comment || ''}`.toLowerCase()

  // Check for prohibited content
  const prohibitedWords = [
    'spam',
    'fake',
    'scam',
    'fraud',
    // Add more as needed
  ]

  for (const word of prohibitedWords) {
    if (content.includes(word)) {
      violations.push(`Contains prohibited word: ${word}`)
    }
  }

  // Check for personal information patterns
  const phonePattern = /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/
  const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/

  if (phonePattern.test(content)) {
    violations.push('Contains phone number')
  }

  if (emailPattern.test(content)) {
    violations.push('Contains email address')
  }

  // Check for excessive caps
  const upperCount = (content.match(/[A-Z]/g) || []).length
  const letterCount = (content.match(/[a-zA-Z]/g) || []).length
  if (letterCount > 10 && upperCount / letterCount > 0.5) {
    violations.push('Excessive capitalization')
  }

  return violations
}

/**
 * Get review status display
 */
export const getReviewDisplayInfo = (state: ReviewState) => {
  return match(state)
    .with({ type: 'draft' }, ({ review }) => ({
      ...review,
      status: 'Draft',
      statusColor: 'gray',
    }))
    .with({ type: 'published' }, ({ review, publishedAt }) => ({
      ...review,
      status: `Published ${publishedAt}`,
      statusColor: 'green',
    }))
    .with({ type: 'verified' }, ({ review, verifiedAt }) => ({
      ...review,
      status: `Verified ${verifiedAt}`,
      statusColor: 'blue',
    }))
    .with({ type: 'flagged' }, ({ review, reason }) => ({
      ...review,
      status: `Flagged: ${reason}`,
      statusColor: 'orange',
    }))
    .with({ type: 'hidden' }, ({ review, reason }) => ({
      ...review,
      status: `Hidden: ${reason}`,
      statusColor: 'red',
    }))
    .with({ type: 'deleted' }, ({ reviewId, deletedAt }) => ({
      id: reviewId,
      status: `Deleted ${deletedAt}`,
      statusColor: 'black',
    }))
    .exhaustive()
}

/**
 * Format rating display
 */
export const formatRatingDisplay = (rating: number): string => {
  const stars = '★'.repeat(Math.floor(rating))
  const halfStar = rating % 1 >= 0.5 ? '½' : ''
  const emptyStars = '☆'.repeat(5 - Math.ceil(rating))

  return `${stars}${halfStar}${emptyStars} (${rating.toFixed(1)})`
}
