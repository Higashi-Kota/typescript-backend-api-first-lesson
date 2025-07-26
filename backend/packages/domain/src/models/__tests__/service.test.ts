/**
 * Service ドメインモデルの単体テスト
 * CLAUDE.mdのテスト要件に徹底準拠
 */

import { match } from 'ts-pattern'
import { describe, expect, it } from 'vitest'
import { createSalonId } from '../salon.js'
import {
  type Service,
  type ServiceCategory,
  type ServiceId,
  calculateTotalDuration,
  calculateTotalPrice,
  canBeBooked,
  createCategoryId,
  createCategoryIdSafe,
  createServiceId,
  createServiceIdSafe,
  isActiveService,
  isDiscontinuedService,
  isInactiveService,
  validateDuration,
  validatePrice,
  validateRequiredStaffLevel,
  validateServiceDescription,
  validateServiceName,
} from '../service.js'

// Helper function to create ServiceId with null check
const createTestServiceId = (uuid: string): ServiceId => {
  const id = createServiceId(uuid)
  if (!id) {
    throw new Error(`Failed to create ServiceId from UUID: ${uuid}`)
  }
  return id
}

// Helper function to create SalonId with null check
const createTestSalonId = (uuid: string) => {
  const id = createSalonId(uuid)
  if (!id) {
    throw new Error(`Failed to create SalonId from UUID: ${uuid}`)
  }
  return id
}

describe('Service ID作成関数', () => {
  describe('createServiceId', () => {
    it('should create a valid ServiceId', () => {
      // Arrange
      const validUuid = '550e8400-e29b-41d4-a716-446655440000'

      // Act
      const serviceId = createServiceId(validUuid)

      // Assert
      expect(serviceId).not.toBeNull()
      if (serviceId) {
        expect(serviceId).toBe(validUuid)
        expect(typeof serviceId).toBe('string')
      }
    })
  })

  describe('createServiceIdSafe', () => {
    it('should create ServiceId for valid UUID', () => {
      // Arrange
      const validUuid = '550e8400-e29b-41d4-a716-446655440000'

      // Act
      const result = createServiceIdSafe(validUuid)

      // Assert
      expect(result).toEqual({
        type: 'ok',
        value: validUuid,
      })
    })

    it('should return error for invalid UUID', () => {
      // Arrange
      const invalidUuid = 'not-a-uuid'

      // Act
      const result = createServiceIdSafe(invalidUuid)

      // Assert
      expect(result).toEqual({
        type: 'err',
        error: {
          type: 'invalidFormat',
          value: invalidUuid,
          brand: 'ServiceId',
          message: `Invalid ServiceId format: ${invalidUuid}`,
        },
      })
    })
  })
})

describe('Category ID作成関数', () => {
  describe('createCategoryId', () => {
    it('should create a valid CategoryId', () => {
      // Arrange
      const validUuid = '660e8400-e29b-41d4-a716-446655440001'

      // Act
      const categoryId = createCategoryId(validUuid)

      // Assert
      expect(categoryId).not.toBeNull()
      if (categoryId) {
        expect(categoryId).toBe(validUuid)
        expect(typeof categoryId).toBe('string')
      }
    })
  })

  describe('createCategoryIdSafe', () => {
    it('should create CategoryId for valid UUID', () => {
      // Arrange
      const validUuid = '660e8400-e29b-41d4-a716-446655440001'

      // Act
      const result = createCategoryIdSafe(validUuid)

      // Assert
      expect(result).toEqual({
        type: 'ok',
        value: validUuid,
      })
    })

    it('should return error for invalid UUID', () => {
      // Arrange
      const invalidUuid = 'invalid-category-id'

      // Act
      const result = createCategoryIdSafe(invalidUuid)

      // Assert
      expect(result).toEqual({
        type: 'err',
        error: {
          type: 'invalidFormat',
          value: invalidUuid,
          brand: 'CategoryId',
          message: `Invalid CategoryId format: ${invalidUuid}`,
        },
      })
    })
  })
})

