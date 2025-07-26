/**
 * Booking ドメインモデルの単体テスト
 * CLAUDE.mdのテスト要件に徹底準拠
 */

import { match } from 'ts-pattern'
import { describe, expect, it } from 'vitest'
import {
  type Booking,
  type BookingId,
  type PaymentMethod,
  type PaymentStatus,
  calculateRefundAmount,
  canBeCancelled,
  canBeCompleted,
  canBeUpdated,
  createBookingId,
  createBookingIdSafe,
  getBookingStatus,
  hasReservations,
  isCancelledBooking,
  isCompletedBooking,
  isConfirmedBooking,
  isDraftBooking,
  isFullyPaid,
  isNoShowBooking,
  sortByCreatedAt,
  validateAmount,
  validateFinalAmount,
  validateReservationIds,
} from '../booking.js'
import { createCustomerId } from '../customer.js'
import { type ReservationId, createReservationId } from '../reservation.js'
import { createSalonId } from '../salon.js'

// Helper function to create BookingId with null check
const createTestBookingId = (uuid: string): BookingId => {
  const id = createBookingId(uuid)
  if (!id) {
    throw new Error(`Failed to create BookingId from UUID: ${uuid}`)
  }
  return id
}

// Helper function to create other IDs
const createTestSalonId = (uuid: string) => {
  const id = createSalonId(uuid)
  if (!id) {
    throw new Error(`Failed to create SalonId from UUID: ${uuid}`)
  }
  return id
}

const createTestCustomerId = (uuid: string) => {
  const id = createCustomerId(uuid)
  if (!id) {
    throw new Error(`Failed to create CustomerId from UUID: ${uuid}`)
  }
  return id
}

const createTestReservationId = (uuid: string) => {
  const id = createReservationId(uuid)
  if (!id) {
    throw new Error(`Failed to create ReservationId from UUID: ${uuid}`)
  }
  return id
}

describe('Booking ID作成関数', () => {
  describe('createBookingId', () => {
    it('should create a valid BookingId', () => {
      // Arrange
      const validUuid = '550e8400-e29b-41d4-a716-446655440000'

      // Act
      const bookingId = createBookingId(validUuid)

      // Assert
      expect(bookingId).not.toBeNull()
      if (bookingId) {
        expect(bookingId).toBe(validUuid)
        expect(typeof bookingId).toBe('string')
      }
    })
  })

  describe('createBookingIdSafe', () => {
    it('should create BookingId for valid UUID', () => {
      // Arrange
      const validUuid = '550e8400-e29b-41d4-a716-446655440000'

      // Act
      const result = createBookingIdSafe(validUuid)

      // Assert
      expect(result).toEqual({
        type: 'ok',
        value: validUuid,
      })
    })

    it('should return error for invalid UUID', () => {
      // Arrange
      const invalidUuid = 'not-a-uuid'

      // Act
      const result = createBookingIdSafe(invalidUuid)

      // Assert
      expect(result).toEqual({
        type: 'err',
        error: {
          type: 'invalidFormat',
          value: invalidUuid,
          brand: 'BookingId',
          message: `Invalid BookingId format: ${invalidUuid}`,
        },
      })
    })

    it('should return error for empty string', () => {
      // Arrange
      const emptyString = ''

      // Act
      const result = createBookingIdSafe(emptyString)

      // Assert
      expect(result).toEqual({
        type: 'err',
        error: {
          type: 'invalidFormat',
          value: emptyString,
          brand: 'BookingId',
          message: `Invalid BookingId format: ${emptyString}`,
        },
      })
    })
  })
})

