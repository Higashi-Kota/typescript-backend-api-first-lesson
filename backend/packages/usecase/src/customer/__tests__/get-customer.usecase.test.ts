/**
 * Get Customer Use Case Tests
 * AAA（Arrange-Act-Assert）パターンに準拠した詳細なテスト
 */

import type {
  Customer,
  PaginatedResult,
  RepositoryError,
} from '@beauty-salon-backend/domain'
import { err, ok } from '@beauty-salon-backend/domain'
import { describe, expect, it, vi } from 'vitest'
import type {
  CustomerProfile,
  GetCustomerByIdDeps,
  GetCustomerByIdInput,
  GetCustomerProfileDeps,
  GetCustomerProfileInput,
  ListCustomersDeps,
  ListCustomersInput,
} from '../get-customer.usecase.js'
import {
  getCustomerByIdUseCase,
  getCustomerProfileUseCase,
  listCustomersUseCase,
  mapCustomerListToResponse,
  mapCustomerProfileToResponse,
} from '../get-customer.usecase.js'
import {
  createMockCustomerRepository,
  createTestCustomerId,
} from './test-helpers.js'

describe('Get Customer Use Cases - AAA Pattern Tests', () => {
  // テスト用の顧客データを作成するヘルパー関数
  const createTestCustomer = (
    id: string,
    overrides?: Partial<Customer['data']>
  ): Customer => ({
    type: 'active',
    data: {
      id: createTestCustomerId(id),
      name: `Test Customer ${id}`,
      contactInfo: {
        email: `customer${id}@example.com`,
        phoneNumber: '090-1234-5678',
      },
      preferences: null,
      notes: null,
      tags: [],
      birthDate: null,
      loyaltyPoints: 100,
      membershipLevel: 'regular',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      ...overrides,
    },
  })

  /**
   * getCustomerByIdUseCase のテスト
   */
  describe('getCustomerByIdUseCase', () => {
    describe('Success Cases', () => {
      it('should retrieve customer by ID successfully', async () => {
        // Arrange
        const customerId = createTestCustomerId(
          '550e8400-e29b-41d4-a716-446655440301'
        )
        const expectedCustomer = createTestCustomer(
          '550e8400-e29b-41d4-a716-446655440301'
        )

        const mockRepository = createMockCustomerRepository({
          findById: vi.fn().mockResolvedValue(ok(expectedCustomer)),
          save: vi.fn(),
          findByEmail: vi.fn(),
          findAll: vi.fn(),
          delete: vi.fn(),
        })

        const input: GetCustomerByIdInput = { id: customerId }
        const deps: GetCustomerByIdDeps = { customerRepository: mockRepository }

        // Act
        const result = await getCustomerByIdUseCase(input, deps)

        // Assert
        expect(result.type).toBe('ok')
        if (result.type === 'ok') {
          expect(result.value).toEqual(expectedCustomer)
          const customer = result.value
          if (customer.type === 'active') {
            expect(customer.data.id).toBe(customerId)
          }
        }
        expect(mockRepository.findById).toHaveBeenCalledWith(customerId)
        expect(mockRepository.findById).toHaveBeenCalledOnce()
      })

      it('should retrieve deleted customer when it exists', async () => {
        // Arrange
        const customerId = createTestCustomerId(
          '550e8400-e29b-41d4-a716-446655440302'
        )
        const deletedCustomer: Customer = {
          type: 'deleted',
          data: createTestCustomer('550e8400-e29b-41d4-a716-446655440302').data,
          deletedAt: new Date(),
        }

        const mockRepository = createMockCustomerRepository({
          findById: vi.fn().mockResolvedValue(ok(deletedCustomer)),
          save: vi.fn(),
          findByEmail: vi.fn(),
          findAll: vi.fn(),
          delete: vi.fn(),
        })

        const input: GetCustomerByIdInput = { id: customerId }
        const deps: GetCustomerByIdDeps = { customerRepository: mockRepository }

        // Act
        const result = await getCustomerByIdUseCase(input, deps)

        // Assert
        expect(result.type).toBe('ok')
        if (result.type === 'ok') {
          expect(result.value.type).toBe('deleted')
        }
      })
    })

    describe('Error Cases', () => {
      it('should handle customer not found error', async () => {
        // Arrange
        const customerId = createTestCustomerId(
          '550e8400-e29b-41d4-a716-446655440303'
        )
        const notFoundError: RepositoryError = {
          type: 'notFound',
          entity: 'Customer',
          id: customerId,
        }

        const mockRepository = createMockCustomerRepository({
          findById: vi.fn().mockResolvedValue(err(notFoundError)),
          save: vi.fn(),
          findByEmail: vi.fn(),
          findAll: vi.fn(),
          delete: vi.fn(),
        })

        const input: GetCustomerByIdInput = { id: customerId }
        const deps: GetCustomerByIdDeps = { customerRepository: mockRepository }

        // Act
        const result = await getCustomerByIdUseCase(input, deps)

        // Assert
        expect(result.type).toBe('err')
        if (result.type === 'err') {
          expect(result.error.type).toBe('notFound')
          expect(result.error).toEqual(notFoundError)
        }
      })

      it('should handle database error', async () => {
        // Arrange
        const customerId = createTestCustomerId(
          '550e8400-e29b-41d4-a716-446655440304'
        )
        const dbError: RepositoryError = {
          type: 'databaseError',
          message: 'Connection lost',
        }

        const mockRepository = createMockCustomerRepository({
          findById: vi.fn().mockResolvedValue(err(dbError)),
          save: vi.fn(),
          findByEmail: vi.fn(),
          findAll: vi.fn(),
          delete: vi.fn(),
        })

        const input: GetCustomerByIdInput = { id: customerId }
        const deps: GetCustomerByIdDeps = { customerRepository: mockRepository }

        // Act
        const result = await getCustomerByIdUseCase(input, deps)

        // Assert
        expect(result.type).toBe('err')
        if (result.type === 'err') {
          expect(result.error.type).toBe('databaseError')
          if (result.error.type === 'databaseError') {
            expect(result.error.message).toBe('Connection lost')
          }
        }
      })

      it('should handle repository throwing exception', async () => {
        // Arrange
        const customerId = createTestCustomerId(
          '550e8400-e29b-41d4-a716-446655440305'
        )

        const mockRepository = createMockCustomerRepository({
          findById: vi.fn().mockRejectedValue(new Error('Unexpected error')),
          save: vi.fn(),
          findByEmail: vi.fn(),
          findAll: vi.fn(),
          delete: vi.fn(),
        })

        const input: GetCustomerByIdInput = { id: customerId }
        const deps: GetCustomerByIdDeps = { customerRepository: mockRepository }

        // Act & Assert
        await expect(getCustomerByIdUseCase(input, deps)).rejects.toThrow(
          'Unexpected error'
        )
      })
    })
  })

  /**
   * listCustomersUseCase のテスト
   */
  describe('listCustomersUseCase', () => {
    describe('Success Cases', () => {
      it('should list all customers with default pagination', async () => {
        // Arrange
        const customers = [
          createTestCustomer('550e8400-e29b-41d4-a716-446655440311'),
          createTestCustomer('550e8400-e29b-41d4-a716-446655440312'),
          createTestCustomer('550e8400-e29b-41d4-a716-446655440313'),
        ]
        const paginatedResult: PaginatedResult<Customer> = {
          data: customers,
          total: 3,
          limit: 10,
          offset: 0,
        }

        const mockRepository = createMockCustomerRepository({
          findById: vi.fn(),
          save: vi.fn(),
          findByEmail: vi.fn(),
          findAll: vi.fn(),
          delete: vi.fn(),
          search: vi.fn().mockResolvedValue(ok(paginatedResult)),
        })

        const input: ListCustomersInput = {
          limit: 10,
          offset: 0,
        }
        const deps: ListCustomersDeps = { customerRepository: mockRepository }

        // Act
        const result = await listCustomersUseCase(input, deps)

        // Assert
        expect(result.type).toBe('ok')
        if (result.type === 'ok') {
          expect(result.value.data).toHaveLength(3)
          expect(result.value.total).toBe(3)
          expect(result.value.limit).toBe(10)
          expect(result.value.offset).toBe(0)
        }
        expect(mockRepository.search).toHaveBeenCalledWith(
          {
            search: undefined,
            tags: undefined,
            membershipLevel: undefined,
            isActive: undefined,
          },
          { limit: 10, offset: 0 }
        )
      })

      it('should search customers with criteria', async () => {
        // Arrange
        const searchResults = [
          createTestCustomer('550e8400-e29b-41d4-a716-446655440314'),
        ]
        const paginatedResult: PaginatedResult<Customer> = {
          data: searchResults,
          total: 1,
          limit: 20,
          offset: 0,
        }

        const mockRepository = createMockCustomerRepository({
          findById: vi.fn(),
          save: vi.fn(),
          findByEmail: vi.fn(),
          findAll: vi.fn(),
          delete: vi.fn(),
          search: vi.fn().mockResolvedValue(ok(paginatedResult)),
        })

        const input: ListCustomersInput = {
          search: 'john',
          tags: ['vip', 'regular'],
          membershipLevel: 'gold',
          isActive: true,
          limit: 20,
          offset: 0,
        }
        const deps: ListCustomersDeps = { customerRepository: mockRepository }

        // Act
        const result = await listCustomersUseCase(input, deps)

        // Assert
        expect(result.type).toBe('ok')
        if (result.type === 'ok') {
          expect(result.value.data).toHaveLength(1)
        }
        expect(mockRepository.search).toHaveBeenCalledWith(
          {
            search: 'john',
            tags: ['vip', 'regular'],
            membershipLevel: 'gold',
            isActive: true,
          },
          { limit: 20, offset: 0 }
        )
      })

      it('should handle empty results', async () => {
        // Arrange
        const paginatedResult: PaginatedResult<Customer> = {
          data: [],
          total: 0,
          limit: 10,
          offset: 0,
        }

        const mockRepository = createMockCustomerRepository({
          findById: vi.fn(),
          save: vi.fn(),
          findByEmail: vi.fn(),
          findAll: vi.fn(),
          delete: vi.fn(),
          search: vi.fn().mockResolvedValue(ok(paginatedResult)),
        })

        const input: ListCustomersInput = {
          search: 'nonexistent',
          limit: 10,
          offset: 0,
        }
        const deps: ListCustomersDeps = { customerRepository: mockRepository }

        // Act
        const result = await listCustomersUseCase(input, deps)

        // Assert
        expect(result.type).toBe('ok')
        if (result.type === 'ok') {
          expect(result.value.data).toHaveLength(0)
          expect(result.value.total).toBe(0)
        }
      })

      it('should handle pagination with offset', async () => {
        // Arrange
        const customers = [
          createTestCustomer('550e8400-e29b-41d4-a716-446655440315'),
          createTestCustomer('550e8400-e29b-41d4-a716-446655440316'),
        ]
        const paginatedResult: PaginatedResult<Customer> = {
          data: customers,
          total: 50,
          limit: 10,
          offset: 10,
        }

        const mockRepository = createMockCustomerRepository({
          findById: vi.fn(),
          save: vi.fn(),
          findByEmail: vi.fn(),
          findAll: vi.fn(),
          delete: vi.fn(),
          search: vi.fn().mockResolvedValue(ok(paginatedResult)),
        })

        const input: ListCustomersInput = {
          limit: 10,
          offset: 10,
        }
        const deps: ListCustomersDeps = { customerRepository: mockRepository }

        // Act
        const result = await listCustomersUseCase(input, deps)

        // Assert
        expect(result.type).toBe('ok')
        if (result.type === 'ok') {
          expect(result.value.data).toHaveLength(2)
          expect(result.value.total).toBe(50)
          expect(result.value.offset).toBe(10)
        }
      })
    })

    describe('Error Cases', () => {
      it('should handle database error during search', async () => {
        // Arrange
        const dbError: RepositoryError = {
          type: 'databaseError',
          message: 'Query timeout',
        }

        const mockRepository = createMockCustomerRepository({
          findById: vi.fn(),
          save: vi.fn(),
          findByEmail: vi.fn(),
          findAll: vi.fn(),
          delete: vi.fn(),
          search: vi.fn().mockResolvedValue(err(dbError)),
        })

        const input: ListCustomersInput = {
          limit: 10,
          offset: 0,
        }
        const deps: ListCustomersDeps = { customerRepository: mockRepository }

        // Act
        const result = await listCustomersUseCase(input, deps)

        // Assert
        expect(result.type).toBe('err')
        if (result.type === 'err') {
          expect(result.error.type).toBe('databaseError')
          if (result.error.type === 'databaseError') {
            expect(result.error.message).toBe('Query timeout')
          }
        }
      })
    })

    describe('Edge Cases', () => {
      it('should handle very large limit', async () => {
        // Arrange
        const customers = Array(100)
          .fill(null)
          .map((_, i) =>
            createTestCustomer(
              `550e8400-e29b-41d4-a716-44665544${i.toString().padStart(4, '0')}`
            )
          )
        const paginatedResult: PaginatedResult<Customer> = {
          data: customers,
          total: 1000,
          limit: 1000,
          offset: 0,
        }

        const mockRepository = createMockCustomerRepository({
          findById: vi.fn(),
          save: vi.fn(),
          findByEmail: vi.fn(),
          findAll: vi.fn(),
          delete: vi.fn(),
          search: vi.fn().mockResolvedValue(ok(paginatedResult)),
        })

        const input: ListCustomersInput = {
          limit: 1000,
          offset: 0,
        }
        const deps: ListCustomersDeps = { customerRepository: mockRepository }

        // Act
        const result = await listCustomersUseCase(input, deps)

        // Assert
        expect(result.type).toBe('ok')
        if (result.type === 'ok') {
          expect(result.value.data).toHaveLength(100)
          expect(result.value.limit).toBe(1000)
        }
      })

      it('should handle special characters in search', async () => {
        // Arrange
        const paginatedResult: PaginatedResult<Customer> = {
          data: [],
          total: 0,
          limit: 10,
          offset: 0,
        }

        const mockRepository = createMockCustomerRepository({
          findById: vi.fn(),
          save: vi.fn(),
          findByEmail: vi.fn(),
          findAll: vi.fn(),
          delete: vi.fn(),
          search: vi.fn().mockResolvedValue(ok(paginatedResult)),
        })

        const input: ListCustomersInput = {
          search: "'; DROP TABLE customers; --",
          limit: 10,
          offset: 0,
        }
        const deps: ListCustomersDeps = { customerRepository: mockRepository }

        // Act
        const result = await listCustomersUseCase(input, deps)

        // Assert
        expect(result.type).toBe('ok')
        expect(mockRepository.search).toHaveBeenCalledWith(
          {
            search: "'; DROP TABLE customers; --",
            tags: undefined,
            membershipLevel: undefined,
            isActive: undefined,
          },
          { limit: 10, offset: 0 }
        )
      })
    })
  })

  /**
   * getCustomerProfileUseCase のテスト
   */
  describe('getCustomerProfileUseCase', () => {
    describe('Success Cases', () => {
      it('should retrieve customer profile with additional statistics', async () => {
        // Arrange
        const customerId = createTestCustomerId(
          '550e8400-e29b-41d4-a716-446655440306'
        )
        const customer = createTestCustomer(
          '550e8400-e29b-41d4-a716-446655440306',
          {
            loyaltyPoints: 500,
            membershipLevel: 'gold',
          }
        )

        const mockRepository = createMockCustomerRepository({
          findById: vi.fn().mockResolvedValue(ok(customer)),
          save: vi.fn(),
          findByEmail: vi.fn(),
          findAll: vi.fn(),
          delete: vi.fn(),
        })

        const input: GetCustomerProfileInput = { id: customerId }
        const deps: GetCustomerProfileDeps = {
          customerRepository: mockRepository,
        }

        // Act
        const result = await getCustomerProfileUseCase(input, deps)

        // Assert
        expect(result.type).toBe('ok')
        if (result.type === 'ok') {
          expect(result.value.data.id).toBe(customerId)
          expect(result.value.visitCount).toBe(0) // TODO値
          expect(result.value.lastVisitDate).toBeUndefined()
          expect(result.value.totalSpent).toBe(0)
          expect(result.value.favoriteStaffIds).toEqual([])
          expect(result.value.favoriteServiceIds).toEqual([])
        }
      })

      it('should include all customer data in profile', async () => {
        // Arrange
        const customerId = createTestCustomerId(
          '550e8400-e29b-41d4-a716-446655440307'
        )
        const customer = createTestCustomer(
          '550e8400-e29b-41d4-a716-446655440307',
          {
            preferences: 'Prefers evening',
            notes: 'Allergic to certain products',
            tags: ['vip', 'frequent'],
            birthDate: new Date('1990-05-15'),
          }
        )

        const mockRepository = createMockCustomerRepository({
          findById: vi.fn().mockResolvedValue(ok(customer)),
          save: vi.fn(),
          findByEmail: vi.fn(),
          findAll: vi.fn(),
          delete: vi.fn(),
        })

        const input: GetCustomerProfileInput = { id: customerId }
        const deps: GetCustomerProfileDeps = {
          customerRepository: mockRepository,
        }

        // Act
        const result = await getCustomerProfileUseCase(input, deps)

        // Assert
        expect(result.type).toBe('ok')
        if (result.type === 'ok') {
          expect(result.value.data.preferences).toBe('Prefers evening')
          expect(result.value.data.notes).toBe('Allergic to certain products')
          expect(result.value.data.tags).toEqual(['vip', 'frequent'])
          expect(result.value.data.birthDate).toEqual(new Date('1990-05-15'))
        }
      })
    })

    describe('Error Cases', () => {
      it('should propagate repository errors', async () => {
        // Arrange
        const customerId = createTestCustomerId(
          '550e8400-e29b-41d4-a716-446655440308'
        )
        const notFoundError: RepositoryError = {
          type: 'notFound',
          entity: 'Customer',
          id: customerId,
        }

        const mockRepository = createMockCustomerRepository({
          findById: vi.fn().mockResolvedValue(err(notFoundError)),
          save: vi.fn(),
          findByEmail: vi.fn(),
          findAll: vi.fn(),
          delete: vi.fn(),
        })

        const input: GetCustomerProfileInput = { id: customerId }
        const deps: GetCustomerProfileDeps = {
          customerRepository: mockRepository,
        }

        // Act
        const result = await getCustomerProfileUseCase(input, deps)

        // Assert
        expect(result.type).toBe('err')
        if (result.type === 'err') {
          expect(result.error.type).toBe('notFound')
        }
      })
    })
  })

  /**
   * マッピング関数のテスト
   */
  describe('Mapping Functions', () => {
    describe('mapCustomerListToResponse', () => {
      it('should map paginated customer list to response format', () => {
        // Arrange
        const customers = [
          createTestCustomer('550e8400-e29b-41d4-a716-446655440321'),
          createTestCustomer('550e8400-e29b-41d4-a716-446655440322'),
          createTestCustomer('550e8400-e29b-41d4-a716-446655440323'),
        ]
        const paginatedResult: PaginatedResult<Customer> = {
          data: customers,
          total: 3,
          limit: 10,
          offset: 0,
        }

        // Act
        const response = mapCustomerListToResponse(paginatedResult)

        // Assert
        expect(response.data).toHaveLength(3)
        expect(response.total).toBe(3)
        expect(response.limit).toBe(10)
        expect(response.offset).toBe(0)
        expect(response.data[0]).toHaveProperty('id')
        expect(response.data[0]).toHaveProperty('name')
        expect(response.data[0]).toHaveProperty('contactInfo')
      })

      it('should handle empty list', () => {
        // Arrange
        const paginatedResult: PaginatedResult<Customer> = {
          data: [],
          total: 0,
          limit: 20,
          offset: 0,
        }

        // Act
        const response = mapCustomerListToResponse(paginatedResult)

        // Assert
        expect(response.data).toEqual([])
        expect(response.total).toBe(0)
      })
    })

    describe('mapCustomerProfileToResponse', () => {
      it('should map customer profile with statistics to response', () => {
        // Arrange
        const profile: CustomerProfile = {
          type: 'active',
          data: createTestCustomer('550e8400-e29b-41d4-a716-446655440324').data,
          visitCount: 25,
          lastVisitDate: new Date('2024-03-15'),
          totalSpent: 150000,
          favoriteStaffIds: ['staff-1', 'staff-2'],
          favoriteServiceIds: ['service-1', 'service-2'],
        }

        // Act
        const response = mapCustomerProfileToResponse(profile)

        // Assert
        expect(response.id).toBe(profile.data.id)
        expect(response.visitCount).toBe(25)
        expect(response.lastVisitDate).toBe('2024-03-15T00:00:00.000Z')
        expect(response.totalSpent).toBe(150000)
        expect(response.favoriteStaffIds).toEqual(['staff-1', 'staff-2'])
        expect(response.favoriteServiceIds).toEqual(['service-1', 'service-2'])
      })

      it('should handle profile without optional fields', () => {
        // Arrange
        const profile: CustomerProfile = {
          type: 'active',
          data: createTestCustomer('550e8400-e29b-41d4-a716-446655440325').data,
          visitCount: 0,
          lastVisitDate: undefined,
          totalSpent: 0,
          favoriteStaffIds: undefined,
          favoriteServiceIds: undefined,
        }

        // Act
        const response = mapCustomerProfileToResponse(profile)

        // Assert
        expect(response.visitCount).toBe(0)
        expect(response.lastVisitDate).toBeUndefined()
        expect(response.totalSpent).toBe(0)
        expect(response.favoriteStaffIds).toEqual([])
        expect(response.favoriteServiceIds).toEqual([])
      })
    })
  })
})