describe('Service名バリデーション', () => {
  describe('validateServiceName', () => {
    it('should accept valid service name', () => {
      // Arrange
      const validName = 'カット＆ブロー'

      // Act
      const result = validateServiceName(validName)

      // Assert
      expect(result).toEqual({
        type: 'ok',
        value: validName,
      })
    })

    it('should trim whitespace from name', () => {
      // Arrange
      const nameWithWhitespace = '  カット＆ブロー  '

      // Act
      const result = validateServiceName(nameWithWhitespace)

      // Assert
      expect(result).toEqual({
        type: 'ok',
        value: 'カット＆ブロー',
      })
    })

    it('should reject empty name', () => {
      // Arrange
      const emptyName = ''

      // Act
      const result = validateServiceName(emptyName)

      // Assert
      expect(result).toEqual({
        type: 'err',
        error: {
          type: 'invalidName',
          message: 'Service name cannot be empty',
        },
      })
    })

    it('should reject whitespace-only name', () => {
      // Arrange
      const whitespaceOnlyName = '   '

      // Act
      const result = validateServiceName(whitespaceOnlyName)

      // Assert
      expect(result).toEqual({
        type: 'err',
        error: {
          type: 'invalidName',
          message: 'Service name cannot be empty',
        },
      })
    })

    it('should reject name that is too long', () => {
      // Arrange
      const longName = 'a'.repeat(101)

      // Act
      const result = validateServiceName(longName)

      // Assert
      expect(result).toEqual({
        type: 'err',
        error: {
          type: 'invalidName',
          message: 'Service name is too long',
        },
      })
    })
  })
})

describe('Service説明バリデーション', () => {
  describe('validateServiceDescription', () => {
    it('should accept valid description', () => {
      // Arrange
      const validDescription = 'シャンプー、カット、ブローが含まれます'

      // Act
      const result = validateServiceDescription(validDescription)

      // Assert
      expect(result).toEqual({
        type: 'ok',
        value: validDescription,
      })
    })

    it('should trim whitespace from description', () => {
      // Arrange
      const descriptionWithWhitespace =
        '  シャンプー、カット、ブローが含まれます  '

      // Act
      const result = validateServiceDescription(descriptionWithWhitespace)

      // Assert
      expect(result).toEqual({
        type: 'ok',
        value: 'シャンプー、カット、ブローが含まれます',
      })
    })

    it('should reject empty description', () => {
      // Arrange
      const emptyDescription = ''

      // Act
      const result = validateServiceDescription(emptyDescription)

      // Assert
      expect(result).toEqual({
        type: 'err',
        error: {
          type: 'invalidDescription',
          message: 'Service description cannot be empty',
        },
      })
    })

    it('should reject description that is too long', () => {
      // Arrange
      const longDescription = 'a'.repeat(1001)

      // Act
      const result = validateServiceDescription(longDescription)

      // Assert
      expect(result).toEqual({
        type: 'err',
        error: {
          type: 'invalidDescription',
          message: 'Service description is too long',
        },
      })
    })

    it('should accept description at max length', () => {
      // Arrange
      const maxLengthDescription = 'a'.repeat(1000)

      // Act
      const result = validateServiceDescription(maxLengthDescription)

      // Assert
      expect(result).toEqual({
        type: 'ok',
        value: maxLengthDescription,
      })
    })
  })
})

describe('所要時間バリデーション', () => {
  describe('validateDuration', () => {
    it('should accept valid duration', () => {
      // Arrange
      const validDuration = 60 // 60分

      // Act
      const result = validateDuration(validDuration)

      // Assert
      expect(result).toEqual({
        type: 'ok',
        value: validDuration,
      })
    })

    it('should accept minimum valid duration', () => {
      // Arrange
      const minDuration = 1

      // Act
      const result = validateDuration(minDuration)

      // Assert
      expect(result).toEqual({
        type: 'ok',
        value: minDuration,
      })
    })

    it('should reject zero duration', () => {
      // Arrange
      const zeroDuration = 0

      // Act
      const result = validateDuration(zeroDuration)

      // Assert
      expect(result).toEqual({
        type: 'err',
        error: {
          type: 'invalidDuration',
          message: 'Duration must be positive',
        },
      })
    })

    it('should reject negative duration', () => {
      // Arrange
      const negativeDuration = -30

      // Act
      const result = validateDuration(negativeDuration)

      // Assert
      expect(result).toEqual({
        type: 'err',
        error: {
          type: 'invalidDuration',
          message: 'Duration must be positive',
        },
      })
    })

    it('should reject duration over 8 hours', () => {
      // Arrange
      const longDuration = 481 // 8時間1分

      // Act
      const result = validateDuration(longDuration)

      // Assert
      expect(result).toEqual({
        type: 'err',
        error: {
          type: 'invalidDuration',
          message: 'Duration is too long (max 8 hours)',
        },
      })
    })

    it('should accept maximum valid duration', () => {
      // Arrange
      const maxDuration = 480 // 8時間

      // Act
      const result = validateDuration(maxDuration)

      // Assert
      expect(result).toEqual({
        type: 'ok',
        value: maxDuration,
      })
    })
  })
})