describe('金額バリデーション', () => {
  describe('validateAmount', () => {
    it('should accept valid amount', () => {
      // Arrange
      const validAmount = 5000

      // Act
      const result = validateAmount(validAmount)

      // Assert
      expect(result).toEqual({
        type: 'ok',
        value: validAmount,
      })
    })

    it('should accept zero amount', () => {
      // Arrange
      const zeroAmount = 0

      // Act
      const result = validateAmount(zeroAmount)

      // Assert
      expect(result).toEqual({
        type: 'ok',
        value: zeroAmount,
      })
    })

    it('should reject negative amount', () => {
      // Arrange
      const negativeAmount = -100

      // Act
      const result = validateAmount(negativeAmount)

      // Assert
      expect(result).toEqual({
        type: 'err',
        error: {
          type: 'invalidAmount',
          message: 'Amount cannot be negative',
        },
      })
    })

    it('should reject amount over 10 million yen', () => {
      // Arrange
      const highAmount = 10000001

      // Act
      const result = validateAmount(highAmount)

      // Assert
      expect(result).toEqual({
        type: 'err',
        error: {
          type: 'invalidAmount',
          message: 'Amount is too high',
        },
      })
    })

    it('should accept maximum valid amount', () => {
      // Arrange
      const maxAmount = 10000000

      // Act
      const result = validateAmount(maxAmount)

      // Assert
      expect(result).toEqual({
        type: 'ok',
        value: maxAmount,
      })
    })
  })

  describe('validateFinalAmount', () => {
    it('should accept correct final amount without discount', () => {
      // Arrange
      const totalAmount = 5000
      const discountAmount = undefined
      const finalAmount = 5000

      // Act
      const result = validateFinalAmount(
        totalAmount,
        discountAmount,
        finalAmount
      )

      // Assert
      expect(result).toEqual({
        type: 'ok',
        value: finalAmount,
      })
    })

    it('should accept correct final amount with discount', () => {
      // Arrange
      const totalAmount = 5000
      const discountAmount = 500
      const finalAmount = 4500

      // Act
      const result = validateFinalAmount(
        totalAmount,
        discountAmount,
        finalAmount
      )

      // Assert
      expect(result).toEqual({
        type: 'ok',
        value: finalAmount,
      })
    })

    it('should reject mismatched final amount', () => {
      // Arrange
      const totalAmount = 5000
      const discountAmount = 500
      const finalAmount = 5000 // Should be 4500

      // Act
      const result = validateFinalAmount(
        totalAmount,
        discountAmount,
        finalAmount
      )

      // Assert
      expect(result).toEqual({
        type: 'err',
        error: {
          type: 'amountMismatch',
          message: 'Final amount does not match total minus discount',
        },
      })
    })

    it('should reject negative final amount', () => {
      // Arrange
      const totalAmount = 1000
      const discountAmount = 2000
      const finalAmount = -1000

      // Act
      const result = validateFinalAmount(
        totalAmount,
        discountAmount,
        finalAmount
      )

      // Assert
      expect(result).toEqual({
        type: 'err',
        error: {
          type: 'invalidAmount',
          message: 'Final amount cannot be negative',
        },
      })
    })

    it('should handle zero discount correctly', () => {
      // Arrange
      const totalAmount = 3000
      const discountAmount = 0
      const finalAmount = 3000

      // Act
      const result = validateFinalAmount(
        totalAmount,
        discountAmount,
        finalAmount
      )

      // Assert
      expect(result).toEqual({
        type: 'ok',
        value: finalAmount,
      })
    })
  })
})

describe('予約IDバリデーション', () => {
  describe('validateReservationIds', () => {
    it('should accept valid reservation IDs', () => {
      // Arrange
      const validIds = [
        createTestReservationId('550e8400-e29b-41d4-a716-446655440001'),
        createTestReservationId('550e8400-e29b-41d4-a716-446655440002'),
      ]

      // Act
      const result = validateReservationIds(validIds)

      // Assert
      expect(result).toEqual({
        type: 'ok',
        value: validIds,
      })
    })

    it('should accept undefined reservation IDs', () => {
      // Arrange
      const undefinedIds = undefined

      // Act
      const result = validateReservationIds(undefinedIds)

      // Assert
      expect(result).toEqual({
        type: 'ok',
        value: undefined,
      })
    })

    it('should accept empty array as undefined', () => {
      // Arrange
      const emptyIds: ReservationId[] = []

      // Act
      const result = validateReservationIds(emptyIds)

      // Assert
      expect(result).toEqual({
        type: 'ok',
        value: undefined,
      })
    })

    it('should reject duplicate reservation IDs', () => {
      // Arrange
      const duplicateId = createTestReservationId(
        '550e8400-e29b-41d4-a716-446655440001'
      )
      const duplicateIds = [duplicateId, duplicateId]

      // Act
      const result = validateReservationIds(duplicateIds)

      // Assert
      expect(result).toEqual({
        type: 'err',
        error: {
          type: 'noReservations',
          message: 'Duplicate reservation IDs found',
        },
      })
    })

    it('should accept single reservation ID', () => {
      // Arrange
      const singleId = [
        createTestReservationId('550e8400-e29b-41d4-a716-446655440001'),
      ]

      // Act
      const result = validateReservationIds(singleId)

      // Assert
      expect(result).toEqual({
        type: 'ok',
        value: singleId,
      })
    })
  })
})

