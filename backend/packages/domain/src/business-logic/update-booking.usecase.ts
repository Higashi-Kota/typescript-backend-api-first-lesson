/**
 * Update Booking Use Case
 * Business logic for updating an existing booking
 */

import { mapGetBookingDbToDomain } from '../mappers/read/get-booking.mapper'
import {
  trackBookingChanges,
  updateBookingWriteFlow,
} from '../mappers/write/update-booking.mapper'
import type {
  Booking,
  BookingId,
  BookingOperationResult,
  UpdateBookingRequest,
} from '../models/booking'
import type { BookingRepository } from '../repositories/booking.repository'
import type { Result } from '../shared/result'
import { err, ok } from '../shared/result'

/**
 * Update booking use case implementation
 */
export class UpdateBookingUseCase {
  constructor(private readonly bookingRepository: BookingRepository) {}

  /**
   * Execute the update booking use case
   */
  async execute(
    bookingId: BookingId,
    request: UpdateBookingRequest
  ): Promise<Result<Booking, BookingOperationResult>> {
    try {
      // Step 1: Get existing booking
      const existingResult = await this.bookingRepository.findById(bookingId)
      if (existingResult.type === 'err') {
        return err({
          type: 'not_found',
          bookingId,
        })
      }

      const existingBookingDb = existingResult.value
      if (!existingBookingDb) {
        return err({
          type: 'not_found',
          bookingId,
        })
      }

      // Step 2: Map existing booking to domain
      const existingDomainResult = mapGetBookingDbToDomain(existingBookingDb)
      if (existingDomainResult.type === 'err') {
        return existingDomainResult
      }

      // Step 3: Validate status transition if status is being changed
      if (
        request.status &&
        request.status !== existingDomainResult.value.status
      ) {
        // Simple status transition validation
        const validTransitions: Record<string, string[]> = {
          pending: ['confirmed', 'cancelled'],
          confirmed: ['in_progress', 'cancelled', 'no_show'],
          in_progress: ['completed'],
          completed: [],
          cancelled: [],
          no_show: [],
        }

        const currentStatus = existingDomainResult.value.status
        const allowedTransitions = validTransitions[currentStatus] || []

        if (!allowedTransitions.includes(request.status)) {
          return err({
            type: 'invalid_state',
            currentState: currentStatus,
            attemptedAction: `transition to ${request.status}`,
          })
        }
      }

      // Step 4: Map request through write flow
      const writeFlowResult = updateBookingWriteFlow(
        bookingId,
        request,
        existingDomainResult.value
      )
      if (writeFlowResult.type === 'err') {
        return writeFlowResult
      }

      // Step 5: Update booking in database
      const updateResult = await this.bookingRepository.update(
        bookingId,
        writeFlowResult.value
      )
      if (updateResult.type === 'err') {
        return err({
          type: 'error',
          error: {
            type: 'system',
            message: `Failed to update booking: ${updateResult.error}`,
          },
        })
      }

      // Step 6: Map updated record back to domain
      const updatedDomainResult = mapGetBookingDbToDomain(updateResult.value)
      if (updatedDomainResult.type === 'err') {
        return updatedDomainResult
      }

      // Step 7: Track changes for audit
      const _changes = trackBookingChanges(
        existingDomainResult.value,
        updatedDomainResult.value
      )

      return ok(updatedDomainResult.value)
    } catch (error) {
      return err({
        type: 'error',
        error: {
          type: 'system',
          message: `Unexpected error in UpdateBookingUseCase: ${error}`,
        },
      })
    }
  }

  /**
   * Start a booking
   */
  async start(
    bookingId: BookingId
  ): Promise<Result<Booking, BookingOperationResult>> {
    const now = new Date().toISOString()
    return this.execute(bookingId, {
      status: 'in_progress',
      actualStartTime: now,
    })
  }

  /**
   * Complete a booking
   */
  async complete(
    bookingId: BookingId,
    finalAmount?: number
  ): Promise<Result<Booking, BookingOperationResult>> {
    const now = new Date().toISOString()
    const request: UpdateBookingRequest = {
      status: 'completed',
      actualEndTime: now,
    }

    if (finalAmount !== undefined) {
      request.finalAmount = finalAmount
    }

    return this.execute(bookingId, request)
  }

  /**
   * Cancel a booking
   */
  async cancel(
    bookingId: BookingId,
    notes?: string
  ): Promise<Result<Booking, BookingOperationResult>> {
    const request: UpdateBookingRequest = {
      status: 'cancelled',
    }

    if (notes) {
      request.notes = notes
    }

    return this.execute(bookingId, request)
  }

  /**
   * Check in a booking
   */
  async checkIn(
    bookingId: BookingId
  ): Promise<Result<Booking, BookingOperationResult>> {
    const now = new Date().toISOString()
    return this.execute(bookingId, {
      checkedInTime: now,
    })
  }
}

/**
 * Factory function for creating the use case
 */
export const updateBookingUseCase = (
  bookingRepository: BookingRepository
): UpdateBookingUseCase => {
  return new UpdateBookingUseCase(bookingRepository)
}
