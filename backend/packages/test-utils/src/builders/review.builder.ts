/**
 * Review Builder for Testing
 * CLAUDE.mdのテスト要件に準拠
 */

import crypto from 'node:crypto'
import type {
  CustomerId,
  ReservationId,
  Review,
  ReviewId,
  SalonId,
  StaffId,
} from '@beauty-salon-backend/domain'
import { createReviewId } from '@beauty-salon-backend/domain'

export class ReviewBuilder {
  private id: ReviewId
  private salonId: SalonId
  private customerId: CustomerId
  private reservationId: ReservationId
  private staffId?: StaffId
  private rating: number
  private comment?: string
  private serviceRating?: number
  private staffRating?: number
  private atmosphereRating?: number
  private images?: string[]
  private isVerified: boolean
  private helpfulCount: number
  private createdAt: Date
  private createdBy?: string
  private updatedAt: Date
  private updatedBy?: string
  private status: 'draft' | 'published' | 'hidden' | 'deleted' = 'published'
  private publishedAt?: Date
  private publishedBy?: string
  private hiddenAt?: Date
  private hiddenBy?: string
  private hiddenReason?: string
  private deletedAt?: Date
  private deletedBy?: string
  private deletionReason?: string

  constructor() {
    const id = crypto.randomUUID()
    const reviewId = createReviewId(id)
    if (!reviewId) {
      throw new Error(`Failed to create review ID: ${id}`)
    }
    this.id = reviewId

    // Default values - these need to be set via builder methods
    // We'll create valid IDs
    const {
      createSalonId,
      createCustomerId,
      createReservationId,
    } = require('@beauty-salon-backend/domain')
    const salonId = createSalonId(crypto.randomUUID())
    const customerId = createCustomerId(crypto.randomUUID())
    const reservationId = createReservationId(crypto.randomUUID())

    if (!salonId || !customerId || !reservationId) {
      throw new Error('Failed to create default IDs for review builder')
    }

    this.salonId = salonId
    this.customerId = customerId
    this.reservationId = reservationId
    this.rating = 5
    this.comment = 'Great service!'
    this.isVerified = false
    this.helpfulCount = 0
    this.createdAt = new Date()
    this.updatedAt = new Date()
  }

  withId(id: ReviewId): this {
    this.id = id
    return this
  }

  withSalonId(salonId: SalonId): this {
    this.salonId = salonId
    return this
  }

  withCustomerId(customerId: CustomerId): this {
    this.customerId = customerId
    return this
  }

  withReservationId(reservationId: ReservationId): this {
    this.reservationId = reservationId
    return this
  }

  withStaffId(staffId?: StaffId): this {
    this.staffId = staffId
    return this
  }

  withRating(rating: number): this {
    this.rating = rating
    return this
  }

  withComment(comment?: string): this {
    this.comment = comment
    return this
  }

  withServiceRating(rating?: number): this {
    this.serviceRating = rating
    return this
  }

  withStaffRating(rating?: number): this {
    this.staffRating = rating
    return this
  }

  withAtmosphereRating(rating?: number): this {
    this.atmosphereRating = rating
    return this
  }

  withImages(images?: string[]): this {
    this.images = images
    return this
  }

  withIsVerified(isVerified: boolean): this {
    this.isVerified = isVerified
    return this
  }

  withHelpfulCount(count: number): this {
    this.helpfulCount = count
    return this
  }

  withCreatedBy(createdBy?: string): this {
    this.createdBy = createdBy
    return this
  }

  withUpdatedBy(updatedBy?: string): this {
    this.updatedBy = updatedBy
    return this
  }

  asDraft(): this {
    this.status = 'draft'
    return this
  }

  asPublished(publishedBy?: string): this {
    this.status = 'published'
    this.publishedAt = new Date()
    this.publishedBy = publishedBy || 'system'
    return this
  }

  asHidden(reason: string, hiddenBy?: string): this {
    this.status = 'hidden'
    this.hiddenAt = new Date()
    this.hiddenBy = hiddenBy || 'system'
    this.hiddenReason = reason
    return this
  }

  asDeleted(reason: string, deletedBy?: string): this {
    this.status = 'deleted'
    this.deletedAt = new Date()
    this.deletedBy = deletedBy || 'system'
    this.deletionReason = reason
    return this
  }

