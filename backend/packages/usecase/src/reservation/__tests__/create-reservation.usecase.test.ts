/**
 * Create Reservation Use Case Test
 * CLAUDE.mdのテスト要件に徹底準拠
 * AAA（Arrange-Act-Assert）パターンによる包括的なテスト
 */

import type { ReservationRepository } from '@beauty-salon-backend/domain'
import { err, ok } from '@beauty-salon-backend/domain'
import {
  ReservationBuilder,
  createTestCustomerId,
  createTestReservation,
  createTestSalonId,
  createTestServiceId,
  createTestStaffId,
} from '@beauty-salon-backend/test-utils'
import { v4 as uuidv4 } from 'uuid'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  type CreateReservationDeps,
  type CreateReservationUseCaseInput,
  createReservationUseCase,
} from '../create-reservation.usecase.js'

describe('createReservationUseCase', () => {
  let mockRepository: ReservationRepository
  let deps: CreateReservationDeps

  beforeEach(() => {
    // Setup mock repository
    mockRepository = {
      findById: vi.fn(),
      findDetailById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      confirm: vi.fn(),
      cancel: vi.fn(),
      complete: vi.fn(),
      markAsNoShow: vi.fn(),
      updatePaymentStatus: vi.fn(),
      search: vi.fn(),
      findByStaffAndDateRange: vi.fn(),
      findByCustomer: vi.fn(),
      findAvailableSlots: vi.fn(),
      checkTimeSlotConflict: vi.fn().mockResolvedValue(ok(false)),
      countByDate: vi.fn(),
    }
    deps = { reservationRepository: mockRepository }
  })

  describe('正常系', () => {
    it('should create reservation with valid data', async () => {
      // Arrange
      const input: CreateReservationUseCaseInput = {
        salonId: createTestSalonId(uuidv4()),
        customerId: createTestCustomerId(uuidv4()),
        staffId: createTestStaffId(uuidv4()),
        serviceId: createTestServiceId(uuidv4()),
        startTime: new Date('2024-12-25T10:00:00Z'),
        endTime: new Date('2024-12-25T11:00:00Z'),
        notes: 'First visit',
        totalAmount: 5000,
        depositAmount: 1000,
        createdBy: 'customer',
      }

      const createdReservation = new ReservationBuilder()
        .withSalonId(input.salonId)
        .withCustomerId(input.customerId)
        .withStaffId(input.staffId)
        .withServiceId(input.serviceId)
        .withStartTime(input.startTime)
        .withEndTime(input.endTime)
        .withNotes(input.notes)
        .withTotalAmount(input.totalAmount)
        .withDepositAmount(input.depositAmount || 0)
        .asConfirmed()
        .build()

      vi.mocked(mockRepository.create).mockResolvedValueOnce(
        ok(createdReservation)
      )

      // Act
      const result = await createReservationUseCase(input, deps)

      // Assert
      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        expect(result.value.data.customerId).toBe(input.customerId)
        expect(result.value.data.totalAmount).toBe(input.totalAmount)
        expect(result.value.type).toBe('confirmed')
      }
      expect(mockRepository.checkTimeSlotConflict).toHaveBeenCalledWith(
        input.staffId,
        input.startTime,
        input.endTime
      )
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: expect.any(String),
          data: expect.objectContaining({
            customerId: input.customerId,
            salonId: input.salonId,
            staffId: input.staffId,
            serviceId: input.serviceId,
          }),
        })
      )
    })

    it('should create reservation without optional fields', async () => {
      // Arrange
      const input: CreateReservationUseCaseInput = {
        salonId: createTestSalonId(uuidv4()),
        customerId: createTestCustomerId(uuidv4()),
        staffId: createTestStaffId(uuidv4()),
        serviceId: createTestServiceId(uuidv4()),
        startTime: new Date('2024-12-25T14:00:00Z'),
        endTime: new Date('2024-12-25T15:00:00Z'),
        totalAmount: 3000,
        // No notes, depositAmount, or createdBy
      }

      const createdReservation = createTestReservation()
      vi.mocked(mockRepository.create).mockResolvedValueOnce(
        ok(createdReservation)
      )

      // Act
      const result = await createReservationUseCase(input, deps)

      // Assert
      expect(result.type).toBe('ok')
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            notes: null,
            depositAmount: 0,
          }),
        })
      )
    })

    it('should create reservation with exact same start and end time for instant service', async () => {
      // Arrange
      const sameTime = new Date('2024-12-25T10:00:00Z')
      const input: CreateReservationUseCaseInput = {
        salonId: createTestSalonId(uuidv4()),
        customerId: createTestCustomerId(uuidv4()),
        staffId: createTestStaffId(uuidv4()),
        serviceId: createTestServiceId(uuidv4()),
        startTime: sameTime,
        endTime: sameTime,
        totalAmount: 1000,
      }

      const createdReservation = createTestReservation()
      vi.mocked(mockRepository.create).mockResolvedValueOnce(
        ok(createdReservation)
      )

      // Act
      const result = await createReservationUseCase(input, deps)

      // Assert
      expect(result.type).toBe('ok')
    })

    it('should create reservation with full deposit amount', async () => {
      // Arrange
      const input: CreateReservationUseCaseInput = {
        salonId: createTestSalonId(uuidv4()),
        customerId: createTestCustomerId(uuidv4()),
        staffId: createTestStaffId(uuidv4()),
        serviceId: createTestServiceId(uuidv4()),
        startTime: new Date('2024-12-25T10:00:00Z'),
        endTime: new Date('2024-12-25T11:00:00Z'),
        totalAmount: 5000,
        depositAmount: 5000, // Full payment as deposit
      }

      const createdReservation = createTestReservation()
      vi.mocked(mockRepository.create).mockResolvedValueOnce(
        ok(createdReservation)
      )

      // Act
      const result = await createReservationUseCase(input, deps)

      // Assert
      expect(result.type).toBe('ok')
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            depositAmount: 5000,
          }),
        })
      )
    })

    it('should handle future dates correctly', async () => {
      // Arrange
      const futureDate = new Date()
      futureDate.setFullYear(futureDate.getFullYear() + 1)
      const endDate = new Date(futureDate)
      endDate.setHours(endDate.getHours() + 1)

      const input: CreateReservationUseCaseInput = {
        salonId: createTestSalonId(uuidv4()),
        customerId: createTestCustomerId(uuidv4()),
        staffId: createTestStaffId(uuidv4()),
        serviceId: createTestServiceId(uuidv4()),
        startTime: futureDate,
        endTime: endDate,
        totalAmount: 10000,
      }

      const createdReservation = createTestReservation()
      vi.mocked(mockRepository.create).mockResolvedValueOnce(
        ok(createdReservation)
      )

      // Act
      const result = await createReservationUseCase(input, deps)

      // Assert
      expect(result.type).toBe('ok')
    })
  })

  describe('異常系 - バリデーションエラー', () => {
    it('should fail when end time is before start time', async () => {
      // Arrange
      const input: CreateReservationUseCaseInput = {
        salonId: createTestSalonId(uuidv4()),
        customerId: createTestCustomerId(uuidv4()),
        staffId: createTestStaffId(uuidv4()),
        serviceId: createTestServiceId(uuidv4()),
        startTime: new Date('2024-12-25T11:00:00Z'),
        endTime: new Date('2024-12-25T10:00:00Z'), // Before start time
        totalAmount: 5000,
      }

      // Act
      const result = await createReservationUseCase(input, deps)

      // Assert
      expect(result.type).toBe('err')
      if (result.type === 'err') {
        expect(result.error.type).toBe('invalidTimeRange')
        if (result.error.type === 'invalidTimeRange') {
          expect(result.error.message).toContain(
            'End time must be after or equal to start time'
          )
        }
      }
      expect(mockRepository.create).not.toHaveBeenCalled()
    })

    it('should fail when reservation time is in the past', async () => {
      // Arrange
      const pastDate = new Date('2020-01-01T10:00:00Z')
      const input: CreateReservationUseCaseInput = {
        salonId: createTestSalonId(uuidv4()),
        customerId: createTestCustomerId(uuidv4()),
        staffId: createTestStaffId(uuidv4()),
        serviceId: createTestServiceId(uuidv4()),
        startTime: pastDate,
        endTime: new Date('2020-01-01T11:00:00Z'),
        totalAmount: 5000,
      }

      // Act
      const result = await createReservationUseCase(input, deps)

      // Assert
      expect(result.type).toBe('err')
      if (result.type === 'err') {
        expect(result.error.type).toBe('pastTimeNotAllowed')
        if (result.error.type === 'pastTimeNotAllowed') {
          expect(result.error.message).toContain(
            'Cannot create reservation in the past'
          )
        }
      }
    })

    it('should fail when total amount is negative', async () => {
      // Arrange
      const input: CreateReservationUseCaseInput = {
        salonId: createTestSalonId(uuidv4()),
        customerId: createTestCustomerId(uuidv4()),
        staffId: createTestStaffId(uuidv4()),
        serviceId: createTestServiceId(uuidv4()),
        startTime: new Date('2024-12-25T10:00:00Z'),
        endTime: new Date('2024-12-25T11:00:00Z'),
        totalAmount: -1000, // Negative amount
      }

      // Act
      const result = await createReservationUseCase(input, deps)

      // Assert
      expect(result.type).toBe('err')
      if (result.type === 'err') {
        expect(result.error.type).toBe('invalidAmount')
        if (result.error.type === 'invalidAmount') {
          expect(result.error.message).toContain('Amount must be non-negative')
        }
      }
    })

    it('should fail when deposit amount exceeds total amount', async () => {
      // Arrange
      const input: CreateReservationUseCaseInput = {
        salonId: createTestSalonId(uuidv4()),
        customerId: createTestCustomerId(uuidv4()),
        staffId: createTestStaffId(uuidv4()),
        serviceId: createTestServiceId(uuidv4()),
        startTime: new Date('2024-12-25T10:00:00Z'),
        endTime: new Date('2024-12-25T11:00:00Z'),
        totalAmount: 5000,
        depositAmount: 6000, // Exceeds total
      }

      // Act
      const result = await createReservationUseCase(input, deps)

      // Assert
      expect(result.type).toBe('err')
      if (result.type === 'err') {
        expect(result.error.type).toBe('invalidAmount')
        if (result.error.type === 'invalidAmount') {
          expect(result.error.message).toContain(
            'Deposit amount cannot exceed total amount'
          )
        }
      }
    })

    it('should fail when deposit amount is negative', async () => {
      // Arrange
      const input: CreateReservationUseCaseInput = {
        salonId: createTestSalonId(uuidv4()),
        customerId: createTestCustomerId(uuidv4()),
        staffId: createTestStaffId(uuidv4()),
        serviceId: createTestServiceId(uuidv4()),
        startTime: new Date('2024-12-25T10:00:00Z'),
        endTime: new Date('2024-12-25T11:00:00Z'),
        totalAmount: 5000,
        depositAmount: -1000, // Negative deposit
      }

      // Act
      const result = await createReservationUseCase(input, deps)

      // Assert
      expect(result.type).toBe('err')
      if (result.type === 'err') {
        expect(result.error.type).toBe('invalidAmount')
        if (result.error.type === 'invalidAmount') {
          expect(result.error.message).toContain('Amount must be non-negative')
        }
      }
    })
  })

  describe('異常系 - スロット競合', () => {
    it('should fail when time slot has conflict', async () => {
      // Arrange
      const input: CreateReservationUseCaseInput = {
        salonId: createTestSalonId(uuidv4()),
        customerId: createTestCustomerId(uuidv4()),
        staffId: createTestStaffId(uuidv4()),
        serviceId: createTestServiceId(uuidv4()),
        startTime: new Date('2024-12-25T10:00:00Z'),
        endTime: new Date('2024-12-25T11:00:00Z'),
        totalAmount: 5000,
      }

      vi.mocked(mockRepository.checkTimeSlotConflict).mockResolvedValueOnce(
        ok(true) // Conflict exists
      )

      // Act
      const result = await createReservationUseCase(input, deps)

      // Assert
      expect(result.type).toBe('err')
      if (result.type === 'err') {
        expect(result.error.type).toBe('slotConflict')
        if (result.error.type === 'slotConflict') {
          expect(result.error.message).toContain(
            'The selected time slot is not available'
          )
        }
      }
      expect(mockRepository.create).not.toHaveBeenCalled()
    })

    it('should handle concurrent reservation attempts', async () => {
      // Arrange
      const input: CreateReservationUseCaseInput = {
        salonId: createTestSalonId(uuidv4()),
        customerId: createTestCustomerId(uuidv4()),
        staffId: createTestStaffId(uuidv4()),
        serviceId: createTestServiceId(uuidv4()),
        startTime: new Date('2024-12-25T10:00:00Z'),
        endTime: new Date('2024-12-25T11:00:00Z'),
        totalAmount: 5000,
      }

      // First call returns no conflict
      vi.mocked(mockRepository.checkTimeSlotConflict).mockResolvedValueOnce(
        ok(false)
      )
      // But create fails due to concurrent creation
      vi.mocked(mockRepository.create).mockResolvedValueOnce(
        err({
          type: 'constraintViolation',
          constraint: 'time_slot_unique',
          message: 'Unique constraint violation',
        })
      )

      // Act
      const result = await createReservationUseCase(input, deps)

      // Assert
      expect(result.type).toBe('err')
      if (result.type === 'err') {
        expect(result.error.type).toBe('constraintViolation')
      }
    })
  })

  describe('異常系 - リポジトリエラー', () => {
    it('should fail when conflict check fails', async () => {
      // Arrange
      const input: CreateReservationUseCaseInput = {
        salonId: createTestSalonId(uuidv4()),
        customerId: createTestCustomerId(uuidv4()),
        staffId: createTestStaffId(uuidv4()),
        serviceId: createTestServiceId(uuidv4()),
        startTime: new Date('2024-12-25T10:00:00Z'),
        endTime: new Date('2024-12-25T11:00:00Z'),
        totalAmount: 5000,
      }

      vi.mocked(mockRepository.checkTimeSlotConflict).mockResolvedValueOnce(
        err({ type: 'databaseError', message: 'Connection failed' })
      )

      // Act
      const result = await createReservationUseCase(input, deps)

      // Assert
      expect(result.type).toBe('err')
      if (result.type === 'err') {
        expect(result.error.type).toBe('databaseError')
        if (result.error.type === 'databaseError') {
          expect(result.error.message).toBe('Connection failed')
        }
      }
    })

    it('should fail when save operation fails', async () => {
      // Arrange
      const input: CreateReservationUseCaseInput = {
        salonId: createTestSalonId(uuidv4()),
        customerId: createTestCustomerId(uuidv4()),
        staffId: createTestStaffId(uuidv4()),
        serviceId: createTestServiceId(uuidv4()),
        startTime: new Date('2024-12-25T10:00:00Z'),
        endTime: new Date('2024-12-25T11:00:00Z'),
        totalAmount: 5000,
      }

      vi.mocked(mockRepository.create).mockResolvedValueOnce(
        err({ type: 'databaseError', message: 'Save failed' })
      )

      // Act
      const result = await createReservationUseCase(input, deps)

      // Assert
      expect(result.type).toBe('err')
      if (result.type === 'err') {
        expect(result.error.type).toBe('databaseError')
        if (result.error.type === 'databaseError') {
          expect(result.error.message).toBe('Save failed')
        }
      }
    })

    it('should handle network timeout during save', async () => {
      // Arrange
      const input: CreateReservationUseCaseInput = {
        salonId: createTestSalonId(uuidv4()),
        customerId: createTestCustomerId(uuidv4()),
        staffId: createTestStaffId(uuidv4()),
        serviceId: createTestServiceId(uuidv4()),
        startTime: new Date('2024-12-25T10:00:00Z'),
        endTime: new Date('2024-12-25T11:00:00Z'),
        totalAmount: 5000,
      }

      vi.mocked(mockRepository.create).mockResolvedValueOnce(
        err({ type: 'databaseError', message: 'Query timeout' })
      )

      // Act
      const result = await createReservationUseCase(input, deps)

      // Assert
      expect(result.type).toBe('err')
      if (result.type === 'err') {
        expect(result.error.type).toBe('databaseError')
        if (result.error.type === 'databaseError') {
          expect(result.error.message).toContain('timeout')
        }
      }
    })
  })

  describe('エッジケース', () => {
    it('should handle maximum allowed amount', async () => {
      // Arrange
      const input: CreateReservationUseCaseInput = {
        salonId: createTestSalonId(uuidv4()),
        customerId: createTestCustomerId(uuidv4()),
        staffId: createTestStaffId(uuidv4()),
        serviceId: createTestServiceId(uuidv4()),
        startTime: new Date('2024-12-25T10:00:00Z'),
        endTime: new Date('2024-12-25T11:00:00Z'),
        totalAmount: Number.MAX_SAFE_INTEGER,
      }

      const createdReservation = createTestReservation()
      vi.mocked(mockRepository.create).mockResolvedValueOnce(
        ok(createdReservation)
      )

      // Act
      const result = await createReservationUseCase(input, deps)

      // Assert
      expect(result.type).toBe('ok')
    })

    it('should handle very long notes', async () => {
      // Arrange
      const longNotes = 'A'.repeat(1000)
      const input: CreateReservationUseCaseInput = {
        salonId: createTestSalonId(uuidv4()),
        customerId: createTestCustomerId(uuidv4()),
        staffId: createTestStaffId(uuidv4()),
        serviceId: createTestServiceId(uuidv4()),
        startTime: new Date('2024-12-25T10:00:00Z'),
        endTime: new Date('2024-12-25T11:00:00Z'),
        totalAmount: 5000,
        notes: longNotes,
      }

      const createdReservation = createTestReservation()
      vi.mocked(mockRepository.create).mockResolvedValueOnce(
        ok(createdReservation)
      )

      // Act
      const result = await createReservationUseCase(input, deps)

      // Assert
      expect(result.type).toBe('ok')
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            notes: longNotes,
          }),
        })
      )
    })

    it('should handle reservation at midnight', async () => {
      // Arrange
      const input: CreateReservationUseCaseInput = {
        salonId: createTestSalonId(uuidv4()),
        customerId: createTestCustomerId(uuidv4()),
        staffId: createTestStaffId(uuidv4()),
        serviceId: createTestServiceId(uuidv4()),
        startTime: new Date('2024-12-25T00:00:00Z'),
        endTime: new Date('2024-12-25T01:00:00Z'),
        totalAmount: 5000,
      }

      const createdReservation = createTestReservation()
      vi.mocked(mockRepository.create).mockResolvedValueOnce(
        ok(createdReservation)
      )

      // Act
      const result = await createReservationUseCase(input, deps)

      // Assert
      expect(result.type).toBe('ok')
    })

    it('should handle reservation spanning multiple days', async () => {
      // Arrange
      const input: CreateReservationUseCaseInput = {
        salonId: createTestSalonId(uuidv4()),
        customerId: createTestCustomerId(uuidv4()),
        staffId: createTestStaffId(uuidv4()),
        serviceId: createTestServiceId(uuidv4()),
        startTime: new Date('2024-12-25T23:00:00Z'),
        endTime: new Date('2024-12-26T01:00:00Z'), // Next day
        totalAmount: 10000,
      }

      const createdReservation = createTestReservation()
      vi.mocked(mockRepository.create).mockResolvedValueOnce(
        ok(createdReservation)
      )

      // Act
      const result = await createReservationUseCase(input, deps)

      // Assert
      expect(result.type).toBe('ok')
    })
  })
})
