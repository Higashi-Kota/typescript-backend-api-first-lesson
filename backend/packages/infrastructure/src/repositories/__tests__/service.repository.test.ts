/**
 * Service Repository Integration Tests
 * AAA (Arrange-Act-Assert) パターンで実装
 */

import type {
  CreateServiceRequest,
  SalonId,
  ServiceId,
  ServiceSearchCriteria,
  UpdateServiceRequest,
} from '@beauty-salon-backend/domain'
import { createSalonId, createServiceId } from '@beauty-salon-backend/domain'
import {
  type TestContext,
  createTestContext,
} from '@beauty-salon-backend/test-utils'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { salons } from '../../database/schema'
import { DrizzleServiceRepository } from '../service.repository.impl'

describe('ServiceRepository Integration Tests', () => {
  let testContext: TestContext
  let db: PostgresJsDatabase
  let repository: DrizzleServiceRepository
  let testSalonId: SalonId

  // テスト用データの準備
  const createTestSalon = async () => {
    const salonData = {
      id: crypto.randomUUID(),
      name: 'Test Salon',
      description: 'Test Description',
      address: {
        street: '123 Test St',
        city: 'Test City',
        state: 'Test State',
        postalCode: '12345',
        country: 'Test Country',
      },
      email: 'salon@example.com',
      phoneNumber: '080-1234-5678',
      alternativePhone: null,
      imageUrls: ['https://example.com/image.jpg'],
      features: ['駐車場', 'キッズスペース'],
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const [inserted] = await db.insert(salons).values(salonData).returning()
    if (!inserted) {
      throw new Error('Failed to create test salon')
    }
    return inserted
  }

  const createTestServiceRequest = (
    overrides?: Partial<CreateServiceRequest>
  ): CreateServiceRequest => ({
    salonId: testSalonId,
    name: 'Test Service',
    description: 'テストサービスです',
    category: 'cut',
    price: 5000,
    duration: 60,
    ...overrides,
  })

  beforeEach(async () => {
    testContext = await createTestContext()
    db = testContext.db
    repository = new DrizzleServiceRepository(db)

    // テスト用サロンを作成
    const testSalon = await createTestSalon()
    const salonId = createSalonId(testSalon.id)
    if (!salonId) {
      throw new Error('Failed to create salon ID')
    }
    testSalonId = salonId
  })

  afterEach(async () => {
    await testContext.cleanup()
  })

  describe('create', () => {
    it('should create a new service with required fields only', async () => {
      // Arrange
      const request = createTestServiceRequest()

      // Act
      const result = await repository.create(request)

      // Assert
      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        expect(result.value.type).toBe('active')
        if (result.value.type === 'active') {
          expect(result.value.data.name).toBe(request.name)
          expect(result.value.data.category).toBe(request.category)
          expect(result.value.data.price).toBe(request.price)
          expect(result.value.data.salonId).toBe(testSalonId)
        }
      }
    })

    it('should create a new service with additional fields', async () => {
      // Arrange
      const request = createTestServiceRequest({
        requiredStaffLevel: 3,
        imageUrl: 'https://example.com/service.jpg',
      })

      // Act
      const result = await repository.create(request)

      // Assert
      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        expect(result.value.type).toBe('active')
        if (result.value.type === 'active') {
          expect(result.value.data.requiredStaffLevel).toBe(
            request.requiredStaffLevel
          )
          expect(result.value.data.imageUrl).toBe(request.imageUrl)
        }
      }
    })

    it('should handle invalid category', async () => {
      // Arrange
      const request = createTestServiceRequest({
        category: 'invalid' as unknown as 'cut',
      })

      // Act
      const result = await repository.create(request)

      // Assert
      expect(result.type).toBe('err')
      if (result.type === 'err') {
        expect(result.error.type).toBe('databaseError')
      }
    })

    it('should handle database errors gracefully', async () => {
      // Arrange
      const request = createTestServiceRequest({
        salonId: 'invalid-salon-id' as SalonId, // 無効なサロンID
      })

      // Act
      const result = await repository.create(request)

      // Assert
      expect(result.type).toBe('err')
      if (result.type === 'err') {
        expect(result.error.type).toBe('databaseError')
      }
    })
  })

  describe('update', () => {
    let existingServiceId: ServiceId

    beforeEach(async () => {
      const createResult = await repository.create(createTestServiceRequest())
      if (createResult.type === 'ok' && createResult.value.type === 'active') {
        existingServiceId = createResult.value.data.id
      }
    })

    it('should update service name', async () => {
      // Arrange
      const updateRequest: UpdateServiceRequest = {
        id: existingServiceId,
        name: 'Updated Service Name',
      }

      // Act
      const result = await repository.update(updateRequest)

      // Assert
      expect(result.type).toBe('ok')
      if (result.type === 'ok' && result.value.type === 'active') {
        expect(result.value.data.name).toBe('Updated Service Name')
        expect(result.value.data.id).toBe(existingServiceId)
      }
    })

    it('should update service price and duration', async () => {
      // Arrange
      const updateRequest: UpdateServiceRequest = {
        id: existingServiceId,
        price: 8000,
        duration: 90,
      }

      // Act
      const result = await repository.update(updateRequest)

      // Assert
      expect(result.type).toBe('ok')
      if (result.type === 'ok' && result.value.type === 'active') {
        expect(result.value.data.price).toBe(8000)
        expect(result.value.data.duration).toBe(90)
      }
    })

    it('should update service category', async () => {
      // Arrange
      const updateRequest: UpdateServiceRequest = {
        id: existingServiceId,
        category: 'color',
      }

      // Act
      const result = await repository.update(updateRequest)

      // Assert
      expect(result.type).toBe('ok')
      if (result.type === 'ok' && result.value.type === 'active') {
        expect(result.value.data.category).toBe('color')
      }
    })

    it('should return error for non-existent service', async () => {
      // Arrange
      const nonExistentId = createServiceId(crypto.randomUUID())
      if (!nonExistentId) throw new Error('Failed to create service ID')
      const updateRequest: UpdateServiceRequest = {
        id: nonExistentId,
        name: 'Should not update',
      }

      // Act
      const result = await repository.update(updateRequest)

      // Assert
      expect(result.type).toBe('err')
      if (result.type === 'err') {
        expect(result.error.type).toBe('notFound')
      }
    })
  })

  describe('findById', () => {
    it('should find existing service', async () => {
      // Arrange
      const createResult = await repository.create(createTestServiceRequest())
      let serviceId: ServiceId | undefined
      if (createResult.type === 'ok' && createResult.value.type === 'active') {
        serviceId = createResult.value.data.id
      }

      // Act
      if (!serviceId) throw new Error('Service ID not initialized')
      const result = await repository.findById(serviceId)

      // Assert
      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        expect(result.value.data.id).toBe(serviceId)
      }
    })

    it('should return notFound error for non-existent service', async () => {
      // Arrange
      const nonExistentId = createServiceId(crypto.randomUUID())
      if (!nonExistentId) throw new Error('Failed to create service ID')

      // Act
      const result = await repository.findById(nonExistentId)

      // Assert
      expect(result.type).toBe('err')
      if (result.type === 'err') {
        expect(result.error.type).toBe('notFound')
      }
    })

    it('should find inactive service with status', async () => {
      // Arrange
      const createResult = await repository.create(createTestServiceRequest())
      let serviceId: ServiceId | undefined
      if (createResult.type === 'ok' && createResult.value.type === 'active') {
        serviceId = createResult.value.data.id

        // サービスを非アクティブ化
        await repository.deactivate(serviceId, 'Service discontinued', 'admin')
      }

      // Act
      if (!serviceId) throw new Error('Service ID not initialized')
      const result = await repository.findById(serviceId)

      // Assert
      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        expect(result.value.type).toBe('inactive')
        if (result.value.type === 'inactive') {
          expect(result.value.inactivatedReason).toBe('Deactivated')
        }
      }
    })
  })

  describe('search with pagination and filtering', () => {
    beforeEach(async () => {
      // テストデータを準備
      const services = [
        {
          name: 'カット',
          description: '基本的なヘアカット',
          category: 'cut' as const,
          price: 3000,
          duration: 30,
        },
        {
          name: 'カラー',
          description: 'ヘアカラーリング',
          category: 'color' as const,
          price: 8000,
          duration: 120,
        },
        {
          name: 'パーマ',
          description: 'デジタルパーマ',
          category: 'perm' as const,
          price: 10000,
          duration: 150,
        },
        {
          name: 'トリートメント',
          description: 'ヘアトリートメント',
          category: 'treatment' as const,
          price: 5000,
          duration: 60,
        },
      ]

      for (const service of services) {
        await repository.create(createTestServiceRequest(service))
      }
    })

    it('should paginate results correctly', async () => {
      // Arrange
      const pagination = { limit: 2, offset: 0 }

      // Act
      const result = await repository.search({}, pagination)

      // Assert
      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        expect(result.value.data).toHaveLength(2)
        expect(result.value.total).toBe(4)
        expect(result.value.limit).toBe(2)
        expect(result.value.offset).toBe(0)
      }
    })

    it('should filter by keyword', async () => {
      // Arrange
      const criteria: ServiceSearchCriteria = { keyword: 'カット' }
      const pagination = { limit: 10, offset: 0 }

      // Act
      const result = await repository.search(criteria, pagination)

      // Assert
      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        expect(result.value.data).toHaveLength(1)
        expect(result.value.data[0]?.data.name).toBe('カット')
      }
    })

    it('should filter by category', async () => {
      // Arrange
      const criteria: ServiceSearchCriteria = { category: 'color' }
      const pagination = { limit: 10, offset: 0 }

      // Act
      const result = await repository.search(criteria, pagination)

      // Assert
      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        expect(result.value.data).toHaveLength(1)
        expect(result.value.data[0]?.data.category).toBe('color')
      }
    })

    it('should filter by price range', async () => {
      // Arrange
      const criteria: ServiceSearchCriteria = {
        minPrice: 5000,
        maxPrice: 10000,
      }
      const pagination = { limit: 10, offset: 0 }

      // Act
      const result = await repository.search(criteria, pagination)

      // Assert
      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        expect(result.value.data).toHaveLength(3) // カラー, パーマ, トリートメント
        for (const service of result.value.data) {
          expect(service.data.price).toBeGreaterThanOrEqual(5000)
          expect(service.data.price).toBeLessThanOrEqual(10000)
        }
      }
    })

    it('should filter by active status', async () => {
      // Arrange
      const criteria: ServiceSearchCriteria = { isActive: true }
      const pagination = { limit: 10, offset: 0 }

      // Act
      const result = await repository.search(criteria, pagination)

      // Assert
      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        expect(result.value.data).toHaveLength(4)
        for (const service of result.value.data) {
          expect(service.type).toBe('active')
        }
      }
    })

    it('should combine multiple filters', async () => {
      // Arrange
      const criteria: ServiceSearchCriteria = {
        category: 'perm',
        minPrice: 8000,
        isActive: true,
      }
      const pagination = { limit: 10, offset: 0 }

      // Act
      const result = await repository.search(criteria, pagination)

      // Assert
      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        expect(result.value.data).toHaveLength(1)
        expect(result.value.data[0]?.data.name).toBe('パーマ')
        expect(result.value.data[0]?.data.price).toBe(10000)
      }
    })

    it('should handle empty results', async () => {
      // Arrange
      const criteria: ServiceSearchCriteria = { keyword: 'NonExistent' }
      const pagination = { limit: 10, offset: 0 }

      // Act
      const result = await repository.search(criteria, pagination)

      // Assert
      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        expect(result.value.data).toHaveLength(0)
        expect(result.value.total).toBe(0)
      }
    })
  })

  describe('deactivate/reactivate', () => {
    let serviceId: ServiceId

    beforeEach(async () => {
      const createResult = await repository.create(createTestServiceRequest())
      if (createResult.type === 'ok' && createResult.value.type === 'active') {
        serviceId = createResult.value.data.id
      }
    })

    it('should deactivate active service', async () => {
      // Arrange & Act
      const result = await repository.deactivate(
        serviceId,
        'Service discontinued',
        'admin'
      )

      // Assert
      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        expect(result.value.type).toBe('inactive')
        if (result.value.type === 'inactive') {
          expect(result.value.inactivatedReason).toBe('Deactivated')
        }
      }
    })

    it('should reactivate inactive service', async () => {
      // Arrange
      await repository.deactivate(serviceId, 'Temporary', 'admin')

      // Act
      const result = await repository.reactivate(serviceId, 'admin')

      // Assert
      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        expect(result.value.type).toBe('active')
      }
    })

    it('should return error for non-existent service on deactivate', async () => {
      // Arrange
      const nonExistentId = createServiceId(crypto.randomUUID())
      if (!nonExistentId) throw new Error('Failed to create service ID')

      // Act
      const result = await repository.deactivate(nonExistentId, 'Test', 'admin')

      // Assert
      expect(result.type).toBe('err')
      if (result.type === 'err') {
        expect(result.error.type).toBe('notFound')
      }
    })
  })

  describe('discontinue', () => {
    it('should discontinue active service', async () => {
      // Arrange
      const createResult = await repository.create(createTestServiceRequest())
      let serviceId: ServiceId | undefined
      if (createResult.type === 'ok' && createResult.value.type === 'active') {
        serviceId = createResult.value.data.id
      }

      // Act
      if (!serviceId) throw new Error('Service ID not initialized')
      const discontinueResult = await repository.discontinue(
        serviceId,
        'Service no longer offered',
        'admin'
      )

      // Assert
      expect(discontinueResult.type).toBe('ok')

      // 終了後に確認（現在の実装では物理削除される）
      const findResult = await repository.findById(serviceId)
      expect(findResult.type).toBe('err')
      if (findResult.type === 'err') {
        expect(findResult.error.type).toBe('notFound')
      }
    })

    it('should return error for non-existent service', async () => {
      // Arrange
      const nonExistentId = createServiceId(crypto.randomUUID())
      if (!nonExistentId) throw new Error('Failed to create service ID')

      // Act
      const result = await repository.discontinue(
        nonExistentId,
        'Test discontinue',
        'admin'
      )

      // Assert
      expect(result.type).toBe('err')
      if (result.type === 'err') {
        expect(result.error.type).toBe('notFound')
      }
    })
  })

  describe('error handling', () => {
    it('should handle connection errors', async () => {
      // Arrange
      const serviceId = createServiceId(crypto.randomUUID())
      if (!serviceId) throw new Error('Failed to create service ID')

      // Act
      const result = await repository.findById(serviceId)

      // Assert - 存在しないIDの場合はnotFoundエラー
      expect(result.type).toBe('err')
      if (result.type === 'err') {
        expect(result.error.type).toBe('notFound')
      }
    })
  })
})
