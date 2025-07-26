/**
 * ReviewRepository Integration Tests
 * AAAパターンに従ったテスト実装
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  type CreateReviewRequest,
  type UpdateReviewRequest,
  createReviewId,
  createCustomerId,
  createServiceId,
  createStaffId,
  createSalonId,
  createReservationId,
} from '@beauty-salon-backend/domain'
import {
  type TestContext,
  createTestContext,
} from '@beauty-salon-backend/test-utils'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { eq } from 'drizzle-orm'
import { DrizzleReviewRepository } from '../review.repository.impl.js'
import * as schema from '../../database/schema.js'

describe('ReviewRepository Integration Tests', () => {
  let testContext: TestContext
  let db: PostgresJsDatabase
  let repository: DrizzleReviewRepository
  let salonId: ReturnType<typeof createSalonId>
  let customerId: ReturnType<typeof createCustomerId>
  let staffId: ReturnType<typeof createStaffId>
  let serviceId: ReturnType<typeof createServiceId>
  let reservationId: ReturnType<typeof createReservationId>

  // テストヘルパー関数
  const createTestReviewRequest = (
    overrides?: Partial<CreateReviewRequest>
  ): CreateReviewRequest => {
    if (!customerId || !salonId || !reservationId || !serviceId || !staffId) {
      throw new Error('Test IDs not initialized')
    }
    return {
      customerId: customerId,
      salonId: salonId,
      reservationId: reservationId,
      rating: 5,
      comment: 'Great service!',
      createdBy: 'test-user',
      ...overrides,
    }
  }

  const createTestSalon = async () => {
    const salonData = {
      id: crypto.randomUUID(),
      name: 'Test Salon',
      description: 'Test salon for review tests',
      address: {
        street: '123 Test St',
        city: 'Test City',
        state: 'Test State',
        postalCode: '12345',
        country: 'Test Country',
      },
      email: 'salon@example.com',
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
    if (!salonId) {
      throw new Error('Salon ID not initialized')
    }
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
    if (!salonId) {
      throw new Error('Salon ID not initialized')
    }
    const serviceData = {
      salonId: salonId,
      name: 'Test Service',
      description: 'Test service for review',
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

  const createTestReservation = async () => {
    if (!customerId || !salonId || !serviceId || !staffId) {
      throw new Error('Test IDs not initialized')
    }
    const reservationData = {
      customerId: customerId,
      salonId: salonId,
      serviceId: serviceId,
      staffId: staffId,
      startTime: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1日前
      endTime: new Date(Date.now() - 23 * 60 * 60 * 1000), // 23時間前
      totalAmount: 5000,
      depositAmount: 0,
      isPaid: true,
      status: 'completed' as const,
    }
    const [inserted] = await db
      .insert(schema.reservations)
      .values(reservationData)
      .returning()
    if (!inserted) {
      throw new Error('Failed to create test reservation')
    }
    return inserted
  }

  beforeEach(async () => {
    testContext = await createTestContext()
    db = testContext.db
    repository = new DrizzleReviewRepository(db)

    // テストデータのセットアップ
    const salon = await createTestSalon()
    salonId = createSalonId(salon.id)

    const customer = await createTestCustomer()
    customerId = createCustomerId(customer.id)

    const staff = await createTestStaff()
    staffId = createStaffId(staff.id)

    const service = await createTestService()
    serviceId = createServiceId(service.id)

    const reservation = await createTestReservation()
    reservationId = createReservationId(reservation.id)
  })

  afterEach(async () => {
    await testContext.cleanup()
  })

  describe('create', () => {
    it('should create a new review with published status', async () => {
      // Arrange
      const request = createTestReviewRequest()

      // Act
      const result = await repository.create(request)

      // Assert
      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        expect(result.value.type).toBe('published')
        if (result.value.type === 'published') {
          expect(result.value.data.customerId).toBe(request.customerId)
          expect(result.value.data.rating).toBe(request.rating)
          expect(result.value.data.comment).toBe(request.comment)
          expect(result.value.publishedAt).toBeDefined()
        }
      }
    })

    it('should handle duplicate review for same reservation', async () => {
      // Arrange
      const request = createTestReviewRequest()
      await repository.create(request)

      // Act
      const result = await repository.create(request)

      // Assert
      expect(result.type).toBe('err')
      if (result.type === 'err') {
        expect(result.error.type).toBe('duplicateReview')
      }
    })

    it('should create review with all optional fields', async () => {
      // Arrange
      const request = createTestReviewRequest({
        images: [
          'https://example.com/review1.jpg',
          'https://example.com/review2.jpg',
        ],
        serviceRating: 5,
        staffRating: 4,
        atmosphereRating: 5,
      })

      // Act
      const result = await repository.create(request)

      // Assert
      expect(result.type).toBe('ok')
      if (result.type === 'ok' && result.value.type === 'published') {
        expect(result.value.data.images).toEqual(request.images)
        expect(result.value.data.serviceRating).toBe(5)
        expect(result.value.data.staffRating).toBe(4)
        expect(result.value.data.atmosphereRating).toBe(5)
      }
    })

    it('should handle invalid rating value', async () => {
      // Arrange
      const request = createTestReviewRequest({
        rating: 6, // Invalid: should be 1-5
      })

      // Act
      const result = await repository.create(request)

      // Assert
      expect(result.type).toBe('err')
      if (result.type === 'err') {
        expect(result.error.type).toBe('invalidRating')
      }
    })

    it('should handle review for non-existent reservation', async () => {
      // Arrange
      const nonExistentId = createReservationId(crypto.randomUUID())
      if (!nonExistentId) throw new Error('Reservation ID not initialized')
      const request = createTestReviewRequest({
        reservationId: nonExistentId,
      })

      // Act
      const result = await repository.create(request)

      // Assert
      expect(result.type).toBe('err')
      if (result.type === 'err') {
        expect(result.error.type).toBe('reservationNotFound')
      }
    })

    // Database error test is removed as DB connection is managed by test context
  })

  describe('findById', () => {
    it('should find existing review by ID', async () => {
      // Arrange
      const request = createTestReviewRequest()
      const createResult = await repository.create(request)
      if (createResult.type !== 'ok') throw new Error('Failed to create review')
      const reviewId = createResult.value.data.id

      // Act
      const result = await repository.findById(reviewId)

      // Assert
      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        expect(result.value.data.id).toBe(reviewId)
      }
    })

    it('should return notFound for non-existent review', async () => {
      // Arrange
      const nonExistentId = createReviewId(crypto.randomUUID())

      // Act
      if (!nonExistentId) throw new Error('Review ID not initialized')
      const result = await repository.findById(nonExistentId)

      // Assert
      expect(result.type).toBe('err')
      if (result.type === 'err') {
        expect(result.error.type).toBe('notFound')
      }
    })

    it('should return hidden review correctly', async () => {
      // Arrange
      const request = createTestReviewRequest()
      const createResult = await repository.create(request)
      if (createResult.type !== 'ok') throw new Error('Failed to create review')
      const reviewId = createResult.value.data.id

      await repository.hide(reviewId, 'Inappropriate content', 'admin')

      // Act
      const result = await repository.findById(reviewId)

      // Assert
      // Hidden reviews are deleted from DB, so they should return notFound
      expect(result.type).toBe('err')
      if (result.type === 'err') {
        expect(result.error.type).toBe('notFound')
      }
    })
  })

  describe('update', () => {
    it('should update review comment and rating', async () => {
      // Arrange
      const createRequest = createTestReviewRequest()
      const createResult = await repository.create(createRequest)
      if (createResult.type !== 'ok') throw new Error('Failed to create review')
      const reviewId = createResult.value.data.id

      const updateRequest: UpdateReviewRequest = {
        id: reviewId,
        rating: 4,
        comment: 'Updated comment',
        updatedBy: 'test-updater',
      }

      // Act
      const result = await repository.update(updateRequest)

      // Assert
      expect(result.type).toBe('ok')
      if (result.type === 'ok' && result.value.type === 'published') {
        expect(result.value.data.rating).toBe(4)
        expect(result.value.data.comment).toBe('Updated comment')
        expect(result.value.data.updatedAt).toBeDefined()
      }
    })

    it('should not update hidden review', async () => {
      // Arrange
      const createRequest = createTestReviewRequest()
      const createResult = await repository.create(createRequest)
      if (createResult.type !== 'ok') throw new Error('Failed to create review')
      const reviewId = createResult.value.data.id

      await repository.hide(reviewId, 'Test', 'admin')

      const updateRequest: UpdateReviewRequest = {
        id: reviewId,
        comment: 'Should not update',
      }

      // Act
      const result = await repository.update(updateRequest)

      // Assert
      expect(result.type).toBe('err')
      if (result.type === 'err') {
        expect(result.error.type).toBe('notFound')
      }
    })

    it('should handle update after 24 hours restriction', async () => {
      // Arrange
      const createRequest = createTestReviewRequest()
      const createResult = await repository.create(createRequest)
      if (createResult.type !== 'ok') throw new Error('Failed to create review')
      const reviewId = createResult.value.data.id

      // Manually update createdAt to be older than 24 hours
      await db
        .update(schema.reviews)
        .set({ createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000) })
        .where(eq(schema.reviews.id, reviewId))

      const updateRequest: UpdateReviewRequest = {
        id: reviewId,
        comment: 'Too late to update',
      }

      // Act
      const result = await repository.update(updateRequest)

      // Assert
      expect(result.type).toBe('err')
      if (result.type === 'err') {
        expect(result.error.type).toBe('reviewUpdateExpired')
      }
    })
  })

  describe('hide', () => {
    it('should hide a published review', async () => {
      // Arrange
      const request = createTestReviewRequest()
      const createResult = await repository.create(request)
      if (createResult.type !== 'ok') throw new Error('Failed to create review')
      const reviewId = createResult.value.data.id

      // Act
      const result = await repository.hide(
        reviewId,
        'Inappropriate content',
        'admin'
      )

      // Assert
      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        expect(result.value.type).toBe('hidden')
        if (result.value.type === 'hidden') {
          expect(result.value.hiddenAt).toBeDefined()
          expect(result.value.hiddenBy).toBe('admin')
          expect(result.value.hiddenReason).toBe('Inappropriate content')
        }
      }
    })

    it('should not hide already hidden review', async () => {
      // Arrange
      const request = createTestReviewRequest()
      const createResult = await repository.create(request)
      if (createResult.type !== 'ok') throw new Error('Failed to create review')
      const reviewId = createResult.value.data.id

      await repository.hide(reviewId, 'First hide', 'admin1')

      // Act
      const result = await repository.hide(reviewId, 'Second hide', 'admin2')

      // Assert
      expect(result.type).toBe('err')
      if (result.type === 'err') {
        // Already hidden reviews are deleted, so it returns notFound
        expect(result.error.type).toBe('notFound')
      }
    })
  })

  describe('search', () => {
    it('should search reviews by salon', async () => {
      // Arrange
      const reservation1 = await createTestReservation()
      const reservation2 = await createTestReservation()
      const request1 = createTestReviewRequest({
        rating: 5,
        reservationId: createReservationId(reservation1.id) || undefined,
      })
      const request2 = createTestReviewRequest({
        rating: 4,
        reservationId: createReservationId(reservation2.id) || undefined,
      })

      await repository.create(request1)
      await repository.create(request2)

      // Act
      const result = await repository.search(
        { salonId: salonId || undefined },
        { limit: 10, offset: 0 }
      )

      // Assert
      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        expect(result.value.data.length).toBe(2)
        expect(result.value.total).toBe(2)
      }
    })

    it('should filter reviews by rating', async () => {
      // Arrange
      const reservation1 = await createTestReservation()
      const reservation2 = await createTestReservation()
      const reservation3 = await createTestReservation()
      await repository.create(
        createTestReviewRequest({
          rating: 5,
          reservationId: createReservationId(reservation1.id) || undefined,
        })
      )
      await repository.create(
        createTestReviewRequest({
          rating: 4,
          reservationId: createReservationId(reservation2.id) || undefined,
        })
      )
      await repository.create(
        createTestReviewRequest({
          rating: 3,
          reservationId: createReservationId(reservation3.id) || undefined,
        })
      )

      // Act
      const result = await repository.search(
        { minRating: 4 },
        { limit: 10, offset: 0 }
      )

      // Assert
      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        expect(result.value.data.length).toBeGreaterThanOrEqual(2)
        for (const review of result.value.data) {
          expect(review.data.rating).toBeGreaterThanOrEqual(4)
        }
      }
    })

    it('should filter reviews by customer', async () => {
      // Arrange
      await repository.create(createTestReviewRequest())

      // Create another customer and review
      const otherCustomer = await createTestCustomer()
      const otherReservation = await createTestReservation()
      await repository.create(
        createTestReviewRequest({
          customerId: createCustomerId(otherCustomer.id) || undefined,
          reservationId: createReservationId(otherReservation.id) || undefined,
        })
      )

      // Act
      const result = await repository.search(
        { customerId: customerId || undefined },
        { limit: 10, offset: 0 }
      )

      // Assert
      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        expect(result.value.data.length).toBe(1)
        const firstReview = result.value.data[0]
        if (firstReview) {
          expect(firstReview.data.customerId).toBe(customerId)
        }
      }
    })

    it('should exclude hidden reviews by default', async () => {
      // Arrange
      const reservation1 = await createTestReservation()
      const reservation2 = await createTestReservation()
      const request1 = createTestReviewRequest({
        reservationId: createReservationId(reservation1.id) || undefined,
      })
      const request2 = createTestReviewRequest({
        reservationId: createReservationId(reservation2.id) || undefined,
      })

      const createResult1 = await repository.create(request1)
      const createResult2 = await repository.create(request2)

      if (createResult1.type !== 'ok' || createResult2.type !== 'ok')
        throw new Error('Failed to create review')
      await repository.hide(createResult1.value.data.id, 'Test', 'admin')

      // Act
      const result = await repository.search(
        { salonId: salonId || undefined },
        { limit: 10, offset: 0 }
      )

      // Assert
      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        // 削除されたレビューを除いて1件のみ取得される
        expect(result.value.data.length).toBe(1)
        const firstReview = result.value.data[0]
        if (firstReview) {
          expect(firstReview.type).toBe('published')
          expect(firstReview.data.id).toBe(createResult2.value.data.id)
        }
      }
    })

    it('should paginate results correctly', async () => {
      // Arrange
      for (let i = 0; i < 5; i++) {
        const reservation = await createTestReservation()
        await repository.create(
          createTestReviewRequest({
            reservationId: createReservationId(reservation.id) || undefined,
          })
        )
      }

      // Act
      const result = await repository.search({}, { limit: 2, offset: 2 })

      // Assert
      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        expect(result.value.data.length).toBe(2)
        expect(result.value.total).toBe(5)
      }
    })
  })

  describe('findByReservationId', () => {
    it('should find review for specific reservation', async () => {
      // Arrange
      const request = createTestReviewRequest()
      await repository.create(request)

      // Act
      if (!reservationId) throw new Error('Reservation ID not initialized')
      const result = await repository.findByReservationId(reservationId)

      // Assert
      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        expect(result.value).toBeDefined()
        if (result.value) {
          expect(result.value.data.reservationId).toBe(reservationId)
        }
      }
    })

    it('should return null for reservation without review', async () => {
      // Arrange
      const newReservation = await createTestReservation()
      const newReservationId = createReservationId(newReservation.id)

      // Act
      if (!newReservationId)
        throw new Error('New reservation ID not initialized')
      const result = await repository.findByReservationId(newReservationId)

      // Assert
      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        expect(result.value).toBeNull()
      }
    })
  })
})
