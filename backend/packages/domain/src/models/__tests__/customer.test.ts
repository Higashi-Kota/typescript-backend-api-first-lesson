/**
 * Customer ドメインモデルの単体テスト
 * CLAUDE.mdのテスト要件に徹底準拠
 */

import { match } from 'ts-pattern'
import { describe, expect, it } from 'vitest'
import {
  type CreateCustomerInput,
  type Customer,
  type CustomerError,
  type MembershipLevel,
  type UpdateCustomerInput,
  addLoyaltyPoints,
  calculateMembershipLevel,
  canMakeReservation,
  createCustomer,
  createCustomerId,
  createCustomerIdSafe,
  deleteCustomer,
  getCustomerDisplayName,
  reactivateCustomer,
  suspendCustomer,
  updateCustomer,
  validateEmail,
  validateName,
  validatePhoneNumber,
} from '../customer.js'

describe('Customer ID作成関数', () => {
  describe('createCustomerId', () => {
    it('should create a valid CustomerId', () => {
      // Arrange
      const validUuid = '550e8400-e29b-41d4-a716-446655440000'

      // Act
      const customerId = createCustomerId(validUuid)

      // Assert
      expect(customerId).toBe(validUuid)
      expect(typeof customerId).toBe('string')
    })
  })

  describe('createCustomerIdSafe', () => {
    it('should create CustomerId for valid UUID', () => {
      // Arrange
      const validUuid = '550e8400-e29b-41d4-a716-446655440000'

      // Act
      const result = createCustomerIdSafe(validUuid)

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
      const result = createCustomerIdSafe(invalidUuid)

      // Assert
      expect(result).toEqual({
        type: 'err',
        error: {
          type: 'invalidFormat',
          value: invalidUuid,
          brand: 'CustomerId',
          message: `Invalid CustomerId format: ${invalidUuid}`,
        },
      })
    })

    it('should return error for empty string', () => {
      // Arrange
      const emptyString = ''

      // Act
      const result = createCustomerIdSafe(emptyString)

      // Assert
      expect(result).toEqual({
        type: 'err',
        error: {
          type: 'invalidFormat',
          value: emptyString,
          brand: 'CustomerId',
          message: `Invalid CustomerId format: ${emptyString}`,
        },
      })
    })

    it('should return error for malformed UUID', () => {
      // Arrange
      const malformedUuids = [
        '550e8400-e29b-41d4-a716',
        '550e8400-e29b-41d4-a716-446655440000-extra',
        'g50e8400-e29b-41d4-a716-446655440000',
        '550e8400e29b41d4a716446655440000',
      ]

      // Act & Assert
      for (const uuid of malformedUuids) {
        const result = createCustomerIdSafe(uuid)
        expect(result).toEqual({
          type: 'err',
          error: {
            type: 'invalidFormat',
            value: uuid,
            brand: 'CustomerId',
            message: `Invalid CustomerId format: ${uuid}`,
          },
        })
      }
    })
  })
})