describe('Booking状態判定関数', () => {
  const baseBookingData = {
    id: createTestBookingId('550e8400-e29b-41d4-a716-446655440000'),
    salonId: createTestSalonId('660e8400-e29b-41d4-a716-446655440001'),
    customerId: createTestCustomerId('770e8400-e29b-41d4-a716-446655440002'),
    totalAmount: 5000,
    finalAmount: 5000,
    paymentStatus: 'pending' as PaymentStatus,
    reservationIds: [
      createTestReservationId('880e8400-e29b-41d4-a716-446655440003'),
    ],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  }

  describe('isDraftBooking', () => {
    it('should return true for draft booking', () => {
      // Arrange
      const draftBooking: Booking = {
        type: 'draft',
        data: baseBookingData,
      }

      // Act
      const result = isDraftBooking(draftBooking)

      // Assert
      expect(result).toBe(true)
    })

    it('should return false for confirmed booking', () => {
      // Arrange
      const confirmedBooking: Booking = {
        type: 'confirmed',
        data: baseBookingData,
        confirmedAt: new Date('2024-01-02'),
        confirmedBy: 'user',
      }

      // Act
      const result = isDraftBooking(confirmedBooking)

      // Assert
      expect(result).toBe(false)
    })
  })

  describe('isConfirmedBooking', () => {
    it('should return true for confirmed booking', () => {
      // Arrange
      const confirmedBooking: Booking = {
        type: 'confirmed',
        data: baseBookingData,
        confirmedAt: new Date('2024-01-02'),
        confirmedBy: 'user',
      }

      // Act
      const result = isConfirmedBooking(confirmedBooking)

      // Assert
      expect(result).toBe(true)
    })

    it('should return false for draft booking', () => {
      // Arrange
      const draftBooking: Booking = {
        type: 'draft',
        data: baseBookingData,
      }

      // Act
      const result = isConfirmedBooking(draftBooking)

      // Assert
      expect(result).toBe(false)
    })
  })

  describe('isCancelledBooking', () => {
    it('should return true for cancelled booking', () => {
      // Arrange
      const cancelledBooking: Booking = {
        type: 'cancelled',
        data: baseBookingData,
        cancelledAt: new Date('2024-01-03'),
        cancelledBy: 'user',
        cancellationReason: '予定変更',
      }

      // Act
      const result = isCancelledBooking(cancelledBooking)

      // Assert
      expect(result).toBe(true)
    })

    it('should return false for confirmed booking', () => {
      // Arrange
      const confirmedBooking: Booking = {
        type: 'confirmed',
        data: baseBookingData,
        confirmedAt: new Date('2024-01-02'),
        confirmedBy: 'user',
      }

      // Act
      const result = isCancelledBooking(confirmedBooking)

      // Assert
      expect(result).toBe(false)
    })
  })

  describe('isCompletedBooking', () => {
    it('should return true for completed booking', () => {
      // Arrange
      const completedBooking: Booking = {
        type: 'completed',
        data: baseBookingData,
        completedAt: new Date('2024-01-04'),
        completedBy: 'staff',
      }

      // Act
      const result = isCompletedBooking(completedBooking)

      // Assert
      expect(result).toBe(true)
    })

    it('should return false for confirmed booking', () => {
      // Arrange
      const confirmedBooking: Booking = {
        type: 'confirmed',
        data: baseBookingData,
        confirmedAt: new Date('2024-01-02'),
        confirmedBy: 'user',
      }

      // Act
      const result = isCompletedBooking(confirmedBooking)

      // Assert
      expect(result).toBe(false)
    })
  })

  describe('isNoShowBooking', () => {
    it('should return true for no-show booking', () => {
      // Arrange
      const noShowBooking: Booking = {
        type: 'no_show',
        data: baseBookingData,
        markedNoShowAt: new Date('2024-01-05'),
        markedNoShowBy: 'staff',
      }

      // Act
      const result = isNoShowBooking(noShowBooking)

      // Assert
      expect(result).toBe(true)
    })

    it('should return false for completed booking', () => {
      // Arrange
      const completedBooking: Booking = {
        type: 'completed',
        data: baseBookingData,
        completedAt: new Date('2024-01-04'),
        completedBy: 'staff',
      }

      // Act
      const result = isNoShowBooking(completedBooking)

      // Assert
      expect(result).toBe(false)
    })
  })
})

