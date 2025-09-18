/**
 * Get Booking Use Case
 * Business logic for retrieving booking information
 */

import {
  mapBookingListDbToDomain,
  mapGetBookingDbToDomain,
} from '../mappers/read/get-booking.mapper'
import type {
  Booking,
  BookingId,
  BookingOperationResult,
} from '../models/booking'
import type { BookingRepository } from '../repositories/booking.repository'
import type { Result } from '../shared/result'
import { err, ok } from '../shared/result'

/**
 * Get booking use case implementation
 */
export class GetBookingUseCase {
  constructor(private readonly bookingRepository: BookingRepository) {}

  /**
   * Get booking by ID
   */
  async execute(
    bookingId: BookingId
  ): Promise<Result<Booking, BookingOperationResult>> {
    try {
      // Step 1: Get booking from repository
      const bookingResult = await this.bookingRepository.findById(bookingId)
      if (bookingResult.type === 'err') {
        return err({
          type: 'not_found',
          bookingId,
        })
      }

      if (!bookingResult.value) {
        return err({
          type: 'not_found',
          bookingId,
        })
      }

      // Step 2: Map DB record to domain
      const domainResult = mapGetBookingDbToDomain(bookingResult.value)
      if (domainResult.type === 'err') {
        return domainResult
      }

      return ok(domainResult.value)
    } catch (error) {
      return err({
        type: 'error',
        error: {
          type: 'system',
          message: `Failed to get booking: ${error}`,
        },
      })
    }
  }

  /**
   * List bookings by customer
   */
  async listByCustomer(
    customerId: string,
    filters?: {
      status?: string
      startDate?: string
      endDate?: string
    }
  ): Promise<Result<Booking[], BookingOperationResult>> {
    try {
      const listResult = await this.bookingRepository.listByCustomer(
        customerId,
        filters
      )
      if (listResult.type === 'err') {
        return err({
          type: 'error',
          error: {
            type: 'system',
            message: `Failed to list bookings: ${listResult.error}`,
          },
        })
      }

      const domainResult = mapBookingListDbToDomain(listResult.value)
      if (domainResult.type === 'err') {
        return domainResult
      }

      return ok(domainResult.value)
    } catch (error) {
      return err({
        type: 'error',
        error: {
          type: 'system',
          message: `Failed to list bookings: ${error}`,
        },
      })
    }
  }

  /**
   * List bookings by salon
   */
  async listBySalon(
    salonId: string,
    filters?: {
      status?: string
      date?: string
    }
  ): Promise<Result<Booking[], BookingOperationResult>> {
    try {
      const listResult = await this.bookingRepository.listBySalon(
        salonId,
        filters
      )
      if (listResult.type === 'err') {
        return err({
          type: 'error',
          error: {
            type: 'system',
            message: `Failed to list bookings: ${listResult.error}`,
          },
        })
      }

      const domainResult = mapBookingListDbToDomain(listResult.value)
      if (domainResult.type === 'err') {
        return domainResult
      }

      return ok(domainResult.value)
    } catch (error) {
      return err({
        type: 'error',
        error: {
          type: 'system',
          message: `Failed to list bookings: ${error}`,
        },
      })
    }
  }

  /**
   * Get today's bookings for a salon
   */
  async getTodayBookings(
    salonId: string
  ): Promise<Result<Booking[], BookingOperationResult>> {
    const today = new Date().toISOString().split('T')[0]
    return this.listBySalon(salonId, { date: today })
  }

  /**
   * Get upcoming bookings for a customer
   */
  async getUpcomingBookings(
    customerId: string
  ): Promise<Result<Booking[], BookingOperationResult>> {
    const now = new Date().toISOString()
    return this.listByCustomer(customerId, {
      status: 'confirmed',
      startDate: now,
    })
  }
}

/**
 * Factory function for creating the use case
 */
export const getBookingUseCase = (
  bookingRepository: BookingRepository
): GetBookingUseCase => {
  return new GetBookingUseCase(bookingRepository)
}