describe('バリデーション関数', () => {
  describe('validateEmail', () => {
    it('should accept valid email addresses', () => {
      // Arrange
      const validEmails = [
        'user@example.com',
        'test.user@example.com',
        'user+tag@example.com',
        'user123@example.co.jp',
        'a@example.com',
        'user@subdomain.example.com',
      ]

      // Act & Assert
      for (const email of validEmails) {
        const result = validateEmail(email)
        expect(result).toEqual({
          type: 'ok',
          value: email,
        })
      }
    })

    it('should reject empty email', () => {
      // Arrange
      const emptyEmail = ''

      // Act
      const result = validateEmail(emptyEmail)

      // Assert
      expect(result).toEqual({
        type: 'err',
        error: { type: 'invalidEmail', email: emptyEmail },
      })
    })

    it('should reject email with consecutive dots', () => {
      // Arrange
      const emailWithConsecutiveDots = 'user..name@example.com'

      // Act
      const result = validateEmail(emailWithConsecutiveDots)

      // Assert
      expect(result).toEqual({
        type: 'err',
        error: { type: 'invalidEmail', email: emailWithConsecutiveDots },
      })
    })

    it('should reject email without @ symbol', () => {
      // Arrange
      const emailsWithoutAt = ['userexample.com', 'user.example.com']

      // Act & Assert
      for (const email of emailsWithoutAt) {
        const result = validateEmail(email)
        expect(result).toEqual({
          type: 'err',
          error: { type: 'invalidEmail', email },
        })
      }
    })

    it('should reject email with multiple @ symbols', () => {
      // Arrange
      const emailWithMultipleAt = 'user@@example.com'

      // Act
      const result = validateEmail(emailWithMultipleAt)

      // Assert
      expect(result).toEqual({
        type: 'err',
        error: { type: 'invalidEmail', email: emailWithMultipleAt },
      })
    })

    it('should reject email starting with special characters', () => {
      // Arrange
      const invalidStartEmails = [
        '.user@example.com',
        '@user@example.com',
        '%user@example.com',
      ]

      // Act & Assert
      for (const email of invalidStartEmails) {
        const result = validateEmail(email)
        expect(result).toEqual({
          type: 'err',
          error: { type: 'invalidEmail', email },
        })
      }
    })

    it('should reject email with invalid domain', () => {
      // Arrange
      const invalidDomainEmails = [
        'user@',
        'user@.com',
        'user@example.',
        'user@example',
        'user@-example.com',
      ]

      // Act & Assert
      for (const email of invalidDomainEmails) {
        const result = validateEmail(email)
        expect(result).toEqual({
          type: 'err',
          error: { type: 'invalidEmail', email },
        })
      }
    })
  })

  describe('validatePhoneNumber', () => {
    it('should accept valid phone numbers', () => {
      // Arrange
      const validPhoneNumbers = [
        '03-1234-5678',
        '090-1234-5678',
        '+81-90-1234-5678',
        '0312345678',
        '(03) 1234-5678',
        '03 1234 5678',
      ]

      // Act & Assert
      for (const phoneNumber of validPhoneNumbers) {
        const result = validatePhoneNumber(phoneNumber)
        expect(result).toEqual({
          type: 'ok',
          value: phoneNumber,
        })
      }
    })

    it('should reject phone numbers shorter than 10 characters', () => {
      // Arrange
      const shortPhoneNumbers = ['123', '12345678', '123-456']

      // Act & Assert
      for (const phoneNumber of shortPhoneNumbers) {
        const result = validatePhoneNumber(phoneNumber)
        expect(result).toEqual({
          type: 'err',
          error: { type: 'invalidPhoneNumber', phoneNumber },
        })
      }
    })

    it('should reject phone numbers with invalid characters', () => {
      // Arrange
      const invalidPhoneNumbers = [
        'abc-1234-5678',
        '03-1234-567a',
        '03@1234-5678',
        '03#1234$5678',
      ]

      // Act & Assert
      for (const phoneNumber of invalidPhoneNumbers) {
        const result = validatePhoneNumber(phoneNumber)
        expect(result).toEqual({
          type: 'err',
          error: { type: 'invalidPhoneNumber', phoneNumber },
        })
      }
    })
  })

  describe('validateName', () => {
    it('should accept valid names', () => {
      // Arrange
      const validNames = ['山田太郎', 'John Doe', 'Jean-Pierre', "O'Neill", 'A']

      // Act & Assert
      for (const name of validNames) {
        const result = validateName(name)
        expect(result).toEqual({
          type: 'ok',
          value: name.trim(),
        })
      }
    })

    it('should trim whitespace from names', () => {
      // Arrange
      const nameWithWhitespace = '  山田太郎  '

      // Act
      const result = validateName(nameWithWhitespace)

      // Assert
      expect(result).toEqual({
        type: 'ok',
        value: '山田太郎',
      })
    })

    it('should reject empty names', () => {
      // Arrange
      const emptyName = ''

      // Act
      const result = validateName(emptyName)

      // Assert
      expect(result).toEqual({
        type: 'err',
        error: { type: 'invalidName', name: emptyName },
      })
    })

    it('should reject names with only whitespace', () => {
      // Arrange
      const whitespaceOnlyNames = [' ', '   ', '\t', '\n']

      // Act & Assert
      for (const name of whitespaceOnlyNames) {
        const result = validateName(name)
        expect(result).toEqual({
          type: 'err',
          error: { type: 'invalidName', name },
        })
      }
    })
  })
})