describe('Booking権限判定関数', () => {
  const baseBookingData = {
    id: createTestBookingId('550e8400-e29b-41d4-a716-446655440000'),
    salonId: createTestSalonId('660e8400-e29b-41d4-a716-446655440001'),
    customerId: createTestCustomerId('770e8400-e29b-41d4-a716-446655440002'),
    totalAmount: 5000,
    finalAmount: 5000,
    paymentStatus: 'pending' as PaymentStatus,
    reservationIds: [
      createTestReservationId('880e8400-e29b-41d4-a716-446655440003'),
    ],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  }

  describe('canBeCancelled', () => {
    it('should return true for draft booking', () => {
      // Arrange
      const draftBooking: Booking = {
        type: 'draft',
        data: baseBookingData,
      }

      // Act
      const result = canBeCancelled(draftBooking)

      // Assert
      expect(result).toBe(true)
    })

    it('should return true for confirmed booking', () => {
      // Arrange
      const confirmedBooking: Booking = {
        type: 'confirmed',
        data: baseBookingData,
        confirmedAt: new Date('2024-01-02'),
        confirmedBy: 'user',
      }

      // Act
      const result = canBeCancelled(confirmedBooking)

      // Assert
      expect(result).toBe(true)
    })

    it('should return false for completed booking', () => {
      // Arrange
      const completedBooking: Booking = {
        type: 'completed',
        data: baseBookingData,
        completedAt: new Date('2024-01-04'),
        completedBy: 'staff',
      }

      // Act
      const result = canBeCancelled(completedBooking)

      // Assert
      expect(result).toBe(false)
    })

    it('should return false for cancelled booking', () => {
      // Arrange
      const cancelledBooking: Booking = {
        type: 'cancelled',
        data: baseBookingData,
        cancelledAt: new Date('2024-01-03'),
        cancelledBy: 'user',
      }

      // Act
      const result = canBeCancelled(cancelledBooking)

      // Assert
      expect(result).toBe(false)
    })
  })

  describe('canBeCompleted', () => {
    it('should return true for confirmed booking', () => {
      // Arrange
      const confirmedBooking: Booking = {
        type: 'confirmed',
        data: baseBookingData,
        confirmedAt: new Date('2024-01-02'),
        confirmedBy: 'user',
      }

      // Act
      const result = canBeCompleted(confirmedBooking)

      // Assert
      expect(result).toBe(true)
    })

    it('should return false for draft booking', () => {
      // Arrange
      const draftBooking: Booking = {
        type: 'draft',
        data: baseBookingData,
      }

      // Act
      const result = canBeCompleted(draftBooking)

      // Assert
      expect(result).toBe(false)
    })

    it('should return false for completed booking', () => {
      // Arrange
      const completedBooking: Booking = {
        type: 'completed',
        data: baseBookingData,
        completedAt: new Date('2024-01-04'),
        completedBy: 'staff',
      }

      // Act
      const result = canBeCompleted(completedBooking)

      // Assert
      expect(result).toBe(false)
    })
  })

  describe('canBeUpdated', () => {
    it('should return true for draft booking', () => {
      // Arrange
      const draftBooking: Booking = {
        type: 'draft',
        data: baseBookingData,
      }

      // Act
      const result = canBeUpdated(draftBooking)

      // Assert
      expect(result).toBe(true)
    })

    it('should return false for confirmed booking', () => {
      // Arrange
      const confirmedBooking: Booking = {
        type: 'confirmed',
        data: baseBookingData,
        confirmedAt: new Date('2024-01-02'),
        confirmedBy: 'user',
      }

      // Act
      const result = canBeUpdated(confirmedBooking)

      // Assert
      expect(result).toBe(false)
    })
  })
})

