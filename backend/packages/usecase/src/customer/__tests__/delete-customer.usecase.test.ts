/**
 * Delete Customer Use Case Tests
 * AAA（Arrange-Act-Assert）パターンに準拠した詳細なテスト
 */

import type { Customer, RepositoryError } from '@beauty-salon-backend/domain'
import { err, ok } from '@beauty-salon-backend/domain'
import { describe, expect, it, vi } from 'vitest'
import type {
  DeleteCustomerDeps,
  DeleteCustomerUseCaseInput,
} from '../delete-customer.usecase.js'
import {
  deleteCustomerUseCase,
  hardDeleteCustomerUseCase,
} from '../delete-customer.usecase.js'
import {
  createMockCustomerRepository,
  createTestCustomerId,
} from './test-helpers.js'

describe('Delete Customer Use Case - AAA Pattern Tests', () => {
  // テスト用の顧客データを作成するヘルパー関数
  const createTestCustomer = (
    id: string,
    overrides?: Partial<Customer['data']>
  ): Customer => ({
    type: 'active',
    data: {
      id: createTestCustomerId(id),
      name: 'Test Customer',
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
   * deleteCustomerUseCase (論理削除) のテスト
   */
  describe('deleteCustomerUseCase (Soft Delete)', () => {
    describe('Success Cases', () => {
      it('should soft delete an active customer', async () => {
        // Arrange
        const customerId = createTestCustomerId(
          '550e8400-e29b-41d4-a716-446655440100'
        )
        const existingCustomer = createTestCustomer(
          '550e8400-e29b-41d4-a716-446655440100'
        )
        const input: DeleteCustomerUseCaseInput = {
          id: customerId,
        }

        let savedCustomer: Customer | null = null
        const mockRepository = createMockCustomerRepository({
          findById: vi.fn().mockResolvedValue(ok(existingCustomer)),
          save: vi.fn().mockImplementation(async (customer) => {
            savedCustomer = customer
            return ok(customer)
          }),
          findByEmail: vi.fn(),
          findAll: vi.fn(),
          delete: vi.fn(),
        })

        const deps: DeleteCustomerDeps = {
          customerRepository: mockRepository,
        }

        // Act
        const result = await deleteCustomerUseCase(input, deps)

        // Assert
        expect(result.type).toBe('ok')
        expect(mockRepository.findById).toHaveBeenCalledWith(customerId)
        expect(mockRepository.save).toHaveBeenCalledOnce()

        // 保存された顧客が論理削除されていることを確認
        expect(savedCustomer).not.toBeNull()
        if (savedCustomer) {
          const customer = savedCustomer as Customer
          expect(customer.type).toBe('deleted')
          if (customer.type === 'deleted') {
            expect(customer.deletedAt).toBeInstanceOf(Date)
          }
        }
      })

      it('should soft delete with force flag', async () => {
        // Arrange
        const customerId = createTestCustomerId(
          '550e8400-e29b-41d4-a716-446655440101'
        )
        const existingCustomer = createTestCustomer(
          '550e8400-e29b-41d4-a716-446655440101'
        )
        const input: DeleteCustomerUseCaseInput = {
          id: customerId,
          force: true,
        }

        const mockRepository = createMockCustomerRepository({
          findById: vi.fn().mockResolvedValue(ok(existingCustomer)),
          save: vi.fn().mockImplementation(async (customer) => ok(customer)),
          findByEmail: vi.fn(),
          findAll: vi.fn(),
          delete: vi.fn(),
        })

        const deps: DeleteCustomerDeps = {
          customerRepository: mockRepository,
        }

        // Act
        const result = await deleteCustomerUseCase(input, deps)

        // Assert
        expect(result.type).toBe('ok')
        expect(mockRepository.save).toHaveBeenCalledOnce()
      })

      it('should handle already deleted customer', async () => {
        // Arrange
        const customerId = createTestCustomerId(
          '550e8400-e29b-41d4-a716-446655440102'
        )
        const deletedCustomer: Customer = {
          type: 'deleted',
          data: createTestCustomer('550e8400-e29b-41d4-a716-446655440102').data,
          deletedAt: new Date('2024-01-10'),
        }
        const input: DeleteCustomerUseCaseInput = {
          id: customerId,
        }

        let savedCustomer: Customer | null = null
        const mockRepository = createMockCustomerRepository({
          findById: vi.fn().mockResolvedValue(ok(deletedCustomer)),
          save: vi.fn().mockImplementation(async (customer) => {
            savedCustomer = customer
            return ok(customer)
          }),
          findByEmail: vi.fn(),
          findAll: vi.fn(),
          delete: vi.fn(),
        })

        const deps: DeleteCustomerDeps = {
          customerRepository: mockRepository,
        }

        // Act
        const result = await deleteCustomerUseCase(input, deps)

        // Assert
        expect(result.type).toBe('ok')
        expect(mockRepository.save).toHaveBeenCalledOnce()

        // 既に削除済みの顧客は変更されないことを確認
        expect(savedCustomer).not.toBeNull()
        if (savedCustomer) {
          const customer = savedCustomer as Customer
          expect(customer.type).toBe('deleted')
          if (customer.type === 'deleted') {
            // 削除日時は変更されない（既に削除済みのため）
            expect(customer.deletedAt).toEqual(deletedCustomer.deletedAt)
            expect(customer.data).toEqual(deletedCustomer.data)
          }
        }
      })

      it('should preserve customer data when soft deleting', async () => {
        // Arrange
        const customerId = createTestCustomerId(
          '550e8400-e29b-41d4-a716-446655440103'
        )
        const existingCustomer = createTestCustomer(
          '550e8400-e29b-41d4-a716-446655440103',
          {
            preferences: 'Special preferences',
            notes: 'Important notes',
            tags: ['vip', 'regular'],
            birthDate: new Date('1990-05-15'),
            loyaltyPoints: 500,
            membershipLevel: 'gold',
          }
        )
        const input: DeleteCustomerUseCaseInput = {
          id: customerId,
        }

        let savedCustomer: Customer | null = null
        const mockRepository = createMockCustomerRepository({
          findById: vi.fn().mockResolvedValue(ok(existingCustomer)),
          save: vi.fn().mockImplementation(async (customer) => {
            savedCustomer = customer
            return ok(customer)
          }),
          findByEmail: vi.fn(),
          findAll: vi.fn(),
          delete: vi.fn(),
        })

        const deps: DeleteCustomerDeps = {
          customerRepository: mockRepository,
        }

        // Act
        const result = await deleteCustomerUseCase(input, deps)

        // Assert
        expect(result.type).toBe('ok')
        expect(savedCustomer).not.toBeNull()

        // すべてのデータが保持されていることを確認
        expect(savedCustomer).not.toBeNull()
        if (savedCustomer) {
          const customer = savedCustomer as Customer
          expect(customer.data).toEqual(existingCustomer.data)
          expect(customer.data.preferences).toBe('Special preferences')
          expect(customer.data.notes).toBe('Important notes')
          expect(customer.data.tags).toEqual(['vip', 'regular'])
          expect(customer.data.loyaltyPoints).toBe(500)
          expect(customer.data.membershipLevel).toBe('gold')
        }
      })
    })

    describe('Error Cases', () => {
      it('should return error when customer not found', async () => {
        // Arrange
        const customerId = createTestCustomerId(
          '550e8400-e29b-41d4-a716-446655440104'
        )
        const input: DeleteCustomerUseCaseInput = {
          id: customerId,
        }

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

        const deps: DeleteCustomerDeps = {
          customerRepository: mockRepository,
        }

        // Act
        const result = await deleteCustomerUseCase(input, deps)

        // Assert
        expect(result.type).toBe('err')
        if (result.type === 'err') {
          expect(result.error.type).toBe('notFound')
        }
        expect(mockRepository.save).not.toHaveBeenCalled()
      })

      it('should handle repository save error', async () => {
        // Arrange
        const customerId = createTestCustomerId(
          '550e8400-e29b-41d4-a716-446655440105'
        )
        const existingCustomer = createTestCustomer(
          '550e8400-e29b-41d4-a716-446655440105'
        )
        const input: DeleteCustomerUseCaseInput = {
          id: customerId,
        }

        const saveError: RepositoryError = {
          type: 'databaseError',
          message: 'Failed to save deleted customer',
        }

        const mockRepository = createMockCustomerRepository({
          findById: vi.fn().mockResolvedValue(ok(existingCustomer)),
          save: vi.fn().mockResolvedValue(err(saveError)),
          findByEmail: vi.fn(),
          findAll: vi.fn(),
          delete: vi.fn(),
        })

        const deps: DeleteCustomerDeps = {
          customerRepository: mockRepository,
        }

        // Act
        const result = await deleteCustomerUseCase(input, deps)

        // Assert
        expect(result.type).toBe('err')
        if (result.type === 'err') {
          expect(result.error.type).toBe('databaseError')
          if (result.error.type === 'databaseError') {
            expect(result.error.message).toBe('Failed to save deleted customer')
          }
        }
      })

      it('should handle database connection error', async () => {
        // Arrange
        const customerId = createTestCustomerId(
          '550e8400-e29b-41d4-a716-446655440106'
        )
        const input: DeleteCustomerUseCaseInput = {
          id: customerId,
        }

        const connectionError: RepositoryError = {
          type: 'databaseError',
          message: 'Database connection lost',
        }

        const mockRepository = createMockCustomerRepository({
          findById: vi.fn().mockResolvedValue(err(connectionError)),
          save: vi.fn(),
          findByEmail: vi.fn(),
          findAll: vi.fn(),
          delete: vi.fn(),
        })

        const deps: DeleteCustomerDeps = {
          customerRepository: mockRepository,
        }

        // Act
        const result = await deleteCustomerUseCase(input, deps)

        // Assert
        expect(result.type).toBe('err')
        if (result.type === 'err') {
          expect(result.error.type).toBe('databaseError')
          if (result.error.type === 'databaseError') {
            expect(result.error.message).toBe('Database connection lost')
          }
        }
      })
    })

    describe('Edge Cases', () => {
      it('should handle concurrent delete attempts', async () => {
        // Arrange
        const customerId = createTestCustomerId(
          '550e8400-e29b-41d4-a716-446655440107'
        )
        const existingCustomer = createTestCustomer(
          '550e8400-e29b-41d4-a716-446655440107'
        )
        const input: DeleteCustomerUseCaseInput = {
          id: customerId,
        }

        let callCount = 0
        const mockRepository = createMockCustomerRepository({
          findById: vi.fn().mockImplementation(async () => {
            callCount++
            if (callCount === 1) {
              return ok(existingCustomer)
            }
            // 2回目の呼び出しでは既に削除済み
            return ok({
              type: 'deleted',
              data: existingCustomer.data,
              deletedAt: new Date(),
            } as Customer)
          }),
          save: vi.fn().mockImplementation(async (customer) => ok(customer)),
          findByEmail: vi.fn(),
          findAll: vi.fn(),
          delete: vi.fn(),
        })

        const deps: DeleteCustomerDeps = {
          customerRepository: mockRepository,
        }

        // Act - 同時実行をシミュレート
        const [result1, result2] = await Promise.all([
          deleteCustomerUseCase(input, deps),
          deleteCustomerUseCase(input, deps),
        ])

        // Assert
        expect(result1.type).toBe('ok')
        expect(result2.type).toBe('ok')
        expect(mockRepository.save).toHaveBeenCalledTimes(2)
      })

      it('should handle suspended customer deletion', async () => {
        // Arrange
        const customerId = createTestCustomerId(
          '550e8400-e29b-41d4-a716-446655440108'
        )
        const suspendedCustomer: Customer = {
          type: 'suspended',
          data: createTestCustomer('550e8400-e29b-41d4-a716-446655440108').data,
          reason: 'Policy violation',
          suspendedAt: new Date('2024-01-05'),
        }
        const input: DeleteCustomerUseCaseInput = {
          id: customerId,
        }

        let savedCustomer: Customer | null = null
        const mockRepository = createMockCustomerRepository({
          findById: vi.fn().mockResolvedValue(ok(suspendedCustomer)),
          save: vi.fn().mockImplementation(async (customer) => {
            savedCustomer = customer
            return ok(customer)
          }),
          findByEmail: vi.fn(),
          findAll: vi.fn(),
          delete: vi.fn(),
        })

        const deps: DeleteCustomerDeps = {
          customerRepository: mockRepository,
        }

        // Act
        const result = await deleteCustomerUseCase(input, deps)

        // Assert
        expect(result.type).toBe('ok')
        expect(savedCustomer).not.toBeNull()
        if (savedCustomer) {
          const customer = savedCustomer as Customer
          expect(customer.type).toBe('deleted')
        }
      })

      // TODO: 将来的に予約チェックが実装されたときのテスト
      it.skip('should check for active reservations when not forced', async () => {
        // Arrange
        const customerId = createTestCustomerId(
          '550e8400-e29b-41d4-a716-446655440109'
        )
        const existingCustomer = createTestCustomer(
          '550e8400-e29b-41d4-a716-446655440109'
        )
        const input: DeleteCustomerUseCaseInput = {
          id: customerId,
          force: false,
        }

        // TODO: 予約リポジトリのモックを追加
        const mockRepository = createMockCustomerRepository({
          findById: vi.fn().mockResolvedValue(ok(existingCustomer)),
          save: vi.fn(),
          findByEmail: vi.fn(),
          findAll: vi.fn(),
          delete: vi.fn(),
        })

        const deps: DeleteCustomerDeps = {
          customerRepository: mockRepository,
          // TODO: reservationRepository を追加
        }

        // Act
        const result = await deleteCustomerUseCase(input, deps)

        // Assert
        expect(result.type).toBe('err')
        if (result.type === 'err') {
          expect(result.error.type).toBe('hasActiveReservations')
        }
      })
    })
  })

  /**
   * hardDeleteCustomerUseCase (物理削除) のテスト
   */
  describe('hardDeleteCustomerUseCase (Hard Delete)', () => {
    describe('Success Cases', () => {
      it('should permanently delete a customer', async () => {
        // Arrange
        const customerId = createTestCustomerId(
          '550e8400-e29b-41d4-a716-446655440110'
        )
        const input = { id: customerId }

        const mockRepository = createMockCustomerRepository({
          delete: vi.fn().mockResolvedValue(ok(undefined)),
          findById: vi.fn(),
          save: vi.fn(),
          findByEmail: vi.fn(),
          findAll: vi.fn(),
        })

        const deps: DeleteCustomerDeps = {
          customerRepository: mockRepository,
        }

        // Act
        const result = await hardDeleteCustomerUseCase(input, deps)

        // Assert
        expect(result.type).toBe('ok')
        expect(mockRepository.delete).toHaveBeenCalledWith(customerId)
        expect(mockRepository.delete).toHaveBeenCalledOnce()
        // 他のメソッドは呼ばれない
        expect(mockRepository.findById).not.toHaveBeenCalled()
        expect(mockRepository.save).not.toHaveBeenCalled()
      })
    })

    describe('Error Cases', () => {
      it('should handle customer not found error', async () => {
        // Arrange
        const customerId = createTestCustomerId(
          '550e8400-e29b-41d4-a716-446655440111'
        )
        const input = { id: customerId }

        const notFoundError: RepositoryError = {
          type: 'notFound',
          entity: 'Customer',
          id: customerId,
        }

        const mockRepository = createMockCustomerRepository({
          delete: vi.fn().mockResolvedValue(err(notFoundError)),
          findById: vi.fn(),
          save: vi.fn(),
          findByEmail: vi.fn(),
          findAll: vi.fn(),
        })

        const deps: DeleteCustomerDeps = {
          customerRepository: mockRepository,
        }

        // Act
        const result = await hardDeleteCustomerUseCase(input, deps)

        // Assert
        expect(result.type).toBe('err')
        if (result.type === 'err') {
          expect(result.error.type).toBe('notFound')
        }
      })

      it('should handle database error during hard delete', async () => {
        // Arrange
        const customerId = createTestCustomerId(
          '550e8400-e29b-41d4-a716-446655440112'
        )
        const input = { id: customerId }

        const dbError: RepositoryError = {
          type: 'databaseError',
          message: 'Cannot delete due to foreign key constraint',
        }

        const mockRepository = createMockCustomerRepository({
          delete: vi.fn().mockResolvedValue(err(dbError)),
          findById: vi.fn(),
          save: vi.fn(),
          findByEmail: vi.fn(),
          findAll: vi.fn(),
        })

        const deps: DeleteCustomerDeps = {
          customerRepository: mockRepository,
        }

        // Act
        const result = await hardDeleteCustomerUseCase(input, deps)

        // Assert
        expect(result.type).toBe('err')
        if (result.type === 'err') {
          expect(result.error.type).toBe('databaseError')
          if (result.error.type === 'databaseError') {
            expect(result.error.message).toBe(
              'Cannot delete due to foreign key constraint'
            )
          }
        }
      })
    })

    describe('Edge Cases', () => {
      it('should handle repository throwing exception', async () => {
        // Arrange
        const customerId = createTestCustomerId(
          '550e8400-e29b-41d4-a716-446655440113'
        )
        const input = { id: customerId }

        const mockRepository = createMockCustomerRepository({
          delete: vi
            .fn()
            .mockRejectedValue(new Error('Unexpected database error')),
          findById: vi.fn(),
          save: vi.fn(),
          findByEmail: vi.fn(),
          findAll: vi.fn(),
        })

        const deps: DeleteCustomerDeps = {
          customerRepository: mockRepository,
        }

        // Act & Assert
        await expect(hardDeleteCustomerUseCase(input, deps)).rejects.toThrow(
          'Unexpected database error'
        )
      })
    })
  })

  /**
   * 統合的なシナリオテスト
   */
  describe('Integration Scenarios', () => {
    it('should handle full customer lifecycle: create -> update -> delete -> hard delete', async () => {
      // Arrange
      const customerId = createTestCustomerId(
        '550e8400-e29b-41d4-a716-446655440114'
      )
      const customer = createTestCustomer(
        '550e8400-e29b-41d4-a716-446655440114'
      )

      // リポジトリの状態を管理
      let customerState: Customer | null = customer
      let isHardDeleted = false

      const mockRepository = createMockCustomerRepository({
        findById: vi.fn().mockImplementation(async () => {
          if (isHardDeleted) {
            return err({
              type: 'notFound',
              entity: 'Customer',
              id: customerId,
            } as RepositoryError)
          }
          return ok(customerState)
        }),
        save: vi.fn().mockImplementation(async (c) => {
          customerState = c
          return ok(c)
        }),
        delete: vi.fn().mockImplementation(async () => {
          isHardDeleted = true
          customerState = null
          return ok(undefined)
        }),
        findByEmail: vi.fn(),
        findAll: vi.fn(),
      })

      const deps: DeleteCustomerDeps = {
        customerRepository: mockRepository,
      }

      // Act & Assert - Soft delete
      const softDeleteResult = await deleteCustomerUseCase(
        { id: customerId },
        deps
      )
      expect(softDeleteResult.type).toBe('ok')
      expect(customerState?.type).toBe('deleted')

      // Act & Assert - Try to soft delete again
      const softDeleteAgainResult = await deleteCustomerUseCase(
        { id: customerId },
        deps
      )
      expect(softDeleteAgainResult.type).toBe('ok')

      // Act & Assert - Hard delete
      const hardDeleteResult = await hardDeleteCustomerUseCase(
        { id: customerId },
        deps
      )
      expect(hardDeleteResult.type).toBe('ok')
      expect(isHardDeleted).toBe(true)

      // Act & Assert - Try to access after hard delete
      const accessAfterDelete = await mockRepository.findById(customerId)
      expect(accessAfterDelete.type).toBe('err')
    })
  })
})
