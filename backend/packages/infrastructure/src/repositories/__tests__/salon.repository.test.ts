/**
 * SalonRepository Integration Tests
 * AAAパターンに従ったテスト実装
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  type CreateSalonRequest,
  type UpdateSalonRequest,
  type OpeningHours,
  createSalonId,
} from '@beauty-salon-backend/domain'
import {
  createTestContext,
  type TestContext,
} from '@beauty-salon-backend/test-utils'
import { DrizzleSalonRepository } from '../salon.repository.impl.js'

describe('SalonRepository Integration Tests', () => {
  let testContext: TestContext
  let repository: DrizzleSalonRepository

  // テストヘルパー関数
  const createTestSalonRequest = (
    overrides?: Partial<CreateSalonRequest>
  ): CreateSalonRequest => ({
    name: 'Test Salon',
    description: 'A test salon for integration tests',
    address: {
      street: '123 Test Street',
      city: 'Test City',
      state: 'Test State',
      postalCode: '12345',
      country: 'Japan',
    },
    contactInfo: {
      email: `test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`,
      phoneNumber: '03-1234-5678',
    },
    openingHours: createTestOpeningHours(),
    imageUrls: [
      'https://example.com/image1.jpg',
      'https://example.com/image2.jpg',
    ],
    features: ['駐車場', 'キッズスペース', 'クレジットカード可'],
    createdBy: 'test-user',
    ...overrides,
  })

  const createTestOpeningHours = (): OpeningHours[] => [
    {
      dayOfWeek: 'monday',
      openTime: '09:00',
      closeTime: '18:00',
      isHoliday: false,
    },
    {
      dayOfWeek: 'tuesday',
      openTime: '09:00',
      closeTime: '18:00',
      isHoliday: false,
    },
    {
      dayOfWeek: 'wednesday',
      openTime: '09:00',
      closeTime: '18:00',
      isHoliday: false,
    },
    {
      dayOfWeek: 'thursday',
      openTime: '09:00',
      closeTime: '18:00',
      isHoliday: false,
    },
    {
      dayOfWeek: 'friday',
      openTime: '09:00',
      closeTime: '18:00',
      isHoliday: false,
    },
    {
      dayOfWeek: 'saturday',
      openTime: '10:00',
      closeTime: '19:00',
      isHoliday: false,
    },
    {
      dayOfWeek: 'sunday',
      openTime: '10:00',
      closeTime: '19:00',
      isHoliday: false,
    },
  ]

  beforeEach(async () => {
    testContext = await createTestContext()
    repository = new DrizzleSalonRepository(testContext.db)
  })

  afterEach(async () => {
    await testContext.cleanup()
  })

  describe('create', () => {
    it('should create a new salon with all fields', async () => {
      // Arrange
      const request = createTestSalonRequest()

      // Act
      const result = await repository.create(request)

      // Assert
      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        expect(result.value.type).toBe('active')
        expect(result.value.data.name).toBe(request.name)
        expect(result.value.data.description).toBe(request.description)
        expect(result.value.data.address).toEqual(request.address)
        expect(result.value.data.contactInfo).toEqual(request.contactInfo)
        expect(result.value.data.openingHours).toHaveLength(7)
        expect(result.value.data.imageUrls).toEqual(request.imageUrls)
        expect(result.value.data.features).toEqual(request.features)
        expect(result.value.data.createdBy).toBe(request.createdBy)
      }
    })

    it('should create salon with minimal required fields', async () => {
      // Arrange
      const request = createTestSalonRequest({
        imageUrls: undefined,
        features: undefined,
      })

      // Act
      const result = await repository.create(request)

      // Assert
      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        expect(result.value.data.name).toBe(request.name)
        expect(result.value.data.imageUrls).toEqual([])
        expect(result.value.data.features).toEqual([])
      }
    })

    it('should handle long salon names', async () => {
      // Arrange
      const request = createTestSalonRequest({
        name: 'A'.repeat(200), // Max length
      })

      // Act
      const result = await repository.create(request)

      // Assert
      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        expect(result.value.data.name).toHaveLength(200)
      }
    })

    it('should handle multiple features', async () => {
      // Arrange
      const features = Array(10)
        .fill(0)
        .map((_, i) => `Feature ${i + 1}`)
      const request = createTestSalonRequest({ features })

      // Act
      const result = await repository.create(request)

      // Assert
      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        expect(result.value.data.features).toHaveLength(10)
        expect(result.value.data.features).toEqual(features)
      }
    })

    it('should create salon with custom opening hours', async () => {
      // Arrange
      const customHours: OpeningHours[] = [
        {
          dayOfWeek: 'monday',
          openTime: '00:00',
          closeTime: '00:00',
          isHoliday: true,
        },
        {
          dayOfWeek: 'tuesday',
          openTime: '11:00',
          closeTime: '23:00',
          isHoliday: false,
        },
      ]
      const request = createTestSalonRequest({
        openingHours: customHours,
      })

      // Act
      const result = await repository.create(request)

      // Assert
      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        expect(result.value.data.openingHours).toHaveLength(2)
        const monday = result.value.data.openingHours.find(
          (h) => h.dayOfWeek === 'monday'
        )
        expect(monday?.isHoliday).toBe(true)
      }
    })

    it.skip('should handle database errors gracefully', async () => {
      // Arrange
      const request = createTestSalonRequest()
      await testContext.cleanup()
      // Force an error by creating a new repository with a closed connection
      // @ts-expect-error Testing error handling
      repository = new DrizzleSalonRepository({})

      // Act
      const result = await repository.create(request)

      // Assert
      expect(result.type).toBe('err')
      if (result.type === 'err') {
        expect(result.error.type).toBe('databaseError')
      }
    })
  })

  describe('findById', () => {
    it('should find existing salon by ID', async () => {
      // Arrange
      const createRequest = createTestSalonRequest()
      const createResult = await repository.create(createRequest)
      if (createResult.type !== 'ok') throw new Error('Failed to create salon')
      const salonId = createResult.value.data.id

      // Act
      const result = await repository.findById(salonId)

      // Assert
      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        expect(result.value.data.id).toBe(salonId)
        expect(result.value.data.name).toBe(createRequest.name)
      }
    })

    it('should return notFound for non-existent salon', async () => {
      // Arrange
      const nonExistentId = createSalonId(crypto.randomUUID())
      if (!nonExistentId) throw new Error('Failed to create salon ID')

      // Act
      const result = await repository.findById(nonExistentId)

      // Assert
      expect(result.type).toBe('err')
      if (result.type === 'err') {
        expect(result.error.type).toBe('notFound')
        if ('entity' in result.error) {
          expect(result.error.entity).toBe('Salon')
        }
      }
    })

    it('should include all salon details including opening hours', async () => {
      // Arrange
      const createRequest = createTestSalonRequest()
      const createResult = await repository.create(createRequest)
      if (createResult.type !== 'ok') throw new Error('Failed to create salon')
      const salonId = createResult.value.data.id

      // Act
      const result = await repository.findById(salonId)

      // Assert
      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        expect(result.value.data.openingHours).toHaveLength(7)
        expect(result.value.data.imageUrls).toEqual(createRequest.imageUrls)
        expect(result.value.data.features).toEqual(createRequest.features)
      }
    })
  })

  describe('update', () => {
    it('should update salon name and description', async () => {
      // Arrange
      const createRequest = createTestSalonRequest()
      const createResult = await repository.create(createRequest)
      if (createResult.type !== 'ok') throw new Error('Failed to create salon')
      const salonId = createResult.value.data.id

      const updateRequest: UpdateSalonRequest = {
        id: salonId,
        name: 'Updated Salon Name',
        description: 'Updated description',
        updatedBy: 'updater',
      }

      // Act
      const result = await repository.update(updateRequest)

      // Assert
      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        expect(result.value.data.name).toBe('Updated Salon Name')
        expect(result.value.data.description).toBe('Updated description')
        expect(result.value.data.updatedBy).toBe('updater')
      }
    })

    it('should update salon address', async () => {
      // Arrange
      const createRequest = createTestSalonRequest()
      const createResult = await repository.create(createRequest)
      if (createResult.type !== 'ok') throw new Error('Failed to create salon')
      const salonId = createResult.value.data.id

      const newAddress = {
        street: '456 New Street',
        city: 'New City',
        state: 'New State',
        postalCode: '54321',
        country: 'Japan',
      }

      const updateRequest: UpdateSalonRequest = {
        id: salonId,
        address: newAddress,
      }

      // Act
      const result = await repository.update(updateRequest)

      // Assert
      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        expect(result.value.data.address).toEqual(newAddress)
      }
    })

    it('should update contact information', async () => {
      // Arrange
      const createRequest = createTestSalonRequest()
      const createResult = await repository.create(createRequest)
      if (createResult.type !== 'ok') throw new Error('Failed to create salon')
      const salonId = createResult.value.data.id

      const newContactInfo = {
        email: 'newemail@example.com',
        phoneNumber: '090-9876-5432',
      }

      const updateRequest: UpdateSalonRequest = {
        id: salonId,
        contactInfo: newContactInfo,
      }

      // Act
      const result = await repository.update(updateRequest)

      // Assert
      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        expect(result.value.data.contactInfo).toEqual(newContactInfo)
      }
    })

    it('should update opening hours', async () => {
      // Arrange
      const createRequest = createTestSalonRequest()
      const createResult = await repository.create(createRequest)
      if (createResult.type !== 'ok') throw new Error('Failed to create salon')
      const salonId = createResult.value.data.id

      const newOpeningHours: OpeningHours[] = [
        {
          dayOfWeek: 'monday',
          openTime: '10:00',
          closeTime: '20:00',
          isHoliday: false,
        },
      ]

      const updateRequest: UpdateSalonRequest = {
        id: salonId,
        openingHours: newOpeningHours,
      }

      // Act
      const result = await repository.update(updateRequest)

      // Assert
      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        expect(result.value.data.openingHours).toHaveLength(1)
        const firstHour = result.value.data.openingHours[0]
        if (firstHour) {
          expect(firstHour.openTime).toBe('10:00:00')
        }
      }
    })

    it('should update features and image URLs', async () => {
      // Arrange
      const createRequest = createTestSalonRequest()
      const createResult = await repository.create(createRequest)
      if (createResult.type !== 'ok') throw new Error('Failed to create salon')
      const salonId = createResult.value.data.id

      const updateRequest: UpdateSalonRequest = {
        id: salonId,
        features: ['Wi-Fi', 'ペット可'],
        imageUrls: ['https://example.com/new-image.jpg'],
      }

      // Act
      const result = await repository.update(updateRequest)

      // Assert
      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        expect(result.value.data.features).toEqual(['Wi-Fi', 'ペット可'])
        expect(result.value.data.imageUrls).toEqual([
          'https://example.com/new-image.jpg',
        ])
      }
    })

    it('should handle partial updates', async () => {
      // Arrange
      const createRequest = createTestSalonRequest()
      const createResult = await repository.create(createRequest)
      if (createResult.type !== 'ok') throw new Error('Failed to create salon')
      const salonId = createResult.value.data.id

      const updateRequest: UpdateSalonRequest = {
        id: salonId,
        name: 'Only Name Updated',
      }

      // Act
      const result = await repository.update(updateRequest)

      // Assert
      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        expect(result.value.data.name).toBe('Only Name Updated')
        expect(result.value.data.description).toBe(createRequest.description)
        expect(result.value.data.address).toEqual(createRequest.address)
      }
    })

    it('should return notFound for non-existent salon', async () => {
      // Arrange
      const testId = createSalonId(crypto.randomUUID())
      if (!testId) throw new Error('Failed to create salon ID')
      const updateRequest: UpdateSalonRequest = {
        id: testId,
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

  describe('delete', () => {
    it('should delete existing salon', async () => {
      // Arrange
      const createRequest = createTestSalonRequest()
      const createResult = await repository.create(createRequest)
      if (createResult.type !== 'ok') throw new Error('Failed to create salon')
      const salonId = createResult.value.data.id

      // Act
      const deleteResult = await repository.delete(salonId, 'deleter')

      // Assert
      expect(deleteResult.type).toBe('ok')

      // Verify salon is deleted
      const findResult = await repository.findById(salonId)
      expect(findResult.type).toBe('err')
      if (findResult.type === 'err') {
        expect(findResult.error.type).toBe('notFound')
      }
    })

    it('should return notFound for non-existent salon', async () => {
      // Arrange
      const nonExistentId = createSalonId(crypto.randomUUID())
      if (!nonExistentId) throw new Error('Failed to create salon ID')

      // Act
      const result = await repository.delete(nonExistentId, 'deleter')

      // Assert
      expect(result.type).toBe('err')
      if (result.type === 'err') {
        expect(result.error.type).toBe('notFound')
      }
    })
  })

  describe('search', () => {
    it('should search salons by keyword in name', async () => {
      // Arrange
      await repository.create(
        createTestSalonRequest({ name: 'Beauty Salon Tokyo' })
      )
      await repository.create(
        createTestSalonRequest({ name: 'Hair Salon Osaka' })
      )
      await repository.create(
        createTestSalonRequest({ name: 'Nail Studio Kyoto' })
      )

      // Act
      const result = await repository.search(
        { keyword: 'Salon' },
        { limit: 10, offset: 0 }
      )

      // Assert
      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        expect(result.value.data).toHaveLength(2)
        expect(result.value.total).toBe(2)
      }
    })

    it('should search salons by keyword in description', async () => {
      // Arrange
      await repository.create(
        createTestSalonRequest({
          name: 'Salon A',
          description: 'Premium hair treatment services',
        })
      )
      await repository.create(
        createTestSalonRequest({
          name: 'Salon B',
          description: 'Best nail art in town',
        })
      )

      // Act
      const result = await repository.search(
        { keyword: 'hair' },
        { limit: 10, offset: 0 }
      )

      // Assert
      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        expect(result.value.data).toHaveLength(1)
        const firstResult = result.value.data[0]
        if (firstResult) {
          expect(firstResult.data.name).toBe('Salon A')
        }
      }
    })

    it('should search salons by city', async () => {
      // Arrange
      await repository.create(
        createTestSalonRequest({
          address: {
            street: '123 Street',
            city: 'Tokyo',
            state: 'Tokyo',
            postalCode: '100-0001',
            country: 'Japan',
          },
        })
      )
      await repository.create(
        createTestSalonRequest({
          address: {
            street: '456 Street',
            city: 'Osaka',
            state: 'Osaka',
            postalCode: '530-0001',
            country: 'Japan',
          },
        })
      )

      // Act
      const result = await repository.search(
        { city: 'Tokyo' },
        { limit: 10, offset: 0 }
      )

      // Assert
      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        expect(result.value.data).toHaveLength(1)
        const firstResult = result.value.data[0]
        if (firstResult) {
          expect(firstResult.data.address.city).toBe('Tokyo')
        }
      }
    })

    it('should combine multiple search criteria', async () => {
      // Arrange
      await repository.create(
        createTestSalonRequest({
          name: 'Premium Beauty Salon',
          address: {
            street: '123 Street',
            city: 'Tokyo',
            state: 'Tokyo',
            postalCode: '100-0001',
            country: 'Japan',
          },
        })
      )
      await repository.create(
        createTestSalonRequest({
          name: 'Standard Beauty Salon',
          address: {
            street: '456 Street',
            city: 'Osaka',
            state: 'Osaka',
            postalCode: '530-0001',
            country: 'Japan',
          },
        })
      )

      // Act
      const result = await repository.search(
        { keyword: 'Premium', city: 'Tokyo' },
        { limit: 10, offset: 0 }
      )

      // Assert
      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        expect(result.value.data).toHaveLength(1)
        const firstResult = result.value.data[0]
        if (firstResult) {
          expect(firstResult.data.name).toBe('Premium Beauty Salon')
        }
      }
    })

    it('should paginate search results', async () => {
      // Arrange
      for (let i = 0; i < 5; i++) {
        await repository.create(
          createTestSalonRequest({
            name: `Test Salon ${i + 1}`,
          })
        )
      }

      // Act
      const result = await repository.search({}, { limit: 2, offset: 2 })

      // Assert
      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        expect(result.value.data).toHaveLength(2)
        expect(result.value.total).toBe(5)
        expect(result.value.limit).toBe(2)
        expect(result.value.offset).toBe(2)
      }
    })

    it('should return empty results for no matches', async () => {
      // Arrange
      await repository.create(createTestSalonRequest())

      // Act
      const result = await repository.search(
        { keyword: 'NonExistentKeyword' },
        { limit: 10, offset: 0 }
      )

      // Assert
      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        expect(result.value.data).toHaveLength(0)
        expect(result.value.total).toBe(0)
      }
    })
  })

  describe('findAllActive', () => {
    it('should return all active salons', async () => {
      // Arrange
      const result1 = await repository.create(
        createTestSalonRequest({ name: 'Salon 1' })
      )
      const result2 = await repository.create(
        createTestSalonRequest({ name: 'Salon 2' })
      )
      const result3 = await repository.create(
        createTestSalonRequest({ name: 'Salon 3' })
      )

      // Check all creates succeeded
      if (result1.type === 'err') {
        console.error('Create 1 failed:', result1.error)
      }
      if (result2.type === 'err') {
        console.error('Create 2 failed:', result2.error)
      }
      if (result3.type === 'err') {
        console.error('Create 3 failed:', result3.error)
      }
      expect(result1.type).toBe('ok')
      expect(result2.type).toBe('ok')
      expect(result3.type).toBe('ok')

      // Act
      const result = await repository.findAllActive({ limit: 10, offset: 0 })

      // Assert
      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        expect(result.value.data).toHaveLength(3)
        expect(result.value.total).toBe(3)
        for (const salon of result.value.data) {
          expect(salon.type).toBe('active')
        }
      }
    })

    it.skip('should paginate active salons', async () => {
      // Arrange
      for (let i = 0; i < 10; i++) {
        await repository.create(
          createTestSalonRequest({
            name: `Active Salon ${i + 1}`,
          })
        )
      }

      // Act
      const result = await repository.findAllActive({ limit: 5, offset: 5 })

      // Assert
      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        expect(result.value.data).toHaveLength(5)
        expect(result.value.total).toBe(10)
      }
    })
  })

  describe('countByCity', () => {
    it('should count salons by city', async () => {
      // Arrange
      const tokyoAddress = {
        street: '123 Street',
        city: 'Tokyo',
        state: 'Tokyo',
        postalCode: '100-0001',
        country: 'Japan',
      }
      const osakaAddress = {
        street: '456 Street',
        city: 'Osaka',
        state: 'Osaka',
        postalCode: '530-0001',
        country: 'Japan',
      }

      await repository.create(createTestSalonRequest({ address: tokyoAddress }))
      await repository.create(createTestSalonRequest({ address: tokyoAddress }))
      await repository.create(createTestSalonRequest({ address: osakaAddress }))

      // Act
      const result = await repository.countByCity()

      // Assert
      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        expect(result.value.get('Tokyo')).toBe(2)
        expect(result.value.get('Osaka')).toBe(1)
      }
    })

    it('should return empty map when no salons exist', async () => {
      // Act
      const result = await repository.countByCity()

      // Assert
      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        expect(result.value.size).toBe(0)
      }
    })
  })

  describe('suspend', () => {
    it('should return error for unimplemented suspend', async () => {
      // Arrange
      const createRequest = createTestSalonRequest()
      const createResult = await repository.create(createRequest)
      if (createResult.type !== 'ok') throw new Error('Failed to create salon')
      const salonId = createResult.value.data.id

      // Act
      const result = await repository.suspend(salonId, 'Test reason', 'admin')

      // Assert
      expect(result.type).toBe('err')
      if (result.type === 'err') {
        expect(result.error.type).toBe('databaseError')
        if (result.error.type === 'databaseError') {
          expect(result.error.message).toContain('not implemented')
        }
      }
    })
  })

  describe('reactivate', () => {
    it('should return error for unimplemented reactivate', async () => {
      // Arrange
      const createRequest = createTestSalonRequest()
      const createResult = await repository.create(createRequest)
      if (createResult.type !== 'ok') throw new Error('Failed to create salon')
      const salonId = createResult.value.data.id

      // Act
      const result = await repository.reactivate(salonId, 'admin')

      // Assert
      expect(result.type).toBe('err')
      if (result.type === 'err') {
        expect(result.error.type).toBe('databaseError')
        if (result.error.type === 'databaseError') {
          expect(result.error.message).toContain('not implemented')
        }
      }
    })
  })
})