describe('価格バリデーション', () => {
  describe('validatePrice', () => {
    it('should accept valid price', () => {
      // Arrange
      const validPrice = 3000

      // Act
      const result = validatePrice(validPrice)

      // Assert
      expect(result).toEqual({
        type: 'ok',
        value: validPrice,
      })
    })

    it('should accept zero price', () => {
      // Arrange
      const zeroPrice = 0

      // Act
      const result = validatePrice(zeroPrice)

      // Assert
      expect(result).toEqual({
        type: 'ok',
        value: zeroPrice,
      })
    })

    it('should reject negative price', () => {
      // Arrange
      const negativePrice = -100

      // Act
      const result = validatePrice(negativePrice)

      // Assert
      expect(result).toEqual({
        type: 'err',
        error: {
          type: 'invalidPrice',
          message: 'Price cannot be negative',
        },
      })
    })

    it('should reject price over 1 million yen', () => {
      // Arrange
      const highPrice = 1000001

      // Act
      const result = validatePrice(highPrice)

      // Assert
      expect(result).toEqual({
        type: 'err',
        error: {
          type: 'invalidPrice',
          message: 'Price is too high',
        },
      })
    })

    it('should accept maximum valid price', () => {
      // Arrange
      const maxPrice = 1000000

      // Act
      const result = validatePrice(maxPrice)

      // Assert
      expect(result).toEqual({
        type: 'ok',
        value: maxPrice,
      })
    })
  })
})

describe('必要スタッフレベルバリデーション', () => {
  describe('validateRequiredStaffLevel', () => {
    it('should accept valid staff level', () => {
      // Arrange
      const validLevel = 3

      // Act
      const result = validateRequiredStaffLevel(validLevel)

      // Assert
      expect(result).toEqual({
        type: 'ok',
        value: validLevel,
      })
    })

    it('should accept undefined staff level', () => {
      // Arrange
      const undefinedLevel = undefined

      // Act
      const result = validateRequiredStaffLevel(undefinedLevel)

      // Assert
      expect(result).toEqual({
        type: 'ok',
        value: undefined,
      })
    })

    it('should accept minimum valid level', () => {
      // Arrange
      const minLevel = 1

      // Act
      const result = validateRequiredStaffLevel(minLevel)

      // Assert
      expect(result).toEqual({
        type: 'ok',
        value: minLevel,
      })
    })

    it('should reject zero level', () => {
      // Arrange
      const zeroLevel = 0

      // Act
      const result = validateRequiredStaffLevel(zeroLevel)

      // Assert
      expect(result).toEqual({
        type: 'err',
        error: {
          type: 'invalidStaffLevel',
          message: 'Staff level must be at least 1',
        },
      })
    })

    it('should reject negative level', () => {
      // Arrange
      const negativeLevel = -1

      // Act
      const result = validateRequiredStaffLevel(negativeLevel)

      // Assert
      expect(result).toEqual({
        type: 'err',
        error: {
          type: 'invalidStaffLevel',
          message: 'Staff level must be at least 1',
        },
      })
    })

    it('should reject level over 10', () => {
      // Arrange
      const highLevel = 11

      // Act
      const result = validateRequiredStaffLevel(highLevel)

      // Assert
      expect(result).toEqual({
        type: 'err',
        error: {
          type: 'invalidStaffLevel',
          message: 'Staff level is too high (max 10)',
        },
      })
    })

    it('should accept maximum valid level', () => {
      // Arrange
      const maxLevel = 10

      // Act
      const result = validateRequiredStaffLevel(maxLevel)

      // Assert
      expect(result).toEqual({
        type: 'ok',
        value: maxLevel,
      })
    })
  })
})

