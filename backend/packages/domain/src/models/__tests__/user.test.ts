import { describe, expect, it } from 'vitest'
import {
  generateBackupCodes,
  getAccountLockDuration,
  getEmailVerificationTokenExpiry,
  getPasswordResetTokenExpiry,
  isAccountLocked,
  isEmailVerified,
  isPasswordReused,
  isTwoFactorEnabled,
  validateEmail,
  validatePassword,
} from '../user.js'
import type { User, UserAccountStatus, UserId } from '../user.js'

describe('User Model', () => {
  describe('validatePassword', () => {
    it('should reject password shorter than 12 characters', () => {
      const result = validatePassword('Short123!')

      expect(result.type).toBe('err')
      if (result.type === 'err') {
        expect(result.error.type).toBe('weakPassword')
        if (result.error.type === 'weakPassword') {
          expect(result.error.reason).toBe(
            'Password must be at least 12 characters long'
          )
        }
      }
    })

    it('should reject password without uppercase letter', () => {
      const result = validatePassword('longpassword123!')

      expect(result.type).toBe('err')
      if (result.type === 'err') {
        expect(result.error.type).toBe('weakPassword')
        if (result.error.type === 'weakPassword') {
          expect(result.error.reason).toBe(
            'Password must contain uppercase, lowercase, numbers, and special characters'
          )
        }
      }
    })

    it('should reject password without lowercase letter', () => {
      const result = validatePassword('LONGPASSWORD123!')

      expect(result.type).toBe('err')
      if (result.type === 'err') {
        expect(result.error.type).toBe('weakPassword')
        if (result.error.type === 'weakPassword') {
          expect(result.error.reason).toBe(
            'Password must contain uppercase, lowercase, numbers, and special characters'
          )
        }
      }
    })

    it('should reject password without numbers', () => {
      const result = validatePassword('LongPassword!')

      expect(result.type).toBe('err')
      if (result.type === 'err') {
        expect(result.error.type).toBe('weakPassword')
        if (result.error.type === 'weakPassword') {
          expect(result.error.reason).toBe(
            'Password must contain uppercase, lowercase, numbers, and special characters'
          )
        }
      }
    })

    it('should reject password without special characters', () => {
      const result = validatePassword('LongPassword123')

      expect(result.type).toBe('err')
      if (result.type === 'err') {
        expect(result.error.type).toBe('weakPassword')
        if (result.error.type === 'weakPassword') {
          expect(result.error.reason).toBe(
            'Password must contain uppercase, lowercase, numbers, and special characters'
          )
        }
      }
    })

    it('should accept valid password with all requirements', () => {
      const result = validatePassword('ValidPassword123!')

      expect(result.type).toBe('ok')
    })

    it('should accept password with exactly 12 characters', () => {
      const result = validatePassword('Valid1Pass!!')

      expect(result.type).toBe('ok')
    })

    it('should accept password with multiple special characters', () => {
      const result = validatePassword('Complex!@#Pass123')

      expect(result.type).toBe('ok')
    })
  })

  describe('validateEmail', () => {
    it('should reject email without @ symbol', () => {
      const invalidEmail = 'invalidemail.com'
      const result = validateEmail(invalidEmail)

      expect(result.type).toBe('err')
      if (result.type === 'err') {
        expect(result.error.type).toBe('invalidEmail')
        if (result.error.type === 'invalidEmail') {
          expect(result.error.email).toBe(invalidEmail)
        }
      }
    })

    it('should reject email without domain', () => {
      const invalidEmail = 'user@'
      const result = validateEmail(invalidEmail)

      expect(result.type).toBe('err')
      if (result.type === 'err') {
        expect(result.error.type).toBe('invalidEmail')
        if (result.error.type === 'invalidEmail') {
          expect(result.error.email).toBe(invalidEmail)
        }
      }
    })

    it('should reject email without local part', () => {
      const invalidEmail = '@example.com'
      const result = validateEmail(invalidEmail)

      expect(result.type).toBe('err')
      if (result.type === 'err') {
        expect(result.error.type).toBe('invalidEmail')
        if (result.error.type === 'invalidEmail') {
          expect(result.error.email).toBe(invalidEmail)
        }
      }
    })

    it('should reject email with spaces', () => {
      const invalidEmail = 'user name@example.com'
      const result = validateEmail(invalidEmail)

      expect(result.type).toBe('err')
      if (result.type === 'err') {
        expect(result.error.type).toBe('invalidEmail')
        if (result.error.type === 'invalidEmail') {
          expect(result.error.email).toBe(invalidEmail)
        }
      }
    })

    it('should accept valid email address', () => {
      const result = validateEmail('user@example.com')

      expect(result.type).toBe('ok')
    })

    it('should accept email with subdomain', () => {
      const result = validateEmail('user@mail.example.com')

      expect(result.type).toBe('ok')
    })

    it('should accept email with numbers and dots', () => {
      const result = validateEmail('user.name123@example.com')

      expect(result.type).toBe('ok')
    })

    it('should accept email with plus sign', () => {
      const result = validateEmail('user+tag@example.com')

      expect(result.type).toBe('ok')
    })
  })

  describe('isPasswordReused', () => {
    const passwordHistory = ['hash1', 'hash2', 'hash3']

    it('should return true if password hash exists in history', () => {
      const result = isPasswordReused('hash2', passwordHistory)

      expect(result).toBe(true)
    })

    it('should return false if password hash does not exist in history', () => {
      const result = isPasswordReused('hash4', passwordHistory)

      expect(result).toBe(false)
    })

    it('should return false for empty password history', () => {
      const result = isPasswordReused('hash1', [])

      expect(result).toBe(false)
    })

    it('should check first password in history', () => {
      const result = isPasswordReused('hash1', passwordHistory)

      expect(result).toBe(true)
    })

    it('should check last password in history', () => {
      const result = isPasswordReused('hash3', passwordHistory)

      expect(result).toBe(true)
    })
  })

  describe('isAccountLocked', () => {
    it('should return true for locked account', () => {
      const lockedStatus: UserAccountStatus = {
        type: 'locked',
        reason: 'Too many failed login attempts',
        lockedAt: new Date(),
        failedAttempts: 5,
      }

      const result = isAccountLocked(lockedStatus)

      expect(result).toBe(true)
    })

    it('should return false for active account', () => {
      const activeStatus: UserAccountStatus = {
        type: 'active',
      }

      const result = isAccountLocked(activeStatus)

      expect(result).toBe(false)
    })

    it('should return false for unverified account', () => {
      const unverifiedStatus: UserAccountStatus = {
        type: 'unverified',
        emailVerificationToken: 'token123',
        tokenExpiry: new Date(Date.now() + 86400000),
      }

      const result = isAccountLocked(unverifiedStatus)

      expect(result).toBe(false)
    })

    it('should return false for suspended account', () => {
      const suspendedStatus: UserAccountStatus = {
        type: 'suspended',
        reason: 'Terms violation',
        suspendedAt: new Date(),
      }

      const result = isAccountLocked(suspendedStatus)

      expect(result).toBe(false)
    })

    it('should return false for deleted account', () => {
      const deletedStatus: UserAccountStatus = {
        type: 'deleted',
        deletedAt: new Date(),
      }

      const result = isAccountLocked(deletedStatus)

      expect(result).toBe(false)
    })
  })

  describe('isEmailVerified', () => {
    const createUser = (emailVerified: boolean): User => ({
      status: { type: 'active' },
      data: {
        id: 'user123' as UserId,
        email: 'user@example.com',
        name: 'Test User',
        passwordHash: 'hash',
        role: 'customer',
        emailVerified,
        twoFactorStatus: { type: 'disabled' },
        passwordResetStatus: { type: 'none' },
        passwordHistory: [],
        trustedIpAddresses: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    })

    it('should return true for verified email', () => {
      const user = createUser(true)

      const result = isEmailVerified(user)

      expect(result).toBe(true)
    })

    it('should return false for unverified email', () => {
      const user = createUser(false)

      const result = isEmailVerified(user)

      expect(result).toBe(false)
    })
  })

  describe('isTwoFactorEnabled', () => {
    const createUserWith2FA = (
      twoFactorStatus: User['data']['twoFactorStatus']
    ): User => ({
      status: { type: 'active' },
      data: {
        id: 'user123' as UserId,
        email: 'user@example.com',
        name: 'Test User',
        passwordHash: 'hash',
        role: 'customer',
        emailVerified: true,
        twoFactorStatus,
        passwordResetStatus: { type: 'none' },
        passwordHistory: [],
        trustedIpAddresses: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    })

    it('should return true for enabled 2FA', () => {
      const user = createUserWith2FA({
        type: 'enabled',
        secret: 'secret123',
        backupCodes: ['code1', 'code2'],
      })

      const result = isTwoFactorEnabled(user)

      expect(result).toBe(true)
    })

    it('should return false for disabled 2FA', () => {
      const user = createUserWith2FA({
        type: 'disabled',
      })

      const result = isTwoFactorEnabled(user)

      expect(result).toBe(false)
    })

    it('should return false for pending 2FA', () => {
      const user = createUserWith2FA({
        type: 'pending',
        secret: 'secret123',
        qrCodeUrl: 'https://example.com/qr',
      })

      const result = isTwoFactorEnabled(user)

      expect(result).toBe(false)
    })
  })

  describe('Time duration functions', () => {
    it('should return 30 minutes for account lock duration', () => {
      const duration = getAccountLockDuration()

      expect(duration).toBe(30 * 60 * 1000)
    })

    it('should return 15 minutes for password reset token expiry', () => {
      const duration = getPasswordResetTokenExpiry()

      expect(duration).toBe(15 * 60 * 1000)
    })

    it('should return 24 hours for email verification token expiry', () => {
      const duration = getEmailVerificationTokenExpiry()

      expect(duration).toBe(24 * 60 * 60 * 1000)
    })
  })

  describe('generateBackupCodes', () => {
    it('should generate 8 backup codes by default', () => {
      const codes = generateBackupCodes()

      expect(codes).toHaveLength(8)
    })

    it('should generate specified number of backup codes', () => {
      const codes = generateBackupCodes(5)

      expect(codes).toHaveLength(5)
    })

    it('should generate codes with 8 characters each', () => {
      const codes = generateBackupCodes()

      for (const code of codes) {
        expect(code).toHaveLength(8)
      }
    })

    it('should generate codes with only uppercase letters and numbers', () => {
      const codes = generateBackupCodes()
      const validChars = /^[A-Z0-9]+$/

      for (const code of codes) {
        expect(code).toMatch(validChars)
      }
    })

    it('should generate unique codes', () => {
      const codes = generateBackupCodes(10)
      const uniqueCodes = new Set(codes)

      expect(uniqueCodes.size).toBe(10)
    })

    it('should generate different codes on each call', () => {
      const codes1 = generateBackupCodes()
      const codes2 = generateBackupCodes()

      expect(codes1).not.toEqual(codes2)
    })
  })
})
