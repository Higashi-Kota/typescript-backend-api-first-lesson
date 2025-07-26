/**
 * Cancel Reservation Use Case Test
 * CLAUDE.mdのテスト要件に徹底準拠
 * AAA（Arrange-Act-Assert）パターンによる包括的なテスト
 */

import type { ReservationRepository } from '@beauty-salon-backend/domain'
import { err, ok } from '@beauty-salon-backend/domain'
import {
  ReservationBuilder,
  createTestReservationId,
} from '@beauty-salon-backend/test-utils'
import { v4 as uuidv4 } from 'uuid'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  type CancelReservationDeps,
  type CancelReservationUseCaseInput,
  cancelReservationUseCase,
} from '../cancel-reservation.usecase.js'

describe('cancelReservationUseCase', () => {
  let mockRepository: ReservationRepository
  let deps: CancelReservationDeps

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
      checkTimeSlotConflict: vi.fn(),
      countByDate: vi.fn(),
    }
    deps = { reservationRepository: mockRepository }
  })

  describe('正常系', () => {
    it('should cancel pending reservation', async () => {
      // Arrange
      const reservationId = createTestReservationId(uuidv4())
      const pendingReservation = new ReservationBuilder()
        .withId(reservationId)
        .withStartTime(new Date('2025-01-01T10:00:00Z')) // Future date
        .asPending()
        .build()

      const cancelledReservation = new ReservationBuilder()
        .withId(reservationId)
        .asCancelled('Customer request')
        .build()

      const input: CancelReservationUseCaseInput = {
        id: reservationId,
        reason: 'Customer request',
        cancelledBy: 'customer',
      }

      vi.mocked(mockRepository.findById).mockResolvedValueOnce(
        ok(pendingReservation)
      )
      vi.mocked(mockRepository.cancel).mockResolvedValueOnce(
        ok(cancelledReservation)
      )

      // Act
      const result = await cancelReservationUseCase(input, deps)

      // Assert
      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        expect(result.value.type).toBe('cancelled')
      }
      expect(mockRepository.findById).toHaveBeenCalledWith(reservationId)
      expect(mockRepository.cancel).toHaveBeenCalledWith(
        reservationId,
        'Customer request',
        'customer'
      )
    })

    it('should cancel confirmed reservation', async () => {
      // Arrange
      const reservationId = createTestReservationId(uuidv4())
      const confirmedReservation = new ReservationBuilder()
        .withId(reservationId)
        .withStartTime(new Date('2025-01-01T10:00:00Z')) // Future date
        .asConfirmed()
        .build()

      const cancelledReservation = new ReservationBuilder()
        .withId(reservationId)
        .asCancelled('Schedule conflict')
        .build()

      const input: CancelReservationUseCaseInput = {
        id: reservationId,
        reason: 'Schedule conflict',
        cancelledBy: 'staff',
      }

      vi.mocked(mockRepository.findById).mockResolvedValueOnce(
        ok(confirmedReservation)
      )
      vi.mocked(mockRepository.cancel).mockResolvedValueOnce(
        ok(cancelledReservation)
      )

      // Act
      const result = await cancelReservationUseCase(input, deps)

      // Assert
      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        expect(result.value.type).toBe('cancelled')
      }
    })

    it('should cancel reservation with detailed reason', async () => {
      // Arrange
      const reservationId = createTestReservationId(uuidv4())
      const reservation = new ReservationBuilder()
        .withId(reservationId)
        .withStartTime(new Date('2025-01-01T10:00:00Z'))
        .asConfirmed()
        .build()

      const longReason =
        'Due to unexpected circumstances and schedule changes, the customer needs to cancel this appointment'
      const input: CancelReservationUseCaseInput = {
        id: reservationId,
        reason: longReason,
        cancelledBy: 'customer',
      }

      vi.mocked(mockRepository.findById).mockResolvedValueOnce(ok(reservation))
      vi.mocked(mockRepository.cancel).mockResolvedValueOnce(
        ok(
          new ReservationBuilder()
            .withId(reservationId)
            .asCancelled(longReason)
            .build()
        )
      )

      // Act
      const result = await cancelReservationUseCase(input, deps)

      // Assert
      expect(result.type).toBe('ok')
      expect(mockRepository.cancel).toHaveBeenCalledWith(
        reservationId,
        longReason,
        'customer'
      )
    })

    it('should cancel reservation by admin', async () => {
      // Arrange
      const reservationId = createTestReservationId(uuidv4())
      const reservation = new ReservationBuilder()
        .withId(reservationId)
        .withStartTime(new Date('2025-01-01T10:00:00Z'))
        .asConfirmed()
        .build()

      const input: CancelReservationUseCaseInput = {
        id: reservationId,
        reason: 'Admin cancellation',
        cancelledBy: 'admin',
      }

      vi.mocked(mockRepository.findById).mockResolvedValueOnce(ok(reservation))
      vi.mocked(mockRepository.cancel).mockResolvedValueOnce(
        ok(
          new ReservationBuilder()
            .withId(reservationId)
            .asCancelled('Admin cancellation')
            .build()
        )
      )

      // Act
      const result = await cancelReservationUseCase(input, deps)

      // Assert
      expect(result.type).toBe('ok')
      expect(mockRepository.cancel).toHaveBeenCalledWith(
        reservationId,
        'Admin cancellation',
        'admin'
      )
    })

    it('should cancel reservation far in future', async () => {
      // Arrange
      const reservationId = createTestReservationId(uuidv4())
      const futureDate = new Date()
      futureDate.setMonth(futureDate.getMonth() + 6) // 6 months in future

      const reservation = new ReservationBuilder()
        .withId(reservationId)
        .withStartTime(futureDate)
        .asConfirmed()
        .build()

      const input: CancelReservationUseCaseInput = {
        id: reservationId,
        reason: 'Changed plans',
        cancelledBy: 'customer',
      }

      vi.mocked(mockRepository.findById).mockResolvedValueOnce(ok(reservation))
      vi.mocked(mockRepository.cancel).mockResolvedValueOnce(
        ok(
          new ReservationBuilder()
            .withId(reservationId)
            .asCancelled('Changed plans')
            .build()
        )
      )

      // Act
      const result = await cancelReservationUseCase(input, deps)

      // Assert
      expect(result.type).toBe('ok')
    })
  })

  describe('異常系 - 予約が見つからない', () => {
    it('should fail when reservation not found', async () => {
      // Arrange
      const reservationId = createTestReservationId(uuidv4())
      const input: CancelReservationUseCaseInput = {
        id: reservationId,
        reason: 'Customer request',
        cancelledBy: 'customer',
      }

      vi.mocked(mockRepository.findById).mockResolvedValueOnce(
        err({ type: 'notFound', entity: 'Reservation', id: reservationId })
      )

      // Act
      const result = await cancelReservationUseCase(input, deps)

      // Assert
      expect(result.type).toBe('err')
      if (result.type === 'err') {
        expect(result.error.type).toBe('notFound')
      }
      expect(mockRepository.cancel).not.toHaveBeenCalled()
    })
  })

  describe('異常系 - キャンセル不可な状態', () => {
    it('should fail when reservation is already cancelled', async () => {
      // Arrange
      const reservationId = createTestReservationId(uuidv4())
      const cancelledReservation = new ReservationBuilder()
        .withId(reservationId)
        .asCancelled('Already cancelled')
        .build()

      const input: CancelReservationUseCaseInput = {
        id: reservationId,
        reason: 'Try to cancel again',
        cancelledBy: 'customer',
      }

      vi.mocked(mockRepository.findById).mockResolvedValueOnce(
        ok(cancelledReservation)
      )

      // Act
      const result = await cancelReservationUseCase(input, deps)

      // Assert
      expect(result.type).toBe('err')
      if (result.type === 'err') {
        expect(result.error.type).toBe('cannotCancel')
        if (result.error.type === 'cannotCancel') {
          expect(result.error.message).toContain(
            'Cannot cancel reservation in cancelled status'
          )
        }
      }
      expect(mockRepository.cancel).not.toHaveBeenCalled()
    })

    it('should fail when reservation is completed', async () => {
      // Arrange
      const reservationId = createTestReservationId(uuidv4())
      const completedReservation = new ReservationBuilder()
        .withId(reservationId)
        .asCompleted()
        .build()

      const input: CancelReservationUseCaseInput = {
        id: reservationId,
        reason: 'Too late',
        cancelledBy: 'customer',
      }

      vi.mocked(mockRepository.findById).mockResolvedValueOnce(
        ok(completedReservation)
      )

      // Act
      const result = await cancelReservationUseCase(input, deps)

      // Assert
      expect(result.type).toBe('err')
      if (result.type === 'err') {
        expect(result.error.type).toBe('cannotCancel')
        if (result.error.type === 'cannotCancel') {
          expect(result.error.message).toContain(
            'Cannot cancel reservation in completed status'
          )
        }
      }
    })

    it('should fail when reservation is no-show', async () => {
      // Arrange
      const reservationId = createTestReservationId(uuidv4())
      const noShowReservation = new ReservationBuilder()
        .withId(reservationId)
        .asNoShow()
        .build()

      const input: CancelReservationUseCaseInput = {
        id: reservationId,
        reason: 'Try to cancel',
        cancelledBy: 'customer',
      }

      vi.mocked(mockRepository.findById).mockResolvedValueOnce(
        ok(noShowReservation)
      )

      // Act
      const result = await cancelReservationUseCase(input, deps)

      // Assert
      expect(result.type).toBe('err')
      if (result.type === 'err') {
        expect(result.error.type).toBe('cannotCancel')
        if (result.error.type === 'cannotCancel') {
          expect(result.error.message).toContain(
            'Cannot cancel reservation in no_show status'
          )
        }
      }
    })

    it('should fail when too close to start time', async () => {
      // Arrange
      const reservationId = createTestReservationId(uuidv4())
      const nearFutureTime = new Date()
      nearFutureTime.setMinutes(nearFutureTime.getMinutes() + 10) // 10 minutes from now

      const reservation = new ReservationBuilder()
        .withId(reservationId)
        .withStartTime(nearFutureTime)
        .asConfirmed()
        .build()

      const input: CancelReservationUseCaseInput = {
        id: reservationId,
        reason: 'Last minute cancellation',
        cancelledBy: 'customer',
      }

      vi.mocked(mockRepository.findById).mockResolvedValueOnce(ok(reservation))

      // Act
      const result = await cancelReservationUseCase(input, deps)

      // Assert
      expect(result.type).toBe('err')
      if (result.type === 'err') {
        expect(result.error.type).toBe('cannotCancel')
        if (result.error.type === 'cannotCancel') {
          expect(result.error.message).toContain('too close to start time')
        }
      }
    })

    it('should fail when reservation has already started', async () => {
      // Arrange
      const reservationId = createTestReservationId(uuidv4())
      const pastTime = new Date()
      pastTime.setHours(pastTime.getHours() - 1) // 1 hour ago

      const reservation = new ReservationBuilder()
        .withId(reservationId)
        .withStartTime(pastTime)
        .asConfirmed()
        .build()

      const input: CancelReservationUseCaseInput = {
        id: reservationId,
        reason: 'Too late',
        cancelledBy: 'customer',
      }

      vi.mocked(mockRepository.findById).mockResolvedValueOnce(ok(reservation))

      // Act
      const result = await cancelReservationUseCase(input, deps)

      // Assert
      expect(result.type).toBe('err')
      if (result.type === 'err') {
        expect(result.error.type).toBe('cannotCancel')
        if (result.error.type === 'cannotCancel') {
          expect(result.error.message).toContain('too close to start time')
        }
      }
    })
  })

  describe('異常系 - リポジトリエラー', () => {
    it('should fail when findById fails', async () => {
      // Arrange
      const reservationId = createTestReservationId(uuidv4())
      const input: CancelReservationUseCaseInput = {
        id: reservationId,
        reason: 'Customer request',
        cancelledBy: 'customer',
      }

      vi.mocked(mockRepository.findById).mockResolvedValueOnce(
        err({ type: 'databaseError', message: 'Connection failed' })
      )

      // Act
      const result = await cancelReservationUseCase(input, deps)

      // Assert
      expect(result.type).toBe('err')
      if (result.type === 'err') {
        expect(result.error.type).toBe('databaseError')
        if (result.error.type === 'databaseError') {
          expect(result.error.message).toBe('Connection failed')
        }
      }
    })

    it('should fail when cancel operation fails', async () => {
      // Arrange
      const reservationId = createTestReservationId(uuidv4())
      const reservation = new ReservationBuilder()
        .withId(reservationId)
        .withStartTime(new Date('2025-01-01T10:00:00Z'))
        .asConfirmed()
        .build()

      const input: CancelReservationUseCaseInput = {
        id: reservationId,
        reason: 'Customer request',
        cancelledBy: 'customer',
      }

      vi.mocked(mockRepository.findById).mockResolvedValueOnce(ok(reservation))
      vi.mocked(mockRepository.cancel).mockResolvedValueOnce(
        err({ type: 'databaseError', message: 'Update failed' })
      )

      // Act
      const result = await cancelReservationUseCase(input, deps)

      // Assert
      expect(result.type).toBe('err')
      if (result.type === 'err') {
        expect(result.error.type).toBe('databaseError')
        if (result.error.type === 'databaseError') {
          expect(result.error.message).toBe('Update failed')
        }
      }
    })

    it('should handle concurrent cancellation attempts', async () => {
      // Arrange
      const reservationId = createTestReservationId(uuidv4())
      const reservation = new ReservationBuilder()
        .withId(reservationId)
        .withStartTime(new Date('2025-01-01T10:00:00Z'))
        .asConfirmed()
        .build()

      const input: CancelReservationUseCaseInput = {
        id: reservationId,
        reason: 'Customer request',
        cancelledBy: 'customer',
      }

      vi.mocked(mockRepository.findById).mockResolvedValueOnce(ok(reservation))
      vi.mocked(mockRepository.cancel).mockResolvedValueOnce(
        err({ type: 'databaseError', message: 'Version mismatch' })
      )

      // Act
      const result = await cancelReservationUseCase(input, deps)

      // Assert
      expect(result.type).toBe('err')
      if (result.type === 'err') {
        expect(result.error.type).toBe('databaseError')
      }
    })
  })

  describe('エッジケース', () => {
    it('should handle cancellation exactly at allowed time boundary', async () => {
      // Arrange
      const reservationId = createTestReservationId(uuidv4())
      const boundaryTime = new Date()
      boundaryTime.setHours(boundaryTime.getHours() + 1) // Exactly 1 hour from now

      const reservation = new ReservationBuilder()
        .withId(reservationId)
        .withStartTime(boundaryTime)
        .asConfirmed()
        .build()

      const input: CancelReservationUseCaseInput = {
        id: reservationId,
        reason: 'Just in time',
        cancelledBy: 'customer',
      }

      vi.mocked(mockRepository.findById).mockResolvedValueOnce(ok(reservation))
      vi.mocked(mockRepository.cancel).mockResolvedValueOnce(
        ok(
          new ReservationBuilder()
            .withId(reservationId)
            .asCancelled('Just in time')
            .build()
        )
      )

      // Act
      const result = await cancelReservationUseCase(input, deps)

      // Assert
      expect(result.type).toBe('ok')
    })

    it('should handle empty reason string', async () => {
      // Arrange
      const reservationId = createTestReservationId(uuidv4())
      const reservation = new ReservationBuilder()
        .withId(reservationId)
        .withStartTime(new Date('2025-01-01T10:00:00Z'))
        .asConfirmed()
        .build()

      const input: CancelReservationUseCaseInput = {
        id: reservationId,
        reason: '', // Empty reason
        cancelledBy: 'customer',
      }

      vi.mocked(mockRepository.findById).mockResolvedValueOnce(ok(reservation))
      vi.mocked(mockRepository.cancel).mockResolvedValueOnce(
        ok(
          new ReservationBuilder().withId(reservationId).asCancelled('').build()
        )
      )

      // Act
      const result = await cancelReservationUseCase(input, deps)

      // Assert
      expect(result.type).toBe('ok')
      expect(mockRepository.cancel).toHaveBeenCalledWith(
        reservationId,
        '',
        'customer'
      )
    })

    it('should handle system-initiated cancellation', async () => {
      // Arrange
      const reservationId = createTestReservationId(uuidv4())
      const reservation = new ReservationBuilder()
        .withId(reservationId)
        .withStartTime(new Date('2025-01-01T10:00:00Z'))
        .asConfirmed()
        .build()

      const input: CancelReservationUseCaseInput = {
        id: reservationId,
        reason: 'System maintenance',
        cancelledBy: 'system',
      }

      vi.mocked(mockRepository.findById).mockResolvedValueOnce(ok(reservation))
      vi.mocked(mockRepository.cancel).mockResolvedValueOnce(
        ok(
          new ReservationBuilder()
            .withId(reservationId)
            .asCancelled('System maintenance')
            .build()
        )
      )

      // Act
      const result = await cancelReservationUseCase(input, deps)

      // Assert
      expect(result.type).toBe('ok')
      expect(mockRepository.cancel).toHaveBeenCalledWith(
        reservationId,
        'System maintenance',
        'system'
      )
    })
  })
})
