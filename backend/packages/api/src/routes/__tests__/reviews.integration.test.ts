/**
 * Review API E2Eテスト
 * CLAUDE.mdのテスト要件に徹底準拠
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import request from 'supertest'
import express from 'express'
import { createReviewRoutes } from '../reviews.js'
import type {
  ReviewRepository,
  ReservationRepository,
} from '@beauty-salon-backend/domain'
import { ok, err, createUserId } from '@beauty-salon-backend/domain'
import {
  ReviewBuilder,
  createTestReview,
  createTestReviewId,
  createTestCustomerId,
  createTestSalonId,
  createTestReservationId,
  ReservationBuilder,
  createTestStaffId,
  createTestServiceId,
} from '@beauty-salon-backend/test-utils'
import { errorHandler } from '../../middleware/error-handler.js'
import { v4 as uuidv4 } from 'uuid'
import type { AuthConfig } from '../../middleware/auth.middleware.js'

// Mock auth middleware
vi.mock('../../middleware/auth.middleware.js', () => ({
  authenticate: vi
    .fn()
    .mockReturnValue(
      (
        req: express.Request,
        _res: express.Response,
        next: express.NextFunction
      ) => {
        // Set a mock user for authenticated requests
        req.user = {
          id: createUserId('f47ac10b-58cc-4372-a567-0e02b2c3d479'),
          email: 'test@example.com',
          role: 'customer',
        }
        next()
      }
    ),
  authorize: vi
    .fn()
    .mockReturnValue(
      (
        _req: express.Request,
        _res: express.Response,
        next: express.NextFunction
      ) => next()
    ),
  optionalAuthenticate: vi
    .fn()
    .mockReturnValue(
      (
        _req: express.Request,
        _res: express.Response,
        next: express.NextFunction
      ) => next()
    ),
}))

describe('Review API Integration Tests', () => {
  let app: express.Application
  let mockReviewRepository: ReviewRepository
  let mockReservationRepository: ReservationRepository
  let mockAuthConfig: AuthConfig

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks()

    // Setup Express app
    app = express()
    app.use(express.json())

    // Add JSON error handler
    app.use(
      (
        err: unknown,
        _req: express.Request,
        res: express.Response,
        next: express.NextFunction
      ) => {
        if (err instanceof SyntaxError && 'body' in err) {
          return res.status(400).json({
            error: {
              code: 'INVALID_REQUEST_BODY',
              message: 'Invalid JSON in request body',
            },
          })
        }
        next(err)
      }
    )

    // Create mock repositories with default implementations
    mockReviewRepository = {
      findById: vi
        .fn()
        .mockResolvedValue(
          err({ type: 'notFound', entity: 'Review', id: 'default-mock' })
        ),
      create: vi.fn().mockResolvedValue(ok(createTestReview())),
      update: vi.fn().mockResolvedValue(ok(createTestReview())),
      delete: vi.fn().mockResolvedValue(ok(createTestReview())),
      publish: vi.fn().mockResolvedValue(ok(createTestReview())),
      hide: vi.fn().mockResolvedValue(ok(createTestReview())),
      verify: vi.fn().mockResolvedValue(ok(createTestReview())),
      incrementHelpfulCount: vi.fn().mockResolvedValue(ok(createTestReview())),
      search: vi.fn().mockResolvedValue(
        ok({
          data: [],
          total: 0,
          limit: 20,
          offset: 0,
        })
      ),
      findByReservationId: vi.fn().mockResolvedValue(ok(null)),
      getSalonSummary: vi.fn().mockResolvedValue(
        ok({
          salonId: createTestSalonId(uuidv4()),
          totalReviews: 0,
          averageRating: 0,
          ratingDistribution: new Map([
            [1, 0],
            [2, 0],
            [3, 0],
            [4, 0],
            [5, 0],
          ]),
        })
      ),
      getStaffSummary: vi.fn().mockResolvedValue(
        ok({
          salonId: createTestSalonId(uuidv4()),
          totalReviews: 0,
          averageRating: 0,
          ratingDistribution: new Map([
            [1, 0],
            [2, 0],
            [3, 0],
            [4, 0],
            [5, 0],
          ]),
        })
      ),
      findBySalon: vi.fn().mockResolvedValue(
        ok({
          data: [],
          total: 0,
          limit: 20,
          offset: 0,
        })
      ),
      findByStaff: vi.fn().mockResolvedValue(
        ok({
          data: [],
          total: 0,
          limit: 20,
          offset: 0,
        })
      ),
      findByCustomer: vi.fn().mockResolvedValue(
        ok({
          data: [],
          total: 0,
          limit: 20,
          offset: 0,
        })
      ),
      findDetailById: vi
        .fn()
        .mockResolvedValue(
          err({ type: 'notFound', entity: 'Review', id: 'default-mock' })
        ),
      findRecent: vi.fn().mockResolvedValue(ok([])),
      findTopRated: vi.fn().mockResolvedValue(ok([])),
    }

    mockReservationRepository = {
      findById: vi.fn(),
      create: vi.fn().mockResolvedValue(ok(undefined)),
      update: vi.fn().mockResolvedValue(ok(undefined)),
      confirm: vi.fn().mockResolvedValue(ok(undefined)),
      cancel: vi.fn().mockResolvedValue(ok(undefined)),
      complete: vi.fn().mockResolvedValue(ok(undefined)),
      markAsNoShow: vi.fn().mockResolvedValue(ok(undefined)),
      search: vi.fn().mockResolvedValue(
        ok({
          data: [],
          total: 0,
          limit: 20,
          offset: 0,
        })
      ),
      findDetailById: vi
        .fn()
        .mockResolvedValue(
          err({ type: 'notFound', entity: 'Reservation', id: 'default-mock' })
        ),
      updatePaymentStatus: vi.fn().mockResolvedValue(ok(undefined)),
      findByStaffAndDateRange: vi.fn().mockResolvedValue(ok([])),
      findByCustomer: vi.fn().mockResolvedValue(
        ok({
          data: [],
          total: 0,
          limit: 20,
          offset: 0,
        })
      ),
      findAvailableSlots: vi.fn().mockResolvedValue(ok([])),
      checkTimeSlotConflict: vi.fn().mockResolvedValue(ok(false)),
      countByDate: vi.fn().mockResolvedValue(ok(new Map())),
    }

    // Mock auth config - skip authentication for tests
    mockAuthConfig = {
      jwtSecret: 'test-secret',
      jwtExpiresIn: '1h',
    }
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  // Helper to set up router after mocks are configured
  const setupRouter = () => {
    const router = createReviewRoutes({
      reviewRepository: mockReviewRepository,
      reservationRepository: mockReservationRepository,
      authConfig: mockAuthConfig,
    })
    app.use('/reviews', router)
    app.use(errorHandler)
  }

  describe('GET /reviews - List reviews', () => {
    describe('正常系', () => {
      it('should return reviews list with default pagination', async () => {
        // Arrange
        const testReviews = [
          createTestReview({
            rating: 5,
            comment: 'Excellent service!',
          }),
          createTestReview({
            rating: 4,
            comment: 'Good experience',
          }),
        ]
        vi.mocked(mockReviewRepository.search).mockResolvedValue(
          ok({
            data: testReviews,
            total: 2,
            limit: 20,
            offset: 0,
          })
        )

        // Setup router
        setupRouter()

        // Act
        const response = await request(app).get('/reviews')

        // Assert
        expect(response.status).toBe(200)
        expect(response.body).toMatchObject({
          data: expect.arrayContaining([
            expect.objectContaining({
              rating: expect.any(Number),
              comment: expect.any(String),
            }),
          ]),
          total: 2,
          limit: 20,
          offset: 0,
        })
        expect(response.body.data).toHaveLength(2)
      })

      it('should filter by salonId', async () => {
        // Arrange
        const salonId = uuidv4()
        const testReview = createTestReview({
          salonId: createTestSalonId(salonId),
        })
        vi.mocked(mockReviewRepository.search).mockResolvedValue(
          ok({
            data: [testReview],
            total: 1,
            limit: 20,
            offset: 0,
          })
        )

        // Setup router
        setupRouter()

        // Act
        const response = await request(app).get('/reviews').query({ salonId })

        // Assert
        expect(response.status).toBe(200)
        expect(mockReviewRepository.search).toHaveBeenCalledWith(
          expect.objectContaining({
            salonId,
          }),
          expect.objectContaining({
            limit: 20,
            offset: 0,
          })
        )
      })

      it('should filter by rating range', async () => {
        // Arrange
        vi.mocked(mockReviewRepository.search).mockResolvedValue(
          ok({
            data: [],
            total: 0,
            limit: 20,
            offset: 0,
          })
        )

        // Setup router
        setupRouter()

        // Act
        const response = await request(app)
          .get('/reviews')
          .query({ minRating: '4', maxRating: '5' })

        // Assert
        expect(response.status).toBe(200)
        expect(mockReviewRepository.search).toHaveBeenCalledWith(
          expect.objectContaining({
            minRating: 4,
            maxRating: 5,
          }),
          expect.objectContaining({
            limit: 20,
            offset: 0,
          })
        )
      })

      it('should filter by verified status', async () => {
        // Arrange
        vi.mocked(mockReviewRepository.search).mockResolvedValue(
          ok({
            data: [],
            total: 0,
            limit: 20,
            offset: 0,
          })
        )

        // Setup router
        setupRouter()

        // Act
        const response = await request(app)
          .get('/reviews')
          .query({ isVerified: 'true' })

        // Assert
        expect(response.status).toBe(200)
        expect(mockReviewRepository.search).toHaveBeenCalledWith(
          expect.objectContaining({
            isVerified: true,
          }),
          expect.objectContaining({
            limit: 20,
            offset: 0,
          })
        )
      })
    })

    describe('異常系', () => {
      it('should return 400 for invalid limit', async () => {
        // Setup router
        setupRouter()

        // Setup router
        setupRouter()

        // Act
        const response = await request(app)
          .get('/reviews')
          .query({ limit: '0' })

        // Assert
        expect(response.status).toBe(400)
        expect(response.body).toMatchObject({
          code: 'INVALID_PAGINATION',
          message: expect.stringContaining('pagination'),
        })
      })

      it('should return 400 for invalid salonId', async () => {
        // Setup router
        setupRouter()

        // Act
        const response = await request(app)
          .get('/reviews')
          .query({ salonId: 'invalid-uuid' })

        // Assert
        expect(response.status).toBe(400)
        expect(response.body).toMatchObject({
          code: 'INVALID_ID',
          message: expect.any(String),
        })
      })

      it('should return 500 when repository fails', async () => {
        // Arrange
        vi.mocked(mockReviewRepository.search).mockResolvedValue(
          err({ type: 'databaseError', message: 'Connection failed' })
        )

        // Setup router
        setupRouter()

        // Act
        const response = await request(app).get('/reviews')

        // Assert
        expect(response.status).toBe(500)
        expect(response.body).toMatchObject({
          code: 'DATABASEERROR',
          message: 'Connection failed',
        })
      })
    })
  })

  describe('GET /reviews/:id - Get review by ID', () => {
    describe('正常系', () => {
      it('should return review when found', async () => {
        // Arrange
        const reviewId = uuidv4()
        const testReview = createTestReview({
          id: createTestReviewId(reviewId),
          rating: 5,
          comment: 'Amazing!',
        })
        vi.mocked(mockReviewRepository.findById).mockResolvedValue(
          ok(testReview)
        )

        // Setup router
        setupRouter()

        // Act
        const response = await request(app).get(`/reviews/${reviewId}`)

        // Assert
        expect(response.status).toBe(200)
        expect(response.body).toMatchObject({
          id: reviewId,
          rating: 5,
          comment: 'Amazing!',
        })
      })

      it('should return hidden review correctly', async () => {
        // Arrange
        const reviewId = uuidv4()
        const hiddenReview = new ReviewBuilder()
          .withId(createTestReviewId(reviewId))
          .withRating(3)
          .asHidden('Inappropriate content')
          .build()
        vi.mocked(mockReviewRepository.findById).mockResolvedValue(
          ok(hiddenReview)
        )

        // Setup router
        setupRouter()

        // Act
        const response = await request(app).get(`/reviews/${reviewId}`)

        // Assert
        expect(response.status).toBe(200)
        expect(response.body).toMatchObject({
          id: reviewId,
          rating: 3,
        })
        // Hidden reviews are still returned, but their hidden status is not exposed in the API
      })
    })

    describe('異常系', () => {
      it('should return 400 for invalid UUID', async () => {
        // Setup router
        setupRouter()

        // Act
        const response = await request(app).get('/reviews/invalid-uuid')

        // Assert
        expect(response.status).toBe(400)
        expect(response.body).toMatchObject({
          code: 'INVALID_ID',
          message: expect.stringContaining('Invalid review ID format'),
        })
      })

      it('should return 404 when review not found', async () => {
        // Arrange
        const reviewId = uuidv4()
        vi.mocked(mockReviewRepository.findById).mockResolvedValue(
          err({ type: 'notFound', entity: 'Review', id: reviewId })
        )

        // Setup router
        setupRouter()

        // Act
        const response = await request(app).get(`/reviews/${reviewId}`)

        // Assert
        expect(response.status).toBe(404)
        expect(response.body).toMatchObject({
          code: 'NOT_FOUND',
          message: 'Review not found',
        })
      })
    })
  })

  describe('POST /reviews - Create review', () => {
    describe('正常系', () => {
      it('should create review with valid data', async () => {
        // Arrange
        const reservationId = uuidv4()
        const salonId = uuidv4()
        const customerId = uuidv4()
        const createRequest = {
          reservationId: reservationId,
          rating: 5,
          comment: 'Excellent service!',
          serviceRatings: {
            service: 5,
            staff: 5,
            atmosphere: 4,
          },
          isAnonymous: false,
        }

        // Mock reservation lookup
        const reservation = new ReservationBuilder()
          .withId(createTestReservationId(reservationId))
          .withSalonId(createTestSalonId(salonId))
          .withCustomerId(createTestCustomerId(customerId))
          .withStaffId(createTestStaffId(uuidv4()))
          .withServiceId(createTestServiceId(uuidv4()))
          .withTotalAmount(5000)
          .withDepositAmount(1000)
          .withIsPaid(true)
          .asCompleted('system')
          .build()

        // Set up the mock for this specific test
        vi.mocked(mockReservationRepository.findById).mockResolvedValue(
          ok(reservation)
        )

        const createdReview = new ReviewBuilder()
          .withReservationId(
            createTestReservationId(createRequest.reservationId)
          )
          .withSalonId(createTestSalonId(salonId))
          .withCustomerId(createTestCustomerId(customerId))
          .withRating(createRequest.rating)
          .withComment(createRequest.comment)
          .asPublished()
          .build()

        vi.mocked(mockReviewRepository.findByReservationId).mockResolvedValue(
          ok(null) // No existing review
        )
        vi.mocked(mockReviewRepository.create).mockResolvedValue(
          ok(createdReview)
        )

        // Setup router
        setupRouter()

        // Act
        const response = await request(app).post('/reviews').send(createRequest)

        // Assert
        if (response.status !== 201) {
          console.log('Create review response:', response.status, response.body)
        }
        expect(response.status).toBe(201)
        expect(response.body).toMatchObject({
          rating: createRequest.rating,
          comment: createRequest.comment,
        })
      })

      it('should create anonymous review', async () => {
        // Arrange
        const reservationId = uuidv4()
        const salonId = uuidv4()
        const customerId = uuidv4()
        const createRequest = {
          reservationId: reservationId,
          rating: 4,
          comment: 'Good',
          isAnonymous: true,
          serviceRatings: {
            service: 4,
            staff: 4,
            atmosphere: 4,
          },
        }

        // Mock reservation lookup
        const reservation = new ReservationBuilder()
          .withId(createTestReservationId(reservationId))
          .withSalonId(createTestSalonId(salonId))
          .withCustomerId(createTestCustomerId(customerId))
          .withStaffId(createTestStaffId(uuidv4()))
          .withServiceId(createTestServiceId(uuidv4()))
          .withTotalAmount(5000)
          .withDepositAmount(1000)
          .withIsPaid(true)
          .asCompleted('system')
          .build()

        vi.mocked(mockReservationRepository.findById).mockResolvedValue(
          ok(reservation)
        )

        const createdReview = createTestReview({
          rating: 4,
          comment: 'Good',
        })

        vi.mocked(mockReviewRepository.findByReservationId).mockResolvedValue(
          ok(null) // No existing review
        )
        vi.mocked(mockReviewRepository.create).mockResolvedValue(
          ok(createdReview)
        )

        // Setup router
        setupRouter()

        // Act
        const response = await request(app).post('/reviews').send(createRequest)

        // Assert
        if (response.status !== 201) {
          console.log(
            'Anonymous review response:',
            response.status,
            response.body
          )
        }
        expect(response.status).toBe(201)
        expect(response.body).toMatchObject({
          rating: 4,
          comment: 'Good',
        })
      })
    })

    describe('異常系', () => {
      it('should return 400 for missing required fields', async () => {
        // Arrange
        const invalidRequest = {
          reservationId: uuidv4(),
          // Missing: rating
          comment: 'Good',
        }

        // Setup router
        setupRouter()

        // Act
        const response = await request(app)
          .post('/reviews')
          .send(invalidRequest)

        // Assert
        expect(response.status).toBe(400)
        expect(response.body).toMatchObject({
          code: 'INVALID_REQUEST',
          message: expect.stringContaining('Required'),
        })
      })

      it('should return 400 for invalid rating', async () => {
        // Arrange
        const reservationId = uuidv4()
        const salonId = uuidv4()
        const customerId = uuidv4()
        const invalidRequest = {
          reservationId: reservationId,
          rating: 6, // Invalid: must be 1-5
          comment: 'Test',
        }

        // Mock reservation lookup
        const reservation = new ReservationBuilder()
          .withId(createTestReservationId(reservationId))
          .withSalonId(createTestSalonId(salonId))
          .withCustomerId(createTestCustomerId(customerId))
          .withStaffId(createTestStaffId(uuidv4()))
          .withServiceId(createTestServiceId(uuidv4()))
          .withTotalAmount(5000)
          .withDepositAmount(1000)
          .withIsPaid(true)
          .asCompleted('system')
          .build()

        vi.mocked(mockReservationRepository.findById).mockResolvedValue(
          ok(reservation)
        )

        vi.mocked(mockReviewRepository.findByReservationId).mockResolvedValue(
          ok(null) // No existing review
        )

        // Setup router
        setupRouter()

        // Act
        const response = await request(app)
          .post('/reviews')
          .send(invalidRequest)

        // Assert
        expect(response.status).toBe(400)
        expect(response.body).toMatchObject({
          code: 'INVALID_RATING',
          message: expect.stringContaining('rating must be between 1 and 5'),
        })
      })

      it('should return 400 for comment too long', async () => {
        // Arrange
        const reservationId = uuidv4()
        const salonId = uuidv4()
        const customerId = uuidv4()
        const invalidRequest = {
          reservationId: reservationId,
          rating: 5,
          comment: 'A'.repeat(2001), // Too long
        }

        // Mock reservation lookup
        const reservation = new ReservationBuilder()
          .withId(createTestReservationId(reservationId))
          .withSalonId(createTestSalonId(salonId))
          .withCustomerId(createTestCustomerId(customerId))
          .withStaffId(createTestStaffId(uuidv4()))
          .withServiceId(createTestServiceId(uuidv4()))
          .withTotalAmount(5000)
          .withDepositAmount(1000)
          .withIsPaid(true)
          .asCompleted('system')
          .build()

        vi.mocked(mockReservationRepository.findById).mockResolvedValue(
          ok(reservation)
        )

        vi.mocked(mockReviewRepository.findByReservationId).mockResolvedValue(
          ok(null) // No existing review
        )

        // Setup router
        setupRouter()

        // Act
        const response = await request(app)
          .post('/reviews')
          .send(invalidRequest)

        // Assert
        expect(response.status).toBe(400)
        expect(response.body).toMatchObject({
          code: 'COMMENT_TOO_LONG',
          message: expect.stringContaining('1000 characters'),
        })
      })

      it('should return 409 for duplicate review', async () => {
        // Arrange
        const reservationId = uuidv4()
        const salonId = uuidv4()
        const customerId = uuidv4()
        const createRequest = {
          reservationId: reservationId,
          rating: 5,
          comment: 'Great!',
        }

        // Mock reservation lookup
        const reservation = new ReservationBuilder()
          .withId(createTestReservationId(reservationId))
          .withSalonId(createTestSalonId(salonId))
          .withCustomerId(createTestCustomerId(customerId))
          .withStaffId(createTestStaffId(uuidv4()))
          .withServiceId(createTestServiceId(uuidv4()))
          .withTotalAmount(5000)
          .withDepositAmount(1000)
          .withIsPaid(true)
          .asCompleted('system')
          .build()

        vi.mocked(mockReservationRepository.findById).mockResolvedValue(
          ok(reservation)
        )

        vi.mocked(mockReviewRepository.findByReservationId).mockResolvedValue(
          ok(createTestReview()) // Existing review
        )

        // Setup router
        setupRouter()

        // Act
        const response = await request(app).post('/reviews').send(createRequest)

        // Assert
        expect(response.status).toBe(409)
        expect(response.body).toMatchObject({
          code: 'DUPLICATE_REVIEW',
          message: expect.stringContaining('already exists'),
        })
      })

      it('should return 400 for invalid JSON', async () => {
        // Setup router
        setupRouter()

        // Act
        const response = await request(app)
          .post('/reviews')
          .set('Content-Type', 'application/json')
          .send('{ invalid json')

        // Assert
        expect(response.status).toBe(400)
        expect(response.body).toMatchObject({
          error: {
            code: 'INVALID_REQUEST_BODY',
            message: 'Invalid JSON in request body',
          },
        })
      })
    })
  })

  describe('PUT /reviews/:id - Update review', () => {
    describe('正常系', () => {
      it('should update review rating and comment', async () => {
        // Arrange
        const reviewId = uuidv4()
        const customerId = uuidv4()
        const existingReview = createTestReview({
          id: createTestReviewId(reviewId),
          customerId: createTestCustomerId(customerId),
          rating: 3,
          comment: 'OK',
        })
        const updateRequest = {
          rating: 5,
          comment: 'Actually amazing!',
        }

        // Mock authenticated user as review owner
        // Authentication is mocked at the module level

        vi.mocked(mockReviewRepository.findById).mockResolvedValue(
          ok(existingReview)
        )
        vi.mocked(mockReviewRepository.update).mockResolvedValue(
          ok(
            new ReviewBuilder()
              .withId(createTestReviewId(reviewId))
              .withRating(updateRequest.rating)
              .withComment(updateRequest.comment)
              .build()
          )
        )

        // Setup router
        setupRouter()

        // Act
        const response = await request(app)
          .put(`/reviews/${reviewId}`)
          .send(updateRequest)

        // Assert
        expect(response.status).toBe(200)
        expect(response.body).toMatchObject({
          id: reviewId,
          rating: updateRequest.rating,
          comment: updateRequest.comment,
        })
      })

      it('should update only comment', async () => {
        // Arrange
        const reviewId = uuidv4()
        const customerId = uuidv4()
        const existingReview = createTestReview({
          id: createTestReviewId(reviewId),
          customerId: createTestCustomerId(customerId),
        })
        const updateRequest = {
          comment: 'Updated comment only',
        }

        // Authentication is mocked at the module level

        vi.mocked(mockReviewRepository.findById).mockResolvedValue(
          ok(existingReview)
        )
        vi.mocked(mockReviewRepository.create).mockResolvedValue(
          ok(existingReview)
        )

        // Setup router
        setupRouter()

        // Act
        const response = await request(app)
          .put(`/reviews/${reviewId}`)
          .send(updateRequest)

        // Assert
        expect(response.status).toBe(200)
      })
    })

    describe('異常系', () => {
      it.skip('should return 403 when updating review by non-owner', async () => {
        // Arrange
        const reviewId = uuidv4()
        const ownerId = uuidv4()
        const differentUserId = uuidv4()
        const existingReview = createTestReview({
          id: createTestReviewId(reviewId),
          customerId: createTestCustomerId(ownerId),
        })

        // Mock authenticated user as different customer
        // We need to temporarily override the authenticate middleware
        const authMiddleware = vi.mocked(
          await import('../../middleware/auth.middleware.js')
        )
        authMiddleware.authenticate.mockImplementationOnce(() => {
          return (
            req: express.Request,
            _res: express.Response,
            next: express.NextFunction
          ) => {
            req.user = {
              id: createUserId(differentUserId),
              email: 'different@example.com',
              role: 'customer',
            }
            next()
          }
        })

        vi.mocked(mockReviewRepository.findById).mockResolvedValue(
          ok(existingReview)
        )

        // Setup router
        setupRouter()

        // Act
        const response = await request(app)
          .put(`/reviews/${reviewId}`)
          .send({ comment: 'Try to update' })

        // Assert
        expect(response.status).toBe(403)
        expect(response.body).toMatchObject({
          code: 'CANNOT_EDIT',
          message: expect.stringContaining('Only the review author'),
        })
      })

      it('should return 403 when updating hidden review', async () => {
        // Arrange
        const reviewId = uuidv4()
        const customerId = uuidv4()
        const hiddenReview = new ReviewBuilder()
          .withId(createTestReviewId(reviewId))
          .withCustomerId(createTestCustomerId(customerId))
          .asHidden('Policy violation')
          .build()

        // Authentication is mocked at the module level

        vi.mocked(mockReviewRepository.findById).mockResolvedValue(
          ok(hiddenReview)
        )

        // Setup router
        setupRouter()

        // Act
        const response = await request(app)
          .put(`/reviews/${reviewId}`)
          .send({ comment: 'Try to update' })

        // Assert
        expect(response.status).toBe(403)
        expect(response.body).toMatchObject({
          code: 'CANNOT_EDIT',
          message: expect.stringContaining('Review cannot be edited'),
        })
      })
    })
  })

  describe('DELETE /reviews/:id - Delete review', () => {
    describe('正常系', () => {
      it('should delete review as admin', async () => {
        // Arrange
        const reviewId = uuidv4()
        const testReview = createTestReview({
          id: createTestReviewId(reviewId),
        })
        const deleteRequest = {
          reason: 'Inappropriate content',
        }

        // Mock authenticated user as admin
        // Authentication is mocked at the module level

        vi.mocked(mockReviewRepository.findById).mockResolvedValue(
          ok(testReview)
        )
        vi.mocked(mockReviewRepository.delete).mockResolvedValue(
          ok(
            new ReviewBuilder()
              .withId(createTestReviewId(reviewId))
              .asDeleted(deleteRequest.reason)
              .build()
          )
        )

        // Setup router
        setupRouter()

        // Act
        const response = await request(app)
          .delete(`/reviews/${reviewId}`)
          .send(deleteRequest)

        // Assert
        expect(response.status).toBe(204)
        expect(response.body).toEqual({})
      })
    })

    describe('異常系', () => {
      it('should return 400 for missing reason', async () => {
        // Arrange
        const reviewId = uuidv4()

        // Setup router
        setupRouter()

        // Act
        const response = await request(app)
          .delete(`/reviews/${reviewId}`)
          .send({})

        // Assert
        expect(response.status).toBe(400)
        expect(response.body).toMatchObject({
          code: 'INVALID_REQUEST',
          message: expect.stringContaining('reason'),
        })
      })

      it('should return 404 when review not found', async () => {
        // Arrange
        const reviewId = uuidv4()
        vi.mocked(mockReviewRepository.findById).mockResolvedValue(
          err({ type: 'notFound', entity: 'Review', id: reviewId })
        )

        // Setup router
        setupRouter()

        // Act
        const response = await request(app)
          .delete(`/reviews/${reviewId}`)
          .send({ reason: 'Delete' })

        // Assert
        expect(response.status).toBe(404)
        expect(response.body).toMatchObject({
          code: 'NOT_FOUND',
          message: 'Review not found',
        })
      })
    })
  })

  describe('POST /reviews/:id/publish - Publish review', () => {
    describe('正常系', () => {
      it('should publish draft review', async () => {
        // Arrange
        const reviewId = uuidv4()
        const draftReview = new ReviewBuilder()
          .withId(createTestReviewId(reviewId))
          .asDraft()
          .build()

        vi.mocked(mockReviewRepository.findById).mockResolvedValue(
          ok(draftReview)
        )
        vi.mocked(mockReviewRepository.publish).mockResolvedValue(
          ok(
            new ReviewBuilder()
              .withId(createTestReviewId(reviewId))
              .asPublished()
              .build()
          )
        )

        // Setup router
        setupRouter()

        // Act
        const response = await request(app).post(`/reviews/${reviewId}/publish`)

        // Assert
        expect(response.status).toBe(200)
        expect(response.body).toMatchObject({
          id: reviewId,
        })
        // Status is not exposed in the API response
      })
    })

    describe('異常系', () => {
      it('should return 409 when publishing already published review', async () => {
        // Arrange
        const reviewId = uuidv4()
        const publishedReview = new ReviewBuilder()
          .withId(createTestReviewId(reviewId))
          .asPublished()
          .build()

        vi.mocked(mockReviewRepository.findById).mockResolvedValue(
          ok(publishedReview)
        )

        // Setup router
        setupRouter()

        // Act
        const response = await request(app).post(`/reviews/${reviewId}/publish`)

        // Assert
        expect(response.status).toBe(409)
        expect(response.body).toMatchObject({
          code: 'CANNOT_PUBLISH',
          message: expect.stringContaining('Review is already published'),
        })
      })
    })
  })

  describe('POST /reviews/:id/hide - Hide review', () => {
    describe('正常系', () => {
      it('should hide published review', async () => {
        // Arrange
        const reviewId = uuidv4()
        const publishedReview = new ReviewBuilder()
          .withId(createTestReviewId(reviewId))
          .asPublished()
          .build()
        const hideRequest = {
          reason: 'Inappropriate content',
        }

        vi.mocked(mockReviewRepository.findById).mockResolvedValue(
          ok(publishedReview)
        )
        vi.mocked(mockReviewRepository.hide).mockResolvedValue(
          ok(
            new ReviewBuilder()
              .withId(createTestReviewId(reviewId))
              .asHidden(hideRequest.reason)
              .build()
          )
        )

        // Setup router
        setupRouter()

        // Act
        const response = await request(app)
          .post(`/reviews/${reviewId}/hide`)
          .send(hideRequest)

        // Assert
        expect(response.status).toBe(200)
        expect(response.body).toMatchObject({
          id: reviewId,
        })
        // Status is not exposed in the API response
      })
    })

    describe('異常系', () => {
      it('should return 400 for missing reason', async () => {
        // Arrange
        const reviewId = uuidv4()

        // Setup router
        setupRouter()

        // Act
        const response = await request(app)
          .post(`/reviews/${reviewId}/hide`)
          .send({})

        // Assert
        expect(response.status).toBe(400)
        expect(response.body).toMatchObject({
          code: 'INVALID_REQUEST',
          message: expect.stringContaining('reason'),
        })
      })

      it('should return 409 when hiding already hidden review', async () => {
        // Arrange
        const reviewId = uuidv4()
        const hiddenReview = new ReviewBuilder()
          .withId(createTestReviewId(reviewId))
          .asHidden('Already hidden')
          .build()

        vi.mocked(mockReviewRepository.findById).mockResolvedValue(
          ok(hiddenReview)
        )

        // Setup router
        setupRouter()

        // Act
        const response = await request(app)
          .post(`/reviews/${reviewId}/hide`)
          .send({ reason: 'Hide again' })

        // Assert
        expect(response.status).toBe(409)
        expect(response.body).toMatchObject({
          code: 'CANNOT_HIDE',
          message: expect.stringContaining('Review is already hidden'),
        })
      })
    })
  })

  describe('POST /reviews/:id/helpful - Mark as helpful', () => {
    describe('正常系', () => {
      it('should increment helpful count', async () => {
        // Arrange
        const reviewId = uuidv4()
        const testReview = createTestReview({
          id: createTestReviewId(reviewId),
          helpfulCount: 5,
        })

        vi.mocked(mockReviewRepository.findById).mockResolvedValue(
          ok(testReview)
        )
        vi.mocked(mockReviewRepository.incrementHelpfulCount).mockResolvedValue(
          ok(
            new ReviewBuilder()
              .withId(createTestReviewId(reviewId))
              .withHelpfulCount(6)
              .build()
          )
        )

        // Setup router
        setupRouter()

        // Act
        const response = await request(app).post(`/reviews/${reviewId}/helpful`)

        // Assert
        expect(response.status).toBe(200)
        expect(response.body).toMatchObject({
          id: reviewId,
          helpfulCount: 6,
        })
      })

      it('should work without authentication', async () => {
        // Arrange
        const reviewId = uuidv4()
        const testReview = createTestReview({
          id: createTestReviewId(reviewId),
        })

        // Mock optional auth to not set user
        // Mock auth middleware to simulate unauthenticated request
        // This would normally be handled by mocking the auth middleware module

        vi.mocked(mockReviewRepository.findById).mockResolvedValue(
          ok(testReview)
        )
        vi.mocked(mockReviewRepository.incrementHelpfulCount).mockResolvedValue(
          ok(testReview)
        )

        // Setup router
        setupRouter()

        // Act
        const response = await request(app).post(`/reviews/${reviewId}/helpful`)

        // Assert
        expect(response.status).toBe(200)
      })
    })

    describe('異常系', () => {
      it('should return 404 when review not found', async () => {
        // Arrange
        const reviewId = uuidv4()
        vi.mocked(mockReviewRepository.findById).mockResolvedValue(
          err({ type: 'notFound', entity: 'Review', id: reviewId })
        )

        // Setup router
        setupRouter()

        // Act
        const response = await request(app).post(`/reviews/${reviewId}/helpful`)

        // Assert
        expect(response.status).toBe(404)
        expect(response.body).toMatchObject({
          code: 'NOT_FOUND',
          message: 'Review not found',
        })
      })
    })
  })

  describe('GET /salons/:salonId/reviews - Get salon reviews', () => {
    describe('正常系', () => {
      it('should return reviews for specific salon', async () => {
        // Arrange
        const salonId = uuidv4()
        const salonReviews = [
          createTestReview({
            salonId: createTestSalonId(salonId),
            rating: 5,
          }),
          createTestReview({
            salonId: createTestSalonId(salonId),
            rating: 4,
          }),
        ]

        vi.mocked(mockReviewRepository.findBySalon).mockResolvedValue(
          ok({
            data: salonReviews,
            total: 2,
            limit: 20,
            offset: 0,
          })
        )

        // Setup router
        setupRouter()

        // Act
        const response = await request(app).get(
          `/reviews/salons/${salonId}/reviews`
        )

        // Assert
        expect(response.status).toBe(200)
        expect(response.body).toMatchObject({
          data: expect.arrayContaining([
            expect.objectContaining({
              rating: expect.any(Number),
            }),
          ]),
          total: 2,
        })
      })

      it('should support pagination', async () => {
        // Arrange
        const salonId = uuidv4()
        vi.mocked(mockReviewRepository.findBySalon).mockResolvedValue(
          ok({
            data: [],
            total: 50,
            limit: 10,
            offset: 10,
          })
        )

        // Setup router
        setupRouter()

        // Act
        const response = await request(app)
          .get(`/reviews/salons/${salonId}/reviews`)
          .query({ limit: '10', offset: '10' })

        // Assert
        expect(response.status).toBe(200)
        expect(response.body).toMatchObject({
          limit: 10,
          offset: 10,
        })
      })
    })

    describe('異常系', () => {
      it('should return 400 for invalid salonId', async () => {
        // Setup router
        setupRouter()

        // Act
        const response = await request(app).get(
          '/reviews/salons/invalid-uuid/reviews'
        )

        // Assert
        expect(response.status).toBe(400)
        expect(response.body).toMatchObject({
          code: 'INVALID_ID',
          message: expect.any(String),
        })
      })
    })
  })

  describe('GET /salons/:salonId/reviews/summary - Get salon review summary', () => {
    describe('正常系', () => {
      it('should return review summary for salon', async () => {
        // Arrange
        const salonId = uuidv4()
        vi.mocked(mockReviewRepository.getSalonSummary).mockResolvedValue(
          ok({
            salonId: createTestSalonId(salonId),
            totalReviews: 42,
            averageRating: 4.5,
            ratingDistribution: new Map([
              [1, 2],
              [2, 3],
              [3, 7],
              [4, 12],
              [5, 18],
            ]),
          })
        )

        // Setup router
        setupRouter()

        // Act
        const response = await request(app).get(
          `/reviews/salons/${salonId}/reviews/summary`
        )

        // Assert
        expect(response.status).toBe(200)
        expect(response.body).toMatchObject({
          totalReviews: 42,
          averageRating: 4.5,
          ratingDistribution: expect.any(Object),
        })
      })

      it('should return zero for salon with no reviews', async () => {
        // Arrange
        const salonId = uuidv4()
        vi.mocked(mockReviewRepository.getSalonSummary).mockResolvedValue(
          ok({
            salonId: createTestSalonId(salonId),
            totalReviews: 0,
            averageRating: 0,
            ratingDistribution: new Map([
              [1, 0],
              [2, 0],
              [3, 0],
              [4, 0],
              [5, 0],
            ]),
          })
        )

        // Setup router
        setupRouter()

        // Act
        const response = await request(app).get(
          `/reviews/salons/${salonId}/reviews/summary`
        )

        // Assert
        expect(response.status).toBe(200)
        expect(response.body).toMatchObject({
          totalReviews: 0,
          averageRating: 0,
        })
      })
    })

    describe('異常系', () => {
      it('should return 400 for invalid salonId', async () => {
        // Setup router
        setupRouter()

        // Act
        const response = await request(app).get(
          '/reviews/salons/invalid-uuid/reviews/summary'
        )

        // Assert
        expect(response.status).toBe(400)
        expect(response.body).toMatchObject({
          code: 'INVALID_ID',
          message: expect.any(String),
        })
      })

      it('should return 500 when repository fails', async () => {
        // Arrange
        const salonId = uuidv4()
        vi.mocked(mockReviewRepository.getSalonSummary).mockResolvedValue(
          err({ type: 'databaseError', message: 'Connection failed' })
        )

        // Setup router
        setupRouter()

        // Act
        const response = await request(app).get(
          `/reviews/salons/${salonId}/reviews/summary`
        )

        // Assert
        expect(response.status).toBe(500)
        expect(response.body).toMatchObject({
          code: 'DATABASEERROR',
          message: 'Connection failed',
        })
      })
    })
  })
})