describe('ドメインロジック', () => {
  describe('createCustomer', () => {
    it('should create active customer with valid input', () => {
      // Arrange
      const customerId = createCustomerId(
        '550e8400-e29b-41d4-a716-446655440000'
      )
      const input: CreateCustomerInput = {
        name: '山田太郎',
        contactInfo: {
          email: 'yamada@example.com',
          phoneNumber: '090-1234-5678',
        },
        preferences: '午前中の予約を希望',
        notes: 'VIP顧客',
        tags: ['VIP', '常連'],
        birthDate: new Date('1990-01-01'),
      }
      const beforeCreate = new Date()

      // Act
      const result = createCustomer(customerId, input)

      // Assert
      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        const customer = result.value
        expect(customer.type).toBe('active')
        expect(customer.data.id).toBe(customerId)
        expect(customer.data.name).toBe('山田太郎')
        expect(customer.data.contactInfo).toEqual({
          email: 'yamada@example.com',
          phoneNumber: '090-1234-5678',
        })
        expect(customer.data.preferences).toBe('午前中の予約を希望')
        expect(customer.data.notes).toBe('VIP顧客')
        expect(customer.data.tags).toEqual(['VIP', '常連'])
        expect(customer.data.birthDate).toEqual(new Date('1990-01-01'))
        expect(customer.data.loyaltyPoints).toBe(0)
        expect(customer.data.membershipLevel).toBe('regular')
        expect(customer.data.createdAt.getTime()).toBeGreaterThanOrEqual(
          beforeCreate.getTime()
        )
        expect(customer.data.updatedAt).toEqual(customer.data.createdAt)
      }
    })

    it('should create customer with minimal input', () => {
      // Arrange
      const customerId = createCustomerId(
        '550e8400-e29b-41d4-a716-446655440000'
      )
      const input: CreateCustomerInput = {
        name: '鈴木花子',
        contactInfo: {
          email: 'suzuki@example.com',
          phoneNumber: '03-1234-5678',
        },
      }

      // Act
      const result = createCustomer(customerId, input)

      // Assert
      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        const customer = result.value
        expect(customer.data.preferences).toBeNull()
        expect(customer.data.notes).toBeNull()
        expect(customer.data.tags).toEqual([])
        expect(customer.data.birthDate).toBeNull()
      }
    })

    it('should return error for invalid name', () => {
      // Arrange
      const customerId = createCustomerId(
        '550e8400-e29b-41d4-a716-446655440000'
      )
      const input: CreateCustomerInput = {
        name: '',
        contactInfo: {
          email: 'test@example.com',
          phoneNumber: '090-1234-5678',
        },
      }

      // Act
      const result = createCustomer(customerId, input)

      // Assert
      expect(result).toEqual({
        type: 'err',
        error: { type: 'invalidName', name: '' },
      })
    })

    it('should return error for invalid email', () => {
      // Arrange
      const customerId = createCustomerId(
        '550e8400-e29b-41d4-a716-446655440000'
      )
      const input: CreateCustomerInput = {
        name: '山田太郎',
        contactInfo: {
          email: 'invalid-email',
          phoneNumber: '090-1234-5678',
        },
      }

      // Act
      const result = createCustomer(customerId, input)

      // Assert
      expect(result).toEqual({
        type: 'err',
        error: { type: 'invalidEmail', email: 'invalid-email' },
      })
    })

    it('should return error for invalid phone number', () => {
      // Arrange
      const customerId = createCustomerId(
        '550e8400-e29b-41d4-a716-446655440000'
      )
      const input: CreateCustomerInput = {
        name: '山田太郎',
        contactInfo: {
          email: 'yamada@example.com',
          phoneNumber: '123',
        },
      }

      // Act
      const result = createCustomer(customerId, input)

      // Assert
      expect(result).toEqual({
        type: 'err',
        error: { type: 'invalidPhoneNumber', phoneNumber: '123' },
      })
    })
  })

  describe('updateCustomer', () => {
    const createActiveCustomer = (): Customer => ({
      type: 'active',
      data: {
        id: createCustomerId('550e8400-e29b-41d4-a716-446655440000'),
        name: '山田太郎',
        contactInfo: {
          email: 'yamada@example.com',
          phoneNumber: '090-1234-5678',
        },
        preferences: '午前中希望',
        notes: 'VIP顧客',
        tags: ['VIP'],
        birthDate: new Date('1990-01-01'),
        loyaltyPoints: 500,
        membershipLevel: 'regular',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
    })

    it('should update customer name', () => {
      // Arrange
      const customer = createActiveCustomer()
      const input: UpdateCustomerInput = {
        name: '山田次郎',
      }
      const beforeUpdate = new Date()

      // Act
      const result = updateCustomer(customer, input)

      // Assert
      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        const updated = result.value
        expect(updated.type).toBe('active')
        expect(updated.data.name).toBe('山田次郎')
        expect(updated.data.contactInfo).toEqual(customer.data.contactInfo)
        expect(updated.data.updatedAt.getTime()).toBeGreaterThanOrEqual(
          beforeUpdate.getTime()
        )
      }
    })

    it('should update contact info partially', () => {
      // Arrange
      const customer = createActiveCustomer()
      const input: UpdateCustomerInput = {
        contactInfo: {
          email: 'newemail@example.com',
        },
      }

      // Act
      const result = updateCustomer(customer, input)

      // Assert
      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        const updated = result.value
        expect(updated.data.contactInfo.email).toBe('newemail@example.com')
        expect(updated.data.contactInfo.phoneNumber).toBe('090-1234-5678')
      }
    })

    it('should update nullable fields to null', () => {
      // Arrange
      const customer = createActiveCustomer()
      const input: UpdateCustomerInput = {
        preferences: null,
        notes: null,
        birthDate: null,
      }

      // Act
      const result = updateCustomer(customer, input)

      // Assert
      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        const updated = result.value
        expect(updated.data.preferences).toBeNull()
        expect(updated.data.notes).toBeNull()
        expect(updated.data.birthDate).toBeNull()
      }
    })

    it('should return error for suspended customer', () => {
      // Arrange
      const suspendedCustomer: Customer = {
        type: 'suspended',
        data: createActiveCustomer().data,
        reason: '支払い遅延',
        suspendedAt: new Date(),
      }
      const input: UpdateCustomerInput = {
        name: '新しい名前',
      }

      // Act
      const result = updateCustomer(suspendedCustomer, input)

      // Assert
      expect(result).toEqual({
        type: 'err',
        error: {
          type: 'customerSuspended',
          id: suspendedCustomer.data.id,
        },
      })
    })

    it('should return error for invalid email in update', () => {
      // Arrange
      const customer = createActiveCustomer()
      const input: UpdateCustomerInput = {
        contactInfo: {
          email: 'invalid@',
        },
      }

      // Act
      const result = updateCustomer(customer, input)

      // Assert
      expect(result).toEqual({
        type: 'err',
        error: { type: 'invalidEmail', email: 'invalid@' },
      })
    })

    it('should return error for invalid phone number in update', () => {
      // Arrange
      const customer = createActiveCustomer()
      const input: UpdateCustomerInput = {
        contactInfo: {
          phoneNumber: '123',
        },
      }

      // Act
      const result = updateCustomer(customer, input)

      // Assert
      expect(result).toEqual({
        type: 'err',
        error: { type: 'invalidPhoneNumber', phoneNumber: '123' },
      })
    })

    it('should return error for deleted customer', () => {
      // Arrange
      const deletedCustomer: Customer = {
        type: 'deleted',
        data: createActiveCustomer().data,
        deletedAt: new Date(),
      }
      const input: UpdateCustomerInput = {
        name: '新しい名前',
      }

      // Act
      const result = updateCustomer(deletedCustomer, input)

      // Assert
      expect(result).toEqual({
        type: 'err',
        error: {
          type: 'customerSuspended',
          id: deletedCustomer.data.id,
        },
      })
    })
  })

  describe('suspendCustomer', () => {
    it('should suspend active customer', () => {
      // Arrange
      const activeCustomer: Customer = {
        type: 'active',
        data: {
          id: createCustomerId('550e8400-e29b-41d4-a716-446655440000'),
          name: '山田太郎',
          contactInfo: {
            email: 'yamada@example.com',
            phoneNumber: '090-1234-5678',
          },
          preferences: null,
          notes: null,
          tags: [],
          birthDate: null,
          loyaltyPoints: 0,
          membershipLevel: 'regular',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
      }
      const reason = '利用規約違反'
      const beforeSuspend = new Date()

      // Act
      const result = suspendCustomer(activeCustomer, reason)

      // Assert
      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        const suspended = result.value
        expect(suspended.type).toBe('suspended')
        if (suspended.type === 'suspended') {
          expect(suspended.data).toEqual(activeCustomer.data)
          expect(suspended.reason).toBe('利用規約違反')
          expect(suspended.suspendedAt.getTime()).toBeGreaterThanOrEqual(
            beforeSuspend.getTime()
          )
        }
      }
    })

    it('should return already suspended customer unchanged', () => {
      // Arrange
      const suspendedCustomer: Customer = {
        type: 'suspended',
        data: {
          id: createCustomerId('550e8400-e29b-41d4-a716-446655440000'),
          name: '山田太郎',
          contactInfo: {
            email: 'yamada@example.com',
            phoneNumber: '090-1234-5678',
          },
          preferences: null,
          notes: null,
          tags: [],
          birthDate: null,
          loyaltyPoints: 0,
          membershipLevel: 'regular',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
        reason: '既存の理由',
        suspendedAt: new Date('2024-02-01'),
      }

      // Act
      const result = suspendCustomer(suspendedCustomer, '新しい理由')

      // Assert
      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        expect(result.value).toEqual(suspendedCustomer)
      }
    })

    it('should return deleted customer unchanged', () => {
      // Arrange
      const deletedCustomer: Customer = {
        type: 'deleted',
        data: {
          id: createCustomerId('550e8400-e29b-41d4-a716-446655440000'),
          name: '山田太郎',
          contactInfo: {
            email: 'yamada@example.com',
            phoneNumber: '090-1234-5678',
          },
          preferences: null,
          notes: null,
          tags: [],
          birthDate: null,
          loyaltyPoints: 0,
          membershipLevel: 'regular',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
        deletedAt: new Date('2024-03-01'),
      }

      // Act
      const result = suspendCustomer(deletedCustomer, '停止理由')

      // Assert
      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        expect(result.value).toEqual(deletedCustomer)
      }
    })
  })

  describe('reactivateCustomer', () => {
    it('should reactivate suspended customer', () => {
      // Arrange
      const suspendedCustomer: Customer = {
        type: 'suspended',
        data: {
          id: createCustomerId('550e8400-e29b-41d4-a716-446655440000'),
          name: '山田太郎',
          contactInfo: {
            email: 'yamada@example.com',
            phoneNumber: '090-1234-5678',
          },
          preferences: null,
          notes: null,
          tags: [],
          birthDate: null,
          loyaltyPoints: 0,
          membershipLevel: 'regular',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
        reason: '支払い遅延',
        suspendedAt: new Date('2024-02-01'),
      }
      const beforeReactivate = new Date()

      // Act
      const result = reactivateCustomer(suspendedCustomer)

      // Assert
      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        const reactivated = result.value
        expect(reactivated.type).toBe('active')
        if (reactivated.type === 'active') {
          expect(reactivated.data.id).toEqual(suspendedCustomer.data.id)
          expect(reactivated.data.name).toEqual(suspendedCustomer.data.name)
          expect(reactivated.data.updatedAt.getTime()).toBeGreaterThanOrEqual(
            beforeReactivate.getTime()
          )
        }
      }
    })

    it('should return active customer unchanged', () => {
      // Arrange
      const activeCustomer: Customer = {
        type: 'active',
        data: {
          id: createCustomerId('550e8400-e29b-41d4-a716-446655440000'),
          name: '山田太郎',
          contactInfo: {
            email: 'yamada@example.com',
            phoneNumber: '090-1234-5678',
          },
          preferences: null,
          notes: null,
          tags: [],
          birthDate: null,
          loyaltyPoints: 0,
          membershipLevel: 'regular',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
      }

      // Act
      const result = reactivateCustomer(activeCustomer)

      // Assert
      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        expect(result.value).toEqual(activeCustomer)
      }
    })

    it('should return deleted customer unchanged', () => {
      // Arrange
      const deletedCustomer: Customer = {
        type: 'deleted',
        data: {
          id: createCustomerId('550e8400-e29b-41d4-a716-446655440000'),
          name: '山田太郎',
          contactInfo: {
            email: 'yamada@example.com',
            phoneNumber: '090-1234-5678',
          },
          preferences: null,
          notes: null,
          tags: [],
          birthDate: null,
          loyaltyPoints: 0,
          membershipLevel: 'regular',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
        deletedAt: new Date('2024-03-01'),
      }

      // Act
      const result = reactivateCustomer(deletedCustomer)

      // Assert
      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        expect(result.value).toEqual(deletedCustomer)
      }
    })
  })

  describe('deleteCustomer', () => {
    it('should delete active customer', () => {
      // Arrange
      const activeCustomer: Customer = {
        type: 'active',
        data: {
          id: createCustomerId('550e8400-e29b-41d4-a716-446655440000'),
          name: '山田太郎',
          contactInfo: {
            email: 'yamada@example.com',
            phoneNumber: '090-1234-5678',
          },
          preferences: null,
          notes: null,
          tags: [],
          birthDate: null,
          loyaltyPoints: 0,
          membershipLevel: 'regular',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
      }
      const beforeDelete = new Date()

      // Act
      const result = deleteCustomer(activeCustomer)

      // Assert
      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        const deleted = result.value
        expect(deleted.type).toBe('deleted')
        if (deleted.type === 'deleted') {
          expect(deleted.data).toEqual(activeCustomer.data)
          expect(deleted.deletedAt.getTime()).toBeGreaterThanOrEqual(
            beforeDelete.getTime()
          )
        }
      }
    })

    it('should delete suspended customer', () => {
      // Arrange
      const suspendedCustomer: Customer = {
        type: 'suspended',
        data: {
          id: createCustomerId('550e8400-e29b-41d4-a716-446655440000'),
          name: '山田太郎',
          contactInfo: {
            email: 'yamada@example.com',
            phoneNumber: '090-1234-5678',
          },
          preferences: null,
          notes: null,
          tags: [],
          birthDate: null,
          loyaltyPoints: 0,
          membershipLevel: 'regular',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
        reason: '支払い遅延',
        suspendedAt: new Date('2024-02-01'),
      }
      const beforeDelete = new Date()

      // Act
      const result = deleteCustomer(suspendedCustomer)

      // Assert
      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        const deleted = result.value
        expect(deleted.type).toBe('deleted')
        if (deleted.type === 'deleted') {
          expect(deleted.data).toEqual(suspendedCustomer.data)
          expect(deleted.deletedAt.getTime()).toBeGreaterThanOrEqual(
            beforeDelete.getTime()
          )
        }
      }
    })

    it('should return already deleted customer unchanged', () => {
      // Arrange
      const deletedCustomer: Customer = {
        type: 'deleted',
        data: {
          id: createCustomerId('550e8400-e29b-41d4-a716-446655440000'),
          name: '山田太郎',
          contactInfo: {
            email: 'yamada@example.com',
            phoneNumber: '090-1234-5678',
          },
          preferences: null,
          notes: null,
          tags: [],
          birthDate: null,
          loyaltyPoints: 0,
          membershipLevel: 'regular',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
        deletedAt: new Date('2024-03-01'),
      }

      // Act
      const result = deleteCustomer(deletedCustomer)

      // Assert
      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        expect(result.value).toEqual(deletedCustomer)
      }
    })
  })

  describe('addLoyaltyPoints', () => {
    it('should add points to active customer', () => {
      // Arrange
      const activeCustomer: Customer = {
        type: 'active',
        data: {
          id: createCustomerId('550e8400-e29b-41d4-a716-446655440000'),
          name: '山田太郎',
          contactInfo: {
            email: 'yamada@example.com',
            phoneNumber: '090-1234-5678',
          },
          preferences: null,
          notes: null,
          tags: [],
          birthDate: null,
          loyaltyPoints: 500,
          membershipLevel: 'regular',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
      }
      const pointsToAdd = 600
      const beforeAdd = new Date()

      // Act
      const result = addLoyaltyPoints(activeCustomer, pointsToAdd)

      // Assert
      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        const updated = result.value
        expect(updated.type).toBe('active')
        if (updated.type === 'active') {
          expect(updated.data.loyaltyPoints).toBe(1100)
          expect(updated.data.membershipLevel).toBe('silver')
          expect(updated.data.updatedAt.getTime()).toBeGreaterThanOrEqual(
            beforeAdd.getTime()
          )
        }
      }
    })

    it('should upgrade membership level when reaching thresholds', () => {
      // Arrange
      const testCases: Array<{
        initialPoints: number
        addPoints: number
        expectedLevel: MembershipLevel
      }> = [
        { initialPoints: 0, addPoints: 999, expectedLevel: 'regular' },
        { initialPoints: 0, addPoints: 1000, expectedLevel: 'silver' },
        { initialPoints: 2000, addPoints: 3000, expectedLevel: 'gold' },
        { initialPoints: 5000, addPoints: 5000, expectedLevel: 'platinum' },
      ]

      for (const { initialPoints, addPoints, expectedLevel } of testCases) {
        const customer: Customer = {
          type: 'active',
          data: {
            id: createCustomerId('550e8400-e29b-41d4-a716-446655440000'),
            name: '山田太郎',
            contactInfo: {
              email: 'yamada@example.com',
              phoneNumber: '090-1234-5678',
            },
            preferences: null,
            notes: null,
            tags: [],
            birthDate: null,
            loyaltyPoints: initialPoints,
            membershipLevel: 'regular',
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-01'),
          },
        }

        // Act
        const result = addLoyaltyPoints(customer, addPoints)

        // Assert
        expect(result.type).toBe('ok')
        if (result.type === 'ok' && result.value.type === 'active') {
          expect(result.value.data.loyaltyPoints).toBe(
            initialPoints + addPoints
          )
          expect(result.value.data.membershipLevel).toBe(expectedLevel)
        }
      }
    })

    it('should return error for suspended customer', () => {
      // Arrange
      const suspendedCustomer: Customer = {
        type: 'suspended',
        data: {
          id: createCustomerId('550e8400-e29b-41d4-a716-446655440000'),
          name: '山田太郎',
          contactInfo: {
            email: 'yamada@example.com',
            phoneNumber: '090-1234-5678',
          },
          preferences: null,
          notes: null,
          tags: [],
          birthDate: null,
          loyaltyPoints: 0,
          membershipLevel: 'regular',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
        reason: '支払い遅延',
        suspendedAt: new Date('2024-02-01'),
      }

      // Act
      const result = addLoyaltyPoints(suspendedCustomer, 100)

      // Assert
      expect(result).toEqual({
        type: 'err',
        error: {
          type: 'customerSuspended',
          id: suspendedCustomer.data.id,
        },
      })
    })

    it('should return error for deleted customer', () => {
      // Arrange
      const deletedCustomer: Customer = {
        type: 'deleted',
        data: {
          id: createCustomerId('550e8400-e29b-41d4-a716-446655440000'),
          name: '山田太郎',
          contactInfo: {
            email: 'yamada@example.com',
            phoneNumber: '090-1234-5678',
          },
          preferences: null,
          notes: null,
          tags: [],
          birthDate: null,
          loyaltyPoints: 0,
          membershipLevel: 'regular',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
        deletedAt: new Date('2024-03-01'),
      }

      // Act
      const result = addLoyaltyPoints(deletedCustomer, 100)

      // Assert
      expect(result).toEqual({
        type: 'err',
        error: {
          type: 'customerSuspended',
          id: deletedCustomer.data.id,
        },
      })
    })

    it('should handle negative points addition', () => {
      // Arrange
      const activeCustomer: Customer = {
        type: 'active',
        data: {
          id: createCustomerId('550e8400-e29b-41d4-a716-446655440000'),
          name: '山田太郎',
          contactInfo: {
            email: 'yamada@example.com',
            phoneNumber: '090-1234-5678',
          },
          preferences: null,
          notes: null,
          tags: [],
          birthDate: null,
          loyaltyPoints: 6000,
          membershipLevel: 'gold',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
      }

      // Act
      const result = addLoyaltyPoints(activeCustomer, -2000)

      // Assert
      expect(result.type).toBe('ok')
      if (result.type === 'ok' && result.value.type === 'active') {
        expect(result.value.data.loyaltyPoints).toBe(4000)
        expect(result.value.data.membershipLevel).toBe('silver')
      }
    })
  })

  describe('calculateMembershipLevel', () => {
    it('should calculate correct membership levels', () => {
      // Arrange
      const testCases: Array<{
        points: number
        expectedLevel: MembershipLevel
      }> = [
        { points: 0, expectedLevel: 'regular' },
        { points: 999, expectedLevel: 'regular' },
        { points: 1000, expectedLevel: 'silver' },
        { points: 4999, expectedLevel: 'silver' },
        { points: 5000, expectedLevel: 'gold' },
        { points: 9999, expectedLevel: 'gold' },
        { points: 10000, expectedLevel: 'platinum' },
        { points: 50000, expectedLevel: 'platinum' },
      ]

      // Act & Assert
      for (const { points, expectedLevel } of testCases) {
        const level = calculateMembershipLevel(points)
        expect(level).toBe(expectedLevel)
      }
    })

    it('should handle negative points as regular', () => {
      // Arrange
      const negativePoints = -100

      // Act
      const level = calculateMembershipLevel(negativePoints)

      // Assert
      expect(level).toBe('regular')
    })
  })

  describe('canMakeReservation', () => {
    it('should return true for active customer', () => {
      // Arrange
      const activeCustomer: Customer = {
        type: 'active',
        data: {
          id: createCustomerId('550e8400-e29b-41d4-a716-446655440000'),
          name: '山田太郎',
          contactInfo: {
            email: 'yamada@example.com',
            phoneNumber: '090-1234-5678',
          },
          preferences: null,
          notes: null,
          tags: [],
          birthDate: null,
          loyaltyPoints: 0,
          membershipLevel: 'regular',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
      }

      // Act
      const canReserve = canMakeReservation(activeCustomer)

      // Assert
      expect(canReserve).toBe(true)
    })

    it('should return false for suspended customer', () => {
      // Arrange
      const suspendedCustomer: Customer = {
        type: 'suspended',
        data: {
          id: createCustomerId('550e8400-e29b-41d4-a716-446655440000'),
          name: '山田太郎',
          contactInfo: {
            email: 'yamada@example.com',
            phoneNumber: '090-1234-5678',
          },
          preferences: null,
          notes: null,
          tags: [],
          birthDate: null,
          loyaltyPoints: 0,
          membershipLevel: 'regular',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
        reason: '支払い遅延',
        suspendedAt: new Date('2024-02-01'),
      }

      // Act
      const canReserve = canMakeReservation(suspendedCustomer)

      // Assert
      expect(canReserve).toBe(false)
    })

    it('should return false for deleted customer', () => {
      // Arrange
      const deletedCustomer: Customer = {
        type: 'deleted',
        data: {
          id: createCustomerId('550e8400-e29b-41d4-a716-446655440000'),
          name: '山田太郎',
          contactInfo: {
            email: 'yamada@example.com',
            phoneNumber: '090-1234-5678',
          },
          preferences: null,
          notes: null,
          tags: [],
          birthDate: null,
          loyaltyPoints: 0,
          membershipLevel: 'regular',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
        deletedAt: new Date('2024-03-01'),
      }

      // Act
      const canReserve = canMakeReservation(deletedCustomer)

      // Assert
      expect(canReserve).toBe(false)
    })
  })

  describe('getCustomerDisplayName', () => {
    it('should return name for active customer', () => {
      // Arrange
      const activeCustomer: Customer = {
        type: 'active',
        data: {
          id: createCustomerId('550e8400-e29b-41d4-a716-446655440000'),
          name: '山田太郎',
          contactInfo: {
            email: 'yamada@example.com',
            phoneNumber: '090-1234-5678',
          },
          preferences: null,
          notes: null,
          tags: [],
          birthDate: null,
          loyaltyPoints: 0,
          membershipLevel: 'regular',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
      }

      // Act
      const displayName = getCustomerDisplayName(activeCustomer)

      // Assert
      expect(displayName).toBe('山田太郎')
    })

    it('should return name with status for suspended customer', () => {
      // Arrange
      const suspendedCustomer: Customer = {
        type: 'suspended',
        data: {
          id: createCustomerId('550e8400-e29b-41d4-a716-446655440000'),
          name: '山田太郎',
          contactInfo: {
            email: 'yamada@example.com',
            phoneNumber: '090-1234-5678',
          },
          preferences: null,
          notes: null,
          tags: [],
          birthDate: null,
          loyaltyPoints: 0,
          membershipLevel: 'regular',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
        reason: '支払い遅延',
        suspendedAt: new Date('2024-02-01'),
      }

      // Act
      const displayName = getCustomerDisplayName(suspendedCustomer)

      // Assert
      expect(displayName).toBe('山田太郎 (停止中)')
    })

    it('should return name with status for deleted customer', () => {
      // Arrange
      const deletedCustomer: Customer = {
        type: 'deleted',
        data: {
          id: createCustomerId('550e8400-e29b-41d4-a716-446655440000'),
          name: '山田太郎',
          contactInfo: {
            email: 'yamada@example.com',
            phoneNumber: '090-1234-5678',
          },
          preferences: null,
          notes: null,
          tags: [],
          birthDate: null,
          loyaltyPoints: 0,
          membershipLevel: 'regular',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
        deletedAt: new Date('2024-03-01'),
      }

      // Act
      const displayName = getCustomerDisplayName(deletedCustomer)

      // Assert
      expect(displayName).toBe('山田太郎 (削除済み)')
    })
  })
})

describe('Sum型のパターンマッチング網羅性', () => {
  it('should handle all customer states with pattern matching', () => {
    // Arrange
    const customers: Customer[] = [
      {
        type: 'active',
        data: {
          id: createCustomerId('550e8400-e29b-41d4-a716-446655440001'),
          name: 'アクティブ顧客',
          contactInfo: {
            email: 'active@example.com',
            phoneNumber: '090-1111-1111',
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
      },
      {
        type: 'suspended',
        data: {
          id: createCustomerId('550e8400-e29b-41d4-a716-446655440002'),
          name: '停止中顧客',
          contactInfo: {
            email: 'suspended@example.com',
            phoneNumber: '090-2222-2222',
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
        reason: '支払い遅延',
        suspendedAt: new Date(),
      },
      {
        type: 'deleted',
        data: {
          id: createCustomerId('550e8400-e29b-41d4-a716-446655440003'),
          name: '削除済み顧客',
          contactInfo: {
            email: 'deleted@example.com',
            phoneNumber: '090-3333-3333',
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
        deletedAt: new Date(),
      },
    ]

    // Act & Assert
    for (const customer of customers) {
      const status = match(customer)
        .with({ type: 'active' }, () => 'アクティブ')
        .with({ type: 'suspended' }, () => '停止中')
        .with({ type: 'deleted' }, () => '削除済み')
        .exhaustive()

      expect(status).toBeDefined()
      expect(['アクティブ', '停止中', '削除済み']).toContain(status)
    }
  })

  it('should handle all membership levels with pattern matching', () => {
    // Arrange
    const membershipLevels: MembershipLevel[] = [
      'regular',
      'silver',
      'gold',
      'platinum',
    ]

    // Act & Assert
    for (const level of membershipLevels) {
      const benefit = match(level)
        .with('regular', () => '基本特典')
        .with('silver', () => 'シルバー特典')
        .with('gold', () => 'ゴールド特典')
        .with('platinum', () => 'プラチナ特典')
        .exhaustive()

      expect(benefit).toBeDefined()
      expect([
        '基本特典',
        'シルバー特典',
        'ゴールド特典',
        'プラチナ特典',
      ]).toContain(benefit)
    }
  })

  it('should handle all customer error types with pattern matching', () => {
    // Arrange
    const errors: CustomerError[] = [
      { type: 'invalidEmail', email: 'bad-email' },
      { type: 'invalidPhoneNumber', phoneNumber: '123' },
      { type: 'duplicateEmail', email: 'duplicate@example.com' },
      {
        type: 'customerNotFound',
        id: createCustomerId('550e8400-e29b-41d4-a716-446655440000'),
      },
      {
        type: 'customerSuspended',
        id: createCustomerId('550e8400-e29b-41d4-a716-446655440000'),
      },
      { type: 'invalidName', name: '' },
    ]

    // Act & Assert
    for (const error of errors) {
      const message = match(error)
        .with(
          { type: 'invalidEmail' },
          ({ email }) => `無効なメールアドレス: ${email}`
        )
        .with(
          { type: 'invalidPhoneNumber' },
          ({ phoneNumber }) => `無効な電話番号: ${phoneNumber}`
        )
        .with(
          { type: 'duplicateEmail' },
          ({ email }) => `重複したメールアドレス: ${email}`
        )
        .with(
          { type: 'customerNotFound' },
          ({ id }) => `顧客が見つかりません: ${id}`
        )
        .with(
          { type: 'customerSuspended' },
          ({ id }) => `顧客は停止中です: ${id}`
        )
        .with({ type: 'invalidName' }, ({ name }) => `無効な名前: ${name}`)
        .exhaustive()

      expect(message).toBeDefined()
      expect(typeof message).toBe('string')
    }
  })
})
