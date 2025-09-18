/**
 * Create Review Use Case
 * Business logic for creating a new review
 */

import { mapGetReviewDbToDomain } from '../mappers/read/get-review.mapper'
import { createReviewWriteFlow } from '../mappers/write/create-review.mapper'
import type {
  CreateReviewRequest,
  Review,
  ReviewOperationResult,
} from '../models/review'
import type { BookingRepository } from '../repositories/booking.repository'
import type { ReviewRepository } from '../repositories/review.repository'
import type { Result } from '../shared/result'
import { err, ok } from '../shared/result'

/**
 * Create review use case implementation
 */
export class CreateReviewUseCase {
  constructor(
    private readonly reviewRepository: ReviewRepository,
    private readonly bookingRepository: BookingRepository
  ) {}

  /**
   * Execute the create review use case
   */
  async execute(
    request: CreateReviewRequest
  ): Promise<Result<Review, ReviewOperationResult>> {
    try {
      // Step 1: Map request through write flow (API → Domain → DB)
      const writeFlowResult = createReviewWriteFlow(request)
      if (writeFlowResult.type === 'err') {
        return writeFlowResult
      }

      // Step 2: Verify booking exists and is completed
      const bookingCheck = await this.bookingRepository.findById(
        writeFlowResult.value.bookingId as any
      )
      if (bookingCheck.type === 'err' || !bookingCheck.value) {
        return err({
          type: 'validation_failed',
          errors: [
            {
              field: 'bookingId',
              message: 'Booking not found',
            },
          ],
        })
      }

      // Check if booking is completed
      if (bookingCheck.value.status.type !== 'completed') {
        return err({
          type: 'validation_failed',
          errors: [
            {
              field: 'bookingId',
              message: 'Cannot review a booking that is not completed',
            },
          ],
        })
      }

      // Step 3: Check for duplicate review
      const duplicateCheck = await this.reviewRepository.findByBookingId(
        writeFlowResult.value.bookingId as any
      )
      if (duplicateCheck.type === 'ok' && duplicateCheck.value) {
        return err({
          type: 'duplicate',
          customerId: writeFlowResult.value.customerId as any,
          reservationId: writeFlowResult.value.bookingId as any, // API expects reservationId in error
        })
      }

      // Step 4: Validate review content using business rules
      const validationResult = this.validateBusinessRules(request)
      if (validationResult.type === 'err') {
        return validationResult
      }

      // Step 5: Create review in database
      const createResult = await this.reviewRepository.create(
        writeFlowResult.value
      )
      if (createResult.type === 'err') {
        return err({
          type: 'error',
          error: {
            type: 'system',
            message: `Failed to create review: ${createResult.error}`,
          },
        })
      }

      // Step 6: Map DB record back to domain
      const domainResult = mapGetReviewDbToDomain(createResult.value)
      if (domainResult.type === 'err') {
        return domainResult
      }

      return ok(domainResult.value)
    } catch (error) {
      return err({
        type: 'error',
        error: {
          type: 'system',
          message: `Unexpected error in CreateReviewUseCase: ${error}`,
        },
      })
    }
  }

  /**
   * Validate review business rules
   */
  private validateBusinessRules(
    request: CreateReviewRequest
  ): Result<void, ReviewOperationResult> {
    // Validate rating range
    const rating = (request as any).overallRating || (request as any).rating
    if (rating < 1 || rating > 5) {
      return err({
        type: 'validation_failed',
        errors: [
          {
            field: 'rating',
            message: 'Rating must be between 1 and 5',
          },
        ],
      })
    }

    // Validate sub-ratings if provided
    const subRatings = [
      { field: 'serviceRating', value: request.serviceRating },
      { field: 'cleanlinessRating', value: (request as any).cleanlinessRating },
      { field: 'staffRating', value: request.staffRating },
      { field: 'valueRating', value: (request as any).valueRating },
    ]

    for (const { field, value } of subRatings) {
      if (value !== undefined && (value < 1 || value > 5)) {
        return err({
          type: 'validation_failed',
          errors: [
            {
              field,
              message: `${field} must be between 1 and 5`,
            },
          ],
        })
      }
    }

    // Validate comment length if provided
    if (request.comment && request.comment.length > 2000) {
      return err({
        type: 'validation_failed',
        errors: [
          {
            field: 'comment',
            message: 'Comment must not exceed 2000 characters',
          },
        ],
      })
    }

    // Validate title length if provided
    const title = (request as any).title
    if (title && title.length > 255) {
      return err({
        type: 'validation_failed',
        errors: [
          {
            field: 'title',
            message: 'Title must not exceed 255 characters',
          },
        ],
      })
    }

    return ok(undefined)
  }
}

/**
 * Factory function for creating the use case
 */
export const createReviewUseCase = (
  reviewRepository: ReviewRepository,
  bookingRepository: BookingRepository
): CreateReviewUseCase => {
  return new CreateReviewUseCase(reviewRepository, bookingRepository)
}
