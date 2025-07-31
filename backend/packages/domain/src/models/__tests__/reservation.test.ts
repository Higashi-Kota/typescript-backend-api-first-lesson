/**
 * Reservation ドメインモデルの単体テスト
 * CLAUDE.mdのテスト要件に徹底準拠
 */

import { addDays, addHours, addMonths, subDays, subHours } from 'date-fns'
import { match } from 'ts-pattern'
import { describe, expect, it } from 'vitest'
import { type CustomerId, createCustomerId } from '../customer.js'
import {
  type Reservation,
  type ReservationError,
  type ReservationId,
  type ReservationStatus,
  calculateRefundAmount,
  canBeCancelled,
  canBeModified,
  createReservationId,
  createReservationIdSafe,
  getReservationStatus,
  isCancelledReservation,
  isCompletedReservation,
  isConfirmedReservation,
  isNoShowReservation,
  isPendingReservation,
  validateAmount,
  validateDepositAmount,
  validateTimeRange,
} from '../reservation.js'
import { type SalonId, createSalonId } from '../salon.js'
import { type ServiceId, createServiceId } from '../service.js'
import { type StaffId, createStaffId } from '../staff.js'

// Test helper functions to create IDs with assertion
const createTestReservationId = (uuid: string): ReservationId => {
  const id = createReservationId(uuid)
  if (!id) {
    throw new Error(`Failed to create ReservationId from UUID: ${uuid}`)
  }
  return id
}

const createTestCustomerId = (uuid: string): CustomerId => {
  const id = createCustomerId(uuid)
  if (!id) {
    throw new Error(`Failed to create CustomerId from UUID: ${uuid}`)
  }
  return id
}

const createTestSalonId = (uuid: string): SalonId => {
  const id = createSalonId(uuid)
  if (!id) {
    throw new Error(`Failed to create SalonId from UUID: ${uuid}`)
  }
  return id
}

const createTestStaffId = (uuid: string): StaffId => {
  const id = createStaffId(uuid)
  if (!id) {
    throw new Error(`Failed to create StaffId from UUID: ${uuid}`)
  }
  return id
}

const createTestServiceId = (uuid: string): ServiceId => {
  const id = createServiceId(uuid)
  if (!id) {
    throw new Error(`Failed to create ServiceId from UUID: ${uuid}`)
  }
  return id
}

describe('Reservation ID作成関数', () => {
  describe('createReservationId', () => {
    it('should create a valid ReservationId', () => {
      // Arrange
      const validUuid = '550e8400-e29b-41d4-a716-446655440000'

      // Act
      const reservationId = createReservationId(validUuid)

      // Assert
      expect(reservationId).toBe(validUuid)
      expect(typeof reservationId).toBe('string')
    })
  })

  describe('createReservationIdSafe', () => {
    it('should create ReservationId for valid UUID', () => {
      // Arrange
      const validUuid = '550e8400-e29b-41d4-a716-446655440000'

      // Act
      const result = createReservationIdSafe(validUuid)

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
      const result = createReservationIdSafe(invalidUuid)

      // Assert
      expect(result).toEqual({
        type: 'err',
        error: {
          type: 'invalidFormat',
          value: invalidUuid,
          brand: 'ReservationId',
          message: `Invalid ReservationId format: ${invalidUuid}`,
        },
      })
    })

    it('should return error for empty string', () => {
      // Arrange
      const emptyString = ''

      // Act
      const result = createReservationIdSafe(emptyString)

      // Assert
      expect(result).toEqual({
        type: 'err',
        error: {
          type: 'invalidFormat',
          value: emptyString,
          brand: 'ReservationId',
          message: `Invalid ReservationId format: ${emptyString}`,
        },
      })
    })

    it('should return error for malformed UUID', () => {
      // Arrange
      const malformedUuids = [
        '550e8400-e29b-41d4-a716',
        '550e8400-e29b-41d4-a716-446655440000-extra',
        'g50e8400-e29b-41d4-a716-446655440000',
        '550e8400e29b41d4a716446655440000',
        'XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX',
      ]

      // Act & Assert
      for (const uuid of malformedUuids) {
        const result = createReservationIdSafe(uuid)
        expect(result).toEqual({
          type: 'err',
          error: {
            type: 'invalidFormat',
            value: uuid,
            brand: 'ReservationId',
            message: `Invalid ReservationId format: ${uuid}`,
          },
        })
      }
    })

    it('should handle case sensitivity in UUID validation', () => {
      // Arrange
      const upperCaseUuid = '550E8400-E29B-41D4-A716-446655440000'
      const lowerCaseUuid = '550e8400-e29b-41d4-a716-446655440000'

      // Act
      const upperResult = createReservationIdSafe(upperCaseUuid)
      const lowerResult = createReservationIdSafe(lowerCaseUuid)

      // Assert
      expect(upperResult).toEqual({
        type: 'ok',
        value: upperCaseUuid,
      })
      expect(lowerResult).toEqual({
        type: 'ok',
        value: lowerCaseUuid,
      })
    })
  })
})

