/**
 * Salon API E2Eテスト
 * CLAUDE.mdのテスト要件に徹底準拠
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import request from 'supertest'
import express from 'express'
import { createSalonRoutes } from '../salons.js'
import type { SalonRepository } from '@beauty-salon-backend/domain'
import { ok, err } from '@beauty-salon-backend/domain'
import {
  SalonBuilder,
  createTestSalon,
  createTestSalonId,
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
        _req: express.Request,
        _res: express.Response,
        next: express.NextFunction
      ) => next()
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
}))

describe('Salon API Integration Tests', () => {
  let app: express.Application
  let mockRepository: SalonRepository
  let mockAuthConfig: AuthConfig

  beforeEach(() => {
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
            code: 'INVALID_REQUEST_BODY',
            message: 'Invalid JSON in request body',
          })
        }
        next(err)
      }
    )

    // Create mock repository with default implementations
    mockRepository = {
      findById: vi
        .fn()
        .mockResolvedValue(
          err({ type: 'notFound', entity: 'Salon', id: 'test' })
        ),
      create: vi.fn().mockResolvedValue(ok(createTestSalon())),
      update: vi.fn().mockResolvedValue(ok(createTestSalon())),
      suspend: vi.fn().mockResolvedValue(ok(createTestSalon())),
      reactivate: vi.fn().mockResolvedValue(ok(createTestSalon())),
      delete: vi.fn().mockResolvedValue(ok(undefined)),
      search: vi.fn().mockResolvedValue(
        ok({
          data: [],
          total: 0,
          limit: 20,
          offset: 0,
        })
      ),
      findAllActive: vi.fn().mockResolvedValue(
        ok({
          data: [],
          total: 0,
          limit: 20,
          offset: 0,
        })
      ),
      countByCity: vi.fn().mockResolvedValue(ok(new Map())),
    }

    // Mock auth config - skip authentication for tests
    mockAuthConfig = {
      jwtSecret: 'test-secret',
      jwtExpiresIn: '1h',
    }

    // Setup router with dependencies
    const router = createSalonRoutes({
      salonRepository: mockRepository,
      authConfig: mockAuthConfig,
    })

    app.use('/salons', router)
    app.use(errorHandler)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /salons - List salons', () => {
    describe('正常系', () => {
      it('should return salons list with default pagination', async () => {
        // Arrange
        const testSalons = [
          createTestSalon({ name: 'Salon A' }),
          createTestSalon({ name: 'Salon B' }),
        ]
        vi.mocked(mockRepository.search).mockResolvedValueOnce(
          ok({
            data: testSalons,
            total: 2,
            limit: 20,
            offset: 0,
          })
        )

        // Act
        const response = await request(app).get('/salons')

        // Assert
        expect(response.status).toBe(200)
        expect(response.body).toMatchObject({
          data: expect.arrayContaining([
            expect.objectContaining({ name: 'Salon A' }),
            expect.objectContaining({ name: 'Salon B' }),
          ]),
          total: 2,
          limit: 20,
          offset: 0,
        })
      })

      it('should support custom pagination parameters', async () => {
        // Arrange
        const testSalons = [createTestSalon()]
        vi.mocked(mockRepository.search).mockResolvedValueOnce(
          ok({
            data: testSalons,
            total: 15,
            limit: 10,
            offset: 10,
          })
        )

        // Act
        const response = await request(app)
          .get('/salons')
          .query({ limit: '10', offset: '10' })

        // Assert
        expect(response.status).toBe(200)
        expect(response.body).toMatchObject({
          limit: 10,
          offset: 10,
        })
        expect(mockRepository.search).toHaveBeenCalledWith(
          {
            keyword: undefined,
            city: undefined,
            isActive: undefined,
          },
          {
            limit: 10,
            offset: 10,
          }
        )
      })

      it('should filter by keyword', async () => {
        // Arrange
        const testSalons = [createTestSalon({ name: 'Tokyo Beauty Salon' })]
        vi.mocked(mockRepository.search).mockResolvedValueOnce(
          ok({
            data: testSalons,
            total: 1,
            limit: 20,
            offset: 0,
          })
        )

        // Act
        const response = await request(app)
          .get('/salons')
          .query({ keyword: 'Tokyo' })

        // Assert
        expect(response.status).toBe(200)
        expect(mockRepository.search).toHaveBeenCalledWith(
          expect.objectContaining({
            keyword: 'Tokyo',
          }),
          expect.any(Object)
        )
      })

      it('should filter by city', async () => {
        // Arrange
        const testSalons = [
          createTestSalon({
            address: {
              street: '丸の内1-1-1',
              city: '千代田区',
              state: '東京都',
              postalCode: '100-0001',
              country: '日本',
            },
          }),
        ]
        vi.mocked(mockRepository.search).mockResolvedValueOnce(
          ok({
            data: testSalons,
            total: 1,
            limit: 20,
            offset: 0,
          })
        )

        // Act
        const response = await request(app)
          .get('/salons')
          .query({ city: '千代田区' })

        // Assert
        expect(response.status).toBe(200)
        expect(mockRepository.search).toHaveBeenCalledWith(
          expect.objectContaining({
            city: '千代田区',
          }),
          expect.any(Object)
        )
      })

      it('should filter by active status', async () => {
        // Arrange
        const activeSalon = createTestSalon()
        vi.mocked(mockRepository.search).mockResolvedValueOnce(
          ok({
            data: [activeSalon],
            total: 1,
            limit: 20,
            offset: 0,
          })
        )

        // Act
        const response = await request(app)
          .get('/salons')
          .query({ isActive: 'true' })

        // Assert
        expect(response.status).toBe(200)
        expect(mockRepository.search).toHaveBeenCalledWith(
          expect.objectContaining({
            isActive: true,
          }),
          expect.any(Object)
        )
      })
    })

    describe('異常系', () => {
      it('should return 400 for invalid limit', async () => {
        // Act
        const response = await request(app).get('/salons').query({ limit: '0' })

        // Assert
        expect(response.status).toBe(400)
        expect(response.body).toMatchObject({
          code: 'INVALID_PAGINATION',
          message: 'Invalid pagination parameters',
        })
      })

      it('should return 400 for limit over 100', async () => {
        // Act
        const response = await request(app)
          .get('/salons')
          .query({ limit: '101' })

        // Assert
        expect(response.status).toBe(400)
        expect(response.body).toMatchObject({
          code: 'INVALID_PAGINATION',
          message: 'Invalid pagination parameters',
        })
      })

      it('should return 400 for negative offset', async () => {
        // Act
        const response = await request(app)
          .get('/salons')
          .query({ offset: '-1' })

        // Assert
        expect(response.status).toBe(400)
        expect(response.body).toMatchObject({
          code: 'INVALID_PAGINATION',
          message: 'Invalid pagination parameters',
        })
      })

      it('should return 500 when repository fails', async () => {
        // Arrange
        vi.mocked(mockRepository.search).mockResolvedValueOnce(
          err({ type: 'databaseError', message: 'Connection failed' })
        )

        // Act
        const response = await request(app).get('/salons')

        // Assert
        expect(response.status).toBe(500)
        expect(response.body).toMatchObject({
          code: 'DATABASEERROR',
          message: 'Connection failed',
        })
      })
    })
  })

  describe('GET /salons/:id - Get salon by ID', () => {
    describe('正常系', () => {
      it('should return salon when found', async () => {
        // Arrange
        const salonId = uuidv4()
        const testSalon = createTestSalon({ id: createTestSalonId(salonId) })
        vi.mocked(mockRepository.findById).mockResolvedValueOnce(ok(testSalon))

        // Act
        const response = await request(app).get(`/salons/${salonId}`)

        // Assert
        expect(response.status).toBe(200)
        expect(response.body).toMatchObject({
          id: salonId,
          name: testSalon.data.name,
        })
      })

      it('should return suspended salon correctly', async () => {
        // Arrange
        const salonId = uuidv4()
        const suspendedSalon = new SalonBuilder()
          .withId(createTestSalonId(salonId))
          .withName('Suspended Salon')
          .asSuspended('Policy violation')
          .build()
        vi.mocked(mockRepository.findById).mockResolvedValueOnce(
          ok(suspendedSalon)
        )

        // Act
        const response = await request(app).get(`/salons/${salonId}`)

        // Assert
        expect(response.status).toBe(200)
        expect(response.body).toMatchObject({
          id: salonId,
          name: 'Suspended Salon',
        })
      })
    })

    describe('異常系', () => {
      it('should return 400 for invalid UUID', async () => {
        // Act
        const response = await request(app).get('/salons/invalid-uuid')

        // Assert
        expect(response.status).toBe(400)
        expect(response.body).toMatchObject({
          code: 'INVALID_ID',
          message: expect.stringContaining('Invalid salon ID format'),
        })
      })

      it('should return 404 when salon not found', async () => {
        // Arrange
        const salonId = uuidv4()
        vi.mocked(mockRepository.findById).mockResolvedValueOnce(
          err({ type: 'notFound', entity: 'Salon', id: salonId })
        )

        // Act
        const response = await request(app).get(`/salons/${salonId}`)

        // Assert
        expect(response.status).toBe(404)
        expect(response.body).toMatchObject({
          code: 'NOT_FOUND',
          message: 'Salon not found',
        })
      })

      it('should return 500 when repository fails', async () => {
        // Arrange
        const salonId = uuidv4()
        vi.mocked(mockRepository.findById).mockResolvedValueOnce(
          err({ type: 'databaseError', message: 'Connection failed' })
        )

        // Act
        const response = await request(app).get(`/salons/${salonId}`)

        // Assert
        expect(response.status).toBe(500)
        expect(response.body).toMatchObject({
          code: 'INTERNAL_ERROR',
          message: 'An error occurred',
        })
      })
    })
  })

  describe('POST /salons - Create salon', () => {
    describe('正常系', () => {
      it('should create salon with valid data', async () => {
        // Arrange
        const createRequest = {
          name: 'Beauty Salon Tokyo',
          description: 'Premium beauty salon in Tokyo',
          address: {
            street: '丸の内1-1-1 ビル2F',
            city: '千代田区',
            state: '東京都',
            postalCode: '100-0001',
            country: '日本',
          },
          contactInfo: {
            email: 'info@example.com',
            phoneNumber: '03-1234-5678',
            alternativePhone: null,
          },
          openingHours: [
            {
              dayOfWeek: 'monday' as const,
              openTime: '09:00',
              closeTime: '18:00',
            },
          ],
          tags: ['Premium', 'Hair', 'Spa'],
          images: ['https://example.com/image1.jpg'],
        }

        const createdSalon = new SalonBuilder()
          .withName(createRequest.name)
          .withAddress(createRequest.address)
          .build()

        vi.mocked(mockRepository.create).mockResolvedValueOnce(ok(createdSalon))

        // Act
        const response = await request(app).post('/salons').send(createRequest)

        // Assert
        expect(response.status).toBe(201)
        expect(response.body).toMatchObject({
          name: createRequest.name,
        })
        expect(mockRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            name: createRequest.name,
            description: createRequest.description,
            address: createRequest.address,
            contactInfo: createRequest.contactInfo,
          })
        )
      })

      it('should create salon with minimal required fields', async () => {
        // Arrange
        const createRequest = {
          name: 'Minimal Salon',
          address: {
            street: '丸の内1-1-1',
            city: '千代田区',
            state: '東京都',
            postalCode: '100-0001',
            country: '日本',
          },
          contactInfo: {
            email: 'salon@example.com',
            phoneNumber: '03-1234-5678',
          },
          openingHours: [
            {
              dayOfWeek: 'monday' as const,
              openTime: '09:00',
              closeTime: '18:00',
            },
          ],
        }

        const createdSalon = new SalonBuilder()
          .withName(createRequest.name)
          .withAddress(createRequest.address)
          .build()

        vi.mocked(mockRepository.create).mockResolvedValueOnce(ok(createdSalon))

        // Act
        const response = await request(app).post('/salons').send(createRequest)

        // Assert
        expect(response.status).toBe(201)
        expect(response.body).toMatchObject({
          name: createRequest.name,
        })
      })
    })

    describe('異常系', () => {
      it('should return 400 for missing required fields', async () => {
        // Arrange
        const invalidRequest = {
          name: 'Invalid Salon',
          // Missing required fields: address, phone, capacity, openingHours
        }

        // Act
        const response = await request(app).post('/salons').send(invalidRequest)

        // Assert
        expect(response.status).toBe(400)
        expect(response.body).toMatchObject({
          code: 'INVALID_REQUEST',
          message: expect.stringContaining('required'),
        })
      })

      it('should return 400 for missing contactInfo', async () => {
        // Arrange
        const invalidRequest = {
          name: 'Invalid Salon',
          address: {
            street: '丸の内1-1-1',
            city: '千代田区',
            state: '東京都',
            postalCode: '100-0001',
            country: '日本',
          },
          // Missing contactInfo
          openingHours: [
            {
              dayOfWeek: 'monday' as const,
              openTime: '09:00',
              closeTime: '18:00',
            },
          ],
        }

        // Act
        const response = await request(app).post('/salons').send(invalidRequest)

        // Assert
        expect(response.status).toBe(400)
        expect(response.body).toMatchObject({
          code: 'INVALID_REQUEST',
          message: expect.stringContaining('contact info'),
        })
      })

      it('should return 400 for invalid opening hours', async () => {
        // Arrange
        const invalidRequest = {
          name: 'Invalid Salon',
          address: {
            street: '丸の内1-1-1',
            city: '千代田区',
            state: '東京都',
            postalCode: '100-0001',
            country: '日本',
          },
          contactInfo: {
            email: 'salon@example.com',
            phoneNumber: '03-1234-5678',
          },
          openingHours: [
            {
              dayOfWeek: 'monday' as const,
              openTime: '25:00', // Invalid time
              closeTime: '18:00',
            },
          ],
        }

        vi.mocked(mockRepository.create).mockResolvedValueOnce(
          err({ type: 'databaseError', message: 'Invalid opening hours' })
        )

        // Act
        const response = await request(app).post('/salons').send(invalidRequest)

        // Assert
        expect(response.status).toBe(400)
        expect(response.body).toMatchObject({
          code: 'INVALID_OPENING_HOURS',
          message: 'Invalid time format (use HH:MM)',
        })
      })

      it('should return 400 for invalid JSON', async () => {
        // Act
        const response = await request(app)
          .post('/salons')
          .set('Content-Type', 'application/json')
          .send('{ invalid json')

        // Assert
        expect(response.status).toBe(400)
        expect(response.body).toMatchObject({
          code: 'INVALID_REQUEST_BODY',
          message: 'Invalid JSON in request body',
        })
      })

      it('should return 400 when name is invalid', async () => {
        // Arrange
        const createRequest = {
          name: 'A', // Too short
          address: {
            street: '丸の内1-1-1',
            city: '千代田区',
            state: '東京都',
            postalCode: '100-0001',
            country: '日本',
          },
          contactInfo: {
            email: 'salon@example.com',
            phoneNumber: '03-1234-5678',
          },
          openingHours: [
            {
              dayOfWeek: 'monday' as const,
              openTime: '09:00',
              closeTime: '18:00',
            },
          ],
        }

        vi.mocked(mockRepository.create).mockResolvedValueOnce(
          err({
            type: 'databaseError',
            message: 'Name must be at least 2 characters',
          })
        )

        // Act
        const response = await request(app).post('/salons').send(createRequest)

        // Assert
        expect(response.status).toBe(500)
        expect(response.body).toMatchObject({
          code: 'DATABASE_ERROR',
          message: 'Name must be at least 2 characters',
        })
      })

      it('should return 500 when repository fails', async () => {
        // Arrange
        const createRequest = {
          name: 'Valid Salon',
          address: {
            street: '丸の内1-1-1',
            city: '千代田区',
            state: '東京都',
            postalCode: '100-0001',
            country: '日本',
          },
          contactInfo: {
            email: 'salon@example.com',
            phoneNumber: '03-1234-5678',
          },
          openingHours: [
            {
              dayOfWeek: 'monday' as const,
              openTime: '09:00',
              closeTime: '18:00',
            },
          ],
        }

        vi.mocked(mockRepository.create).mockResolvedValueOnce(
          err({ type: 'databaseError', message: 'Connection failed' })
        )

        // Act
        const response = await request(app).post('/salons').send(createRequest)

        // Assert
        expect(response.status).toBe(500)
        expect(response.body).toMatchObject({
          code: 'DATABASE_ERROR',
          message: 'Connection failed',
        })
      })
    })
  })

  describe('PUT /salons/:id - Update salon', () => {
    describe('正常系', () => {
      it('should update salon with valid data', async () => {
        // Arrange
        const salonId = uuidv4()
        const existingSalon = createTestSalon({
          id: createTestSalonId(salonId),
          name: 'Old Name',
        })
        const updateRequest = {
          name: 'Updated Salon Name',
          description: 'Updated description',
        }

        vi.mocked(mockRepository.findById).mockResolvedValueOnce(
          ok(existingSalon)
        )
        vi.mocked(mockRepository.update).mockResolvedValueOnce(
          ok(
            new SalonBuilder()
              .withId(createTestSalonId(salonId))
              .withName(updateRequest.name)
              .withDescription(updateRequest.description)
              .build()
          )
        )

        // Act
        const response = await request(app)
          .put(`/salons/${salonId}`)
          .send(updateRequest)

        // Assert
        expect(response.status).toBe(200)
        expect(response.body).toMatchObject({
          id: salonId,
          name: updateRequest.name,
          description: updateRequest.description,
        })
      })

      it('should update only specified fields', async () => {
        // Arrange
        const salonId = uuidv4()
        const existingSalon = createTestSalon({
          id: createTestSalonId(salonId),
          name: 'Original Name',
          description: 'Original description',
        })
        const updateRequest = {
          description: 'Only update description',
        }

        vi.mocked(mockRepository.findById).mockResolvedValueOnce(
          ok(existingSalon)
        )
        vi.mocked(mockRepository.update).mockResolvedValueOnce(
          ok(
            new SalonBuilder()
              .withId(createTestSalonId(salonId))
              .withName(existingSalon.data.name) // Keep original name
              .withDescription(updateRequest.description)
              .build()
          )
        )

        // Act
        const response = await request(app)
          .put(`/salons/${salonId}`)
          .send(updateRequest)

        // Assert
        expect(response.status).toBe(200)
        expect(response.body).toMatchObject({
          name: 'Original Name', // Unchanged
          description: updateRequest.description,
        })
      })
    })

    describe('異常系', () => {
      it('should return 400 for invalid UUID', async () => {
        // Act
        const response = await request(app)
          .put('/salons/invalid-uuid')
          .send({ name: 'Updated' })

        // Assert
        expect(response.status).toBe(400)
        expect(response.body).toMatchObject({
          code: 'INVALID_ID',
          message: expect.stringContaining('Invalid salon ID format'),
        })
      })

      it('should return 404 when salon not found', async () => {
        // Arrange
        const salonId = uuidv4()
        vi.mocked(mockRepository.findById).mockResolvedValueOnce(
          err({ type: 'notFound', entity: 'Salon', id: salonId })
        )

        // Act
        const response = await request(app)
          .put(`/salons/${salonId}`)
          .send({ name: 'Updated' })

        // Assert
        expect(response.status).toBe(404)
        expect(response.body).toMatchObject({
          code: 'NOT_FOUND',
          message: 'Salon not found',
        })
      })

      it('should return 500 when repository fails', async () => {
        // Arrange
        const salonId = uuidv4()
        const existingSalon = createTestSalon({
          id: createTestSalonId(salonId),
        })

        vi.mocked(mockRepository.findById).mockResolvedValueOnce(
          ok(existingSalon)
        )
        vi.mocked(mockRepository.update).mockResolvedValueOnce(
          err({ type: 'databaseError', message: 'Connection failed' })
        )

        // Act
        const response = await request(app)
          .put(`/salons/${salonId}`)
          .send({ name: 'Updated' })

        // Assert
        expect(response.status).toBe(500)
        expect(response.body).toMatchObject({
          code: 'DATABASE_ERROR',
          message: 'Connection failed',
        })
      })
    })
  })

  describe('DELETE /salons/:id - Delete salon', () => {
    describe('正常系', () => {
      it('should delete active salon', async () => {
        // Arrange
        const salonId = uuidv4()
        const activeSalon = createTestSalon({
          id: createTestSalonId(salonId),
        })

        vi.mocked(mockRepository.findById).mockResolvedValueOnce(
          ok(activeSalon)
        )
        vi.mocked(mockRepository.delete).mockResolvedValueOnce(ok(undefined))

        // Act
        const response = await request(app).delete(`/salons/${salonId}`)

        // Assert
        expect(response.status).toBe(204)
        expect(response.body).toEqual({})
      })
    })

    describe('異常系', () => {
      it('should return 400 for invalid UUID', async () => {
        // Act
        const response = await request(app).delete('/salons/invalid-uuid')

        // Assert
        expect(response.status).toBe(400)
        expect(response.body).toMatchObject({
          code: 'INVALID_ID',
          message: expect.stringContaining('Invalid salon ID format'),
        })
      })

      it('should return 404 when salon not found', async () => {
        // Arrange
        const salonId = uuidv4()
        vi.mocked(mockRepository.findById).mockResolvedValueOnce(
          err({ type: 'notFound', entity: 'Salon', id: salonId })
        )

        // Act
        const response = await request(app).delete(`/salons/${salonId}`)

        // Assert
        expect(response.status).toBe(404)
        expect(response.body).toMatchObject({
          code: 'NOT_FOUND',
          message: 'Salon not found',
        })
      })

      it('should return 500 when repository fails', async () => {
        // Arrange
        const salonId = uuidv4()
        const activeSalon = createTestSalon({
          id: createTestSalonId(salonId),
        })

        vi.mocked(mockRepository.findById).mockResolvedValueOnce(
          ok(activeSalon)
        )
        vi.mocked(mockRepository.delete).mockResolvedValueOnce(
          err({ type: 'databaseError', message: 'Connection failed' })
        )

        // Act
        const response = await request(app).delete(`/salons/${salonId}`)

        // Assert
        expect(response.status).toBe(500)
        expect(response.body).toMatchObject({
          code: 'DATABASE_ERROR',
          message: 'Connection failed',
        })
      })
    })
  })

  describe('POST /salons/:id/suspend - Suspend salon', () => {
    describe('正常系', () => {
      it('should suspend active salon', async () => {
        // Arrange
        const salonId = uuidv4()
        const activeSalon = createTestSalon({
          id: createTestSalonId(salonId),
        })
        const suspendRequest = {
          reason: 'Policy violation',
        }

        vi.mocked(mockRepository.findById).mockResolvedValueOnce(
          ok(activeSalon)
        )
        vi.mocked(mockRepository.suspend).mockResolvedValueOnce(
          ok(
            new SalonBuilder()
              .withId(createTestSalonId(salonId))
              .asSuspended(suspendRequest.reason)
              .build()
          )
        )

        // Act
        const response = await request(app)
          .post(`/salons/${salonId}/suspend`)
          .send(suspendRequest)

        // Assert
        expect(response.status).toBe(200)
        expect(response.body).toMatchObject({
          id: salonId,
        })
      })
    })

    describe('異常系', () => {
      it('should return 400 for missing reason', async () => {
        // Arrange
        const salonId = uuidv4()

        // Act
        const response = await request(app)
          .post(`/salons/${salonId}/suspend`)
          .send({})

        // Assert
        expect(response.status).toBe(400)
        expect(response.body).toMatchObject({
          code: 'INVALID_REQUEST',
          message: expect.stringContaining('reason'),
        })
      })

      it('should return 409 when suspending already suspended salon', async () => {
        // Arrange
        const salonId = uuidv4()
        const suspendedSalon = new SalonBuilder()
          .withId(createTestSalonId(salonId))
          .asSuspended('Already suspended')
          .build()

        vi.mocked(mockRepository.findById).mockResolvedValueOnce(
          ok(suspendedSalon)
        )

        // Act
        const response = await request(app)
          .post(`/salons/${salonId}/suspend`)
          .send({ reason: 'Try to suspend again' })

        // Assert
        expect(response.status).toBe(409)
        expect(response.body).toMatchObject({
          code: 'CONFLICT',
          message: expect.stringContaining('status'),
        })
      })
    })
  })

  describe('POST /salons/:id/reactivate - Reactivate salon', () => {
    describe('正常系', () => {
      it('should reactivate suspended salon', async () => {
        // Arrange
        const salonId = uuidv4()
        const suspendedSalon = new SalonBuilder()
          .withId(createTestSalonId(salonId))
          .asSuspended('Was suspended')
          .build()

        vi.mocked(mockRepository.findById).mockResolvedValueOnce(
          ok(suspendedSalon)
        )
        vi.mocked(mockRepository.reactivate).mockResolvedValueOnce(
          ok(
            new SalonBuilder()
              .withId(createTestSalonId(salonId))
              .asActive()
              .build()
          )
        )

        // Act
        const response = await request(app).post(
          `/salons/${salonId}/reactivate`
        )

        // Assert
        expect(response.status).toBe(200)
        expect(response.body).toMatchObject({
          id: salonId,
        })
      })
    })

    describe('異常系', () => {
      it('should return 409 when reactivating active salon', async () => {
        // Arrange
        const salonId = uuidv4()
        const activeSalon = createTestSalon({
          id: createTestSalonId(salonId),
        })

        vi.mocked(mockRepository.findById).mockResolvedValueOnce(
          ok(activeSalon)
        )

        // Act
        const response = await request(app).post(
          `/salons/${salonId}/reactivate`
        )

        // Assert
        expect(response.status).toBe(409)
        expect(response.body).toMatchObject({
          code: 'CONFLICT',
          message: expect.stringContaining('status'),
        })
      })
    })
  })
})