describe('Bookingユーティリティ関数', () => {
  const baseBookingData = {
    id: createTestBookingId('550e8400-e29b-41d4-a716-446655440000'),
    salonId: createTestSalonId('660e8400-e29b-41d4-a716-446655440001'),
    customerId: createTestCustomerId('770e8400-e29b-41d4-a716-446655440002'),
    totalAmount: 5000,
    finalAmount: 5000,
    paymentStatus: 'pending' as PaymentStatus,
    reservationIds: [],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  }

  describe('getBookingStatus', () => {
    it('should return status for each booking type', () => {
      // Arrange
      const bookings: Booking[] = [
        { type: 'draft', data: baseBookingData },
        {
          type: 'confirmed',
          data: baseBookingData,
          confirmedAt: new Date(),
          confirmedBy: 'user',
        },
        {
          type: 'cancelled',
          data: baseBookingData,
          cancelledAt: new Date(),
          cancelledBy: 'user',
        },
        {
          type: 'completed',
          data: baseBookingData,
          completedAt: new Date(),
          completedBy: 'staff',
        },
        {
          type: 'no_show',
          data: baseBookingData,
          markedNoShowAt: new Date(),
          markedNoShowBy: 'staff',
        },
      ]

      // Act & Assert
      const booking0 = bookings[0]
      const booking1 = bookings[1]
      const booking2 = bookings[2]
      const booking3 = bookings[3]
      const booking4 = bookings[4]

      expect(booking0).toBeDefined()
      expect(booking1).toBeDefined()
      expect(booking2).toBeDefined()
      expect(booking3).toBeDefined()
      expect(booking4).toBeDefined()

      if (booking0) expect(getBookingStatus(booking0)).toBe('draft')
      if (booking1) expect(getBookingStatus(booking1)).toBe('confirmed')
      if (booking2) expect(getBookingStatus(booking2)).toBe('cancelled')
      if (booking3) expect(getBookingStatus(booking3)).toBe('completed')
      if (booking4) expect(getBookingStatus(booking4)).toBe('no_show')
    })
  })

  describe('calculateRefundAmount', () => {
    it('should calculate refund amount for cancelled booking', () => {
      // Arrange
      const cancelledBooking: Booking = {
        type: 'cancelled',
        data: { ...baseBookingData, finalAmount: 10000 },
        cancelledAt: new Date('2024-01-03'),
        cancelledBy: 'user',
      }
      const refundPercentage = 80

      // Act
      const refund = calculateRefundAmount(cancelledBooking, refundPercentage)

      // Assert
      expect(refund).toBe(8000)
    })

    it('should return zero for non-cancelled booking', () => {
      // Arrange
      const confirmedBooking: Booking = {
        type: 'confirmed',
        data: { ...baseBookingData, finalAmount: 10000 },
        confirmedAt: new Date('2024-01-02'),
        confirmedBy: 'user',
      }
      const refundPercentage = 80

      // Act
      const refund = calculateRefundAmount(confirmedBooking, refundPercentage)

      // Assert
      expect(refund).toBe(0)
    })

    it('should handle 100% refund', () => {
      // Arrange
      const cancelledBooking: Booking = {
        type: 'cancelled',
        data: { ...baseBookingData, finalAmount: 5000 },
        cancelledAt: new Date('2024-01-03'),
        cancelledBy: 'user',
      }
      const refundPercentage = 100

      // Act
      const refund = calculateRefundAmount(cancelledBooking, refundPercentage)

      // Assert
      expect(refund).toBe(5000)
    })

    it('should handle 0% refund', () => {
      // Arrange
      const cancelledBooking: Booking = {
        type: 'cancelled',
        data: { ...baseBookingData, finalAmount: 5000 },
        cancelledAt: new Date('2024-01-03'),
        cancelledBy: 'user',
      }
      const refundPercentage = 0

      // Act
      const refund = calculateRefundAmount(cancelledBooking, refundPercentage)

      // Assert
      expect(refund).toBe(0)
    })

    it('should floor decimal amounts', () => {
      // Arrange
      const cancelledBooking: Booking = {
        type: 'cancelled',
        data: { ...baseBookingData, finalAmount: 1000 },
        cancelledAt: new Date('2024-01-03'),
        cancelledBy: 'user',
      }
      const refundPercentage = 33 // Should result in 330

      // Act
      const refund = calculateRefundAmount(cancelledBooking, refundPercentage)

      // Assert
      expect(refund).toBe(330)
    })
  })

  describe('isFullyPaid', () => {
    it('should return true for paid booking', () => {
      // Arrange
      const paidBooking: Booking = {
        type: 'completed',
        data: { ...baseBookingData, paymentStatus: 'paid' },
        completedAt: new Date('2024-01-04'),
        completedBy: 'staff',
      }

      // Act
      const result = isFullyPaid(paidBooking)

      // Assert
      expect(result).toBe(true)
    })

    it('should return false for pending payment', () => {
      // Arrange
      const pendingBooking: Booking = {
        type: 'confirmed',
        data: { ...baseBookingData, paymentStatus: 'pending' },
        confirmedAt: new Date('2024-01-02'),
        confirmedBy: 'user',
      }

      // Act
      const result = isFullyPaid(pendingBooking)

      // Assert
      expect(result).toBe(false)
    })

    it('should return false for refunded payment', () => {
      // Arrange
      const refundedBooking: Booking = {
        type: 'cancelled',
        data: { ...baseBookingData, paymentStatus: 'refunded' },
        cancelledAt: new Date('2024-01-03'),
        cancelledBy: 'user',
      }

      // Act
      const result = isFullyPaid(refundedBooking)

      // Assert
      expect(result).toBe(false)
    })
  })

  describe('hasReservations', () => {
    it('should return true when reservations exist', () => {
      // Arrange
      const bookingWithReservations: Booking = {
        type: 'confirmed',
        data: {
          ...baseBookingData,
          reservationIds: [
            createTestReservationId('880e8400-e29b-41d4-a716-446655440003'),
            createTestReservationId('880e8400-e29b-41d4-a716-446655440004'),
          ],
        },
        confirmedAt: new Date('2024-01-02'),
        confirmedBy: 'user',
      }

      // Act
      const result = hasReservations(bookingWithReservations)

      // Assert
      expect(result).toBe(true)
    })

    it('should return false when no reservations', () => {
      // Arrange
      const bookingWithoutReservations: Booking = {
        type: 'confirmed',
        data: {
          ...baseBookingData,
          reservationIds: [],
        },
        confirmedAt: new Date('2024-01-02'),
        confirmedBy: 'user',
      }

      // Act
      const result = hasReservations(bookingWithoutReservations)

      // Assert
      expect(result).toBe(false)
    })
  })

  describe('sortByCreatedAt', () => {
    it('should sort bookings by creation date descending', () => {
      // Arrange
      const bookings: Booking[] = [
        {
          type: 'draft',
          data: { ...baseBookingData, createdAt: new Date('2024-01-01') },
        },
        {
          type: 'draft',
          data: { ...baseBookingData, createdAt: new Date('2024-01-03') },
        },
        {
          type: 'draft',
          data: { ...baseBookingData, createdAt: new Date('2024-01-02') },
        },
      ]

      // Act
      const sorted = sortByCreatedAt(bookings)

      // Assert
      const sorted0 = sorted[0]
      const sorted1 = sorted[1]
      const sorted2 = sorted[2]

      expect(sorted0).toBeDefined()
      expect(sorted1).toBeDefined()
      expect(sorted2).toBeDefined()

      if (sorted0)
        expect(sorted0.data.createdAt).toEqual(new Date('2024-01-03'))
      if (sorted1)
        expect(sorted1.data.createdAt).toEqual(new Date('2024-01-02'))
      if (sorted2)
        expect(sorted2.data.createdAt).toEqual(new Date('2024-01-01'))
    })

    it('should not modify original array', () => {
      // Arrange
      const bookings: Booking[] = [
        {
          type: 'draft',
          data: { ...baseBookingData, createdAt: new Date('2024-01-01') },
        },
        {
          type: 'draft',
          data: { ...baseBookingData, createdAt: new Date('2024-01-03') },
        },
      ]
      const originalFirst = bookings[0]

      // Act
      sortByCreatedAt(bookings)

      // Assert
      const firstBooking = bookings[0]
      expect(firstBooking).toBeDefined()
      if (firstBooking) expect(firstBooking).toBe(originalFirst)
    })
  })
})