  build(): Review {
    const reviewData = {
      id: this.id,
      salonId: this.salonId,
      customerId: this.customerId,
      reservationId: this.reservationId,
      staffId: this.staffId,
      rating: this.rating,
      comment: this.comment,
      serviceRating: this.serviceRating,
      staffRating: this.staffRating,
      atmosphereRating: this.atmosphereRating,
      images: this.images,
      isVerified: this.isVerified,
      helpfulCount: this.helpfulCount,
      createdAt: this.createdAt,
      createdBy: this.createdBy,
      updatedAt: this.updatedAt,
      updatedBy: this.updatedBy,
    }

    switch (this.status) {
      case 'draft':
        return {
          type: 'draft' as const,
          data: reviewData,
        }
      case 'published':
        return {
          type: 'published' as const,
          data: reviewData,
          publishedAt: this.publishedAt || new Date(),
          publishedBy: this.publishedBy || 'system',
        }
      case 'hidden':
        return {
          type: 'hidden' as const,
          data: reviewData,
          hiddenAt: this.hiddenAt || new Date(),
          hiddenBy: this.hiddenBy || 'system',
          hiddenReason: this.hiddenReason || 'Hidden',
        }
      case 'deleted':
        return {
          type: 'deleted' as const,
          data: reviewData,
          deletedAt: this.deletedAt || new Date(),
          deletedBy: this.deletedBy || 'system',
          deletionReason: this.deletionReason || 'Deleted',
        }
    }
  }
}

// 便利なヘルパー関数
export function createTestReview(overrides?: {
  id?: ReviewId
  salonId?: SalonId
  customerId?: CustomerId
  reservationId?: ReservationId
  staffId?: StaffId
  rating?: number
  comment?: string
  serviceRating?: number
  staffRating?: number
  atmosphereRating?: number
  images?: string[]
  isVerified?: boolean
  helpfulCount?: number
  status?: 'draft' | 'published' | 'hidden' | 'deleted'
}): Review {
  const builder = new ReviewBuilder()

  // Set required IDs with defaults if not provided
  if (
    !overrides?.salonId ||
    !overrides?.customerId ||
    !overrides?.reservationId
  ) {
    // Import these from the domain package
    const {
      createSalonId,
      createCustomerId,
      createReservationId,
    } = require('@beauty-salon-backend/domain')

    if (!overrides?.salonId) {
      const salonId = createSalonId(crypto.randomUUID())
      if (salonId) builder.withSalonId(salonId)
    }
    if (!overrides?.customerId) {
      const customerId = createCustomerId(crypto.randomUUID())
      if (customerId) builder.withCustomerId(customerId)
    }
    if (!overrides?.reservationId) {
      const reservationId = createReservationId(crypto.randomUUID())
      if (reservationId) builder.withReservationId(reservationId)
    }
  }

  if (overrides?.id) {
    builder.withId(overrides.id)
  }
  if (overrides?.salonId) {
    builder.withSalonId(overrides.salonId)
  }
  if (overrides?.customerId) {
    builder.withCustomerId(overrides.customerId)
  }
  if (overrides?.reservationId) {
    builder.withReservationId(overrides.reservationId)
  }
  if (overrides?.staffId) {
    builder.withStaffId(overrides.staffId)
  }
  if (overrides?.rating !== undefined) {
    builder.withRating(overrides.rating)
  }
  if (overrides?.comment !== undefined) {
    builder.withComment(overrides.comment)
  }
  if (overrides?.serviceRating !== undefined) {
    builder.withServiceRating(overrides.serviceRating)
  }
  if (overrides?.staffRating !== undefined) {
    builder.withStaffRating(overrides.staffRating)
  }
  if (overrides?.atmosphereRating !== undefined) {
    builder.withAtmosphereRating(overrides.atmosphereRating)
  }
  if (overrides?.images !== undefined) {
    builder.withImages(overrides.images)
  }
  if (overrides?.isVerified !== undefined) {
    builder.withIsVerified(overrides.isVerified)
  }
  if (overrides?.helpfulCount !== undefined) {
    builder.withHelpfulCount(overrides.helpfulCount)
  }

  // Set status
  switch (overrides?.status) {
    case 'draft':
      builder.asDraft()
      break
    case 'hidden':
      builder.asHidden('Test hidden')
      break
    case 'deleted':
      builder.asDeleted('Test deleted')
      break
    default:
      builder.asPublished()
  }

  return builder.build()
}

export function createTestReviewId(id?: string): ReviewId {
  const reviewId = createReviewId(id || crypto.randomUUID())
  if (!reviewId) {
    throw new Error('Failed to create test review ID')
  }
  return reviewId
}