describe('Service状態判定関数', () => {
  const baseServiceData = {
    id: createTestServiceId('550e8400-e29b-41d4-a716-446655440000'),
    salonId: createTestSalonId('660e8400-e29b-41d4-a716-446655440001'),
    name: 'カット＆ブロー',
    description: 'シャンプー、カット、ブローが含まれます',
    duration: 60,
    price: 3000,
    category: 'cut' as ServiceCategory,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  }

  describe('isActiveService', () => {
    it('should return true for active service', () => {
      // Arrange
      const activeService: Service = {
        type: 'active',
        data: baseServiceData,
      }

      // Act
      const result = isActiveService(activeService)

      // Assert
      expect(result).toBe(true)
    })

    it('should return false for inactive service', () => {
      // Arrange
      const inactiveService: Service = {
        type: 'inactive',
        data: baseServiceData,
        inactivatedAt: new Date('2024-06-01'),
      }

      // Act
      const result = isActiveService(inactiveService)

      // Assert
      expect(result).toBe(false)
    })

    it('should return false for discontinued service', () => {
      // Arrange
      const discontinuedService: Service = {
        type: 'discontinued',
        data: baseServiceData,
        discontinuedAt: new Date('2024-06-01'),
        discontinuedBy: 'admin',
      }

      // Act
      const result = isActiveService(discontinuedService)

      // Assert
      expect(result).toBe(false)
    })
  })

  describe('isInactiveService', () => {
    it('should return true for inactive service', () => {
      // Arrange
      const inactiveService: Service = {
        type: 'inactive',
        data: baseServiceData,
        inactivatedAt: new Date('2024-06-01'),
      }

      // Act
      const result = isInactiveService(inactiveService)

      // Assert
      expect(result).toBe(true)
    })

    it('should return false for active service', () => {
      // Arrange
      const activeService: Service = {
        type: 'active',
        data: baseServiceData,
      }

      // Act
      const result = isInactiveService(activeService)

      // Assert
      expect(result).toBe(false)
    })
  })

  describe('isDiscontinuedService', () => {
    it('should return true for discontinued service', () => {
      // Arrange
      const discontinuedService: Service = {
        type: 'discontinued',
        data: baseServiceData,
        discontinuedAt: new Date('2024-06-01'),
        discontinuedBy: 'admin',
      }

      // Act
      const result = isDiscontinuedService(discontinuedService)

      // Assert
      expect(result).toBe(true)
    })

    it('should return false for active service', () => {
      // Arrange
      const activeService: Service = {
        type: 'active',
        data: baseServiceData,
      }

      // Act
      const result = isDiscontinuedService(activeService)

      // Assert
      expect(result).toBe(false)
    })
  })

  describe('canBeBooked', () => {
    it('should return true for active service', () => {
      // Arrange
      const activeService: Service = {
        type: 'active',
        data: baseServiceData,
      }

      // Act
      const result = canBeBooked(activeService)

      // Assert
      expect(result).toBe(true)
    })

    it('should return false for inactive service', () => {
      // Arrange
      const inactiveService: Service = {
        type: 'inactive',
        data: baseServiceData,
        inactivatedAt: new Date('2024-06-01'),
      }

      // Act
      const result = canBeBooked(inactiveService)

      // Assert
      expect(result).toBe(false)
    })

    it('should return false for discontinued service', () => {
      // Arrange
      const discontinuedService: Service = {
        type: 'discontinued',
        data: baseServiceData,
        discontinuedAt: new Date('2024-06-01'),
        discontinuedBy: 'admin',
      }

      // Act
      const result = canBeBooked(discontinuedService)

      // Assert
      expect(result).toBe(false)
    })
  })
})

