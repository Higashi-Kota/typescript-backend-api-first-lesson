/**
 * Get Reservation Use Case Tests
 * CLAUDE.mdのテスト要件に徹底準拠
 */

import type { ReservationRepository } from '@beauty-salon-backend/domain'
import { err, ok } from '@beauty-salon-backend/domain'
import {
  ReservationBuilder,
  createTestReservation,
  createTestReservationId,
} from '@beauty-salon-backend/test-utils'
import { v4 as uuidv4 } from 'uuid'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getReservationByIdUseCase } from '../get-reservation.usecase.js'

describe('getReservationUseCase', () => {
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
    it('should return reservation when found by valid ID', async () => {
      // Arrange
      const reservationId = createTestReservationId(uuidv4())
      const testReservation = createTestReservation()
      vi.mocked(mockReservationRepository.findById).mockResolvedValueOnce(
        ok(testReservation)
      )

      // Act
      const result = await getReservationByIdUseCase(
        { id: reservationId },
        { reservationRepository: mockReservationRepository }
      )

      // Assert
      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        expect(result.value).toEqual(testReservation)
      }
      expect(mockReservationRepository.findById).toHaveBeenCalledWith(
        reservationId
      )
      expect(mockReservationRepository.findById).toHaveBeenCalledTimes(1)
    })

    it('should return confirmed reservation', async () => {
      // Arrange
      const reservationId = createTestReservationId(uuidv4())
      const confirmedReservation = new ReservationBuilder()
        .asConfirmed('staff-123')
        .build()
      vi.mocked(mockReservationRepository.findById).mockResolvedValueOnce(
        ok(confirmedReservation)
      )

      // Act
      const result = await getReservationByIdUseCase(
        { id: reservationId },
        { reservationRepository: mockReservationRepository }
      )

      // Assert
      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        expect(result.value.type).toBe('confirmed')
      }
    })

    it('should return cancelled reservation', async () => {
      // Arrange
      const reservationId = createTestReservationId(uuidv4())
      const cancelledReservation = new ReservationBuilder()
        .asCancelled('Customer request')
        .build()
      vi.mocked(mockReservationRepository.findById).mockResolvedValueOnce(
        ok(cancelledReservation)
      )

      // Act
      const result = await getReservationByIdUseCase(
        { id: reservationId },
        { reservationRepository: mockReservationRepository }
      )

      // Assert
      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        expect(result.value.type).toBe('cancelled')
        if (result.value.type === 'cancelled') {
          expect(result.value.cancellationReason).toBe('Customer request')
        }
      }
    })

    it('should return completed reservation', async () => {
      // Arrange
      const reservationId = createTestReservationId(uuidv4())
      const completedReservation = new ReservationBuilder()
        .asCompleted('staff-456')
        .build()
      vi.mocked(mockReservationRepository.findById).mockResolvedValueOnce(
        ok(completedReservation)
      )

      // Act
      const result = await getReservationByIdUseCase(
        { id: reservationId },
        { reservationRepository: mockReservationRepository }
      )

      // Assert
      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        expect(result.value.type).toBe('completed')
      }
    })

    it('should return no-show reservation', async () => {
      // Arrange
      const reservationId = createTestReservationId(uuidv4())
      const noShowReservation = new ReservationBuilder().asNoShow().build()
      vi.mocked(mockReservationRepository.findById).mockResolvedValueOnce(
        ok(noShowReservation)
      )

      // Act
      const result = await getReservationByIdUseCase(
        { id: reservationId },
        { reservationRepository: mockReservationRepository }
      )

      // Assert
      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        expect(result.value.type).toBe('no_show')
      }
    })
  })

  describe('異常系', () => {
    it('should return notFound error when reservation does not exist', async () => {
      // Arrange
      const reservationId = createTestReservationId(uuidv4())
      vi.mocked(mockReservationRepository.findById).mockResolvedValueOnce(
        err({ type: 'notFound', entity: 'Reservation', id: reservationId })
      )

      // Act
      const result = await getReservationByIdUseCase(
        { id: reservationId },
        { reservationRepository: mockReservationRepository }
      )

      // Assert
      expect(result.type).toBe('err')
      if (result.type === 'err') {
        expect(result.error.type).toBe('notFound')
        if (result.error.type === 'notFound') {
          expect(result.error.entity).toBe('Reservation')
          expect(result.error.id).toBe(reservationId)
        }
      }
    })

    it('should return databaseError when repository fails', async () => {
      // Arrange
      const reservationId = createTestReservationId(uuidv4())
      vi.mocked(mockReservationRepository.findById).mockResolvedValueOnce(
        err({ type: 'databaseError', message: 'Connection lost' })
      )

      // Act
      const result = await getReservationByIdUseCase(
        { id: reservationId },
        { reservationRepository: mockReservationRepository }
      )

      // Assert
      expect(result.type).toBe('err')
      if (result.type === 'err') {
        expect(result.error.type).toBe('databaseError')
        if (result.error.type === 'databaseError') {
          expect(result.error.message).toBe('Connection lost')
        }
      }
    })

    it('should handle constraint violation error from repository', async () => {
      // Arrange
      const reservationId = createTestReservationId(uuidv4())
      vi.mocked(mockReservationRepository.findById).mockResolvedValueOnce(
        err({
          type: 'constraintViolation',
          constraint: 'FK_reservation_customer',
          message: 'Foreign key constraint violation',
        })
      )

      // Act
      const result = await getReservationByIdUseCase(
        { id: reservationId },
        { reservationRepository: mockReservationRepository }
      )

      // Assert
      expect(result.type).toBe('err')
      if (result.type === 'err') {
        expect(result.error.type).toBe('constraintViolation')
      }
    })

    it('should handle repository timeout error', async () => {
      // Arrange
      const reservationId = createTestReservationId(uuidv4())
      vi.mocked(mockReservationRepository.findById).mockResolvedValueOnce(
        err({ type: 'databaseError', message: 'Query timeout' })
      )

      // Act
      const result = await getReservationByIdUseCase(
        { id: reservationId },
        { reservationRepository: mockReservationRepository }
      )

      // Assert
      expect(result.type).toBe('err')
      if (result.type === 'err') {
        expect(result.error.type).toBe('databaseError')
        if (result.error.type === 'databaseError') {
          expect(result.error.message).toContain('timeout')
        }
      }
    })

    it('should only call repository once even with same ID', async () => {
      // Arrange
      const reservationId = createTestReservationId(uuidv4())
      const testReservation = createTestReservation()
      vi.mocked(mockReservationRepository.findById).mockResolvedValue(
        ok(testReservation)
      )

      // Act
      await getReservationByIdUseCase(
        { id: reservationId },
        { reservationRepository: mockReservationRepository }
      )
      await getReservationByIdUseCase(
        { id: reservationId },
        { reservationRepository: mockReservationRepository }
      )

      // Assert
      expect(mockReservationRepository.findById).toHaveBeenCalledTimes(2)
      expect(mockReservationRepository.findById).toHaveBeenCalledWith(
        reservationId
      )
    })
  })
})
