/**
 * Update Customer Use Case Tests
 * AAA（Arrange-Act-Assert）パターンに準拠した詳細なテスト
 */

import type { Customer, RepositoryError } from '@beauty-salon-backend/domain'
import { err, ok } from '@beauty-salon-backend/domain'
import { describe, expect, it, vi } from 'vitest'
import type {
  UpdateCustomerDeps,
  UpdateCustomerUseCaseInput,
} from '../update-customer.usecase.js'
import {
  mapUpdateCustomerRequest,
  mapUpdateCustomerRequestWithReset,
  updateCustomerUseCase,
} from '../update-customer.usecase.js'
import {
  createMockCustomerRepository,
  createTestCustomerId,
} from './test-helpers.js'

describe('Update Customer Use Case - AAA Pattern Tests', () => {
  // テスト用の顧客データを作成するヘルパー関数
  const createTestCustomer = (
    id: string,
    overrides?: Partial<Customer['data']>
  ): Customer => ({
    type: 'active',
    data: {
      id: createTestCustomerId(id),
      name: 'Original Name',
      contactInfo: {
        email: 'original@example.com',
        phoneNumber: '090-1234-5678',
      },
      preferences: 'Original preferences',
      notes: 'Original notes',
      tags: ['original', 'tag'],
      birthDate: new Date('1990-01-01'),
      loyaltyPoints: 100,
      membershipLevel: 'regular',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      ...overrides,
    },
  })

  /**
   * 正常系テスト
   */
  describe('Success Cases', () => {
    it('should update customer name only', async () => {
      // Arrange
      const customerId = createTestCustomerId(
        '550e8400-e29b-41d4-a716-446655440200'
      )
      const existingCustomer = createTestCustomer(
        '550e8400-e29b-41d4-a716-446655440200'
      )
      const input: UpdateCustomerUseCaseInput = {
        id: customerId,
        updates: {
          name: 'Updated Name',
        },
      }

      const mockRepository = createMockCustomerRepository({
        findById: vi.fn().mockResolvedValue(ok(existingCustomer)),
        findByEmail: vi.fn(),
        save: vi.fn().mockImplementation(async (customer) => ok(customer)),
        findAll: vi.fn(),
        delete: vi.fn(),
      })

      const deps: UpdateCustomerDeps = {
        customerRepository: mockRepository,
      }

      // Act
      const result = await updateCustomerUseCase(input, deps)

      // Assert
      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        expect(result.value.data.name).toBe('Updated Name')
        // 他のフィールドは変更されていない
        expect(result.value.data.contactInfo.email).toBe('original@example.com')
        expect(result.value.data.contactInfo.phoneNumber).toBe('090-1234-5678')
        expect(result.value.data.preferences).toBe('Original preferences')
        expect(result.value.data.notes).toBe('Original notes')
        expect(result.value.data.tags).toEqual(['original', 'tag'])
      }
      expect(mockRepository.findById).toHaveBeenCalledWith(customerId)
      expect(mockRepository.findByEmail).not.toHaveBeenCalled()
      expect(mockRepository.save).toHaveBeenCalledOnce()
    })

    it('should update email with duplicate check', async () => {
      // Arrange
      const customerId = createTestCustomerId(
        '550e8400-e29b-41d4-a716-446655440201'
      )
      const existingCustomer = createTestCustomer(
        '550e8400-e29b-41d4-a716-446655440201'
      )
      const input: UpdateCustomerUseCaseInput = {
        id: customerId,
        updates: {
          email: 'newemail@example.com',
        },
      }

      const mockRepository = createMockCustomerRepository({
        findById: vi.fn().mockResolvedValue(ok(existingCustomer)),
        findByEmail: vi.fn().mockResolvedValue(ok(null)), // No duplicate
        save: vi.fn().mockImplementation(async (customer) => ok(customer)),
        findAll: vi.fn(),
        delete: vi.fn(),
      })

      const deps: UpdateCustomerDeps = {
        customerRepository: mockRepository,
      }

      // Act
      const result = await updateCustomerUseCase(input, deps)

      // Assert
      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        expect(result.value.data.contactInfo.email).toBe('newemail@example.com')
        expect(result.value.data.contactInfo.phoneNumber).toBe('090-1234-5678') // 変更されない
      }
      expect(mockRepository.findByEmail).toHaveBeenCalledWith(
        'newemail@example.com'
      )
    })

    it('should update multiple fields at once', async () => {
      // Arrange
      const customerId = createTestCustomerId(
        '550e8400-e29b-41d4-a716-446655440202'
      )
      const existingCustomer = createTestCustomer(
        '550e8400-e29b-41d4-a716-446655440202'
      )
      const input: UpdateCustomerUseCaseInput = {
        id: customerId,
        updates: {
          name: 'Completely Updated',
          phoneNumber: '080-9876-5432',
          preferences: 'New preferences',
          notes: 'New notes',
          tags: ['new', 'updated', 'tags'],
          birthDate: '1985-05-15',
        },
      }

      const mockRepository = createMockCustomerRepository({
        findById: vi.fn().mockResolvedValue(ok(existingCustomer)),
        findByEmail: vi.fn(),
        save: vi.fn().mockImplementation(async (customer) => ok(customer)),
        findAll: vi.fn(),
        delete: vi.fn(),
      })

      const deps: UpdateCustomerDeps = {
        customerRepository: mockRepository,
      }

      // Act
      const result = await updateCustomerUseCase(input, deps)

      // Assert
      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        expect(result.value.data.name).toBe('Completely Updated')
        expect(result.value.data.contactInfo.phoneNumber).toBe('080-9876-5432')
        expect(result.value.data.preferences).toBe('New preferences')
        expect(result.value.data.notes).toBe('New notes')
        expect(result.value.data.tags).toEqual(['new', 'updated', 'tags'])
        expect(result.value.data.birthDate?.toISOString().split('T')[0]).toBe(
          '1985-05-15'
        )
        // メールは変更されていない
        expect(result.value.data.contactInfo.email).toBe('original@example.com')
      }
    })

    it('should clear optional fields with null', async () => {
      // Arrange
      const customerId = createTestCustomerId(
        '550e8400-e29b-41d4-a716-446655440203'
      )
      const existingCustomer = createTestCustomer(
        '550e8400-e29b-41d4-a716-446655440203'
      )
      const input: UpdateCustomerUseCaseInput = {
        id: customerId,
        updates: {
          preferences: null,
          notes: null,
          birthDate: null,
        },
      }

      const mockRepository = createMockCustomerRepository({
        findById: vi.fn().mockResolvedValue(ok(existingCustomer)),
        findByEmail: vi.fn(),
        save: vi.fn().mockImplementation(async (customer) => ok(customer)),
        findAll: vi.fn(),
        delete: vi.fn(),
      })

      const deps: UpdateCustomerDeps = {
        customerRepository: mockRepository,
      }

      // Act
      const result = await updateCustomerUseCase(input, deps)

      // Assert
      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        expect(result.value.data.preferences).toBeNull()
        expect(result.value.data.notes).toBeNull()
        expect(result.value.data.birthDate).toBeNull()
        // 他のフィールドは変更されない
        expect(result.value.data.name).toBe('Original Name')
        expect(result.value.data.tags).toEqual(['original', 'tag'])
      }
    })

    it('should not update fields not included in updates', async () => {
      // Arrange
      const customerId = createTestCustomerId(
        '550e8400-e29b-41d4-a716-446655440204'
      )
      const existingCustomer = createTestCustomer(
        '550e8400-e29b-41d4-a716-446655440204'
      )
      const input: UpdateCustomerUseCaseInput = {
        id: customerId,
        updates: {}, // 空の更新
      }

      const mockRepository = createMockCustomerRepository({
        findById: vi.fn().mockResolvedValue(ok(existingCustomer)),
        findByEmail: vi.fn(),
        save: vi.fn().mockImplementation(async (customer) => ok(customer)),
        findAll: vi.fn(),
        delete: vi.fn(),
      })

      const deps: UpdateCustomerDeps = {
        customerRepository: mockRepository,
      }

      // Act
      const result = await updateCustomerUseCase(input, deps)

      // Assert
      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        // updatedAt以外のフィールドが元のまま
        const { updatedAt: _, ...dataWithoutUpdatedAt } = result.value.data
        const { updatedAt: __, ...originalWithoutUpdatedAt } =
          existingCustomer.data
        expect(dataWithoutUpdatedAt).toEqual(originalWithoutUpdatedAt)
        // updatedAtは更新されている
        expect(result.value.data.updatedAt.getTime()).toBeGreaterThan(
          existingCustomer.data.updatedAt.getTime()
        )
      }
    })
  })

  /**
   * エラー系テスト
   */
  describe('Error Cases', () => {
    it('should return error when customer not found', async () => {
      // Arrange
      const customerId = createTestCustomerId(
        '550e8400-e29b-41d4-a716-446655440205'
      )
      const input: UpdateCustomerUseCaseInput = {
        id: customerId,
        updates: {
          name: 'New Name',
        },
      }

      const notFoundError: RepositoryError = {
        type: 'notFound',
        entity: 'Customer',
        id: customerId,
      }

      const mockRepository = createMockCustomerRepository({
        findById: vi.fn().mockResolvedValue(err(notFoundError)),
        findByEmail: vi.fn(),
        save: vi.fn(),
        findAll: vi.fn(),
        delete: vi.fn(),
      })

      const deps: UpdateCustomerDeps = {
        customerRepository: mockRepository,
      }

      // Act
      const result = await updateCustomerUseCase(input, deps)

      // Assert
      expect(result.type).toBe('err')
      if (result.type === 'err') {
        expect(result.error.type).toBe('notFound')
      }
      expect(mockRepository.save).not.toHaveBeenCalled()
    })

    it('should return error when email already exists', async () => {
      // Arrange
      const customerId = createTestCustomerId(
        '550e8400-e29b-41d4-a716-446655440206'
      )
      const existingCustomer = createTestCustomer(
        '550e8400-e29b-41d4-a716-446655440206'
      )
      const anotherCustomer = createTestCustomer(
        '550e8400-e29b-41d4-a716-446655440218',
        {
          contactInfo: {
            email: 'taken@example.com',
            phoneNumber: '080-0000-0000',
          },
        }
      )

      const input: UpdateCustomerUseCaseInput = {
        id: customerId,
        updates: {
          email: 'taken@example.com',
        },
      }

      const mockRepository = createMockCustomerRepository({
        findById: vi.fn().mockResolvedValue(ok(existingCustomer)),
        findByEmail: vi.fn().mockResolvedValue(ok(anotherCustomer)),
        save: vi.fn(),
        findAll: vi.fn(),
        delete: vi.fn(),
      })

      const deps: UpdateCustomerDeps = {
        customerRepository: mockRepository,
      }

      // Act
      const result = await updateCustomerUseCase(input, deps)

      // Assert
      expect(result.type).toBe('err')
      if (result.type === 'err') {
        expect(result.error.type).toBe('duplicateEmail')
        expect(result.error).toEqual({
          type: 'duplicateEmail',
          email: 'taken@example.com',
        })
      }
      expect(mockRepository.findByEmail).toHaveBeenCalledWith(
        'taken@example.com'
      )
      expect(mockRepository.save).not.toHaveBeenCalled()
    })

    it('should handle repository save error', async () => {
      // Arrange
      const customerId = createTestCustomerId(
        '550e8400-e29b-41d4-a716-446655440207'
      )
      const existingCustomer = createTestCustomer(
        '550e8400-e29b-41d4-a716-446655440207'
      )
      const input: UpdateCustomerUseCaseInput = {
        id: customerId,
        updates: {
          name: 'New Name',
        },
      }

      const saveError: RepositoryError = {
        type: 'databaseError',
        message: 'Save operation failed',
      }

      const mockRepository = createMockCustomerRepository({
        findById: vi.fn().mockResolvedValue(ok(existingCustomer)),
        findByEmail: vi.fn(),
        save: vi.fn().mockResolvedValue(err(saveError)),
        findAll: vi.fn(),
        delete: vi.fn(),
      })

      const deps: UpdateCustomerDeps = {
        customerRepository: mockRepository,
      }

      // Act
      const result = await updateCustomerUseCase(input, deps)

      // Assert
      expect(result.type).toBe('err')
      if (result.type === 'err') {
        expect(result.error.type).toBe('databaseError')
        if (result.error.type === 'databaseError') {
          expect(result.error.message).toBe('Save operation failed')
        }
      }
    })

    it('should handle validation error for invalid email', async () => {
      // Arrange
      const customerId = createTestCustomerId(
        '550e8400-e29b-41d4-a716-446655440208'
      )
      const existingCustomer = createTestCustomer(
        '550e8400-e29b-41d4-a716-446655440208'
      )
      const input: UpdateCustomerUseCaseInput = {
        id: customerId,
        updates: {
          email: 'invalid-email-format',
        },
      }

      const mockRepository = createMockCustomerRepository({
        findById: vi.fn().mockResolvedValue(ok(existingCustomer)),
        findByEmail: vi.fn().mockResolvedValue(ok(null)),
        save: vi.fn(),
        findAll: vi.fn(),
        delete: vi.fn(),
      })

      const deps: UpdateCustomerDeps = {
        customerRepository: mockRepository,
      }

      // Act
      const result = await updateCustomerUseCase(input, deps)

      // Assert
      expect(result.type).toBe('err')
      if (result.type === 'err') {
        expect(result.error.type).toBe('invalidEmail')
      }
      expect(mockRepository.save).not.toHaveBeenCalled()
    })

    it('should handle validation error for invalid phone number', async () => {
      // Arrange
      const customerId = createTestCustomerId(
        '550e8400-e29b-41d4-a716-446655440209'
      )
      const existingCustomer = createTestCustomer(
        '550e8400-e29b-41d4-a716-446655440209'
      )
      const input: UpdateCustomerUseCaseInput = {
        id: customerId,
        updates: {
          phoneNumber: 'invalid',
        },
      }

      const mockRepository = createMockCustomerRepository({
        findById: vi.fn().mockResolvedValue(ok(existingCustomer)),
        findByEmail: vi.fn(),
        save: vi.fn(),
        findAll: vi.fn(),
        delete: vi.fn(),
      })

      const deps: UpdateCustomerDeps = {
        customerRepository: mockRepository,
      }

      // Act
      const result = await updateCustomerUseCase(input, deps)

      // Assert
      expect(result.type).toBe('err')
      if (result.type === 'err') {
        expect(result.error.type).toBe('invalidPhoneNumber')
      }
      expect(mockRepository.save).not.toHaveBeenCalled()
    })
  })

  /**
   * エッジケース
   */
  describe('Edge Cases', () => {
    it('should not check email duplicate when email is not changed', async () => {
      // Arrange
      const customerId = createTestCustomerId(
        '550e8400-e29b-41d4-a716-446655440210'
      )
      const existingCustomer = createTestCustomer(
        '550e8400-e29b-41d4-a716-446655440210'
      )
      const input: UpdateCustomerUseCaseInput = {
        id: customerId,
        updates: {
          email: 'original@example.com', // 同じメール
          name: 'Updated Name',
        },
      }

      const mockRepository = createMockCustomerRepository({
        findById: vi.fn().mockResolvedValue(ok(existingCustomer)),
        findByEmail: vi.fn(),
        save: vi.fn().mockImplementation(async (customer) => ok(customer)),
        findAll: vi.fn(),
        delete: vi.fn(),
      })

      const deps: UpdateCustomerDeps = {
        customerRepository: mockRepository,
      }

      // Act
      const result = await updateCustomerUseCase(input, deps)

      // Assert
      expect(result.type).toBe('ok')
      expect(mockRepository.findByEmail).not.toHaveBeenCalled()
    })

    it('should handle updating deleted customer', async () => {
      // Arrange
      const customerId = createTestCustomerId(
        '550e8400-e29b-41d4-a716-446655440211'
      )
      const deletedCustomer: Customer = {
        type: 'deleted',
        data: createTestCustomer('550e8400-e29b-41d4-a716-446655440211').data,
        deletedAt: new Date(),
      }
      const input: UpdateCustomerUseCaseInput = {
        id: customerId,
        updates: {
          name: 'Try to update deleted',
        },
      }

      const mockRepository = createMockCustomerRepository({
        findById: vi.fn().mockResolvedValue(ok(deletedCustomer)),
        findByEmail: vi.fn(),
        save: vi.fn().mockImplementation(async (customer) => ok(customer)),
        findAll: vi.fn(),
        delete: vi.fn(),
      })

      const deps: UpdateCustomerDeps = {
        customerRepository: mockRepository,
      }

      // Act
      const result = await updateCustomerUseCase(input, deps)

      // Assert - 削除済み顧客は更新できない
      expect(result.type).toBe('err')
      if (result.type === 'err') {
        expect(result.error.type).toBe('customerSuspended')
      }
    })

    it('should handle very long valid inputs', async () => {
      // Arrange
      const customerId = createTestCustomerId(
        '550e8400-e29b-41d4-a716-446655440212'
      )
      const existingCustomer = createTestCustomer(
        '550e8400-e29b-41d4-a716-446655440212'
      )
      const input: UpdateCustomerUseCaseInput = {
        id: customerId,
        updates: {
          name: 'A'.repeat(200),
          preferences: 'P'.repeat(1000),
          notes: 'N'.repeat(2000),
          tags: Array(100).fill('tag'),
        },
      }

      const mockRepository = createMockCustomerRepository({
        findById: vi.fn().mockResolvedValue(ok(existingCustomer)),
        findByEmail: vi.fn(),
        save: vi.fn().mockImplementation(async (customer) => ok(customer)),
        findAll: vi.fn(),
        delete: vi.fn(),
      })

      const deps: UpdateCustomerDeps = {
        customerRepository: mockRepository,
      }

      // Act
      const result = await updateCustomerUseCase(input, deps)

      // Assert
      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        expect(result.value.data.name).toBe('A'.repeat(200))
        expect(result.value.data.preferences).toBe('P'.repeat(1000))
        expect(result.value.data.notes).toBe('N'.repeat(2000))
        expect(result.value.data.tags).toHaveLength(100)
      }
    })
  })

  /**
   * マッピング関数のテスト
   */
  describe('Mapping Functions', () => {
    describe('mapUpdateCustomerRequest', () => {
      it('should map request with all fields', () => {
        // Arrange
        const customerId = createTestCustomerId(
          '550e8400-e29b-41d4-a716-446655440213'
        )
        const request = {
          name: 'Mapped Name',
          contactInfo: {
            email: 'mapped@example.com',
            phoneNumber: '090-9999-9999',
          },
          preferences: 'Mapped preferences',
          notes: 'Mapped notes',
          tags: ['tag1', 'tag2'],
          birthDate: '1995-12-25',
        }

        // Act
        const result = mapUpdateCustomerRequest(customerId, request)

        // Assert
        expect(result).toEqual({
          id: customerId,
          updates: {
            name: 'Mapped Name',
            email: 'mapped@example.com',
            phoneNumber: '090-9999-9999',
            preferences: 'Mapped preferences',
            notes: 'Mapped notes',
            tags: ['tag1', 'tag2'],
            birthDate: '1995-12-25',
          },
        })
      })

      it('should only include defined fields', () => {
        // Arrange
        const customerId = createTestCustomerId(
          '550e8400-e29b-41d4-a716-446655440214'
        )
        const request = {
          name: 'Only Name',
          contactInfo: {
            email: 'only-email@example.com',
            // phoneNumber is undefined
          },
          // other fields are undefined
        }

        // Act
        const result = mapUpdateCustomerRequest(customerId, request)

        // Assert
        expect(result).toEqual({
          id: customerId,
          updates: {
            name: 'Only Name',
            email: 'only-email@example.com',
          },
        })
        expect(result.updates.phoneNumber).toBeUndefined()
        expect(result.updates.preferences).toBeUndefined()
      })

      it('should handle empty request', () => {
        // Arrange
        const customerId = createTestCustomerId(
          '550e8400-e29b-41d4-a716-446655440215'
        )
        const request = {}

        // Act
        const result = mapUpdateCustomerRequest(customerId, request)

        // Assert
        expect(result).toEqual({
          id: customerId,
          updates: {},
        })
      })
    })

    describe('mapUpdateCustomerRequestWithReset', () => {
      it('should map request with null values for reset', () => {
        // Arrange
        const customerId = createTestCustomerId(
          '550e8400-e29b-41d4-a716-446655440216'
        )
        const request = {
          name: 'Keep Name',
          preferences: null, // Reset to null
          notes: null, // Reset to null
          tags: [], // Empty array
          birthDate: null, // Reset to null
        }

        // Act
        const result = mapUpdateCustomerRequestWithReset(customerId, request)

        // Assert
        expect(result).toEqual({
          id: customerId,
          updates: {
            name: 'Keep Name',
            preferences: null,
            notes: null,
            tags: [],
            birthDate: null,
          },
        })
      })

      it('should handle mixed updates and resets', () => {
        // Arrange
        const customerId = createTestCustomerId(
          '550e8400-e29b-41d4-a716-446655440217'
        )
        const request = {
          name: 'Updated Name',
          contactInfo: {
            email: 'new@example.com',
            phoneNumber: '080-1111-1111',
          },
          preferences: null, // Reset
          notes: 'Keep notes',
          // tags undefined - don't update
          birthDate: '2000-01-01',
        }

        // Act
        const result = mapUpdateCustomerRequestWithReset(customerId, request)

        // Assert
        expect(result).toEqual({
          id: customerId,
          updates: {
            name: 'Updated Name',
            email: 'new@example.com',
            phoneNumber: '080-1111-1111',
            preferences: null,
            notes: 'Keep notes',
            birthDate: '2000-01-01',
          },
        })
        expect(result.updates.tags).toBeUndefined()
      })
    })
  })
})