describe('Booking Sum型のパターンマッチング', () => {
  const baseBookingData = {
    id: createTestBookingId('550e8400-e29b-41d4-a716-446655440000'),
    salonId: createTestSalonId('660e8400-e29b-41d4-a716-446655440001'),
    customerId: createTestCustomerId('770e8400-e29b-41d4-a716-446655440002'),
    totalAmount: 5000,
    discountAmount: 500,
    finalAmount: 4500,
    paymentMethod: 'credit_card' as PaymentMethod,
    paymentStatus: 'pending' as PaymentStatus,
    notes: 'テストメモ',
    reservationIds: [
      createTestReservationId('880e8400-e29b-41d4-a716-446655440003'),
    ],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  }

  it('should handle all booking states with pattern matching', () => {
    // Arrange
    const bookingStates: Booking[] = [
      {
        type: 'draft',
        data: baseBookingData,
      },
      {
        type: 'confirmed',
        data: baseBookingData,
        confirmedAt: new Date('2024-01-02'),
        confirmedBy: 'user123',
      },
      {
        type: 'cancelled',
        data: baseBookingData,
        cancelledAt: new Date('2024-01-03'),
        cancelledBy: 'user123',
        cancellationReason: '予定変更のため',
      },
      {
        type: 'completed',
        data: baseBookingData,
        completedAt: new Date('2024-01-04'),
        completedBy: 'staff456',
      },
      {
        type: 'no_show',
        data: baseBookingData,
        markedNoShowAt: new Date('2024-01-05'),
        markedNoShowBy: 'staff789',
      },
    ]

    // Act & Assert
    for (const booking of bookingStates) {
      const status = match(booking)
        .with({ type: 'draft' }, () => '下書き')
        .with(
          { type: 'confirmed' },
          ({ confirmedBy }) => `確定済み（${confirmedBy}が確定）`
        )
        .with({ type: 'cancelled' }, ({ cancellationReason }) =>
          cancellationReason
            ? `キャンセル: ${cancellationReason}`
            : 'キャンセル済み'
        )
        .with(
          { type: 'completed' },
          ({ completedBy }) => `完了（${completedBy}が処理）`
        )
        .with(
          { type: 'no_show' },
          ({ markedNoShowBy }) => `無断キャンセル（${markedNoShowBy}が記録）`
        )
        .exhaustive()

      // Assert
      expect(status).toBeDefined()
      expect(typeof status).toBe('string')
    }
  })

  it('should handle payment status enum exhaustively', () => {
    // Arrange
    const paymentStatuses: PaymentStatus[] = [
      'pending',
      'paid',
      'refunded',
      'failed',
    ]

    // Act & Assert
    for (const status of paymentStatuses) {
      const statusName = match(status)
        .with('pending', () => '支払い待ち')
        .with('paid', () => '支払い済み')
        .with('refunded', () => '返金済み')
        .with('failed', () => '支払い失敗')
        .exhaustive()

      // Assert
      expect(statusName).toBeDefined()
      expect(typeof statusName).toBe('string')
    }
  })

  it('should handle payment method enum exhaustively', () => {
    // Arrange
    const paymentMethods: PaymentMethod[] = [
      'credit_card',
      'cash',
      'bank_transfer',
      'other',
    ]

    // Act & Assert
    for (const method of paymentMethods) {
      const methodName = match(method)
        .with('credit_card', () => 'クレジットカード')
        .with('cash', () => '現金')
        .with('bank_transfer', () => '銀行振込')
        .with('other', () => 'その他')
        .exhaustive()

      // Assert
      expect(methodName).toBeDefined()
      expect(typeof methodName).toBe('string')
    }
  })
})
