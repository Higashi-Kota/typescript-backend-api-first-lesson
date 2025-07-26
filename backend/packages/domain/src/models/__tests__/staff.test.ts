/**
 * Staff ドメインモデルの単体テスト
 * CLAUDE.mdのテスト要件に徹底準拠
 */

import { match } from 'ts-pattern'
import { describe, expect, it } from 'vitest'
import { createSalonId } from '../salon.js'
import {
  type Staff,
  type StaffAvailability,
  type StaffId,
  canProvideService,
  createStaffId,
  createStaffIdSafe,
  isActiveStaff,
  isInactiveStaff,
  isTerminatedStaff,
  validateAvailability,
  validateSpecialties,
  validateStaffName,
  validateYearsOfExperience,
} from '../staff.js'

// Helper function to create StaffId with null check
const createTestStaffId = (uuid: string): StaffId => {
  const id = createStaffId(uuid)
  if (!id) {
    throw new Error(`Failed to create StaffId from UUID: ${uuid}`)
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

describe('Staff ID作成関数', () => {
  describe('createStaffId', () => {
    it('should create a valid StaffId', () => {
      // Arrange
      const validUuid = '550e8400-e29b-41d4-a716-446655440000'

      // Act
      const staffId = createStaffId(validUuid)

      // Assert
      expect(staffId).not.toBeNull()
      if (staffId) {
        expect(staffId).toBe(validUuid)
        expect(typeof staffId).toBe('string')
      }
    })
  })

  describe('createStaffIdSafe', () => {
    it('should create StaffId for valid UUID', () => {
      // Arrange
      const validUuid = '550e8400-e29b-41d4-a716-446655440000'

      // Act
      const result = createStaffIdSafe(validUuid)

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
      const result = createStaffIdSafe(invalidUuid)

      // Assert
      expect(result).toEqual({
        type: 'err',
        error: {
          type: 'invalidFormat',
          value: invalidUuid,
          brand: 'StaffId',
          message: `Invalid StaffId format: ${invalidUuid}`,
        },
      })
    })

    it('should return error for empty string', () => {
      // Arrange
      const emptyString = ''

      // Act
      const result = createStaffIdSafe(emptyString)

      // Assert
      expect(result).toEqual({
        type: 'err',
        error: {
          type: 'invalidFormat',
          value: emptyString,
          brand: 'StaffId',
          message: `Invalid StaffId format: ${emptyString}`,
        },
      })
    })
  })
})

describe('Staff名バリデーション', () => {
  describe('validateStaffName', () => {
    it('should accept valid staff name', () => {
      // Arrange
      const validName = '山田太郎'

      // Act
      const result = validateStaffName(validName)

      // Assert
      expect(result).toEqual({
        type: 'ok',
        value: validName,
      })
    })

    it('should trim whitespace from name', () => {
      // Arrange
      const nameWithWhitespace = '  山田太郎  '

      // Act
      const result = validateStaffName(nameWithWhitespace)

      // Assert
      expect(result).toEqual({
        type: 'ok',
        value: '山田太郎',
      })
    })

    it('should reject empty name', () => {
      // Arrange
      const emptyName = ''

      // Act
      const result = validateStaffName(emptyName)

      // Assert
      expect(result).toEqual({
        type: 'err',
        error: {
          type: 'invalidName',
          message: 'Staff name cannot be empty',
        },
      })
    })

    it('should reject whitespace-only name', () => {
      // Arrange
      const whitespaceOnlyName = '   '

      // Act
      const result = validateStaffName(whitespaceOnlyName)

      // Assert
      expect(result).toEqual({
        type: 'err',
        error: {
          type: 'invalidName',
          message: 'Staff name cannot be empty',
        },
      })
    })

    it('should reject name that is too long', () => {
      // Arrange
      const longName = 'a'.repeat(101)

      // Act
      const result = validateStaffName(longName)

      // Assert
      expect(result).toEqual({
        type: 'err',
        error: {
          type: 'invalidName',
          message: 'Staff name is too long',
        },
      })
    })

    it('should accept name at max length', () => {
      // Arrange
      const maxLengthName = 'a'.repeat(100)

      // Act
      const result = validateStaffName(maxLengthName)

      // Assert
      expect(result).toEqual({
        type: 'ok',
        value: maxLengthName,
      })
    })
  })
})

describe('スペシャリティバリデーション', () => {
  describe('validateSpecialties', () => {
    it('should accept valid specialties', () => {
      // Arrange
      const validSpecialties = ['カット', 'カラー', 'パーマ']

      // Act
      const result = validateSpecialties(validSpecialties)

      // Assert
      expect(result).toEqual({
        type: 'ok',
        value: validSpecialties,
      })
    })

    it('should accept single specialty', () => {
      // Arrange
      const singleSpecialty = ['カット']

      // Act
      const result = validateSpecialties(singleSpecialty)

      // Assert
      expect(result).toEqual({
        type: 'ok',
        value: singleSpecialty,
      })
    })

    it('should reject empty specialties array', () => {
      // Arrange
      const emptySpecialties: string[] = []

      // Act
      const result = validateSpecialties(emptySpecialties)

      // Assert
      expect(result).toEqual({
        type: 'err',
        error: {
          type: 'invalidSpecialties',
          message: 'At least one specialty is required',
        },
      })
    })

    it('should reject too many specialties', () => {
      // Arrange
      const tooManySpecialties = Array(21).fill('カット')

      // Act
      const result = validateSpecialties(tooManySpecialties)

      // Assert
      expect(result).toEqual({
        type: 'err',
        error: {
          type: 'invalidSpecialties',
          message: 'Too many specialties',
        },
      })
    })

    it('should accept maximum number of specialties', () => {
      // Arrange
      const maxSpecialties = Array(20).fill('カット')

      // Act
      const result = validateSpecialties(maxSpecialties)

      // Assert
      expect(result).toEqual({
        type: 'ok',
        value: maxSpecialties,
      })
    })
  })
})

describe('経験年数バリデーション', () => {
  describe('validateYearsOfExperience', () => {
    it('should accept valid years of experience', () => {
      // Arrange
      const validYears = 5

      // Act
      const result = validateYearsOfExperience(validYears)

      // Assert
      expect(result).toEqual({
        type: 'ok',
        value: validYears,
      })
    })

    it('should accept zero years of experience', () => {
      // Arrange
      const zeroYears = 0

      // Act
      const result = validateYearsOfExperience(zeroYears)

      // Assert
      expect(result).toEqual({
        type: 'ok',
        value: zeroYears,
      })
    })

    it('should accept undefined years of experience', () => {
      // Arrange
      const undefinedYears = undefined

      // Act
      const result = validateYearsOfExperience(undefinedYears)

      // Assert
      expect(result).toEqual({
        type: 'ok',
        value: undefined,
      })
    })

    it('should reject negative years of experience', () => {
      // Arrange
      const negativeYears = -1

      // Act
      const result = validateYearsOfExperience(negativeYears)

      // Assert
      expect(result).toEqual({
        type: 'err',
        error: {
          type: 'invalidExperience',
          message: 'Years of experience cannot be negative',
        },
      })
    })

    it('should reject unrealistic years of experience', () => {
      // Arrange
      const unrealisticYears = 101

      // Act
      const result = validateYearsOfExperience(unrealisticYears)

      // Assert
      expect(result).toEqual({
        type: 'err',
        error: {
          type: 'invalidExperience',
          message: 'Years of experience is unrealistic',
        },
      })
    })

    it('should accept maximum realistic years', () => {
      // Arrange
      const maxYears = 100

      // Act
      const result = validateYearsOfExperience(maxYears)

      // Assert
      expect(result).toEqual({
        type: 'ok',
        value: maxYears,
      })
    })
  })
})

describe('スタッフ可用性バリデーション', () => {
  describe('validateAvailability', () => {
    it('should accept valid availability', () => {
      // Arrange
      const validAvailability: StaffAvailability = {
        staffId: createTestStaffId('550e8400-e29b-41d4-a716-446655440000'),
        dayOfWeek: 'monday',
        startTime: '09:00',
        endTime: '18:00',
      }

      // Act
      const result = validateAvailability(validAvailability)

      // Assert
      expect(result).toEqual({
        type: 'ok',
        value: validAvailability,
      })
    })

    it('should accept availability with break time', () => {
      // Arrange
      const availabilityWithBreak: StaffAvailability = {
        staffId: createTestStaffId('550e8400-e29b-41d4-a716-446655440000'),
        dayOfWeek: 'monday',
        startTime: '09:00',
        endTime: '18:00',
        breakStart: '12:00',
        breakEnd: '13:00',
      }

      // Act
      const result = validateAvailability(availabilityWithBreak)

      // Assert
      expect(result).toEqual({
        type: 'ok',
        value: availabilityWithBreak,
      })
    })

    it('should reject invalid start time format', () => {
      // Arrange
      const invalidStartTime: StaffAvailability = {
        staffId: createTestStaffId('550e8400-e29b-41d4-a716-446655440000'),
        dayOfWeek: 'monday',
        startTime: 'invalid', // Invalid format
        endTime: '18:00',
      }

      // Act
      const result = validateAvailability(invalidStartTime)

      // Assert
      expect(result).toEqual({
        type: 'err',
        error: {
          type: 'invalidAvailability',
          message: 'Invalid time format (use HH:MM)',
        },
      })
    })

    it('should reject invalid end time format', () => {
      // Arrange
      const invalidEndTime: StaffAvailability = {
        staffId: createTestStaffId('550e8400-e29b-41d4-a716-446655440000'),
        dayOfWeek: 'monday',
        startTime: '09:00',
        endTime: '25:00', // Invalid hour
      }

      // Act
      const result = validateAvailability(invalidEndTime)

      // Assert
      expect(result).toEqual({
        type: 'err',
        error: {
          type: 'invalidAvailability',
          message: 'Invalid time format (use HH:MM)',
        },
      })
    })

    it('should reject when start time is after end time', () => {
      // Arrange
      const invalidTimeOrder: StaffAvailability = {
        staffId: createTestStaffId('550e8400-e29b-41d4-a716-446655440000'),
        dayOfWeek: 'monday',
        startTime: '18:00',
        endTime: '09:00',
      }

      // Act
      const result = validateAvailability(invalidTimeOrder)

      // Assert
      expect(result).toEqual({
        type: 'err',
        error: {
          type: 'invalidAvailability',
          message: 'Start time must be before end time',
        },
      })
    })

    it('should reject when start time equals end time', () => {
      // Arrange
      const sameStartAndEnd: StaffAvailability = {
        staffId: createTestStaffId('550e8400-e29b-41d4-a716-446655440000'),
        dayOfWeek: 'monday',
        startTime: '09:00',
        endTime: '09:00',
      }

      // Act
      const result = validateAvailability(sameStartAndEnd)

      // Assert
      expect(result).toEqual({
        type: 'err',
        error: {
          type: 'invalidAvailability',
          message: 'Start time must be before end time',
        },
      })
    })

    it('should reject invalid break start time format', () => {
      // Arrange
      const invalidBreakStart: StaffAvailability = {
        staffId: createTestStaffId('550e8400-e29b-41d4-a716-446655440000'),
        dayOfWeek: 'monday',
        startTime: '09:00',
        endTime: '18:00',
        breakStart: '12:60', // Invalid minutes
        breakEnd: '13:00',
      }

      // Act
      const result = validateAvailability(invalidBreakStart)

      // Assert
      expect(result).toEqual({
        type: 'err',
        error: {
          type: 'invalidAvailability',
          message: 'Invalid break start time format',
        },
      })
    })

    it('should reject invalid break end time format', () => {
      // Arrange
      const invalidBreakEnd: StaffAvailability = {
        staffId: createTestStaffId('550e8400-e29b-41d4-a716-446655440000'),
        dayOfWeek: 'monday',
        startTime: '09:00',
        endTime: '18:00',
        breakStart: '12:00',
        breakEnd: 'invalid',
      }

      // Act
      const result = validateAvailability(invalidBreakEnd)

      // Assert
      expect(result).toEqual({
        type: 'err',
        error: {
          type: 'invalidAvailability',
          message: 'Invalid break end time format',
        },
      })
    })

    it('should accept edge case times', () => {
      // Arrange
      const edgeCaseTimes: StaffAvailability = {
        staffId: createTestStaffId('550e8400-e29b-41d4-a716-446655440000'),
        dayOfWeek: 'monday',
        startTime: '00:00',
        endTime: '23:59',
      }

      // Act
      const result = validateAvailability(edgeCaseTimes)

      // Assert
      expect(result).toEqual({
        type: 'ok',
        value: edgeCaseTimes,
      })
    })
  })
})

describe('Staff状態判定関数', () => {
  const baseStaffData = {
    id: createTestStaffId('550e8400-e29b-41d4-a716-446655440000'),
    salonId: createTestSalonId('660e8400-e29b-41d4-a716-446655440001'),
    name: '山田太郎',
    contactInfo: {
      email: 'yamada@example.com',
      phoneNumber: '080-1234-5678',
    },
    specialties: ['カット', 'カラー'],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  }

  describe('isActiveStaff', () => {
    it('should return true for active staff', () => {
      // Arrange
      const activeStaff: Staff = {
        type: 'active',
        data: baseStaffData,
      }

      // Act
      const result = isActiveStaff(activeStaff)

      // Assert
      expect(result).toBe(true)
    })

    it('should return false for inactive staff', () => {
      // Arrange
      const inactiveStaff: Staff = {
        type: 'inactive',
        data: baseStaffData,
        inactivatedAt: new Date('2024-06-01'),
      }

      // Act
      const result = isActiveStaff(inactiveStaff)

      // Assert
      expect(result).toBe(false)
    })

    it('should return false for terminated staff', () => {
      // Arrange
      const terminatedStaff: Staff = {
        type: 'terminated',
        data: baseStaffData,
        terminatedAt: new Date('2024-06-01'),
        terminatedBy: 'admin',
      }

      // Act
      const result = isActiveStaff(terminatedStaff)

      // Assert
      expect(result).toBe(false)
    })
  })

  describe('isInactiveStaff', () => {
    it('should return true for inactive staff', () => {
      // Arrange
      const inactiveStaff: Staff = {
        type: 'inactive',
        data: baseStaffData,
        inactivatedAt: new Date('2024-06-01'),
      }

      // Act
      const result = isInactiveStaff(inactiveStaff)

      // Assert
      expect(result).toBe(true)
    })

    it('should return false for active staff', () => {
      // Arrange
      const activeStaff: Staff = {
        type: 'active',
        data: baseStaffData,
      }

      // Act
      const result = isInactiveStaff(activeStaff)

      // Assert
      expect(result).toBe(false)
    })

    it('should return false for terminated staff', () => {
      // Arrange
      const terminatedStaff: Staff = {
        type: 'terminated',
        data: baseStaffData,
        terminatedAt: new Date('2024-06-01'),
        terminatedBy: 'admin',
      }

      // Act
      const result = isInactiveStaff(terminatedStaff)

      // Assert
      expect(result).toBe(false)
    })
  })

  describe('isTerminatedStaff', () => {
    it('should return true for terminated staff', () => {
      // Arrange
      const terminatedStaff: Staff = {
        type: 'terminated',
        data: baseStaffData,
        terminatedAt: new Date('2024-06-01'),
        terminatedBy: 'admin',
      }

      // Act
      const result = isTerminatedStaff(terminatedStaff)

      // Assert
      expect(result).toBe(true)
    })

    it('should return false for active staff', () => {
      // Arrange
      const activeStaff: Staff = {
        type: 'active',
        data: baseStaffData,
      }

      // Act
      const result = isTerminatedStaff(activeStaff)

      // Assert
      expect(result).toBe(false)
    })

    it('should return false for inactive staff', () => {
      // Arrange
      const inactiveStaff: Staff = {
        type: 'inactive',
        data: baseStaffData,
        inactivatedAt: new Date('2024-06-01'),
      }

      // Act
      const result = isTerminatedStaff(inactiveStaff)

      // Assert
      expect(result).toBe(false)
    })
  })

  describe('canProvideService', () => {
    it('should return true for active staff', () => {
      // Arrange
      const activeStaff: Staff = {
        type: 'active',
        data: baseStaffData,
      }

      // Act
      const result = canProvideService(activeStaff)

      // Assert
      expect(result).toBe(true)
    })

    it('should return false for inactive staff', () => {
      // Arrange
      const inactiveStaff: Staff = {
        type: 'inactive',
        data: baseStaffData,
        inactivatedAt: new Date('2024-06-01'),
      }

      // Act
      const result = canProvideService(inactiveStaff)

      // Assert
      expect(result).toBe(false)
    })

    it('should return false for terminated staff', () => {
      // Arrange
      const terminatedStaff: Staff = {
        type: 'terminated',
        data: baseStaffData,
        terminatedAt: new Date('2024-06-01'),
        terminatedBy: 'admin',
      }

      // Act
      const result = canProvideService(terminatedStaff)

      // Assert
      expect(result).toBe(false)
    })
  })
})

describe('Staff Sum型のパターンマッチング', () => {
  const baseStaffData = {
    id: createTestStaffId('550e8400-e29b-41d4-a716-446655440000'),
    salonId: createTestSalonId('660e8400-e29b-41d4-a716-446655440001'),
    name: '山田太郎',
    contactInfo: {
      email: 'yamada@example.com',
      phoneNumber: '080-1234-5678',
    },
    specialties: ['カット', 'カラー'],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  }

  it('should handle all staff states with pattern matching', () => {
    // Arrange
    const staffStates: Staff[] = [
      {
        type: 'active',
        data: baseStaffData,
      },
      {
        type: 'inactive',
        data: baseStaffData,
        inactivatedAt: new Date('2024-06-01'),
        inactivatedReason: '休職',
      },
      {
        type: 'terminated',
        data: baseStaffData,
        terminatedAt: new Date('2024-06-01'),
        terminatedBy: 'admin',
        terminatedReason: '退職',
      },
    ]

    // Act & Assert
    for (const staff of staffStates) {
      const status = match(staff)
        .with({ type: 'active' }, () => 'アクティブ')
        .with({ type: 'inactive' }, ({ inactivatedReason }) =>
          inactivatedReason ? `休職中: ${inactivatedReason}` : '休職中'
        )
        .with({ type: 'terminated' }, ({ terminatedReason }) =>
          terminatedReason ? `退職: ${terminatedReason}` : '退職'
        )
        .exhaustive()

      // Assert
      expect(status).toBeDefined()
      expect(typeof status).toBe('string')
    }
  })
})
