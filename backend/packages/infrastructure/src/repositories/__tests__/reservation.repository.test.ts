/**
 * ReservationRepository Integration Tests
 * AAAパターンに従ったテスト実装
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  type CreateReservationRequest,
  type UpdateReservationRequest,
  type CustomerId,
  createReservationId,
  createCustomerId,
  createServiceId,
  createStaffId,
  createSalonId,
} from '@beauty-salon-backend/domain'
import {
  type TestContext,
  createTestContext,
} from '@beauty-salon-backend/test-utils'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { DrizzleReservationRepository } from '../reservation.repository.impl.js'
import * as schema from '../../database/schema.js'

describe('ReservationRepository Integration Tests', () => {
  let testContext: TestContext
  let db: PostgresJsDatabase
  let repository: DrizzleReservationRepository
  let salonId: ReturnType<typeof createSalonId>
  let customerId: ReturnType<typeof createCustomerId>
  let staffId: ReturnType<typeof createStaffId>
  let serviceId: ReturnType<typeof createServiceId>

  // テストヘルパー関数
  const createTestReservationRequest = (
    overrides?: Partial<CreateReservationRequest>
  ): CreateReservationRequest => {
    if (!customerId || !salonId || !serviceId || !staffId) {
      throw new Error('Test IDs not initialized')
    }
    return {
      customerId: customerId,
      salonId: salonId,
      serviceId: serviceId,
      staffId: staffId,
      startTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1日後
      endTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 60 * 60 * 1000), // 1時間後
      totalAmount: 5000,
      depositAmount: 1000,
      notes: 'Test reservation',
      createdBy: 'test-user',
      ...overrides,
    }
  }

  const createTestSalon = async () => {
    const salonData = {
      id: crypto.randomUUID(),
      name: 'Test Salon',
      description: 'Test salon for reservation tests',
      address: {
        street: '123 Test St',
        city: 'Test City',
        state: 'Test State',
        postalCode: '12345',
        country: 'Test Country',
      },
      email: `salon-${Date.now()}@example.com`,
      phoneNumber: '03-1234-5678',
      imageUrls: ['https://example.com/salon.jpg'],
      features: ['駐車場', 'キッズスペース'],
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    const [inserted] = await db
      .insert(schema.salons)
      .values(salonData)
      .returning()
    if (!inserted) {
      throw new Error('Failed to create test salon')
    }
    return inserted
  }

  const createTestCustomer = async () => {
    const customerData = {
      id: crypto.randomUUID(),
      name: 'Test Customer',
      email: `customer-${Date.now()}@example.com`,
      phoneNumber: '090-1234-5678',
      membership_level: 'bronze',
      total_points: 0,
      total_spent: 0,
      visit_count: 0,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    }
    const [inserted] = await db
      .insert(schema.customers)
      .values(customerData)
      .returning()
    if (!inserted) {
      throw new Error('Failed to create test customer')
    }
    return inserted
  }

  const createTestStaff = async () => {
    if (!salonId) throw new Error('Salon ID not initialized')
    const staffData = {
      salonId: salonId,
      name: 'Test Staff',
      email: `staff-${Date.now()}@example.com`,
      phoneNumber: '090-9999-8888',
      specialties: ['カット', 'カラー'],
      yearsOfExperience: 5,
      isActive: true,
    }
    const [inserted] = await db
      .insert(schema.staff)
      .values(staffData)
      .returning()
    if (!inserted) {
      throw new Error('Failed to create test staff')
    }
    return inserted
  }

  const createTestService = async () => {
    if (!salonId) throw new Error('Salon ID not initialized')
    const serviceData = {
      salonId: salonId,
      name: 'Test Service',
      description: 'Test service for reservation',
      price: 5000,
      duration: 60,
      category: 'cut' as const,
      isActive: true,
    }
    const [inserted] = await db
      .insert(schema.services)
      .values(serviceData)
      .returning()
    if (!inserted) {
      throw new Error('Failed to create test service')
    }
    return inserted
  }

  beforeEach(async () => {
    testContext = await createTestContext()
    db = testContext.db
    repository = new DrizzleReservationRepository(db)

    // テストデータのセットアップ
    const salon = await createTestSalon()
    salonId = createSalonId(salon.id)

    const customer = await createTestCustomer()
    customerId = createCustomerId(customer.id)

    const staff = await createTestStaff()
    staffId = createStaffId(staff.id)

    const service = await createTestService()
    serviceId = createServiceId(service.id)
  })

  afterEach(async () => {
    await testContext.cleanup()
  })

  describe('create', () => {
    it('should create a new reservation with pending status', async () => {
      // Arrange
      const request = createTestReservationRequest()

      // Act
      const result = await repository.create(request)

      // Assert
      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        expect(result.value.type).toBe('pending')
        if (result.value.type === 'pending') {
          expect(result.value.data.customerId).toBe(request.customerId)
          expect(result.value.data.serviceId).toBe(request.serviceId)
          expect(result.value.data.staffId).toBe(request.staffId)
          expect(result.value.data.startTime).toEqual(request.startTime)
        }
      }
    })

    it('should handle overlapping reservations error', async () => {
      // Arrange
      const startTime = new Date(Date.now() + 24 * 60 * 60 * 1000)
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000)
      const request1 = createTestReservationRequest({ startTime, endTime })
      const request2 = createTestReservationRequest({ startTime, endTime })

      await repository.create(request1)

      // Act
      const result = await repository.create(request2)

      // Assert
      expect(result.type).toBe('err')
      if (result.type === 'err') {
        expect(result.error.type).toBe('slotNotAvailable')
      }
    })

    it('should create reservation with all optional fields', async () => {
      // Arrange
      const request = createTestReservationRequest({
        notes: 'Special instructions',
        depositAmount: 2000,
      })

      // Act
      const result = await repository.create(request)

      // Assert
      expect(result.type).toBe('ok')
      if (result.type === 'ok' && result.value.type === 'pending') {
        expect(result.value.data.notes).toBe('Special instructions')
        expect(result.value.data.depositAmount).toBe(2000)
      }
    })

    it('should handle invalid customer ID', async () => {
      // Arrange
      const request = createTestReservationRequest({
        customerId: createCustomerId(crypto.randomUUID()) as CustomerId,
      })

      // Act
      const result = await repository.create(request)

      // Assert
      expect(result.type).toBe('err')
      if (result.type === 'err') {
        expect(result.error.type).toBe('databaseError')
      }
    })

    it('should validate time range', async () => {
      // Arrange
      const startTime = new Date(Date.now() + 24 * 60 * 60 * 1000)
      const endTime = new Date(startTime.getTime() - 60 * 60 * 1000) // End before start
      const request = createTestReservationRequest({ startTime, endTime })

      // Act
      const result = await repository.create(request)

      // Assert
      expect(result.type).toBe('err')
      if (result.type === 'err') {
        expect(result.error.type).toBe('invalidTimeRange')
      }
    })
  })

  describe('findById', () => {
    it('should find existing reservation by ID', async () => {
      // Arrange
      const request = createTestReservationRequest()
      const createResult = await repository.create(request)
      if (createResult.type !== 'ok')
        throw new Error('Failed to create reservation')
      const reservationId = createResult.value.data.id

      // Act
      const result = await repository.findById(reservationId)

      // Assert
      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        expect(result.value.data.id).toBe(reservationId)
      }
    })

    it('should return notFound for non-existent reservation', async () => {
      // Arrange
      const nonExistentId = createReservationId(crypto.randomUUID())

      // Act
      if (!nonExistentId) throw new Error('Reservation ID not initialized')
      const result = await repository.findById(nonExistentId)

      // Assert
      expect(result.type).toBe('err')
      if (result.type === 'err') {
        expect(result.error.type).toBe('notFound')
      }
    })

    it('should return cancelled reservation correctly', async () => {
      // Arrange
      const request = createTestReservationRequest()
      const createResult = await repository.create(request)
      if (createResult.type !== 'ok')
        throw new Error('Failed to create reservation')
      const reservationId = createResult.value.data.id

      await repository.cancel(reservationId, 'Customer request', 'customer')

      // Act
      const result = await repository.findById(reservationId)

      // Assert
      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        expect(result.value.type).toBe('cancelled')
      }
    })
  })

  describe('update', () => {
    it('should update reservation details', async () => {
      // Arrange
      const createRequest = createTestReservationRequest()
      const createResult = await repository.create(createRequest)
      if (createResult.type !== 'ok')
        throw new Error('Failed to create reservation')
      const reservationId = createResult.value.data.id

      const updateRequest: UpdateReservationRequest = {
        id: reservationId,
        startTime: new Date(Date.now() + 48 * 60 * 60 * 1000), // 2日後
        endTime: new Date(Date.now() + 48 * 60 * 60 * 1000 + 60 * 60 * 1000),
        notes: 'Updated notes',
        updatedBy: 'test-updater',
      }

      // Act
      const result = await repository.update(updateRequest)

      // Assert
      expect(result.type).toBe('ok')
      if (result.type === 'ok' && result.value.type === 'pending') {
        expect(result.value.data.startTime).toEqual(updateRequest.startTime)
        expect(result.value.data.notes).toBe('Updated notes')
      }
    })

    it('should not update cancelled reservation', async () => {
      // Arrange
      const createRequest = createTestReservationRequest()
      const createResult = await repository.create(createRequest)
      if (createResult.type !== 'ok')
        throw new Error('Failed to create reservation')
      const reservationId = createResult.value.data.id

      await repository.cancel(reservationId, 'Test', 'test')

      const updateRequest: UpdateReservationRequest = {
        id: reservationId,
        notes: 'Should not update',
      }

      // Act
      const result = await repository.update(updateRequest)

      // Assert
      expect(result.type).toBe('err')
      if (result.type === 'err') {
        expect(result.error.type).toBe('reservationNotModifiable')
      }
    })

    it('should handle overlapping reservations on update', async () => {
      // Arrange
      const startTime = new Date(Date.now() + 24 * 60 * 60 * 1000)
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000)
      const request1 = createTestReservationRequest({ startTime, endTime })
      const request2 = createTestReservationRequest({
        startTime: new Date(Date.now() + 48 * 60 * 60 * 1000),
        endTime: new Date(Date.now() + 48 * 60 * 60 * 1000 + 60 * 60 * 1000),
      })

      await repository.create(request1)
      const createResult = await repository.create(request2)
      if (createResult.type !== 'ok')
        throw new Error('Failed to create reservation')
      const reservationId = createResult.value.data.id

      const updateRequest: UpdateReservationRequest = {
        id: reservationId,
        startTime: startTime, // Same time as first reservation
        endTime: endTime,
      }

      // Act
      const result = await repository.update(updateRequest)

      // Assert
      expect(result.type).toBe('err')
      if (result.type === 'err') {
        expect(result.error.type).toBe('slotNotAvailable')
      }
    })
  })

  describe('confirm', () => {
    it('should confirm a pending reservation', async () => {
      // Arrange
      const request = createTestReservationRequest()
      const createResult = await repository.create(request)
      if (createResult.type !== 'ok')
        throw new Error('Failed to create reservation')
      const reservationId = createResult.value.data.id

      // Act
      const result = await repository.confirm(reservationId, 'test-confirmer')

      // Assert
      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        expect(result.value.type).toBe('confirmed')
        if (result.value.type === 'confirmed') {
          expect(result.value.confirmedAt).toBeDefined()
          expect(result.value.confirmedBy).toBe('test-confirmer')
        }
      }
    })

    it('should not confirm already confirmed reservation', async () => {
      // Arrange
      const request = createTestReservationRequest()
      const createResult = await repository.create(request)
      if (createResult.type !== 'ok')
        throw new Error('Failed to create reservation')
      const reservationId = createResult.value.data.id

      await repository.confirm(reservationId, 'first-confirmer')

      // Act
      const result = await repository.confirm(reservationId, 'second-confirmer')

      // Assert
      expect(result.type).toBe('err')
      if (result.type === 'err') {
        expect(result.error.type).toBe('reservationAlreadyConfirmed')
      }
    })
  })

  describe('cancel', () => {
    it('should cancel a confirmed reservation', async () => {
      // Arrange
      const request = createTestReservationRequest()
      const createResult = await repository.create(request)
      if (createResult.type !== 'ok')
        throw new Error('Failed to create reservation')
      const reservationId = createResult.value.data.id

      await repository.confirm(reservationId, 'confirmer')

      // Act
      const result = await repository.cancel(
        reservationId,
        'Customer request',
        'customer'
      )

      // Assert
      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        expect(result.value.type).toBe('cancelled')
        if (result.value.type === 'cancelled') {
          expect(result.value.cancelledAt).toBeDefined()
          expect(result.value.cancelledBy).toBe('customer')
          expect(result.value.cancellationReason).toBe('Customer request')
        }
      }
    })

    it('should not cancel already cancelled reservation', async () => {
      // Arrange
      const request = createTestReservationRequest()
      const createResult = await repository.create(request)
      if (createResult.type !== 'ok')
        throw new Error('Failed to create reservation')
      const reservationId = createResult.value.data.id

      await repository.cancel(reservationId, 'First cancel', 'user1')

      // Act
      const result = await repository.cancel(
        reservationId,
        'Second cancel',
        'user2'
      )

      // Assert
      expect(result.type).toBe('err')
      if (result.type === 'err') {
        expect(result.error.type).toBe('reservationAlreadyCancelled')
      }
    })
  })

  describe('complete', () => {
    it('should complete a confirmed reservation', async () => {
      // Arrange
      const request = createTestReservationRequest()
      const createResult = await repository.create(request)
      if (createResult.type !== 'ok')
        throw new Error('Failed to create reservation')
      const reservationId = createResult.value.data.id

      await repository.confirm(reservationId, 'confirmer')

      // Act
      const result = await repository.complete(reservationId, 'completer')

      // Assert
      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        expect(result.value.type).toBe('completed')
        if (result.value.type === 'completed') {
          expect(result.value.completedAt).toBeDefined()
          expect(result.value.completedBy).toBe('completer')
        }
      }
    })

    it('should not complete unconfirmed reservation', async () => {
      // Arrange
      const request = createTestReservationRequest()
      const createResult = await repository.create(request)
      if (createResult.type !== 'ok')
        throw new Error('Failed to create reservation')
      const reservationId = createResult.value.data.id

      // Act
      const result = await repository.complete(reservationId, 'completer')

      // Assert
      expect(result.type).toBe('err')
      if (result.type === 'err') {
        expect(result.error.type).toBe('reservationNotConfirmed')
      }
    })
  })

  describe('markAsNoShow', () => {
    it('should mark confirmed reservation as no-show', async () => {
      // Arrange
      const request = createTestReservationRequest({
        startTime: new Date(Date.now() - 60 * 60 * 1000), // 1時間前
        endTime: new Date(Date.now()),
      })
      const createResult = await repository.create(request)
      if (createResult.type !== 'ok')
        throw new Error('Failed to create reservation')
      const reservationId = createResult.value.data.id

      await repository.confirm(reservationId, 'confirmer')

      // Act
      const result = await repository.markAsNoShow(reservationId, 'marker')

      // Assert
      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        expect(result.value.type).toBe('no_show')
        if (result.value.type === 'no_show') {
          expect(result.value.markedNoShowAt).toBeDefined()
          expect(result.value.markedNoShowBy).toBe('marker')
        }
      }
    })

    it('should not mark future reservation as no-show', async () => {
      // Arrange
      const request = createTestReservationRequest({
        startTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1日後
        endTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
      })
      const createResult = await repository.create(request)
      if (createResult.type !== 'ok')
        throw new Error('Failed to create reservation')
      const reservationId = createResult.value.data.id

      await repository.confirm(reservationId, 'confirmer')

      // Act
      const result = await repository.markAsNoShow(reservationId, 'marker')

      // Assert
      expect(result.type).toBe('err')
      if (result.type === 'err') {
        expect(result.error.type).toBe('reservationNotYetPassed')
      }
    })
  })

  describe('search', () => {
    it('should search reservations by customer', async () => {
      // Arrange
      const now = new Date()
      const request1 = createTestReservationRequest({
        startTime: new Date(now.getTime() + 24 * 60 * 60 * 1000), // 1日後
        endTime: new Date(now.getTime() + 24 * 60 * 60 * 1000 + 60 * 60 * 1000), // 1時間後
      })
      const request2 = createTestReservationRequest({
        startTime: new Date(now.getTime() + 48 * 60 * 60 * 1000), // 2日後
        endTime: new Date(now.getTime() + 48 * 60 * 60 * 1000 + 60 * 60 * 1000), // 1時間後
      })

      const result1 = await repository.create(request1)
      const result2 = await repository.create(request2)

      expect(result1.type).toBe('ok')
      expect(result2.type).toBe('ok')

      // Act
      const result = await repository.search(
        { customerId: customerId || undefined },
        { limit: 10, offset: 0 }
      )

      // Assert
      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        expect(result.value.data.length).toBeGreaterThanOrEqual(2)
        expect(result.value.total).toBeGreaterThanOrEqual(2)
      }
    })

    it('should filter reservations by status', async () => {
      // Arrange
      const now = new Date()
      const request1 = createTestReservationRequest({
        startTime: new Date(now.getTime() + 72 * 60 * 60 * 1000), // 3日後
        endTime: new Date(now.getTime() + 72 * 60 * 60 * 1000 + 60 * 60 * 1000), // 1時間後
      })
      const request2 = createTestReservationRequest({
        startTime: new Date(now.getTime() + 96 * 60 * 60 * 1000), // 4日後
        endTime: new Date(now.getTime() + 96 * 60 * 60 * 1000 + 60 * 60 * 1000), // 1時間後
      })

      const createResult1 = await repository.create(request1)
      const createResult2 = await repository.create(request2)

      if (createResult1.type !== 'ok' || createResult2.type !== 'ok') {
        throw new Error('Failed to create reservations')
      }

      await repository.confirm(createResult1.value.data.id, 'confirmer')

      // Act
      const result = await repository.search(
        { status: 'confirmed' },
        { limit: 10, offset: 0 }
      )

      // Assert
      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        expect(result.value.data.length).toBeGreaterThanOrEqual(1)
        const confirmedReservations = result.value.data.filter(
          (r) => r.type === 'confirmed'
        )
        expect(confirmedReservations.length).toBeGreaterThanOrEqual(1)
      }
    })

    it('should filter reservations by date range', async () => {
      // Arrange
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
      const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

      await repository.create(
        createTestReservationRequest({
          startTime: tomorrow,
          endTime: new Date(tomorrow.getTime() + 60 * 60 * 1000),
        })
      )
      await repository.create(
        createTestReservationRequest({
          startTime: nextWeek,
          endTime: new Date(nextWeek.getTime() + 60 * 60 * 1000),
        })
      )

      // Act
      const result = await repository.search(
        {
          startDate: yesterday,
          endDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        },
        { limit: 10, offset: 0 }
      )

      // Assert
      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        expect(result.value.data.length).toBe(1)
      }
    })

    it('should paginate results correctly', async () => {
      // Arrange
      const now = new Date()
      const createdIds = []
      for (let i = 0; i < 5; i++) {
        const result = await repository.create(
          createTestReservationRequest({
            startTime: new Date(
              now.getTime() + (120 + i * 24) * 60 * 60 * 1000
            ), // 5日後から順番に
            endTime: new Date(
              now.getTime() + (120 + i * 24) * 60 * 60 * 1000 + 60 * 60 * 1000
            ), // 1時間後
          })
        )
        if (result.type === 'ok') {
          createdIds.push(result.value.data.id)
        }
      }

      expect(createdIds.length).toBe(5)

      // Act
      const result = await repository.search(
        { customerId: customerId || undefined },
        { limit: 2, offset: 2 }
      )

      // Assert
      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        expect(result.value.data.length).toBe(2)
        expect(result.value.total).toBeGreaterThanOrEqual(5)
      }
    })
  })

  describe('findByStaffAndDateRange', () => {
    it('should find reservations for specific staff in date range', async () => {
      // Arrange
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
      const dayAfter = new Date(Date.now() + 48 * 60 * 60 * 1000)

      await repository.create(
        createTestReservationRequest({
          startTime: tomorrow,
          endTime: new Date(tomorrow.getTime() + 60 * 60 * 1000),
        })
      )
      await repository.create(
        createTestReservationRequest({
          startTime: dayAfter,
          endTime: new Date(dayAfter.getTime() + 60 * 60 * 1000),
        })
      )

      const otherStaff = await createTestStaff()
      const otherStaffId = createStaffId(otherStaff.id)
      if (!otherStaffId) throw new Error('Other staff ID not initialized')
      await repository.create(
        createTestReservationRequest({
          staffId: otherStaffId,
          startTime: tomorrow,
          endTime: new Date(tomorrow.getTime() + 60 * 60 * 1000),
        })
      )

      // Act
      if (!staffId) throw new Error('Staff ID not initialized')
      const result = await repository.findByStaffAndDateRange(
        staffId,
        new Date(),
        new Date(Date.now() + 72 * 60 * 60 * 1000)
      )

      // Assert
      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        expect(result.value.length).toBe(2)
        for (const reservation of result.value) {
          expect(reservation.data.staffId).toBe(staffId)
        }
      }
    })

    it('should return empty array for no reservations', async () => {
      // Act
      if (!staffId) throw new Error('Staff ID not initialized')
      const result = await repository.findByStaffAndDateRange(
        staffId,
        new Date(),
        new Date(Date.now() + 24 * 60 * 60 * 1000)
      )

      // Assert
      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        expect(result.value).toEqual([])
      }
    })
  })
})
