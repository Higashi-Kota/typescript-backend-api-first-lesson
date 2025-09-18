/**
 * Create Booking Use Case
 * Business logic for creating a new booking
 */

import { mapGetBookingDbToDomain } from '../mappers/read/get-booking.mapper'
import { createBookingWriteFlow } from '../mappers/write/create-booking.mapper'
import type {
  Booking,
  BookingOperationResult,
  CreateBookingRequest,
} from '../models/booking'
import type { ReservationId } from '../models/reservation'
import type { BookingRepository } from '../repositories/booking.repository'
import type { ReservationRepository } from '../repositories/reservation.repository'
import type { Result } from '../shared/result'
import { err, ok } from '../shared/result'

/**
 * Create booking use case implementation
 */
export class CreateBookingUseCase {
  constructor(
    private readonly bookingRepository: BookingRepository,
    private readonly reservationRepository: ReservationRepository
  ) {}

  /**
   * Execute the create booking use case
   */
  async execute(
    request: CreateBookingRequest
  ): Promise<Result<Booking, BookingOperationResult>> {
    try {
      // Step 1: Map request through write flow (API → Domain → DB)
      const writeFlowResult = createBookingWriteFlow(request)
      if (writeFlowResult.type === 'err') {
        return writeFlowResult
      }

      // Step 2: Validate reservations exist if provided
      if (request.reservationIds && request.reservationIds.length > 0) {
        for (const reservationId of request.reservationIds) {
          const reservationCheck = await this.reservationRepository.findById(
            reservationId as ReservationId
          )
          if (reservationCheck.type === 'err' || !reservationCheck.value) {
            return err({
              type: 'validation_failed',
              errors: [
                {
                  field: 'reservationIds',
                  message: `Reservation ${reservationId} not found`,
                },
              ],
            })
          }
        }
      }

      // Step 3: Validate business rules
      const rulesValidation = this.validateBusinessRules(request)
      if (rulesValidation.type === 'err') {
        return rulesValidation
      }

      // Step 4: Create booking in database
      const dbInsert = writeFlowResult.value
      const createResult = await this.bookingRepository.create(
        dbInsert as any // The repository will handle the actual DB type
      )
      if (createResult.type === 'err') {
        return err({
          type: 'error',
          error: {
            type: 'system',
            message: `Failed to create booking: ${createResult.error}`,
          },
        })
      }

      // Step 5: Map DB record back to domain
      const domainResult = mapGetBookingDbToDomain(createResult.value as any)
      if (domainResult.type === 'err') {
        return domainResult
      }

      return ok(domainResult.value)
    } catch (error) {
      return err({
        type: 'error',
        error: {
          type: 'system',
          message: `Unexpected error in CreateBookingUseCase: ${error}`,
        },
      })
    }
  }

  /**
   * Validate booking business rules
   */
  private validateBusinessRules(
    request: CreateBookingRequest
  ): Result<void, BookingOperationResult> {
    // Validate discount amount if provided
    if (
      request.discountAmount !== undefined &&
      request.discountAmount.value < 0
    ) {
      return err({
        type: 'validation_failed',
        errors: [
          {
            field: 'discountAmount',
            message: 'Discount amount cannot be negative',
          },
        ],
      })
    }

    // Validate required fields
    if (!request.salonId) {
      return err({
        type: 'validation_failed',
        errors: [
          {
            field: 'salonId',
            message: 'Salon ID is required',
          },
        ],
      })
    }

    if (!request.customerId) {
      return err({
        type: 'validation_failed',
        errors: [
          {
            field: 'customerId',
            message: 'Customer ID is required',
          },
        ],
      })
    }

    if (!request.reservationIds || request.reservationIds.length === 0) {
      return err({
        type: 'validation_failed',
        errors: [
          {
            field: 'reservationIds',
            message: 'At least one reservation is required',
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
export const createBookingUseCase = (
  bookingRepository: BookingRepository,
  reservationRepository: ReservationRepository
): CreateBookingUseCase => {
  return new CreateBookingUseCase(bookingRepository, reservationRepository)
}