describe('Service計算関数', () => {
  const createServiceWithPrice = (
    price: number,
    type: Service['type'] = 'active'
  ): Service => {
    // 価格を基に一意なインデックスを生成
    const index = price / 1000 // 3000 -> 3, 5000 -> 5, etc.
    const baseData = {
      id: createTestServiceId(`550e8400-e29b-41d4-a716-44665544000${index}`),
      salonId: createTestSalonId('660e8400-e29b-41d4-a716-446655440001'),
      name: `サービス${price}`,
      description: '説明',
      duration: 60,
      price,
      category: 'cut' as ServiceCategory,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    }

    switch (type) {
      case 'active':
        return { type: 'active', data: baseData }
      case 'inactive':
        return { type: 'inactive', data: baseData, inactivatedAt: new Date() }
      case 'discontinued':
        return {
          type: 'discontinued',
          data: baseData,
          discontinuedAt: new Date(),
          discontinuedBy: 'admin',
        }
    }
  }

  describe('calculateTotalPrice', () => {
    it('should calculate total price for active services', () => {
      // Arrange
      const services = [
        createServiceWithPrice(3000),
        createServiceWithPrice(5000),
        createServiceWithPrice(2000),
      ]

      // Act
      const total = calculateTotalPrice(services)

      // Assert
      expect(total).toBe(10000)
    })

    it('should exclude inactive services from total', () => {
      // Arrange
      const services = [
        createServiceWithPrice(3000, 'active'),
        createServiceWithPrice(5000, 'inactive'),
        createServiceWithPrice(2000, 'active'),
      ]

      // Act
      const total = calculateTotalPrice(services)

      // Assert
      expect(total).toBe(5000)
    })

    it('should apply discount rate correctly', () => {
      // Arrange
      const services = [
        createServiceWithPrice(3000),
        createServiceWithPrice(5000),
      ]
      const discountRate = 0.1 // 10%割引

      // Act
      const total = calculateTotalPrice(services, discountRate)

      // Assert
      expect(total).toBe(7200) // 8000 * 0.9 = 7200
    })

    it('should return zero for empty services', () => {
      // Arrange
      const services: Service[] = []

      // Act
      const total = calculateTotalPrice(services)

      // Assert
      expect(total).toBe(0)
    })

    it('should handle all discontinued services', () => {
      // Arrange
      const services = [
        createServiceWithPrice(3000, 'discontinued'),
        createServiceWithPrice(5000, 'discontinued'),
      ]

      // Act
      const total = calculateTotalPrice(services)

      // Assert
      expect(total).toBe(0)
    })
  })

  describe('calculateTotalDuration', () => {
    const createServiceWithDuration = (
      duration: number,
      type: Service['type'] = 'active'
    ): Service => {
      const baseData = {
        id: createTestServiceId(
          `550e8400-e29b-41d4-a716-446655440${String(duration).padStart(3, '0')}`
        ),
        salonId: createTestSalonId('660e8400-e29b-41d4-a716-446655440001'),
        name: `サービス${duration}分`,
        description: '説明',
        duration,
        price: 3000,
        category: 'cut' as ServiceCategory,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      }

      switch (type) {
        case 'active':
          return { type: 'active', data: baseData }
        case 'inactive':
          return { type: 'inactive', data: baseData, inactivatedAt: new Date() }
        case 'discontinued':
          return {
            type: 'discontinued',
            data: baseData,
            discontinuedAt: new Date(),
            discontinuedBy: 'admin',
          }
      }
    }

    it('should calculate total duration for active services', () => {
      // Arrange
      const services = [
        createServiceWithDuration(30),
        createServiceWithDuration(60),
        createServiceWithDuration(45),
      ]

      // Act
      const total = calculateTotalDuration(services)

      // Assert
      expect(total).toBe(135)
    })

    it('should exclude inactive services from total', () => {
      // Arrange
      const services = [
        createServiceWithDuration(30, 'active'),
        createServiceWithDuration(60, 'inactive'),
        createServiceWithDuration(45, 'active'),
      ]

      // Act
      const total = calculateTotalDuration(services)

      // Assert
      expect(total).toBe(75)
    })

    it('should return zero for empty services', () => {
      // Arrange
      const services: Service[] = []

      // Act
      const total = calculateTotalDuration(services)

      // Assert
      expect(total).toBe(0)
    })
  })
})

describe('Service Sum型のパターンマッチング', () => {
  const baseServiceData = {
    id: createTestServiceId('550e8400-e29b-41d4-a716-446655440000'),
    salonId: createTestSalonId('660e8400-e29b-41d4-a716-446655440001'),
    name: 'カット＆ブロー',
    description: 'シャンプー、カット、ブローが含まれます',
    duration: 60,
    price: 3000,
    category: 'cut' as ServiceCategory,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  }

  it('should handle all service states with pattern matching', () => {
    // Arrange
    const serviceStates: Service[] = [
      {
        type: 'active',
        data: baseServiceData,
      },
      {
        type: 'inactive',
        data: baseServiceData,
        inactivatedAt: new Date('2024-06-01'),
        inactivatedReason: '一時停止',
      },
      {
        type: 'discontinued',
        data: baseServiceData,
        discontinuedAt: new Date('2024-06-01'),
        discontinuedBy: 'admin',
        discontinuedReason: 'サービス終了',
      },
    ]

    // Act & Assert
    for (const service of serviceStates) {
      const status = match(service)
        .with({ type: 'active' }, () => '提供中')
        .with({ type: 'inactive' }, ({ inactivatedReason }) =>
          inactivatedReason ? `一時停止: ${inactivatedReason}` : '一時停止'
        )
        .with({ type: 'discontinued' }, ({ discontinuedReason }) =>
          discontinuedReason ? `提供終了: ${discontinuedReason}` : '提供終了'
        )
        .exhaustive()

      // Assert
      expect(status).toBeDefined()
      expect(typeof status).toBe('string')
    }
  })

  it('should handle service category enum exhaustively', () => {
    // Arrange
    const categories: ServiceCategory[] = [
      'cut',
      'color',
      'perm',
      'treatment',
      'spa',
      'other',
    ]

    // Act & Assert
    for (const category of categories) {
      const categoryName = match(category)
        .with('cut', () => 'カット')
        .with('color', () => 'カラー')
        .with('perm', () => 'パーマ')
        .with('treatment', () => 'トリートメント')
        .with('spa', () => 'スパ')
        .with('other', () => 'その他')
        .exhaustive()

      // Assert
      expect(categoryName).toBeDefined()
      expect(typeof categoryName).toBe('string')
    }
  })
})