describe('バリデーション関数', () => {
  describe('validateTimeRange', () => {
    it('should accept valid future time range', () => {
      // Arrange
      const now = new Date()
      const startTime = addDays(now, 1)
      const endTime = addHours(startTime, 2)

      // Act
      const result = validateTimeRange(startTime, endTime)

      // Assert
      expect(result).toEqual({
        type: 'ok',
        value: { startTime, endTime },
      })
    })

    it('should reject time range where start time equals end time', () => {
      // Arrange
      const startTime = addDays(new Date(), 1)
      const endTime = new Date(startTime)

      // Act
      const result = validateTimeRange(startTime, endTime)

      // Assert
      expect(result).toEqual({
        type: 'err',
        error: {
          type: 'invalidTimeRange',
          message: 'Start time must be before end time',
        },
      })
    })

    it('should reject time range where start time is after end time', () => {
      // Arrange
      const baseTime = addDays(new Date(), 1)
      const startTime = addHours(baseTime, 2)
      const endTime = baseTime

      // Act
      const result = validateTimeRange(startTime, endTime)

      // Assert
      expect(result).toEqual({
        type: 'err',
        error: {
          type: 'invalidTimeRange',
          message: 'Start time must be before end time',
        },
      })
    })

    it('should reject past start time', () => {
      // Arrange
      const startTime = subDays(new Date(), 1)
      const endTime = addHours(startTime, 2)

      // Act
      const result = validateTimeRange(startTime, endTime)

      // Assert
      expect(result).toEqual({
        type: 'err',
        error: {
          type: 'pastTimeNotAllowed',
          message: 'Cannot create reservation for past time',
        },
      })
    })

    it('should reject reservation more than 3 months in advance', () => {
      // Arrange
      const startTime = addMonths(new Date(), 4)
      const endTime = addHours(startTime, 2)

      // Act
      const result = validateTimeRange(startTime, endTime)

      // Assert
      expect(result).toEqual({
        type: 'err',
        error: {
          type: 'invalidTimeRange',
          message: 'Cannot create reservation more than 3 months in advance',
        },
      })
    })

    it('should accept reservation exactly 3 months in advance', () => {
      // Arrange
      const now = new Date()
      const startTime = addMonths(now, 3)
      const endTime = addHours(startTime, 2)

      // Act
      const result = validateTimeRange(startTime, endTime)

      // Assert
      expect(result).toEqual({
        type: 'ok',
        value: { startTime, endTime },
      })
    })

    it('should handle edge cases around current time', () => {
      // Arrange - 1分後の予約
      const startTime = new Date(Date.now() + 60 * 1000)
      const endTime = addHours(startTime, 1)

      // Act
      const result = validateTimeRange(startTime, endTime)

      // Assert
      expect(result).toEqual({
        type: 'ok',
        value: { startTime, endTime },
      })
    })
  })

  describe('validateAmount', () => {
    it('should accept valid positive amounts', () => {
      // Arrange
      const validAmounts = [0, 100, 1000, 10000, 100000, 1000000, 9999999]

      // Act & Assert
      for (const amount of validAmounts) {
        const result = validateAmount(amount)
        expect(result).toEqual({
          type: 'ok',
          value: amount,
        })
      }
    })

    it('should reject negative amounts', () => {
      // Arrange
      const negativeAmounts = [-1, -100, -1000, -10000]

      // Act & Assert
      for (const amount of negativeAmounts) {
        const result = validateAmount(amount)
        expect(result).toEqual({
          type: 'err',
          error: {
            type: 'invalidAmount',
            message: 'Amount cannot be negative',
          },
        })
      }
    })

    it('should reject amounts over 10 million', () => {
      // Arrange
      const tooHighAmounts = [10000001, 20000000, 100000000]

      // Act & Assert
      for (const amount of tooHighAmounts) {
        const result = validateAmount(amount)
        expect(result).toEqual({
          type: 'err',
          error: {
            type: 'invalidAmount',
            message: 'Amount is too high',
          },
        })
      }
    })

    it('should accept exactly 10 million', () => {
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

    it('should handle decimal amounts', () => {
      // Arrange
      const decimalAmounts = [100.5, 1000.99, 9999.01]

      // Act & Assert
      for (const amount of decimalAmounts) {
        const result = validateAmount(amount)
        expect(result).toEqual({
          type: 'ok',
          value: amount,
        })
      }
    })
  })

  describe('validateDepositAmount', () => {
    it('should accept undefined deposit amount', () => {
      // Arrange
      const depositAmount = undefined
      const totalAmount = 1000

      // Act
      const result = validateDepositAmount(depositAmount, totalAmount)

      // Assert
      expect(result).toEqual({
        type: 'ok',
        value: undefined,
      })
    })

    it('should accept valid deposit amounts', () => {
      // Arrange
      const testCases = [
        { deposit: 0, total: 1000 },
        { deposit: 500, total: 1000 },
        { deposit: 1000, total: 1000 },
        { deposit: 100.5, total: 200 },
      ]

      // Act & Assert
      for (const { deposit, total } of testCases) {
        const result = validateDepositAmount(deposit, total)
        expect(result).toEqual({
          type: 'ok',
          value: deposit,
        })
      }
    })

    it('should reject negative deposit amount', () => {
      // Arrange
      const depositAmount = -100
      const totalAmount = 1000

      // Act
      const result = validateDepositAmount(depositAmount, totalAmount)

      // Assert
      expect(result).toEqual({
        type: 'err',
        error: {
          type: 'invalidAmount',
          message: 'Deposit amount cannot be negative',
        },
      })
    })

    it('should reject deposit amount exceeding total amount', () => {
      // Arrange
      const testCases = [
        { deposit: 1001, total: 1000 },
        { deposit: 2000, total: 1000 },
        { deposit: 100.01, total: 100 },
      ]

      // Act & Assert
      for (const { deposit, total } of testCases) {
        const result = validateDepositAmount(deposit, total)
        expect(result).toEqual({
          type: 'err',
          error: {
            type: 'invalidAmount',
            message: 'Deposit amount cannot exceed total amount',
          },
        })
      }
    })

    it('should handle zero total amount edge case', () => {
      // Arrange
      const depositAmount = 0
      const totalAmount = 0

      // Act
      const result = validateDepositAmount(depositAmount, totalAmount)

      // Assert
      expect(result).toEqual({
        type: 'ok',
        value: 0,
      })
    })
  })
})

// テスト用ヘルパー関数
const createTestReservation = (type: ReservationStatus): Reservation => {
  const baseData = {
    id: createTestReservationId('550e8400-e29b-41d4-a716-446655440000'),
    salonId: createTestSalonId('660e8400-e29b-41d4-a716-446655440001'),
    customerId: createTestCustomerId('770e8400-e29b-41d4-a716-446655440002'),
    staffId: createTestStaffId('880e8400-e29b-41d4-a716-446655440003'),
    serviceId: createTestServiceId('990e8400-e29b-41d4-a716-446655440004'),
    startTime: addDays(new Date(), 1),
    endTime: addDays(new Date(), 1),
    totalAmount: 5000,
    isPaid: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  return match(type)
    .with('pending', () => ({
      type: 'pending' as const,
      data: baseData,
    }))
    .with('confirmed', () => ({
      type: 'confirmed' as const,
      data: baseData,
      confirmedAt: new Date(),
      confirmedBy: 'staff-001',
    }))
    .with('cancelled', () => ({
      type: 'cancelled' as const,
      data: baseData,
      cancelledAt: new Date(),
      cancelledBy: 'customer-001',
      cancellationReason: '都合が悪くなったため',
    }))
    .with('completed', () => ({
      type: 'completed' as const,
      data: baseData,
      completedAt: new Date(),
      completedBy: 'staff-001',
    }))
    .with('no_show', () => ({
      type: 'no_show' as const,
      data: baseData,
      markedNoShowAt: new Date(),
      markedNoShowBy: 'staff-001',
    }))
    .exhaustive()
}

describe('型ガード関数', () => {
  describe('isPendingReservation', () => {
    it('should return true for pending reservation', () => {
      // Arrange
      const reservation = createTestReservation('pending')

      // Act
      const result = isPendingReservation(reservation)

      // Assert
      expect(result).toBe(true)
      if (result) {
        expect(reservation.type).toBe('pending')
      }
    })

    it('should return false for non-pending reservations', () => {
      // Arrange
      const nonPendingTypes: ReservationStatus[] = [
        'confirmed',
        'cancelled',
        'completed',
        'no_show',
      ]

      // Act & Assert
      for (const type of nonPendingTypes) {
        const reservation = createTestReservation(type)
        expect(isPendingReservation(reservation)).toBe(false)
      }
    })
  })

  describe('isConfirmedReservation', () => {
    it('should return true for confirmed reservation', () => {
      // Arrange
      const reservation = createTestReservation('confirmed')

      // Act
      const result = isConfirmedReservation(reservation)

      // Assert
      expect(result).toBe(true)
      if (result) {
        expect(reservation.type).toBe('confirmed')
        expect(reservation.confirmedAt).toBeDefined()
        expect(reservation.confirmedBy).toBeDefined()
      }
    })

    it('should return false for non-confirmed reservations', () => {
      // Arrange
      const nonConfirmedTypes: ReservationStatus[] = [
        'pending',
        'cancelled',
        'completed',
        'no_show',
      ]

      // Act & Assert
      for (const type of nonConfirmedTypes) {
        const reservation = createTestReservation(type)
        expect(isConfirmedReservation(reservation)).toBe(false)
      }
    })
  })

  describe('isCancelledReservation', () => {
    it('should return true for cancelled reservation', () => {
      // Arrange
      const reservation = createTestReservation('cancelled')

      // Act
      const result = isCancelledReservation(reservation)

      // Assert
      expect(result).toBe(true)
      if (result) {
        expect(reservation.type).toBe('cancelled')
        expect(reservation.cancelledAt).toBeDefined()
        expect(reservation.cancelledBy).toBeDefined()
        expect(reservation.cancellationReason).toBeDefined()
      }
    })

    it('should return false for non-cancelled reservations', () => {
      // Arrange
      const nonCancelledTypes: ReservationStatus[] = [
        'pending',
        'confirmed',
        'completed',
        'no_show',
      ]

      // Act & Assert
      for (const type of nonCancelledTypes) {
        const reservation = createTestReservation(type)
        expect(isCancelledReservation(reservation)).toBe(false)
      }
    })
  })

  describe('isCompletedReservation', () => {
    it('should return true for completed reservation', () => {
      // Arrange
      const reservation = createTestReservation('completed')

      // Act
      const result = isCompletedReservation(reservation)

      // Assert
      expect(result).toBe(true)
      if (result) {
        expect(reservation.type).toBe('completed')
        expect(reservation.completedAt).toBeDefined()
        expect(reservation.completedBy).toBeDefined()
      }
    })

    it('should return false for non-completed reservations', () => {
      // Arrange
      const nonCompletedTypes: ReservationStatus[] = [
        'pending',
        'confirmed',
        'cancelled',
        'no_show',
      ]

      // Act & Assert
      for (const type of nonCompletedTypes) {
        const reservation = createTestReservation(type)
        expect(isCompletedReservation(reservation)).toBe(false)
      }
    })
  })

  describe('isNoShowReservation', () => {
    it('should return true for no-show reservation', () => {
      // Arrange
      const reservation = createTestReservation('no_show')

      // Act
      const result = isNoShowReservation(reservation)

      // Assert
      expect(result).toBe(true)
      if (result) {
        expect(reservation.type).toBe('no_show')
        expect(reservation.markedNoShowAt).toBeDefined()
        expect(reservation.markedNoShowBy).toBeDefined()
      }
    })

    it('should return false for non-no-show reservations', () => {
      // Arrange
      const nonNoShowTypes: ReservationStatus[] = [
        'pending',
        'confirmed',
        'cancelled',
        'completed',
      ]

      // Act & Assert
      for (const type of nonNoShowTypes) {
        const reservation = createTestReservation(type)
        expect(isNoShowReservation(reservation)).toBe(false)
      }
    })
  })
})

describe('ビジネスロジック関数', () => {
  describe('canBeCancelled', () => {
    it('should allow cancellation for pending reservation more than 1 hour before', () => {
      // Arrange
      const reservation: Reservation = {
        type: 'pending',
        data: {
          id: createTestReservationId('550e8400-e29b-41d4-a716-446655440000'),
          salonId: createTestSalonId('660e8400-e29b-41d4-a716-446655440001'),
          customerId: createTestCustomerId(
            '770e8400-e29b-41d4-a716-446655440002'
          ),
          staffId: createTestStaffId('880e8400-e29b-41d4-a716-446655440003'),
          serviceId: createTestServiceId(
            '990e8400-e29b-41d4-a716-446655440004'
          ),
          startTime: addHours(new Date(), 2),
          endTime: addHours(new Date(), 3),
          totalAmount: 5000,
          isPaid: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      }

      // Act
      const result = canBeCancelled(reservation)

      // Assert
      expect(result).toBe(true)
    })

    it('should allow cancellation for confirmed reservation more than 1 hour before', () => {
      // Arrange
      const reservation: Reservation = {
        type: 'confirmed',
        data: {
          id: createTestReservationId('550e8400-e29b-41d4-a716-446655440000'),
          salonId: createTestSalonId('660e8400-e29b-41d4-a716-446655440001'),
          customerId: createTestCustomerId(
            '770e8400-e29b-41d4-a716-446655440002'
          ),
          staffId: createTestStaffId('880e8400-e29b-41d4-a716-446655440003'),
          serviceId: createTestServiceId(
            '990e8400-e29b-41d4-a716-446655440004'
          ),
          startTime: addHours(new Date(), 2),
          endTime: addHours(new Date(), 3),
          totalAmount: 5000,
          isPaid: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        confirmedAt: new Date(),
        confirmedBy: 'staff-001',
      }

      // Act
      const result = canBeCancelled(reservation)

      // Assert
      expect(result).toBe(true)
    })

    it('should not allow cancellation less than 1 hour before', () => {
      // Arrange
      const reservation: Reservation = {
        type: 'pending',
        data: {
          id: createTestReservationId('550e8400-e29b-41d4-a716-446655440000'),
          salonId: createTestSalonId('660e8400-e29b-41d4-a716-446655440001'),
          customerId: createTestCustomerId(
            '770e8400-e29b-41d4-a716-446655440002'
          ),
          staffId: createTestStaffId('880e8400-e29b-41d4-a716-446655440003'),
          serviceId: createTestServiceId(
            '990e8400-e29b-41d4-a716-446655440004'
          ),
          startTime: addHours(new Date(), 0.5), // 30分後
          endTime: addHours(new Date(), 1.5),
          totalAmount: 5000,
          isPaid: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      }

      // Act
      const result = canBeCancelled(reservation)

      // Assert
      expect(result).toBe(false)
    })

    it('should not allow cancellation for cancelled reservation', () => {
      // Arrange
      const reservation: Reservation = {
        type: 'cancelled',
        data: {
          id: createTestReservationId('550e8400-e29b-41d4-a716-446655440000'),
          salonId: createTestSalonId('660e8400-e29b-41d4-a716-446655440001'),
          customerId: createTestCustomerId(
            '770e8400-e29b-41d4-a716-446655440002'
          ),
          staffId: createTestStaffId('880e8400-e29b-41d4-a716-446655440003'),
          serviceId: createTestServiceId(
            '990e8400-e29b-41d4-a716-446655440004'
          ),
          startTime: addHours(new Date(), 2),
          endTime: addHours(new Date(), 3),
          totalAmount: 5000,
          isPaid: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        cancelledAt: new Date(),
        cancelledBy: 'customer-001',
        cancellationReason: 'キャンセル済み',
      }

      // Act
      const result = canBeCancelled(reservation)

      // Assert
      expect(result).toBe(false)
    })

    it('should not allow cancellation for completed reservation', () => {
      // Arrange
      const reservation: Reservation = {
        type: 'completed',
        data: {
          id: createTestReservationId('550e8400-e29b-41d4-a716-446655440000'),
          salonId: createTestSalonId('660e8400-e29b-41d4-a716-446655440001'),
          customerId: createTestCustomerId(
            '770e8400-e29b-41d4-a716-446655440002'
          ),
          staffId: createTestStaffId('880e8400-e29b-41d4-a716-446655440003'),
          serviceId: createTestServiceId(
            '990e8400-e29b-41d4-a716-446655440004'
          ),
          startTime: subHours(new Date(), 2),
          endTime: subHours(new Date(), 1),
          totalAmount: 5000,
          isPaid: true,
          createdAt: subDays(new Date(), 1),
          updatedAt: new Date(),
        },
        completedAt: new Date(),
        completedBy: 'staff-001',
      }

      // Act
      const result = canBeCancelled(reservation)

      // Assert
      expect(result).toBe(false)
    })

    it('should not allow cancellation for no-show reservation', () => {
      // Arrange
      const reservation: Reservation = {
        type: 'no_show',
        data: {
          id: createTestReservationId('550e8400-e29b-41d4-a716-446655440000'),
          salonId: createTestSalonId('660e8400-e29b-41d4-a716-446655440001'),
          customerId: createTestCustomerId(
            '770e8400-e29b-41d4-a716-446655440002'
          ),
          staffId: createTestStaffId('880e8400-e29b-41d4-a716-446655440003'),
          serviceId: createTestServiceId(
            '990e8400-e29b-41d4-a716-446655440004'
          ),
          startTime: subHours(new Date(), 2),
          endTime: subHours(new Date(), 1),
          totalAmount: 5000,
          isPaid: false,
          createdAt: subDays(new Date(), 1),
          updatedAt: new Date(),
        },
        markedNoShowAt: new Date(),
        markedNoShowBy: 'staff-001',
      }

      // Act
      const result = canBeCancelled(reservation)

      // Assert
      expect(result).toBe(false)
    })

    it('should handle edge case exactly 1 hour before', () => {
      // Arrange
      const exactlyOneHourLater = new Date(Date.now() + 60 * 60 * 1000)
      const reservation: Reservation = {
        type: 'pending',
        data: {
          id: createTestReservationId('550e8400-e29b-41d4-a716-446655440000'),
          salonId: createTestSalonId('660e8400-e29b-41d4-a716-446655440001'),
          customerId: createTestCustomerId(
            '770e8400-e29b-41d4-a716-446655440002'
          ),
          staffId: createTestStaffId('880e8400-e29b-41d4-a716-446655440003'),
          serviceId: createTestServiceId(
            '990e8400-e29b-41d4-a716-446655440004'
          ),
          startTime: exactlyOneHourLater,
          endTime: addHours(exactlyOneHourLater, 1),
          totalAmount: 5000,
          isPaid: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      }

      // Act
      const result = canBeCancelled(reservation)

      // Assert
      expect(result).toBe(false) // 1時間前ちょうどはキャンセル不可
    })
  })

  describe('canBeModified', () => {
    it('should allow modification for pending reservation', () => {
      // Arrange
      const reservation: Reservation = {
        type: 'pending',
        data: {
          id: createTestReservationId('550e8400-e29b-41d4-a716-446655440000'),
          salonId: createTestSalonId('660e8400-e29b-41d4-a716-446655440001'),
          customerId: createTestCustomerId(
            '770e8400-e29b-41d4-a716-446655440002'
          ),
          staffId: createTestStaffId('880e8400-e29b-41d4-a716-446655440003'),
          serviceId: createTestServiceId(
            '990e8400-e29b-41d4-a716-446655440004'
          ),
          startTime: addDays(new Date(), 1),
          endTime: addDays(new Date(), 1),
          totalAmount: 5000,
          isPaid: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      }

      // Act
      const result = canBeModified(reservation)

      // Assert
      expect(result).toBe(true)
    })

    it('should allow modification for confirmed reservation', () => {
      // Arrange
      const reservation: Reservation = {
        type: 'confirmed',
        data: {
          id: createTestReservationId('550e8400-e29b-41d4-a716-446655440000'),
          salonId: createTestSalonId('660e8400-e29b-41d4-a716-446655440001'),
          customerId: createTestCustomerId(
            '770e8400-e29b-41d4-a716-446655440002'
          ),
          staffId: createTestStaffId('880e8400-e29b-41d4-a716-446655440003'),
          serviceId: createTestServiceId(
            '990e8400-e29b-41d4-a716-446655440004'
          ),
          startTime: addDays(new Date(), 1),
          endTime: addDays(new Date(), 1),
          totalAmount: 5000,
          isPaid: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        confirmedAt: new Date(),
        confirmedBy: 'staff-001',
      }

      // Act
      const result = canBeModified(reservation)

      // Assert
      expect(result).toBe(true)
    })

    it('should not allow modification for cancelled reservation', () => {
      // Arrange
      const reservation: Reservation = {
        type: 'cancelled',
        data: {
          id: createTestReservationId('550e8400-e29b-41d4-a716-446655440000'),
          salonId: createTestSalonId('660e8400-e29b-41d4-a716-446655440001'),
          customerId: createTestCustomerId(
            '770e8400-e29b-41d4-a716-446655440002'
          ),
          staffId: createTestStaffId('880e8400-e29b-41d4-a716-446655440003'),
          serviceId: createTestServiceId(
            '990e8400-e29b-41d4-a716-446655440004'
          ),
          startTime: addDays(new Date(), 1),
          endTime: addDays(new Date(), 1),
          totalAmount: 5000,
          isPaid: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        cancelledAt: new Date(),
        cancelledBy: 'customer-001',
        cancellationReason: 'キャンセル',
      }

      // Act
      const result = canBeModified(reservation)

      // Assert
      expect(result).toBe(false)
    })

    it('should not allow modification for completed reservation', () => {
      // Arrange
      const reservation: Reservation = {
        type: 'completed',
        data: {
          id: createTestReservationId('550e8400-e29b-41d4-a716-446655440000'),
          salonId: createTestSalonId('660e8400-e29b-41d4-a716-446655440001'),
          customerId: createTestCustomerId(
            '770e8400-e29b-41d4-a716-446655440002'
          ),
          staffId: createTestStaffId('880e8400-e29b-41d4-a716-446655440003'),
          serviceId: createTestServiceId(
            '990e8400-e29b-41d4-a716-446655440004'
          ),
          startTime: subHours(new Date(), 2),
          endTime: subHours(new Date(), 1),
          totalAmount: 5000,
          isPaid: true,
          createdAt: subDays(new Date(), 1),
          updatedAt: new Date(),
        },
        completedAt: new Date(),
        completedBy: 'staff-001',
      }

      // Act
      const result = canBeModified(reservation)

      // Assert
      expect(result).toBe(false)
    })

    it('should not allow modification for no-show reservation', () => {
      // Arrange
      const reservation: Reservation = {
        type: 'no_show',
        data: {
          id: createTestReservationId('550e8400-e29b-41d4-a716-446655440000'),
          salonId: createTestSalonId('660e8400-e29b-41d4-a716-446655440001'),
          customerId: createTestCustomerId(
            '770e8400-e29b-41d4-a716-446655440002'
          ),
          staffId: createTestStaffId('880e8400-e29b-41d4-a716-446655440003'),
          serviceId: createTestServiceId(
            '990e8400-e29b-41d4-a716-446655440004'
          ),
          startTime: subHours(new Date(), 2),
          endTime: subHours(new Date(), 1),
          totalAmount: 5000,
          isPaid: false,
          createdAt: subDays(new Date(), 1),
          updatedAt: new Date(),
        },
        markedNoShowAt: new Date(),
        markedNoShowBy: 'staff-001',
      }

      // Act
      const result = canBeModified(reservation)

      // Assert
      expect(result).toBe(false)
    })
  })

  describe('getReservationStatus', () => {
    it('should return correct status for each reservation type', () => {
      // Arrange
      const testCases: ReservationStatus[] = [
        'pending',
        'confirmed',
        'cancelled',
        'completed',
        'no_show',
      ]

      // Act & Assert
      for (const expectedStatus of testCases) {
        const reservation = createTestReservation(expectedStatus)
        const status = getReservationStatus(reservation)
        expect(status).toBe(expectedStatus)
      }
    })
  })

  describe('calculateRefundAmount', () => {
    it('should return 0 for non-cancelled reservation', () => {
      // Arrange
      const nonCancelledTypes: ReservationStatus[] = [
        'pending',
        'confirmed',
        'completed',
        'no_show',
      ]

      // Act & Assert
      for (const type of nonCancelledTypes) {
        const reservation = createTestReservation(type)
        const refund = calculateRefundAmount(reservation, new Date())
        expect(refund).toBe(0)
      }
    })

    it('should return full deposit amount for cancellation 24+ hours before', () => {
      // Arrange
      const startTime = addHours(new Date(), 48) // 48時間後
      const cancellationDate = new Date() // 今キャンセル
      const depositAmount = 3000

      const reservation: Reservation = {
        type: 'cancelled',
        data: {
          id: createTestReservationId('550e8400-e29b-41d4-a716-446655440000'),
          salonId: createTestSalonId('660e8400-e29b-41d4-a716-446655440001'),
          customerId: createTestCustomerId(
            '770e8400-e29b-41d4-a716-446655440002'
          ),
          staffId: createTestStaffId('880e8400-e29b-41d4-a716-446655440003'),
          serviceId: createTestServiceId(
            '990e8400-e29b-41d4-a716-446655440004'
          ),
          startTime,
          endTime: addHours(startTime, 2),
          totalAmount: 10000,
          depositAmount,
          isPaid: false,
          createdAt: subDays(new Date(), 1),
          updatedAt: new Date(),
        },
        cancelledAt: cancellationDate,
        cancelledBy: 'customer-001',
        cancellationReason: '都合により',
      }

      // Act
      const refund = calculateRefundAmount(reservation, cancellationDate)

      // Assert
      expect(refund).toBe(depositAmount)
    })

    it('should return 50% deposit amount for cancellation 12-24 hours before', () => {
      // Arrange
      const startTime = addHours(new Date(), 18) // 18時間後
      const cancellationDate = new Date() // 今キャンセル
      const depositAmount = 3000

      const reservation: Reservation = {
        type: 'cancelled',
        data: {
          id: createTestReservationId('550e8400-e29b-41d4-a716-446655440000'),
          salonId: createTestSalonId('660e8400-e29b-41d4-a716-446655440001'),
          customerId: createTestCustomerId(
            '770e8400-e29b-41d4-a716-446655440002'
          ),
          staffId: createTestStaffId('880e8400-e29b-41d4-a716-446655440003'),
          serviceId: createTestServiceId(
            '990e8400-e29b-41d4-a716-446655440004'
          ),
          startTime,
          endTime: addHours(startTime, 2),
          totalAmount: 10000,
          depositAmount,
          isPaid: false,
          createdAt: subDays(new Date(), 1),
          updatedAt: new Date(),
        },
        cancelledAt: cancellationDate,
        cancelledBy: 'customer-001',
        cancellationReason: '都合により',
      }

      // Act
      const refund = calculateRefundAmount(reservation, cancellationDate)

      // Assert
      expect(refund).toBe(1500) // 3000 * 0.5
    })

    it('should return 0 for cancellation less than 12 hours before', () => {
      // Arrange
      const startTime = addHours(new Date(), 6) // 6時間後
      const cancellationDate = new Date() // 今キャンセル
      const depositAmount = 3000

      const reservation: Reservation = {
        type: 'cancelled',
        data: {
          id: createTestReservationId('550e8400-e29b-41d4-a716-446655440000'),
          salonId: createTestSalonId('660e8400-e29b-41d4-a716-446655440001'),
          customerId: createTestCustomerId(
            '770e8400-e29b-41d4-a716-446655440002'
          ),
          staffId: createTestStaffId('880e8400-e29b-41d4-a716-446655440003'),
          serviceId: createTestServiceId(
            '990e8400-e29b-41d4-a716-446655440004'
          ),
          startTime,
          endTime: addHours(startTime, 2),
          totalAmount: 10000,
          depositAmount,
          isPaid: false,
          createdAt: subDays(new Date(), 1),
          updatedAt: new Date(),
        },
        cancelledAt: cancellationDate,
        cancelledBy: 'customer-001',
        cancellationReason: '都合により',
      }

      // Act
      const refund = calculateRefundAmount(reservation, cancellationDate)

      // Assert
      expect(refund).toBe(0)
    })

    it('should handle undefined deposit amount', () => {
      // Arrange
      const startTime = addHours(new Date(), 48)
      const cancellationDate = new Date()

      const reservation: Reservation = {
        type: 'cancelled',
        data: {
          id: createTestReservationId('550e8400-e29b-41d4-a716-446655440000'),
          salonId: createTestSalonId('660e8400-e29b-41d4-a716-446655440001'),
          customerId: createTestCustomerId(
            '770e8400-e29b-41d4-a716-446655440002'
          ),
          staffId: createTestStaffId('880e8400-e29b-41d4-a716-446655440003'),
          serviceId: createTestServiceId(
            '990e8400-e29b-41d4-a716-446655440004'
          ),
          startTime,
          endTime: addHours(startTime, 2),
          totalAmount: 10000,
          depositAmount: undefined,
          isPaid: false,
          createdAt: subDays(new Date(), 1),
          updatedAt: new Date(),
        },
        cancelledAt: cancellationDate,
        cancelledBy: 'customer-001',
        cancellationReason: '都合により',
      }

      // Act
      const refund = calculateRefundAmount(reservation, cancellationDate)

      // Assert
      expect(refund).toBe(0)
    })

    it('should handle edge cases around time boundaries', () => {
      // Arrange - 正確に24時間前
      const startTime = new Date(Date.now() + 24 * 60 * 60 * 1000)
      const cancellationDate = new Date()
      const depositAmount = 1000

      const reservation: Reservation = {
        type: 'cancelled',
        data: {
          id: createTestReservationId('550e8400-e29b-41d4-a716-446655440000'),
          salonId: createTestSalonId('660e8400-e29b-41d4-a716-446655440001'),
          customerId: createTestCustomerId(
            '770e8400-e29b-41d4-a716-446655440002'
          ),
          staffId: createTestStaffId('880e8400-e29b-41d4-a716-446655440003'),
          serviceId: createTestServiceId(
            '990e8400-e29b-41d4-a716-446655440004'
          ),
          startTime,
          endTime: addHours(startTime, 2),
          totalAmount: 5000,
          depositAmount,
          isPaid: false,
          createdAt: subDays(new Date(), 1),
          updatedAt: new Date(),
        },
        cancelledAt: cancellationDate,
        cancelledBy: 'customer-001',
        cancellationReason: '都合により',
      }

      // Act
      const refund = calculateRefundAmount(reservation, cancellationDate)

      // Assert
      expect(refund).toBe(depositAmount) // 24時間ちょうどは全額返金
    })

    it('should handle odd deposit amounts correctly', () => {
      // Arrange
      const startTime = addHours(new Date(), 18)
      const cancellationDate = new Date()
      const depositAmount = 3333 // 奇数額

      const reservation: Reservation = {
        type: 'cancelled',
        data: {
          id: createTestReservationId('550e8400-e29b-41d4-a716-446655440000'),
          salonId: createTestSalonId('660e8400-e29b-41d4-a716-446655440001'),
          customerId: createTestCustomerId(
            '770e8400-e29b-41d4-a716-446655440002'
          ),
          staffId: createTestStaffId('880e8400-e29b-41d4-a716-446655440003'),
          serviceId: createTestServiceId(
            '990e8400-e29b-41d4-a716-446655440004'
          ),
          startTime,
          endTime: addHours(startTime, 2),
          totalAmount: 10000,
          depositAmount,
          isPaid: false,
          createdAt: subDays(new Date(), 1),
          updatedAt: new Date(),
        },
        cancelledAt: cancellationDate,
        cancelledBy: 'customer-001',
        cancellationReason: '都合により',
      }

      // Act
      const refund = calculateRefundAmount(reservation, cancellationDate)

      // Assert
      expect(refund).toBe(1666) // Math.floor(3333 * 0.5)
    })
  })
})

describe('Sum型のパターンマッチング網羅性', () => {
  it('should handle all reservation statuses with pattern matching', () => {
    // Arrange
    const reservations: Reservation[] = [
      {
        type: 'pending',
        data: {
          id: createTestReservationId('550e8400-e29b-41d4-a716-446655440001'),
          salonId: createTestSalonId('660e8400-e29b-41d4-a716-446655440001'),
          customerId: createTestCustomerId(
            '770e8400-e29b-41d4-a716-446655440001'
          ),
          staffId: createTestStaffId('880e8400-e29b-41d4-a716-446655440001'),
          serviceId: createTestServiceId(
            '990e8400-e29b-41d4-a716-446655440001'
          ),
          startTime: addDays(new Date(), 1),
          endTime: addDays(new Date(), 1),
          totalAmount: 5000,
          isPaid: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
      {
        type: 'confirmed',
        data: {
          id: createTestReservationId('550e8400-e29b-41d4-a716-446655440002'),
          salonId: createTestSalonId('660e8400-e29b-41d4-a716-446655440002'),
          customerId: createTestCustomerId(
            '770e8400-e29b-41d4-a716-446655440002'
          ),
          staffId: createTestStaffId('880e8400-e29b-41d4-a716-446655440002'),
          serviceId: createTestServiceId(
            '990e8400-e29b-41d4-a716-446655440002'
          ),
          startTime: addDays(new Date(), 2),
          endTime: addDays(new Date(), 2),
          totalAmount: 7000,
          isPaid: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        confirmedAt: new Date(),
        confirmedBy: 'staff-001',
      },
      {
        type: 'cancelled',
        data: {
          id: createTestReservationId('550e8400-e29b-41d4-a716-446655440003'),
          salonId: createTestSalonId('660e8400-e29b-41d4-a716-446655440003'),
          customerId: createTestCustomerId(
            '770e8400-e29b-41d4-a716-446655440003'
          ),
          staffId: createTestStaffId('880e8400-e29b-41d4-a716-446655440003'),
          serviceId: createTestServiceId(
            '990e8400-e29b-41d4-a716-446655440003'
          ),
          startTime: addDays(new Date(), 3),
          endTime: addDays(new Date(), 3),
          totalAmount: 10000,
          isPaid: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        cancelledAt: new Date(),
        cancelledBy: 'customer-001',
        cancellationReason: '都合が悪くなったため',
      },
      {
        type: 'completed',
        data: {
          id: createTestReservationId('550e8400-e29b-41d4-a716-446655440004'),
          salonId: createTestSalonId('660e8400-e29b-41d4-a716-446655440004'),
          customerId: createTestCustomerId(
            '770e8400-e29b-41d4-a716-446655440004'
          ),
          staffId: createTestStaffId('880e8400-e29b-41d4-a716-446655440004'),
          serviceId: createTestServiceId(
            '990e8400-e29b-41d4-a716-446655440004'
          ),
          startTime: subDays(new Date(), 1),
          endTime: subDays(new Date(), 1),
          totalAmount: 8000,
          isPaid: true,
          createdAt: subDays(new Date(), 2),
          updatedAt: new Date(),
        },
        completedAt: new Date(),
        completedBy: 'staff-001',
      },
      {
        type: 'no_show',
        data: {
          id: createTestReservationId('550e8400-e29b-41d4-a716-446655440005'),
          salonId: createTestSalonId('660e8400-e29b-41d4-a716-446655440005'),
          customerId: createTestCustomerId(
            '770e8400-e29b-41d4-a716-446655440005'
          ),
          staffId: createTestStaffId('880e8400-e29b-41d4-a716-446655440005'),
          serviceId: createTestServiceId(
            '990e8400-e29b-41d4-a716-446655440005'
          ),
          startTime: subDays(new Date(), 1),
          endTime: subDays(new Date(), 1),
          totalAmount: 6000,
          isPaid: false,
          createdAt: subDays(new Date(), 2),
          updatedAt: new Date(),
        },
        markedNoShowAt: new Date(),
        markedNoShowBy: 'staff-001',
      },
    ]

    // Act & Assert
    for (const reservation of reservations) {
      const statusText = match(reservation)
        .with({ type: 'pending' }, () => '予約確定待ち')
        .with({ type: 'confirmed' }, () => '予約確定済み')
        .with({ type: 'cancelled' }, () => 'キャンセル済み')
        .with({ type: 'completed' }, () => 'サービス完了')
        .with({ type: 'no_show' }, () => '無断キャンセル')
        .exhaustive()

      expect(statusText).toBeDefined()
      expect([
        '予約確定待ち',
        '予約確定済み',
        'キャンセル済み',
        'サービス完了',
        '無断キャンセル',
      ]).toContain(statusText)
    }
  })

  it('should handle all error types with pattern matching', () => {
    // Arrange
    const errors: ReservationError[] = [
      { type: 'invalidTimeRange', message: '時間範囲が無効です' },
      { type: 'slotNotAvailable', message: 'その時間帯は予約できません' },
      { type: 'invalidAmount', message: '金額が無効です' },
      { type: 'pastTimeNotAllowed', message: '過去の時間には予約できません' },
      { type: 'cannotCancel', message: 'キャンセルできません' },
    ]

    // Act & Assert
    for (const error of errors) {
      const errorCode = match(error)
        .with({ type: 'invalidTimeRange' }, () => 'TIME_RANGE_ERROR')
        .with({ type: 'slotNotAvailable' }, () => 'SLOT_UNAVAILABLE')
        .with({ type: 'invalidAmount' }, () => 'AMOUNT_ERROR')
        .with({ type: 'pastTimeNotAllowed' }, () => 'PAST_TIME_ERROR')
        .with({ type: 'cannotCancel' }, () => 'CANCEL_ERROR')
        .exhaustive()

      expect(errorCode).toBeDefined()
      expect([
        'TIME_RANGE_ERROR',
        'SLOT_UNAVAILABLE',
        'AMOUNT_ERROR',
        'PAST_TIME_ERROR',
        'CANCEL_ERROR',
      ]).toContain(errorCode)
    }
  })

  it('should handle reservation status transitions with pattern matching', () => {
    // Arrange
    const statusTransitions: Array<{
      from: ReservationStatus
      to: ReservationStatus
      valid: boolean
    }> = [
      { from: 'pending', to: 'confirmed', valid: true },
      { from: 'pending', to: 'cancelled', valid: true },
      { from: 'confirmed', to: 'cancelled', valid: true },
      { from: 'confirmed', to: 'completed', valid: true },
      { from: 'confirmed', to: 'no_show', valid: true },
      { from: 'cancelled', to: 'confirmed', valid: false },
      { from: 'completed', to: 'cancelled', valid: false },
      { from: 'no_show', to: 'completed', valid: false },
    ]

    // Act & Assert
    for (const { from, to, valid } of statusTransitions) {
      const isValidTransition = match([from, to])
        .with(['pending', 'confirmed'], () => true)
        .with(['pending', 'cancelled'], () => true)
        .with(['confirmed', 'cancelled'], () => true)
        .with(['confirmed', 'completed'], () => true)
        .with(['confirmed', 'no_show'], () => true)
        .otherwise(() => false)

      expect(isValidTransition).toBe(valid)
    }
  })
})

describe('実データによる動的な検証', () => {
  it('should handle various time ranges dynamically', () => {
    // Arrange
    const now = new Date()
    const timeRanges = [
      { hours: 1, expectedValid: true },
      { hours: 24, expectedValid: true },
      { hours: 24 * 30, expectedValid: true },
      { hours: 24 * 90, expectedValid: true },
      { hours: 24 * 95, expectedValid: false }, // 3ヶ月以上
    ]

    // Act & Assert
    for (const { hours, expectedValid } of timeRanges) {
      const startTime = addHours(now, hours)
      const endTime = addHours(startTime, 2)
      const result = validateTimeRange(startTime, endTime)

      if (expectedValid) {
        expect(result.type).toBe('ok')
      } else {
        expect(result.type).toBe('err')
      }
    }
  })

  it('should calculate refunds based on dynamic cancellation times', () => {
    // Arrange
    const startTime = addHours(new Date(), 48)
    const depositAmount = 5000
    const cancellationScenarios = [
      { hoursBeforeStart: 48, expectedRefund: 5000 },
      { hoursBeforeStart: 36, expectedRefund: 5000 },
      { hoursBeforeStart: 24, expectedRefund: 5000 },
      { hoursBeforeStart: 18, expectedRefund: 2500 },
      { hoursBeforeStart: 12, expectedRefund: 2500 },
      { hoursBeforeStart: 6, expectedRefund: 0 },
      { hoursBeforeStart: 1, expectedRefund: 0 },
    ]

    // Act & Assert
    for (const { hoursBeforeStart, expectedRefund } of cancellationScenarios) {
      const cancellationDate = subHours(startTime, hoursBeforeStart)
      const reservation: Reservation = {
        type: 'cancelled',
        data: {
          id: createTestReservationId('550e8400-e29b-41d4-a716-446655440000'),
          salonId: createTestSalonId('660e8400-e29b-41d4-a716-446655440001'),
          customerId: createTestCustomerId(
            '770e8400-e29b-41d4-a716-446655440002'
          ),
          staffId: createTestStaffId('880e8400-e29b-41d4-a716-446655440003'),
          serviceId: createTestServiceId(
            '990e8400-e29b-41d4-a716-446655440004'
          ),
          startTime,
          endTime: addHours(startTime, 2),
          totalAmount: 10000,
          depositAmount,
          isPaid: false,
          createdAt: subDays(new Date(), 2),
          updatedAt: new Date(),
        },
        cancelledAt: cancellationDate,
        cancelledBy: 'customer-001',
        cancellationReason: 'テスト',
      }

      const refund = calculateRefundAmount(reservation, cancellationDate)
      expect(refund).toBe(expectedRefund)
    }
  })

  it('should validate various amounts dynamically', () => {
    // Arrange
    const amounts = Array.from(
      { length: 10 },
      () => Math.floor(Math.random() * 15000000) - 5000000
    )

    // Act & Assert
    for (const amount of amounts) {
      const result = validateAmount(amount)

      if (amount < 0) {
        expect(result.type).toBe('err')
        if (result.type === 'err') {
          expect(result.error.message).toBe('Amount cannot be negative')
        }
      } else if (amount > 10000000) {
        expect(result.type).toBe('err')
        if (result.type === 'err') {
          expect(result.error.message).toBe('Amount is too high')
        }
      } else {
        expect(result.type).toBe('ok')
        if (result.type === 'ok') {
          expect(result.value).toBe(amount)
        }
      }
    }
  })
})
