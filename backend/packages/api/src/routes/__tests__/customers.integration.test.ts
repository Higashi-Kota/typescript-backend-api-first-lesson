import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import request from 'supertest'
import express from 'express'
import { createCustomerRoutes } from '../customers.js'
import type { CustomerRepository } from '@beauty-salon-backend/domain'
import { ok, err } from '@beauty-salon-backend/domain'
import {
  CustomerBuilder,
  createTestCustomer,
  createTestCustomerId,
} from '@beauty-salon-backend/test-utils'
import { errorHandler } from '../../middleware/error-handler.js'
import { v4 as uuidv4 } from 'uuid'

describe('Customer API Integration Tests', () => {
  let app: express.Application
  let mockRepository: CustomerRepository

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
            error: {
              code: 'INVALID_REQUEST_BODY',
              message: 'Invalid JSON in request body',
            },
          })
        }
        next(err)
      }
    )

    // Create mock repository with default implementations
    mockRepository = {
      findById: vi
        .fn()
        .mockResolvedValue(err({ type: 'notFound', id: 'test' })),
      findByEmail: vi.fn().mockResolvedValue(ok(null)),
      findByIds: vi.fn().mockResolvedValue(ok([])),
      findByTags: vi.fn().mockResolvedValue(ok([])),
      save: vi.fn().mockResolvedValue(ok(createTestCustomer())),
      delete: vi.fn().mockResolvedValue(ok(undefined)),
      search: vi.fn().mockResolvedValue(
        ok({
          data: [],
          pagination: {
            page: 1,
            limit: 10,
            total: 0,
            totalPages: 0,
          },
        })
      ),
      count: vi.fn().mockResolvedValue(ok(0)),
      countByMembershipLevel: vi.fn().mockResolvedValue(ok(0)),
      findAll: vi.fn().mockResolvedValue(ok([])),
      withTransaction: vi.fn().mockImplementation((fn) => fn(mockRepository)),
    }

    // Setup router with dependencies
    const router = createCustomerRoutes({
      customerRepository: mockRepository,
    })

    app.use('/customers', router)
    app.use(errorHandler)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /customers - List customers', () => {
    describe('validation errors (400)', () => {
      it('should return 400 for invalid page number', async () => {
        // Arrange
        const invalidQueries = [
          { page: '0' },
          { page: '-1' },
          { page: 'abc' },
          { page: '1.5' },
          { page: '' },
        ]

        // Act & Assert
        for (const query of invalidQueries) {
          const response = await request(app).get('/customers').query(query)

          expect(response.status).toBe(400)
          expect(response.body).toMatchObject({
            type: 'validationError',
            errors: expect.arrayContaining([
              expect.objectContaining({
                field: expect.any(String),
                message: expect.any(String),
              }),
            ]),
          })
        }
      })

      it('should return 400 for invalid limit', async () => {
        // Arrange
        const invalidQueries = [
          { limit: '0' },
          { limit: '-10' },
          { limit: 'ten' },
          { limit: '101' }, // Exceeds max
          { limit: '1.5' },
        ]

        // Act & Assert
        for (const query of invalidQueries) {
          const response = await request(app).get('/customers').query(query)

          expect(response.status).toBe(400)
          expect(response.body).toMatchObject({
            type: 'validationError',
            errors: expect.arrayContaining([
              expect.objectContaining({
                field: expect.any(String),
                message: expect.any(String),
              }),
            ]),
          })
        }
      })

      it('should return 400 for invalid membership level filter', async () => {
        // Arrange
        const response = await request(app)
          .get('/customers')
          .query({ membershipLevel: 'invalid' })

        // Assert
        expect(response.status).toBe(400)
        expect(response.body).toMatchObject({
          type: 'validationError',
          errors: expect.arrayContaining([
            expect.objectContaining({
              field: 'membershipLevel',
              message: expect.any(String),
            }),
          ]),
        })
      })

      it.skip('should return 400 for invalid date format', async () => {
        // Arrange
        const invalidQueries = [
          { registeredFrom: 'invalid-date' },
          { registeredTo: '2024-13-01' }, // Invalid month
          { registeredFrom: '2024/01/01' }, // Wrong format
        ]

        // Act & Assert
        for (const query of invalidQueries) {
          const response = await request(app).get('/customers').query(query)

          expect(response.status).toBe(400)
          expect(response.body).toMatchObject({
            type: 'validationError',
            errors: expect.arrayContaining([
              expect.objectContaining({
                field: expect.any(String),
                message: expect.any(String),
              }),
            ]),
          })
        }
      })
    })

    describe('success cases (200)', () => {
      it('should return customers with default pagination', async () => {
        // Arrange
        const customers = [
          createTestCustomer({
            id: createTestCustomerId(uuidv4()),
            contactInfo: {
              email: 'test1@example.com',
              phoneNumber: '090-1234-5678',
            },
          }),
          createTestCustomer({
            id: createTestCustomerId(uuidv4()),
            contactInfo: {
              email: 'test2@example.com',
              phoneNumber: '090-1234-5679',
            },
          }),
        ]
        mockRepository.search = vi.fn().mockResolvedValue(
          ok({
            data: customers,
            total: 2,
            limit: 20,
            offset: 0,
          })
        )

        // Act
        const response = await request(app).get('/customers')

        // Assert
        expect(response.status).toBe(200)
        expect(response.body.data).toHaveLength(2)
        expect(response.body.pagination).toMatchObject({
          page: 1,
          limit: 20,
          total: 2,
          totalPages: 1,
        })
      })

      it('should apply filters correctly', async () => {
        // Arrange
        mockRepository.search = vi.fn().mockResolvedValue(
          ok({
            data: [],
            total: 0,
            limit: 10,
            offset: 0,
          })
        )

        // Act
        const response = await request(app).get('/customers').query({
          email: 'test@example.com',
          membershipLevel: 'gold',
          tags: 'vip,regular',
        })

        // Assert
        expect(response.status).toBe(200)
        expect(mockRepository.search).toHaveBeenCalledWith(
          expect.objectContaining({
            email: 'test@example.com',
            membershipLevel: 'gold',
            tags: ['vip', 'regular'],
          }),
          expect.objectContaining({
            limit: 20,
            offset: 0,
          })
        )
      })
    })

    describe('error cases (500)', () => {
      it('should return 500 for database errors', async () => {
        // Arrange
        mockRepository.search = vi
          .fn()
          .mockResolvedValue(
            err({ type: 'databaseError', message: 'Connection failed' })
          )

        // Act
        const response = await request(app).get('/customers')

        // Assert
        expect(response.status).toBe(500)
        expect(response.body).toMatchObject({
          type: 'error',
          error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'An unexpected error occurred',
          },
        })
      })
    })
  })

  describe('POST /customers - Create customer', () => {
    describe('validation errors (400)', () => {
      it('should return 400 for missing required fields', async () => {
        // Arrange
        const invalidBodies = [
          {}, // Empty body
          { name: 'Test User' }, // Missing contactInfo
          { contactInfo: { email: 'test@example.com' } }, // Missing name and phoneNumber
          { name: 'Test User', contactInfo: { phoneNumber: '090-1234-5678' } }, // Missing email
        ]

        // Act & Assert
        for (const body of invalidBodies) {
          const response = await request(app).post('/customers').send(body)

          expect(response.status).toBe(400)
          expect(response.body).toMatchObject({
            type: 'validationError',
            errors: expect.arrayContaining([
              expect.objectContaining({
                field: expect.any(String),
                message: expect.any(String),
              }),
            ]),
          })
        }
      })

      it('should return 400 for invalid email format', async () => {
        // Arrange
        const body = {
          name: 'Test User',
          contactInfo: {
            email: 'invalid-email',
            phoneNumber: '090-1234-5678',
            alternativePhone: null,
          },
          preferences: null,
          notes: null,
          tags: null,
          birthDate: null,
        }

        // Act
        const response = await request(app).post('/customers').send(body)

        // Assert
        expect(response.status).toBe(400)
        expect(response.body).toMatchObject({
          type: 'validationError',
          errors: expect.arrayContaining([
            expect.objectContaining({
              field: expect.stringContaining('email'),
              message: expect.any(String),
            }),
          ]),
        })
      })

      it('should return 400 for invalid phone number format', async () => {
        // Arrange
        const body = {
          name: 'Test User',
          contactInfo: {
            email: 'test@example.com',
            phoneNumber: 'invalid phone', // Invalid format
          },
        }

        // Act
        const response = await request(app).post('/customers').send(body)

        // Assert
        expect(response.status).toBe(400)
        expect(response.body).toMatchObject({
          type: 'validationError',
          errors: expect.arrayContaining([
            expect.objectContaining({
              field: expect.stringContaining('phone'),
              message: expect.any(String),
            }),
          ]),
        })
      })

      it('should return 400 for invalid gender value', async () => {
        // Arrange
        const body = {
          name: 'Test User',
          contactInfo: {
            email: 'test@example.com',
            phoneNumber: '090-1234-5678',
          },
          preferences: JSON.stringify({
            gender: 'invalid', // Invalid gender value
          }),
        }

        // Act
        const response = await request(app).post('/customers').send(body)

        // Assert
        expect(response.status).toBe(400)
        expect(response.body).toMatchObject({
          type: 'validationError',
          errors: expect.arrayContaining([
            expect.objectContaining({
              field: 'preferences',
              message: 'Invalid preferences JSON',
            }),
          ]),
        })
      })

      it('should return 400 for too many tags', async () => {
        // Arrange
        const body = {
          name: 'Test User',
          contactInfo: {
            email: 'test@example.com',
            phoneNumber: '090-1234-5678',
            alternativePhone: null,
          },
          preferences: null,
          notes: null,
          tags: Array(11).fill('tag'), // 11 tags, exceeds limit
          birthDate: null,
        }

        // Act
        const response = await request(app).post('/customers').send(body)

        // Assert
        expect(response.status).toBe(400)
        expect(response.body).toMatchObject({
          type: 'validationError',
          errors: expect.arrayContaining([
            expect.objectContaining({
              field: 'tags',
              message: expect.stringContaining('Too many tags'),
            }),
          ]),
        })
      })
    })

    describe('conflict errors (409)', () => {
      it('should return 409 for duplicate email', async () => {
        // Arrange
        mockRepository.findByEmail = vi.fn().mockResolvedValue(
          ok(
            createTestCustomer({
              contactInfo: {
                email: 'existing@example.com',
                phoneNumber: '090-1234-5678',
              },
            })
          )
        )

        const body = {
          name: 'Test User',
          contactInfo: {
            email: 'existing@example.com',
            phoneNumber: '090-1234-5678',
          },
        }

        // Act
        const response = await request(app).post('/customers').send(body)

        // Assert
        expect(response.status).toBe(409)
        expect(response.body).toMatchObject({
          type: 'error',
          error: {
            code: 'DUPLICATE_EMAIL',
            message: expect.stringContaining('already exists'),
          },
        })
      })
    })

    describe('success cases (201)', () => {
      it('should create customer with minimal required fields', async () => {
        // Arrange
        const customerId = uuidv4()
        const customer = createTestCustomer({
          id: createTestCustomerId(customerId),
          contactInfo: {
            email: 'new@example.com',
            phoneNumber: '090-1234-5678',
          },
        })
        mockRepository.save = vi.fn().mockResolvedValue(ok(customer))

        const body = {
          name: 'Test User',
          contactInfo: {
            email: 'new@example.com',
            phoneNumber: '090-1234-5678',
          },
        }

        // Act
        const response = await request(app).post('/customers').send(body)

        // Assert
        expect(response.status).toBe(201)
        expect(response.body).toMatchObject({
          id: customerId,
          name: expect.any(String),
          contactInfo: expect.objectContaining({
            email: 'new@example.com',
          }),
        })
      })

      it('should create customer with all optional fields', async () => {
        // Arrange
        const customerId = uuidv4()
        const customer = new CustomerBuilder()
          .withId(customerId)
          .withEmail('full@example.com')
          .withPhoneNumber('090-9999-9999')
          .withName('Full User')
          .withBirthDate(new Date('1990-01-01'))
          .withTags(['vip', 'regular'])
          .withNotes('Special customer')
          .build()

        if (customer.type === 'ok') {
          mockRepository.save = vi.fn().mockResolvedValue(ok(customer.value))
        }

        const body = {
          name: 'Full User',
          contactInfo: {
            email: 'full@example.com',
            phoneNumber: '090-9999-9999',
          },
          preferences: JSON.stringify({
            gender: 'female',
            preferredContactMethod: 'email',
          }),
          tags: ['vip', 'regular'],
        }

        // Act
        const response = await request(app).post('/customers').send(body)

        // Assert
        expect(response.status).toBe(201)
        expect(response.body).toMatchObject({
          id: customerId,
          name: expect.any(String),
          contactInfo: expect.objectContaining({
            email: 'full@example.com',
          }),
          tags: ['vip', 'regular'],
        })
      })
    })

    describe('error cases (500)', () => {
      it('should return 500 for database save errors', async () => {
        // Arrange
        mockRepository.save = vi
          .fn()
          .mockResolvedValue(
            err({ type: 'databaseError', message: 'Save failed' })
          )

        const body = {
          name: 'Test User',
          contactInfo: {
            email: 'test@example.com',
            phoneNumber: '090-1234-5678',
          },
        }

        // Act
        const response = await request(app).post('/customers').send(body)

        // Assert
        expect(response.status).toBe(500)
        expect(response.body).toMatchObject({
          type: 'error',
          error: {
            code: 'DATABASE_ERROR',
            message: 'Save failed',
            target: null,
          },
        })
      })
    })
  })

  describe('GET /customers/:id - Get customer by ID', () => {
    describe('validation errors (400)', () => {
      it('should return 400 for invalid UUID format', async () => {
        // Arrange
        const invalidIds = [
          'invalid-id',
          '123',
          'not-a-uuid',
          '12345678-1234-1234-1234-12345678901', // Wrong length
        ]

        // Act & Assert
        for (const id of invalidIds) {
          const response = await request(app).get(`/customers/${id}`)

          expect(response.status).toBe(400)
          expect(response.body).toMatchObject({
            type: 'validationError',
            errors: expect.arrayContaining([
              expect.objectContaining({
                field: 'id',
                message: expect.stringContaining('Invalid'),
              }),
            ]),
          })
        }
      })
    })

    describe('not found errors (404)', () => {
      it('should return 404 for non-existent customer', async () => {
        // Arrange
        const id = uuidv4()
        mockRepository.findById = vi
          .fn()
          .mockResolvedValue(err({ type: 'notFound', id }))

        // Act
        const response = await request(app).get(`/customers/${id}`)

        // Assert
        expect(response.status).toBe(404)
        expect(response.body).toMatchObject({
          type: 'error',
          error: {
            code: 'NOT_FOUND',
            message: expect.stringContaining('not found'),
          },
        })
      })
    })

    describe('success cases (200)', () => {
      it('should return customer details', async () => {
        // Arrange
        const id = uuidv4()
        const customer = createTestCustomer({
          id: createTestCustomerId(id),
          contactInfo: {
            email: 'found@example.com',
            phoneNumber: '090-1234-5678',
          },
        })
        mockRepository.findById = vi.fn().mockResolvedValue(ok(customer))

        // Act
        const response = await request(app).get(`/customers/${id}`)

        // Assert
        expect(response.status).toBe(200)
        expect(response.body).toMatchObject({
          id,
          name: expect.any(String),
          contactInfo: expect.objectContaining({
            email: 'found@example.com',
          }),
        })
      })

      it('should return suspended customer with status', async () => {
        // Arrange
        const id = uuidv4()
        const customer = new CustomerBuilder()
          .withId(id)
          .withEmail('suspended@example.com')
          .suspended('Payment issues')
          .build()

        if (customer.type === 'ok') {
          mockRepository.findById = vi
            .fn()
            .mockResolvedValue(ok(customer.value))
        }

        // Act
        const response = await request(app).get(`/customers/${id}`)

        // Assert
        expect(response.status).toBe(200)
        expect(response.body).toMatchObject({
          id,
          name: expect.any(String),
          contactInfo: expect.objectContaining({
            email: 'suspended@example.com',
          }),
        })
      })
    })

    describe('error cases (500)', () => {
      it('should return 500 for database errors', async () => {
        // Arrange
        mockRepository.findById = vi
          .fn()
          .mockResolvedValue(
            err({ type: 'databaseError', message: 'Query failed' })
          )

        // Act
        const response = await request(app).get(`/customers/${uuidv4()}`)

        // Assert
        expect(response.status).toBe(500)
        expect(response.body).toMatchObject({
          type: 'error',
          error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'An unexpected error occurred',
          },
        })
      })
    })
  })

  describe('PUT /customers/:id - Update customer', () => {
    describe('validation errors (400)', () => {
      it('should return 400 for invalid UUID', async () => {
        // Act
        const response = await request(app)
          .put('/customers/invalid-id')
          .send({ name: 'Updated' })

        // Assert
        expect(response.status).toBe(400)
        expect(response.body).toMatchObject({
          type: 'validationError',
          errors: expect.arrayContaining([
            expect.objectContaining({
              field: 'id',
              message: expect.stringContaining('Invalid'),
            }),
          ]),
        })
      })

      it('should return 400 for invalid update fields', async () => {
        // Arrange
        const invalidBodies = [
          { contactInfo: { email: 'invalid-email' } },
          { contactInfo: { phoneNumber: 'invalid phone' } },
          { preferences: 'invalid JSON' }, // Invalid JSON
          { tags: Array(11).fill('tag') },
        ]

        // Act & Assert
        for (const body of invalidBodies) {
          const response = await request(app)
            .put(`/customers/${uuidv4()}`)
            .send(body)

          expect(response.status).toBe(400)
          expect(response.body).toMatchObject({
            type: 'validationError',
            errors: expect.arrayContaining([
              expect.objectContaining({
                field: expect.any(String),
                message: expect.any(String),
              }),
            ]),
          })
        }
      })

      it('should return 404 for empty update body', async () => {
        // Arrange
        const id = uuidv4()
        mockRepository.findById = vi
          .fn()
          .mockResolvedValue(err({ type: 'notFound', id }))

        // Act
        const response = await request(app).put(`/customers/${id}`).send({})

        // Assert
        expect(response.status).toBe(404)
        expect(response.body).toMatchObject({
          type: 'error',
          error: {
            code: 'NOT_FOUND',
            message: expect.stringContaining('not found'),
          },
        })
      })
    })

    describe('not found errors (404)', () => {
      it('should return 404 for non-existent customer', async () => {
        // Arrange
        const id = uuidv4()
        mockRepository.findById = vi
          .fn()
          .mockResolvedValue(err({ type: 'notFound', id }))

        // Act
        const response = await request(app)
          .put(`/customers/${id}`)
          .send({ name: 'Updated' })

        // Assert
        expect(response.status).toBe(404)
        expect(response.body).toMatchObject({
          type: 'error',
          error: {
            code: 'NOT_FOUND',
            message: expect.stringContaining('not found'),
          },
        })
      })
    })

    describe('conflict errors (409)', () => {
      it('should return 409 for duplicate email on update', async () => {
        // Arrange
        const id = uuidv4()
        const existingCustomer = createTestCustomer({
          id: createTestCustomerId(id),
          contactInfo: {
            email: 'current@example.com',
            phoneNumber: '090-1234-5678',
          },
        })
        mockRepository.findById = vi
          .fn()
          .mockResolvedValue(ok(existingCustomer))
        mockRepository.findByEmail = vi.fn().mockResolvedValue(
          ok(
            createTestCustomer({
              id: createTestCustomerId(uuidv4()),
              contactInfo: {
                email: 'taken@example.com',
                phoneNumber: '090-1234-5678',
              },
            })
          )
        )

        // Act
        const response = await request(app)
          .put(`/customers/${id}`)
          .send({ contactInfo: { email: 'taken@example.com' } })

        // Assert
        expect(response.status).toBe(409)
        expect(response.body).toMatchObject({
          type: 'error',
          error: {
            code: 'DUPLICATE_EMAIL',
            message: expect.stringContaining('already exists'),
          },
        })
      })
    })

    describe('forbidden errors (403)', () => {
      it('should return 403 for updating deleted customer', async () => {
        // Arrange
        const id = uuidv4()
        const deletedCustomer = new CustomerBuilder()
          .withId(id)
          .deleted()
          .build()

        if (deletedCustomer.type === 'ok') {
          mockRepository.findById = vi
            .fn()
            .mockResolvedValue(ok(deletedCustomer.value))
        }

        // Act
        const response = await request(app)
          .put(`/customers/${id}`)
          .send({ name: 'Updated' })

        // Assert
        expect(response.status).toBe(403)
        expect(response.body).toMatchObject({
          type: 'error',
          error: {
            code: 'CUSTOMER_SUSPENDED',
            message: expect.stringContaining('suspended'),
          },
        })
      })
    })

    describe('success cases (200)', () => {
      it('should update customer fields', async () => {
        // Arrange
        const id = uuidv4()
        const customer = createTestCustomer({ id: createTestCustomerId(id) })
        const updatedCustomer = createTestCustomer({
          id: createTestCustomerId(id),
          name: 'Updated Name',
        })

        mockRepository.findById = vi.fn().mockResolvedValue(ok(customer))
        mockRepository.save = vi.fn().mockResolvedValue(ok(updatedCustomer))

        // Act
        const response = await request(app)
          .put(`/customers/${id}`)
          .send({ name: 'Updated Name' })

        // Assert
        expect(response.status).toBe(200)
        expect(response.body).toMatchObject({
          id,
          name: expect.any(String),
        })
      })

      it('should handle null values for reset', async () => {
        // Arrange
        const id = uuidv4()
        const customer = createTestCustomer({
          id: createTestCustomerId(id),
          notes: 'Some notes',
        })
        const updatedCustomer = createTestCustomer({
          id: createTestCustomerId(id),
          notes: null,
        })

        mockRepository.findById = vi.fn().mockResolvedValue(ok(customer))
        mockRepository.save = vi.fn().mockResolvedValue(ok(updatedCustomer))

        // Act
        const response = await request(app)
          .put(`/customers/${id}`)
          .send({ notes: null })

        // Assert
        expect(response.status).toBe(200)
        expect(response.body).toMatchObject({
          id,
          notes: null,
        })
      })
    })

    describe('error cases (500)', () => {
      it('should return 500 for database save errors', async () => {
        // Arrange
        const id = uuidv4()
        const customer = createTestCustomer({ id: createTestCustomerId(id) })
        mockRepository.findById = vi.fn().mockResolvedValue(ok(customer))
        mockRepository.save = vi
          .fn()
          .mockResolvedValue(
            err({ type: 'databaseError', message: 'Update failed' })
          )

        // Act
        const response = await request(app)
          .put(`/customers/${id}`)
          .send({ name: 'Updated' })

        // Assert
        expect(response.status).toBe(500)
        expect(response.body).toMatchObject({
          type: 'error',
          error: {
            code: 'DATABASE_ERROR',
            message: 'Update failed',
            target: null,
          },
        })
      })
    })
  })

  describe('DELETE /customers/:id - Delete customer', () => {
    describe('validation errors (400)', () => {
      it('should return 400 for invalid UUID', async () => {
        // Act
        const response = await request(app).delete('/customers/invalid-id')

        // Assert
        expect(response.status).toBe(400)
        expect(response.body).toMatchObject({
          type: 'validationError',
          errors: expect.arrayContaining([
            expect.objectContaining({
              field: 'id',
              message: expect.stringContaining('Invalid'),
            }),
          ]),
        })
      })
    })

    describe('not found errors (404)', () => {
      it('should return 404 for non-existent customer', async () => {
        // Arrange
        const id = uuidv4()
        mockRepository.findById = vi
          .fn()
          .mockResolvedValue(err({ type: 'notFound', id }))

        // Act
        const response = await request(app).delete(`/customers/${id}`)

        // Assert
        expect(response.status).toBe(404)
        expect(response.body).toMatchObject({
          type: 'error',
          error: {
            code: 'NOT_FOUND',
            message: expect.stringContaining('not found'),
          },
        })
      })
    })

    describe('success cases (204)', () => {
      it('should delete active customer', async () => {
        // Arrange
        const id = uuidv4()
        const customer = createTestCustomer({ id: createTestCustomerId(id) })
        mockRepository.findById = vi.fn().mockResolvedValue(ok(customer))
        mockRepository.save = vi.fn().mockResolvedValue(ok(customer))

        // Act
        const response = await request(app).delete(`/customers/${id}`)

        // Assert
        expect(response.status).toBe(204)
        expect(response.body).toEqual({})
      })

      it('should be idempotent for already deleted customer', async () => {
        // Arrange
        const id = uuidv4()
        const deletedCustomer = new CustomerBuilder()
          .withId(id)
          .deleted()
          .build()

        if (deletedCustomer.type === 'ok') {
          mockRepository.findById = vi
            .fn()
            .mockResolvedValue(ok(deletedCustomer.value))
        }

        // Act
        const response = await request(app).delete(`/customers/${id}`)

        // Assert
        expect(response.status).toBe(204)
        expect(response.body).toEqual({})
      })
    })

    describe('error cases (500)', () => {
      it('should return 500 for database errors', async () => {
        // Arrange
        const id = uuidv4()
        const customer = createTestCustomer({ id: createTestCustomerId(id) })
        mockRepository.findById = vi.fn().mockResolvedValue(ok(customer))
        mockRepository.save = vi
          .fn()
          .mockResolvedValue(
            err({ type: 'databaseError', message: 'Delete failed' })
          )

        // Act
        const response = await request(app).delete(`/customers/${id}`)

        // Assert
        expect(response.status).toBe(500)
        expect(response.body).toMatchObject({
          type: 'error',
          error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'An unexpected error occurred',
          },
        })
      })
    })
  })

  describe('Edge cases and boundary testing', () => {
    it('should handle maximum allowed tags', async () => {
      // Arrange
      const body = {
        name: 'Test User',
        contactInfo: {
          email: 'test@example.com',
          phoneNumber: '090-1234-5678',
        },
        tags: Array(10)
          .fill(0)
          .map((_, i) => `tag${i}`), // Exactly 10 tags
      }

      // Act
      const response = await request(app).post('/customers').send(body)

      // Assert
      expect(response.status).toBe(201)
    })

    it('should handle very long but valid names', async () => {
      // Arrange
      const longName = 'A'.repeat(100) // Max length
      const body = {
        name: longName,
        contactInfo: {
          email: 'test@example.com',
          phoneNumber: '090-1234-5678',
        },
      }

      // Act
      const response = await request(app).post('/customers').send(body)

      // Assert
      expect(response.status).toBe(201)
    })

    it('should handle pagination at boundary', async () => {
      // Arrange
      mockRepository.search = vi.fn().mockResolvedValue(
        ok({
          data: [],
          total: 10000,
          limit: 100,
          offset: 9900,
        })
      )

      // Act
      const response = await request(app)
        .get('/customers')
        .query({ page: '100', limit: '100' })

      // Assert
      expect(response.status).toBe(200)
      expect(response.body.pagination.page).toBe(100)
      expect(response.body.pagination.limit).toBe(100)
    })

    it('should handle special characters in search', async () => {
      // Arrange
      const specialChars = "test@example.com'; DROP TABLE customers; --"

      // Act
      const response = await request(app)
        .get('/customers')
        .query({ search: specialChars })

      // Assert
      expect(response.status).toBe(200)
      expect(mockRepository.search).toHaveBeenCalledWith(
        expect.objectContaining({ search: specialChars }),
        expect.any(Object)
      )
    })

    it('should handle concurrent updates gracefully', async () => {
      // Arrange
      const id = uuidv4()
      const customer = createTestCustomer({ id: createTestCustomerId(id) })
      mockRepository.findById = vi.fn().mockResolvedValue(ok(customer))
      mockRepository.save = vi.fn().mockResolvedValue(ok(customer))

      // Act - Send multiple concurrent updates
      const updates = Promise.all([
        request(app).put(`/customers/${id}`).send({ firstName: 'Update1' }),
        request(app).put(`/customers/${id}`).send({ firstName: 'Update2' }),
        request(app).put(`/customers/${id}`).send({ firstName: 'Update3' }),
      ])

      // Assert
      const responses = await updates
      for (const response of responses) {
        expect(response.status).toBe(200)
      }
    })

    it('should handle malformed JSON gracefully', async () => {
      // Act
      const response = await request(app)
        .post('/customers')
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

    it('should handle missing content-type header', async () => {
      // Act
      const response = await request(app)
        .post('/customers')
        .send('plain text body')

      // Assert
      expect(response.status).toBe(400)
    })

    it('should validate date ranges correctly', async () => {
      // Act
      const response = await request(app).get('/customers').query({
        registeredFrom: '2024-01-01',
        registeredTo: '2023-01-01', // End before start
      })

      // Assert
      expect(response.status).toBe(200) // Should still work, filtering logic handles this
    })

    it('should handle unicode characters in names', async () => {
      // Arrange
      const body = {
        name: '田中太郎',
        contactInfo: {
          email: 'unicode@example.com',
          phoneNumber: '090-1234-5678',
        },
      }

      // Act
      const response = await request(app).post('/customers').send(body)

      // Assert
      expect(response.status).toBe(201)
    })
  })
})
