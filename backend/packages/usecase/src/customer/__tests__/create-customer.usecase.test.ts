/**
 * Create Customer Use Case Tests
 * AAA（Arrange-Act-Assert）パターンに準拠した詳細なテスト
 */

import type {
  Customer,
  CustomerError,
  RepositoryError,
} from '@beauty-salon-backend/domain'
import { err, ok } from '@beauty-salon-backend/domain'
import { describe, expect, it, vi } from 'vitest'
import type {
  CreateCustomerDeps,
  CreateCustomerUseCaseError,
  CreateCustomerUseCaseInput,
} from '../create-customer.usecase.js'
import {
  createCustomerErrorResponse,
  createCustomerUseCase,
  mapCreateCustomerRequest,
  mapCustomerToResponse,
} from '../create-customer.usecase.js'
import {
  createMockCustomerRepository,
  createTestCustomerId,
} from './test-helpers.js'

describe('Create Customer Use Case - AAA Pattern Tests', () => {
  /**
   * 正常系テスト
   */
  describe('Success Cases', () => {
    it('should create a new customer with all fields', async () => {
      // Arrange
      const input: CreateCustomerUseCaseInput = {
        name: 'John Doe',
        email: 'john.doe@example.com',
        phoneNumber: '090-1234-5678',
        preferences: 'Prefers morning appointments',
        notes: 'VIP customer',
        tags: ['premium', 'regular'],
        birthDate: '1990-01-01',
      }

      const mockCustomerId = '550e8400-e29b-41d4-a716-446655440000'
      const mockCustomer: Customer = {
        type: 'active',
        data: {
          id: createTestCustomerId(mockCustomerId),
          name: input.name,
          contactInfo: {
            email: input.email,
            phoneNumber: input.phoneNumber,
          },
          preferences: input.preferences ?? null,
          notes: input.notes ?? null,
          tags: input.tags ?? [],
          birthDate: input.birthDate ? new Date(input.birthDate) : null,
          loyaltyPoints: 0,
          membershipLevel: 'regular',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      }

      const mockRepository = createMockCustomerRepository({
        save: vi.fn().mockResolvedValue(ok(mockCustomer)),
        findById: vi.fn(),
        findByEmail: vi.fn().mockResolvedValue(ok(null)),
        findAll: vi.fn(),
        delete: vi.fn(),
      })

      const deps: CreateCustomerDeps = {
        customerRepository: mockRepository,
        generateId: () => mockCustomerId,
      }

      // Act
      const result = await createCustomerUseCase(input, deps)

      // Assert
      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        const customer = result.value
        if (customer.type === 'active') {
          expect(customer.data.name).toBe(input.name)
          expect(customer.data.contactInfo.email).toBe(input.email)
          expect(customer.data.contactInfo.phoneNumber).toBe(input.phoneNumber)
          expect(customer.data.preferences).toBe(input.preferences)
          expect(customer.data.notes).toBe(input.notes)
          expect(customer.data.tags).toEqual(input.tags)
          expect(customer.data.birthDate?.toISOString().split('T')[0]).toBe(
            input.birthDate
          )
        }
      }
      expect(mockRepository.findByEmail).toHaveBeenCalledWith(input.email)
      expect(mockRepository.save).toHaveBeenCalledOnce()
    })

    it('should create a customer with minimal required fields', async () => {
      // Arrange
      const input: CreateCustomerUseCaseInput = {
        name: 'Jane Smith',
        email: 'jane.smith@example.com',
        phoneNumber: '080-9876-5432',
      }

      const mockCustomerId = '550e8400-e29b-41d4-a716-446655440001'
      const mockCustomer: Customer = {
        type: 'active',
        data: {
          id: createTestCustomerId(mockCustomerId),
          name: input.name,
          contactInfo: {
            email: input.email,
            phoneNumber: input.phoneNumber,
          },
          preferences: null,
          notes: null,
          tags: [],
          birthDate: null,
          loyaltyPoints: 0,
          membershipLevel: 'regular',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      }

      const mockRepository = createMockCustomerRepository({
        save: vi.fn().mockResolvedValue(ok(mockCustomer)),
        findById: vi.fn(),
        findByEmail: vi.fn().mockResolvedValue(ok(null)),
        findAll: vi.fn(),
        delete: vi.fn(),
      })

      const deps: CreateCustomerDeps = {
        customerRepository: mockRepository,
        generateId: () => mockCustomerId,
      }

      // Act
      const result = await createCustomerUseCase(input, deps)

      // Assert
      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        const customer = result.value
        if (customer.type === 'active') {
          expect(customer.data.name).toBe(input.name)
          expect(customer.data.contactInfo.email).toBe(input.email)
          expect(customer.data.contactInfo.phoneNumber).toBe(input.phoneNumber)
          expect(customer.data.preferences).toBeNull()
          expect(customer.data.notes).toBeNull()
          expect(customer.data.tags).toEqual([])
          expect(customer.data.birthDate).toBeNull()
        }
      }
    })

    it('should handle null values appropriately', async () => {
      // Arrange
      const input: CreateCustomerUseCaseInput = {
        name: 'Null Test User',
        email: 'null.test@example.com',
        phoneNumber: '090-0000-0000',
        preferences: null,
        notes: null,
        tags: undefined,
        birthDate: null,
      }

      const mockCustomerId = '550e8400-e29b-41d4-a716-446655440006'
      const mockCustomer: Customer = {
        type: 'active',
        data: {
          id: createTestCustomerId(mockCustomerId),
          name: input.name,
          contactInfo: {
            email: input.email,
            phoneNumber: input.phoneNumber,
          },
          preferences: null,
          notes: null,
          tags: [],
          birthDate: null,
          loyaltyPoints: 0,
          membershipLevel: 'regular',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      }

      const mockRepository = createMockCustomerRepository({
        save: vi.fn().mockResolvedValue(ok(mockCustomer)),
        findById: vi.fn(),
        findByEmail: vi.fn().mockResolvedValue(ok(null)),
        findAll: vi.fn(),
        delete: vi.fn(),
      })

      const deps: CreateCustomerDeps = {
        customerRepository: mockRepository,
      }

      // Act
      const result = await createCustomerUseCase(input, deps)

      // Assert
      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        const customer = result.value
        if (customer.type === 'active') {
          expect(customer.data.preferences).toBeNull()
          expect(customer.data.notes).toBeNull()
          expect(customer.data.tags).toEqual([])
          expect(customer.data.birthDate).toBeNull()
        }
      }
    })
  })

  /**
   * エラー系テスト
   */
  describe('Error Cases', () => {
    it('should return duplicateEmail error when email already exists', async () => {
      // Arrange
      const input: CreateCustomerUseCaseInput = {
        name: 'Duplicate User',
        email: 'existing@example.com',
        phoneNumber: '090-1111-1111',
      }

      const existingCustomer: Customer = {
        type: 'active',
        data: {
          id: createTestCustomerId('550e8400-e29b-41d4-a716-446655440010'),
          name: 'Existing User',
          contactInfo: {
            email: input.email,
            phoneNumber: '090-2222-2222',
          },
          preferences: null,
          notes: null,
          tags: [],
          birthDate: null,
          loyaltyPoints: 100,
          membershipLevel: 'silver',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      }

      const mockRepository = createMockCustomerRepository({
        save: vi.fn(),
        findById: vi.fn(),
        findByEmail: vi.fn().mockResolvedValue(ok(existingCustomer)),
        findAll: vi.fn(),
        delete: vi.fn(),
      })

      const deps: CreateCustomerDeps = {
        customerRepository: mockRepository,
      }

      // Act
      const result = await createCustomerUseCase(input, deps)

      // Assert
      expect(result.type).toBe('err')
      if (result.type === 'err') {
        expect(result.error.type).toBe('duplicateEmail')
        expect(result.error).toEqual({
          type: 'duplicateEmail',
          email: input.email,
        })
      }
      expect(mockRepository.findByEmail).toHaveBeenCalledWith(input.email)
      expect(mockRepository.save).not.toHaveBeenCalled()
    })

    it('should handle repository findByEmail error', async () => {
      // Arrange
      const input: CreateCustomerUseCaseInput = {
        name: 'Error Test User',
        email: 'error@example.com',
        phoneNumber: '090-3333-3333',
      }

      const repositoryError: RepositoryError = {
        type: 'databaseError',
        message: 'Database connection failed',
      }

      const mockRepository = createMockCustomerRepository({
        save: vi.fn(),
        findById: vi.fn(),
        findByEmail: vi.fn().mockResolvedValue(err(repositoryError)),
        findAll: vi.fn(),
        delete: vi.fn(),
      })

      const deps: CreateCustomerDeps = {
        customerRepository: mockRepository,
      }

      // Act
      const result = await createCustomerUseCase(input, deps)

      // Assert
      expect(result.type).toBe('err')
      if (result.type === 'err') {
        expect(result.error.type).toBe('databaseError')
        expect(result.error).toEqual(repositoryError)
      }
      expect(mockRepository.save).not.toHaveBeenCalled()
    })

    it('should handle repository save error', async () => {
      // Arrange
      const input: CreateCustomerUseCaseInput = {
        name: 'Save Error User',
        email: 'save.error@example.com',
        phoneNumber: '090-4444-4444',
      }

      const saveError: RepositoryError = {
        type: 'databaseError',
        message: 'Failed to save customer',
      }

      const mockRepository = createMockCustomerRepository({
        save: vi.fn().mockResolvedValue(err(saveError)),
        findById: vi.fn(),
        findByEmail: vi.fn().mockResolvedValue(ok(null)),
        findAll: vi.fn(),
        delete: vi.fn(),
      })

      const deps: CreateCustomerDeps = {
        customerRepository: mockRepository,
        generateId: () => '550e8400-e29b-41d4-a716-446655440003',
      }

      // Act
      const result = await createCustomerUseCase(input, deps)

      // Assert
      expect(result.type).toBe('err')
      if (result.type === 'err') {
        expect(result.error.type).toBe('databaseError')
        expect(result.error).toEqual(saveError)
      }
      expect(mockRepository.save).toHaveBeenCalledOnce()
    })

    it('should handle invalid email format', async () => {
      // Arrange
      const input: CreateCustomerUseCaseInput = {
        name: 'Invalid Email User',
        email: 'invalid-email',
        phoneNumber: '090-5555-5555',
      }

      const mockRepository = createMockCustomerRepository({
        save: vi.fn(),
        findById: vi.fn(),
        findByEmail: vi.fn().mockResolvedValue(ok(null)),
        findAll: vi.fn(),
        delete: vi.fn(),
      })

      const deps: CreateCustomerDeps = {
        customerRepository: mockRepository,
        generateId: () => '550e8400-e29b-41d4-a716-446655440002',
      }

      // Act
      const result = await createCustomerUseCase(input, deps)

      // Assert
      expect(result.type).toBe('err')
      if (result.type === 'err') {
        expect(result.error.type).toBe('invalidEmail')
      }
      expect(mockRepository.save).not.toHaveBeenCalled()
    })

    it('should handle invalid phone number format', async () => {
      // Arrange
      const input: CreateCustomerUseCaseInput = {
        name: 'Invalid Phone User',
        email: 'valid@example.com',
        phoneNumber: 'invalid',
      }

      const mockRepository = createMockCustomerRepository({
        save: vi.fn(),
        findById: vi.fn(),
        findByEmail: vi.fn().mockResolvedValue(ok(null)),
        findAll: vi.fn(),
        delete: vi.fn(),
      })

      const deps: CreateCustomerDeps = {
        customerRepository: mockRepository,
        generateId: () => '550e8400-e29b-41d4-a716-446655440004',
      }

      // Act
      const result = await createCustomerUseCase(input, deps)

      // Assert
      expect(result.type).toBe('err')
      if (result.type === 'err') {
        expect(result.error.type).toBe('invalidPhoneNumber')
      }
      expect(mockRepository.save).not.toHaveBeenCalled()
    })

    it('should handle empty name', async () => {
      // Arrange
      const input: CreateCustomerUseCaseInput = {
        name: '',
        email: 'empty.name@example.com',
        phoneNumber: '090-6666-6666',
      }

      const mockRepository = createMockCustomerRepository({
        save: vi.fn(),
        findById: vi.fn(),
        findByEmail: vi.fn().mockResolvedValue(ok(null)),
        findAll: vi.fn(),
        delete: vi.fn(),
      })

      const deps: CreateCustomerDeps = {
        customerRepository: mockRepository,
        generateId: () => '550e8400-e29b-41d4-a716-446655440005',
      }

      // Act
      const result = await createCustomerUseCase(input, deps)

      // Assert
      expect(result.type).toBe('err')
      if (result.type === 'err') {
        expect(result.error.type).toBe('invalidName')
      }
      expect(mockRepository.save).not.toHaveBeenCalled()
    })
  })

  /**
   * Edge Cases
   */
  describe('Edge Cases', () => {
    it('should handle very long valid inputs', async () => {
      // Arrange
      const input: CreateCustomerUseCaseInput = {
        name: 'A'.repeat(100), // Long but valid name
        email: 'very.long.email.address@extremely-long-domain-name.example.com',
        phoneNumber: '090-1234-5678',
        preferences: 'P'.repeat(500),
        notes: 'N'.repeat(1000),
        tags: Array(50).fill('tag'),
      }

      const mockCustomerId = '550e8400-e29b-41d4-a716-446655440007'
      const mockCustomer: Customer = {
        type: 'active',
        data: {
          id: createTestCustomerId(mockCustomerId),
          name: input.name,
          contactInfo: {
            email: input.email,
            phoneNumber: input.phoneNumber,
          },
          preferences: input.preferences ?? null,
          notes: input.notes ?? null,
          tags: input.tags ?? [],
          birthDate: null,
          loyaltyPoints: 0,
          membershipLevel: 'regular',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      }

      const mockRepository = createMockCustomerRepository({
        save: vi.fn().mockResolvedValue(ok(mockCustomer)),
        findById: vi.fn(),
        findByEmail: vi.fn().mockResolvedValue(ok(null)),
        findAll: vi.fn(),
        delete: vi.fn(),
      })

      const deps: CreateCustomerDeps = {
        customerRepository: mockRepository,
        generateId: () => mockCustomerId,
      }

      // Act
      const result = await createCustomerUseCase(input, deps)

      // Assert
      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        const customer = result.value
        if (customer.type === 'active') {
          expect(customer.data.name).toBe(input.name)
          expect(customer.data.preferences).toBe(input.preferences)
          expect(customer.data.notes).toBe(input.notes)
          expect(customer.data.tags).toEqual(input.tags)
        }
      }
    })

    it('should handle concurrent creation attempts', async () => {
      // Arrange
      const input: CreateCustomerUseCaseInput = {
        name: 'Concurrent User',
        email: 'concurrent@example.com',
        phoneNumber: '090-7777-7777',
      }

      let callCount = 0
      const mockRepository = createMockCustomerRepository({
        save: vi.fn().mockResolvedValue(
          ok({
            type: 'active',
            data: {
              id: createTestCustomerId('550e8400-e29b-41d4-a716-446655440012'),
              name: input.name,
              contactInfo: {
                email: input.email,
                phoneNumber: input.phoneNumber,
              },
              preferences: null,
              notes: null,
              tags: [],
              birthDate: null,
              loyaltyPoints: 0,
              membershipLevel: 'regular',
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          } as Customer)
        ),
        findById: vi.fn(),
        findByEmail: vi.fn().mockImplementation(async () => {
          callCount++
          // Simulate race condition - first call returns null, second returns existing
          if (callCount === 1) {
            return ok(null)
          }
          return ok({
            type: 'active',
            data: {
              id: createTestCustomerId('550e8400-e29b-41d4-a716-446655440008'),
              name: 'Already Created',
              contactInfo: {
                email: input.email,
                phoneNumber: '090-8888-8888',
              },
              preferences: null,
              notes: null,
              tags: [],
              birthDate: null,
              loyaltyPoints: 0,
              membershipLevel: 'regular',
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          } as Customer)
        }),
        findAll: vi.fn(),
        delete: vi.fn(),
      })

      const deps: CreateCustomerDeps = {
        customerRepository: mockRepository,
      }

      // Act - Simulate concurrent requests
      const [result1, result2] = await Promise.all([
        createCustomerUseCase(input, deps),
        createCustomerUseCase(input, deps),
      ])

      // Assert - At least one should fail with duplicate email
      expect(result1).toBeDefined()
      expect(result2).toBeDefined()

      const results = [result1, result2]
      const errorResults = results.filter((r) => r?.type === 'err')
      expect(errorResults.length).toBeGreaterThanOrEqual(1)

      if (errorResults[0]?.type === 'err') {
        expect(errorResults[0].error.type).toBe('duplicateEmail')
      }
    })
  })

  /**
   * マッピング関数のテスト
   */
  describe('Mapping Functions', () => {
    it('should map CreateCustomerRequest to UseCaseInput correctly', () => {
      // Arrange
      const request = {
        name: 'Mapped User',
        contactInfo: {
          email: 'mapped@example.com',
          phoneNumber: '090-9999-9999',
        },
        preferences: 'Mapped preferences',
        notes: 'Mapped notes',
        tags: ['tag1', 'tag2'],
        birthDate: '1985-05-15',
      }

      // Act
      const result = mapCreateCustomerRequest(request)

      // Assert
      expect(result).toEqual({
        name: request.name,
        email: request.contactInfo.email,
        phoneNumber: request.contactInfo.phoneNumber,
        preferences: request.preferences,
        notes: request.notes,
        tags: request.tags,
        birthDate: request.birthDate,
      })
    })

    it('should map Customer to Response correctly', () => {
      // Arrange
      const customer: Customer = {
        type: 'active',
        data: {
          id: createTestCustomerId('550e8400-e29b-41d4-a716-446655440009'),
          name: 'Response User',
          contactInfo: {
            email: 'response@example.com',
            phoneNumber: '090-0000-0000',
          },
          preferences: 'Test preferences',
          notes: 'Test notes',
          tags: ['vip', 'regular'],
          birthDate: new Date('1990-06-20'),
          loyaltyPoints: 500,
          membershipLevel: 'gold',
          createdAt: new Date('2024-01-01T10:00:00Z'),
          updatedAt: new Date('2024-01-02T15:30:00Z'),
        },
      }

      // Act
      const response = mapCustomerToResponse(customer)

      // Assert
      expect(response).toEqual({
        id: customer.data.id,
        name: customer.data.name,
        contactInfo: {
          email: customer.data.contactInfo.email,
          phoneNumber: customer.data.contactInfo.phoneNumber,
        },
        preferences: customer.data.preferences,
        notes: customer.data.notes,
        tags: customer.data.tags,
        loyaltyPoints: customer.data.loyaltyPoints,
        membershipLevel: customer.data.membershipLevel,
        birthDate: '1990-06-20',
        createdAt: '2024-01-01T10:00:00.000Z',
        createdBy: null,
        updatedAt: '2024-01-02T15:30:00.000Z',
        updatedBy: null,
      })
    })

    it('should handle Customer without optional fields in response mapping', () => {
      // Arrange
      const customer: Customer = {
        type: 'active',
        data: {
          id: createTestCustomerId('550e8400-e29b-41d4-a716-446655440011'),
          name: 'Minimal User',
          contactInfo: {
            email: 'minimal@example.com',
            phoneNumber: '090-1111-1111',
          },
          preferences: null,
          notes: null,
          tags: [],
          birthDate: null,
          loyaltyPoints: 0,
          membershipLevel: 'regular',
          createdAt: new Date('2024-03-01T09:00:00Z'),
          updatedAt: new Date('2024-03-01T09:00:00Z'),
        },
      }

      // Act
      const response = mapCustomerToResponse(customer)

      // Assert
      expect(response.preferences).toBeNull()
      expect(response.notes).toBeNull()
      expect(response.tags).toEqual([])
      expect(response.birthDate).toBeUndefined()
    })
  })

  /**
   * エラーレスポンス生成のテスト
   */
  describe('Error Response Generation', () => {
    it('should generate correct error response for duplicateEmail', () => {
      // Arrange
      const error: CreateCustomerUseCaseError = {
        type: 'duplicateEmail',
        email: 'duplicate@example.com',
      }

      // Act
      const response = createCustomerErrorResponse(error)

      // Assert
      expect(response).toEqual({
        code: 'DUPLICATE_EMAIL',
        message: 'Email already exists: duplicate@example.com',
        target: 'email',
      })
    })

    it('should generate correct error response for invalidEmail', () => {
      // Arrange
      const error: CustomerError = {
        type: 'invalidEmail',
        email: 'invalid-email',
      }

      // Act
      const response = createCustomerErrorResponse(error)

      // Assert
      expect(response).toEqual({
        code: 'INVALID_EMAIL',
        message: 'Invalid email format: invalid-email',
        target: 'email',
      })
    })

    it('should generate correct error response for databaseError', () => {
      // Arrange
      const error: RepositoryError = {
        type: 'databaseError',
        message: 'Connection timeout',
      }

      // Act
      const response = createCustomerErrorResponse(error)

      // Assert
      expect(response).toEqual({
        code: 'DATABASE_ERROR',
        message: 'Connection timeout',
        target: null,
      })
    })

    it('should handle all error types exhaustively', () => {
      // Arrange
      const errorTypes: CreateCustomerUseCaseError[] = [
        { type: 'invalidEmail', email: 'test' },
        { type: 'invalidPhoneNumber', phoneNumber: '123' },
        { type: 'invalidName', name: '' },
        { type: 'duplicateEmail', email: 'dup@test.com' },
        { type: 'notFound', entity: 'Customer', id: '123' },
        { type: 'databaseError', message: 'DB Error' },
      ]

      // Act & Assert
      for (const error of errorTypes) {
        const response = createCustomerErrorResponse(error)
        expect(response).toHaveProperty('code')
        expect(response).toHaveProperty('message')
        expect(response).toHaveProperty('target')
        expect(response.code).not.toBe('UNKNOWN_ERROR')
      }
    })
  })
})
