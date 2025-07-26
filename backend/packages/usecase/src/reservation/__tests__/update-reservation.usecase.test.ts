/**
 * Update Reservation Use Case Tests
 * CLAUDE.mdのテスト要件に徹底準拠
 */

import type { ReservationRepository } from '@beauty-salon-backend/domain'
import { err, ok } from '@beauty-salon-backend/domain'
import {
  ReservationBuilder,
  createTestReservation,
  createTestReservationId,
  createTestStaffId,
} from '@beauty-salon-backend/test-utils'
import { v4 as uuidv4 } from 'uuid'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { updateReservationUseCase } from '../update-reservation.usecase.js'

describe('updateReservationUseCase', () => {
  let mockReservationRepository: ReservationRepository

  beforeEach(() => {
    // Create mock repository with default implementations
    mockReservationRepository = {
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
      checkTimeSlotConflict: vi.fn(),
      countByDate: vi.fn(),
    }
  })

  describe('正常系', () => {
    it('should update reservation time successfully', async () => {
      // Arrange
      const reservationId = createTestReservationId(uuidv4())
      const existingReservation = new ReservationBuilder()
        .withId(reservationId)
        .asPending()
        .build()

      const newStartTime = new Date('2024-12-20T10:00:00Z')
      const newEndTime = new Date('2024-12-20T11:00:00Z')

      vi.mocked(mockReservationRepository.findById).mockResolvedValueOnce(
        ok(existingReservation)
      )
      vi.mocked(
        mockReservationRepository.checkTimeSlotConflict
      ).mockResolvedValueOnce(
        ok(false) // No conflict
      )
      vi.mocked(mockReservationRepository.update).mockResolvedValueOnce(
        ok({
          ...existingReservation,
          data: {
            ...existingReservation.data,
            startTime: newStartTime,
            endTime: newEndTime,
            updatedAt: new Date(),
          },
        })
      )

      // Act
      const result = await updateReservationUseCase(
        {
          id: reservationId,
          startTime: newStartTime,
          endTime: newEndTime,
          updatedBy: 'user-123',
        },
        { reservationRepository: mockReservationRepository }
      )

      // Assert
      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        expect(result.value.data.startTime).toEqual(newStartTime)
        expect(result.value.data.endTime).toEqual(newEndTime)
      }
      expect(
        mockReservationRepository.checkTimeSlotConflict
      ).toHaveBeenCalledWith(
        existingReservation.data.staffId,
        newStartTime,
        newEndTime,
        reservationId
      )
    })

    it('should update reservation staff successfully', async () => {
      // Arrange
      const reservationId = createTestReservationId(uuidv4())
      const newStaffId = createTestStaffId(uuidv4())
      const existingReservation = new ReservationBuilder()
        .withId(reservationId)
        .asPending()
        .build()

      vi.mocked(mockReservationRepository.findById).mockResolvedValueOnce(
        ok(existingReservation)
      )
      vi.mocked(
        mockReservationRepository.checkTimeSlotConflict
      ).mockResolvedValueOnce(
        ok(false) // No conflict
      )
      vi.mocked(mockReservationRepository.update).mockResolvedValueOnce(
        ok({
          ...existingReservation,
          data: {
            ...existingReservation.data,
            staffId: newStaffId,
            updatedAt: new Date(),
          },
        })
      )

      // Act
      const result = await updateReservationUseCase(
        {
          id: reservationId,
          staffId: newStaffId,
          updatedBy: 'user-123',
        },
        { reservationRepository: mockReservationRepository }
      )

      // Assert
      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        expect(result.value.data.staffId).toEqual(newStaffId)
      }
    })

    it('should update reservation notes successfully', async () => {
      // Arrange
      const reservationId = createTestReservationId(uuidv4())
      const existingReservation = new ReservationBuilder()
        .withId(reservationId)
        .asPending()
        .build()
      const newNotes = 'Please prepare special treatment'

      vi.mocked(mockReservationRepository.findById).mockResolvedValueOnce(
        ok(existingReservation)
      )
      vi.mocked(mockReservationRepository.update).mockResolvedValueOnce(
        ok({
          ...existingReservation,
          data: {
            ...existingReservation.data,
            notes: newNotes,
            updatedAt: new Date(),
          },
        })
      )

      // Act
      const result = await updateReservationUseCase(
        {
          id: reservationId,
          notes: newNotes,
          updatedBy: 'user-123',
        },
        { reservationRepository: mockReservationRepository }
      )

      // Assert
      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        expect(result.value.data.notes).toBe(newNotes)
      }
    })

    it('should handle updating confirmed reservation', async () => {
      // Arrange
      const reservationId = createTestReservationId(uuidv4())
      const confirmedReservation = new ReservationBuilder()
        .withId(reservationId)
        .asConfirmed('staff-123')
        .build()

      vi.mocked(mockReservationRepository.findById).mockResolvedValueOnce(
        ok(confirmedReservation)
      )
      vi.mocked(mockReservationRepository.update).mockResolvedValueOnce(
        ok(confirmedReservation)
      )

      // Act
      const result = await updateReservationUseCase(
        {
          id: reservationId,
          notes: 'Updated notes',
          updatedBy: 'user-123',
        },
        { reservationRepository: mockReservationRepository }
      )

      // Assert
      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        expect(result.value.type).toBe('confirmed')
      }
    })
  })

  describe('異常系', () => {
    it('should return error when reservation not found', async () => {
      // Arrange
      const reservationId = createTestReservationId(uuidv4())
      vi.mocked(mockReservationRepository.findById).mockResolvedValueOnce(
        err({ type: 'notFound', entity: 'Reservation', id: reservationId })
      )

      // Act
      const result = await updateReservationUseCase(
        {
          id: reservationId,
          notes: 'Updated notes',
          updatedBy: 'user-123',
        },
        { reservationRepository: mockReservationRepository }
      )

      // Assert
      expect(result.type).toBe('err')
      if (result.type === 'err') {
        expect(result.error.type).toBe('notFound')
      }
    })

    it('should return error when updating cancelled reservation', async () => {
      // Arrange
      const reservationId = createTestReservationId(uuidv4())
      const cancelledReservation = new ReservationBuilder()
        .withId(reservationId)
        .asCancelled('Customer request')
        .build()

      vi.mocked(mockReservationRepository.findById).mockResolvedValueOnce(
        ok(cancelledReservation)
      )

      // Act
      const result = await updateReservationUseCase(
        {
          id: reservationId,
          notes: 'Try to update',
          updatedBy: 'user-123',
        },
        { reservationRepository: mockReservationRepository }
      )

      // Assert
      expect(result.type).toBe('err')
      if (result.type === 'err') {
        expect(result.error.type).toBe('cannotModify')
        if (result.error.type === 'cannotModify') {
          expect(result.error.message).toContain('Cannot modify reservation')
        }
      }
    })

    it('should return error when updating completed reservation', async () => {
      // Arrange
      const reservationId = createTestReservationId(uuidv4())
      const completedReservation = new ReservationBuilder()
        .withId(reservationId)
        .asCompleted('staff-456')
        .build()

      vi.mocked(mockReservationRepository.findById).mockResolvedValueOnce(
        ok(completedReservation)
      )

      // Act
      const result = await updateReservationUseCase(
        {
          id: reservationId,
          notes: 'Try to update',
          updatedBy: 'user-123',
        },
        { reservationRepository: mockReservationRepository }
      )

      // Assert
      expect(result.type).toBe('err')
      if (result.type === 'err') {
        expect(result.error.type).toBe('cannotModify')
        if (result.error.type === 'cannotModify') {
          expect(result.error.message).toContain('Cannot modify reservation')
        }
      }
    })

    it('should return error when updating no-show reservation', async () => {
      // Arrange
      const reservationId = createTestReservationId(uuidv4())
      const noShowReservation = new ReservationBuilder()
        .withId(reservationId)
        .asNoShow()
        .build()

      vi.mocked(mockReservationRepository.findById).mockResolvedValueOnce(
        ok(noShowReservation)
      )

      // Act
      const result = await updateReservationUseCase(
        {
          id: reservationId,
          notes: 'Try to update',
          updatedBy: 'user-123',
        },
        { reservationRepository: mockReservationRepository }
      )

      // Assert
      expect(result.type).toBe('err')
      if (result.type === 'err') {
        expect(result.error.type).toBe('cannotModify')
      }
    })

    it('should return error when time slot conflicts with another reservation', async () => {
      // Arrange
      const reservationId = createTestReservationId(uuidv4())
      const existingReservation = new ReservationBuilder()
        .withId(reservationId)
        .asPending()
        .build()

      const newStartTime = new Date('2024-12-20T10:00:00Z')
      const newEndTime = new Date('2024-12-20T11:00:00Z')

      vi.mocked(mockReservationRepository.findById).mockResolvedValueOnce(
        ok(existingReservation)
      )
      vi.mocked(
        mockReservationRepository.checkTimeSlotConflict
      ).mockResolvedValueOnce(
        ok(true) // Conflict exists
      )

      // Act
      const result = await updateReservationUseCase(
        {
          id: reservationId,
          startTime: newStartTime,
          endTime: newEndTime,
          updatedBy: 'user-123',
        },
        { reservationRepository: mockReservationRepository }
      )

      // Assert
      expect(result.type).toBe('err')
      if (result.type === 'err') {
        expect(result.error.type).toBe('slotConflict')
        if (result.error.type === 'slotConflict') {
          expect(result.error.message).toContain('time slot is not available')
        }
      }
    })

    it('should return error when database fails during update', async () => {
      // Arrange
      const reservationId = createTestReservationId(uuidv4())
      const existingReservation = createTestReservation()

      vi.mocked(mockReservationRepository.findById).mockResolvedValueOnce(
        ok(existingReservation)
      )
      vi.mocked(mockReservationRepository.update).mockResolvedValueOnce(
        err({ type: 'databaseError', message: 'Connection failed' })
      )

      // Act
      const result = await updateReservationUseCase(
        {
          id: reservationId,
          notes: 'Updated notes',
          updatedBy: 'user-123',
        },
        { reservationRepository: mockReservationRepository }
      )

      // Assert
      expect(result.type).toBe('err')
      if (result.type === 'err') {
        expect(result.error.type).toBe('databaseError')
      }
    })

    it('should validate time order when updating both start and end time', async () => {
      // Arrange
      const reservationId = createTestReservationId(uuidv4())
      const existingReservation = createTestReservation()

      vi.mocked(mockReservationRepository.findById).mockResolvedValueOnce(
        ok(existingReservation)
      )

      // Act - end time before start time
      const result = await updateReservationUseCase(
        {
          id: reservationId,
          startTime: new Date('2024-12-20T11:00:00Z'),
          endTime: new Date('2024-12-20T10:00:00Z'), // Invalid: end before start
          updatedBy: 'user-123',
        },
        { reservationRepository: mockReservationRepository }
      )

      // Assert
      expect(result.type).toBe('err')
      if (result.type === 'err') {
        expect(result.error.type).toBe('invalidTimeRange')
        if (result.error.type === 'invalidTimeRange') {
          expect(result.error.message).toBeDefined()
        }
      }
    })

    it('should return error when updating reservation in the past', async () => {
      // Arrange
      const reservationId = createTestReservationId(uuidv4())
      const existingReservation = createTestReservation()
      const pastTime = new Date('2020-01-01T10:00:00Z')

      vi.mocked(mockReservationRepository.findById).mockResolvedValueOnce(
        ok(existingReservation)
      )

      // Act
      const result = await updateReservationUseCase(
        {
          id: reservationId,
          startTime: pastTime,
          endTime: new Date(pastTime.getTime() + 3600000), // 1 hour later
          updatedBy: 'user-123',
        },
        { reservationRepository: mockReservationRepository }
      )

      // Assert
      expect(result.type).toBe('err')
      if (result.type === 'err') {
        expect(result.error.type).toBe('pastTimeNotAllowed')
        if (result.error.type === 'pastTimeNotAllowed') {
          expect(result.error.message).toBeDefined()
        }
      }
    })

    it('should handle constraint violation from repository', async () => {
      // Arrange
      const reservationId = createTestReservationId(uuidv4())
      const existingReservation = createTestReservation()

      vi.mocked(mockReservationRepository.findById).mockResolvedValueOnce(
        ok(existingReservation)
      )
      vi.mocked(mockReservationRepository.update).mockResolvedValueOnce(
        err({
          type: 'constraintViolation',
          constraint: 'FK_reservation_staff',
          message: 'Foreign key constraint failed',
        })
      )

      // Act
      const result = await updateReservationUseCase(
        {
          id: reservationId,
          staffId: createTestStaffId(uuidv4()),
          updatedBy: 'user-123',
        },
        { reservationRepository: mockReservationRepository }
      )

      // Assert
      expect(result.type).toBe('err')
      if (result.type === 'err') {
        expect(result.error.type).toBe('constraintViolation')
      }
    })
  })
})
