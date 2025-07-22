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
import type {
  PasswordResetStatus,
  TwoFactorStatus,
  User,
  UserAccountStatus,
  UserData,
  UserId,
} from '../user.js'

describe('User Model', () => {
  // Helper functions for creating test data
  const createTestUserData = (overrides?: Partial<UserData>): UserData => ({
    id: 'user123' as UserId,
    email: 'test@example.com',
    name: 'Test User',
    passwordHash: 'hashedPassword123',
    role: 'customer',
    emailVerified: true,
    twoFactorStatus: { type: 'disabled' },
    passwordResetStatus: { type: 'none' },
    passwordHistory: [],
    trustedIpAddresses: [],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  })

  const createTestUser = (
    status: UserAccountStatus,
    dataOverrides?: Partial<UserData>
  ): User => ({
    status,
    data: createTestUserData(dataOverrides),
  })

  describe('validatePassword - AAA Pattern Tests', () => {
    describe('Password Length Validation', () => {
      it('should reject password shorter than 12 characters', () => {
        // Arrange
        const shortPassword = 'Short123!'

        // Act
        const result = validatePassword(shortPassword)

        // Assert
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

      it('should reject empty password', () => {
        // Arrange
        const emptyPassword = ''

        // Act
        const result = validatePassword(emptyPassword)

        // Assert
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

      it('should reject password with exactly 11 characters', () => {
        // Arrange
        const password = 'Pass123!Abc' // 11 characters

        // Act
        const result = validatePassword(password)

        // Assert
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

      it('should accept password with exactly 12 characters', () => {
        // Arrange
        const password = 'Pass123!Abcd' // 12 characters

        // Act
        const result = validatePassword(password)

        // Assert
        expect(result.type).toBe('ok')
      })
    })

    describe('Character Type Requirements', () => {
      it('should reject password without uppercase letter', () => {
        // Arrange
        const password = 'longpassword123!'

        // Act
        const result = validatePassword(password)

        // Assert
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
        // Arrange
        const password = 'LONGPASSWORD123!'

        // Act
        const result = validatePassword(password)

        // Assert
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
        // Arrange
        const password = 'LongPassword!'

        // Act
        const result = validatePassword(password)

        // Assert
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
        // Arrange
        const password = 'LongPassword123'

        // Act
        const result = validatePassword(password)

        // Assert
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

      it('should reject password with only spaces', () => {
        // Arrange
        const password = '                    ' // 20 spaces

        // Act
        const result = validatePassword(password)

        // Assert
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

      it('should reject password with only special characters', () => {
        // Arrange
        const password = '!@#$%^&*()_+-='

        // Act
        const result = validatePassword(password)

        // Assert
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
    })

    describe('Valid Password Scenarios', () => {
      it('should accept valid password with all requirements', () => {
        // Arrange
        const password = 'ValidPassword123!'

        // Act
        const result = validatePassword(password)

        // Assert
        expect(result.type).toBe('ok')
      })

      it('should accept password with multiple special characters', () => {
        // Arrange
        const password = 'Complex!@#Pass123'

        // Act
        const result = validatePassword(password)

        // Assert
        expect(result.type).toBe('ok')
      })

      it('should accept very long password', () => {
        // Arrange
        const password = 'VeryLongPassword123!ThatMeetsAllRequirements'

        // Act
        const result = validatePassword(password)

        // Assert
        expect(result.type).toBe('ok')
      })

      it('should accept password with unicode special characters', () => {
        // Arrange
        const password = 'Password123€£¥'

        // Act
        const result = validatePassword(password)

        // Assert
        expect(result.type).toBe('ok')
      })
    })
  })

  describe('validateEmail - AAA Pattern Tests', () => {
    describe('Invalid Email Formats', () => {
      it('should reject email without @ symbol', () => {
        // Arrange
        const email = 'invalidemail.com'

        // Act
        const result = validateEmail(email)

        // Assert
        expect(result.type).toBe('err')
        if (result.type === 'err') {
          expect(result.error.type).toBe('invalidEmail')
          if (result.error.type === 'invalidEmail') {
            expect(result.error.email).toBe(email)
          }
        }
      })

      it('should reject email without domain', () => {
        // Arrange
        const email = 'user@'

        // Act
        const result = validateEmail(email)

        // Assert
        expect(result.type).toBe('err')
        if (result.type === 'err') {
          expect(result.error.type).toBe('invalidEmail')
          if (result.error.type === 'invalidEmail') {
            expect(result.error.email).toBe(email)
          }
        }
      })

      it('should reject email without local part', () => {
        // Arrange
        const email = '@example.com'

        // Act
        const result = validateEmail(email)

        // Assert
        expect(result.type).toBe('err')
        if (result.type === 'err') {
          expect(result.error.type).toBe('invalidEmail')
          if (result.error.type === 'invalidEmail') {
            expect(result.error.email).toBe(email)
          }
        }
      })

      it('should reject email with spaces', () => {
        // Arrange
        const email = 'user name@example.com'

        // Act
        const result = validateEmail(email)

        // Assert
        expect(result.type).toBe('err')
        if (result.type === 'err') {
          expect(result.error.type).toBe('invalidEmail')
          if (result.error.type === 'invalidEmail') {
            expect(result.error.email).toBe(email)
          }
        }
      })

      it('should reject empty email', () => {
        // Arrange
        const email = ''

        // Act
        const result = validateEmail(email)

        // Assert
        expect(result.type).toBe('err')
        if (result.type === 'err') {
          expect(result.error.type).toBe('invalidEmail')
          if (result.error.type === 'invalidEmail') {
            expect(result.error.email).toBe(email)
          }
        }
      })

      it('should reject email with multiple @ symbols', () => {
        // Arrange
        const email = 'user@@example.com'

        // Act
        const result = validateEmail(email)

        // Assert
        expect(result.type).toBe('err')
        if (result.type === 'err') {
          expect(result.error.type).toBe('invalidEmail')
          if (result.error.type === 'invalidEmail') {
            expect(result.error.email).toBe(email)
          }
        }
      })

      it('should reject email without TLD', () => {
        // Arrange
        const email = 'user@example'

        // Act
        const result = validateEmail(email)

        // Assert
        expect(result.type).toBe('err')
        if (result.type === 'err') {
          expect(result.error.type).toBe('invalidEmail')
          if (result.error.type === 'invalidEmail') {
            expect(result.error.email).toBe(email)
          }
        }
      })
    })

    describe('Valid Email Formats', () => {
      it('should accept valid email address', () => {
        // Arrange
        const email = 'user@example.com'

        // Act
        const result = validateEmail(email)

        // Assert
        expect(result.type).toBe('ok')
      })

      it('should accept email with subdomain', () => {
        // Arrange
        const email = 'user@mail.example.com'

        // Act
        const result = validateEmail(email)

        // Assert
        expect(result.type).toBe('ok')
      })

      it('should accept email with numbers and dots', () => {
        // Arrange
        const email = 'user.name123@example.com'

        // Act
        const result = validateEmail(email)

        // Assert
        expect(result.type).toBe('ok')
      })

      it('should accept email with plus sign', () => {
        // Arrange
        const email = 'user+tag@example.com'

        // Act
        const result = validateEmail(email)

        // Assert
        expect(result.type).toBe('ok')
      })

      it('should accept email with hyphen in domain', () => {
        // Arrange
        const email = 'user@my-domain.com'

        // Act
        const result = validateEmail(email)

        // Assert
        expect(result.type).toBe('ok')
      })
    })
  })

  describe('isPasswordReused - AAA Pattern Tests', () => {
    describe('Password History Checks', () => {
      it('should return true if password hash exists in history', () => {
        // Arrange
        const passwordHash = 'hash2'
        const passwordHistory = ['hash1', 'hash2', 'hash3']

        // Act
        const result = isPasswordReused(passwordHash, passwordHistory)

        // Assert
        expect(result).toBe(true)
      })

      it('should return false if password hash does not exist in history', () => {
        // Arrange
        const passwordHash = 'hash4'
        const passwordHistory = ['hash1', 'hash2', 'hash3']

        // Act
        const result = isPasswordReused(passwordHash, passwordHistory)

        // Assert
        expect(result).toBe(false)
      })

      it('should return false for empty password history', () => {
        // Arrange
        const passwordHash = 'hash1'
        const passwordHistory: string[] = []

        // Act
        const result = isPasswordReused(passwordHash, passwordHistory)

        // Assert
        expect(result).toBe(false)
      })

      it('should check first password in history', () => {
        // Arrange
        const passwordHash = 'hash1'
        const passwordHistory = ['hash1', 'hash2', 'hash3']

        // Act
        const result = isPasswordReused(passwordHash, passwordHistory)

        // Assert
        expect(result).toBe(true)
      })

      it('should check last password in history', () => {
        // Arrange
        const passwordHash = 'hash3'
        const passwordHistory = ['hash1', 'hash2', 'hash3']

        // Act
        const result = isPasswordReused(passwordHash, passwordHistory)

        // Assert
        expect(result).toBe(true)
      })

      it('should handle large password history', () => {
        // Arrange
        const passwordHash = 'hash50'
        const passwordHistory = Array.from(
          { length: 100 },
          (_, i) => `hash${i + 1}`
        )

        // Act
        const result = isPasswordReused(passwordHash, passwordHistory)

        // Assert
        expect(result).toBe(true)
      })

      it('should be case sensitive', () => {
        // Arrange
        const passwordHash = 'HASH1'
        const passwordHistory = ['hash1', 'hash2', 'hash3']

        // Act
        const result = isPasswordReused(passwordHash, passwordHistory)

        // Assert
        expect(result).toBe(false)
      })
    })
  })

  describe('isAccountLocked - AAA Pattern Tests', () => {
    describe('Account Status Checks', () => {
      it('should return true for locked account', () => {
        // Arrange
        const lockedStatus: UserAccountStatus = {
          type: 'locked',
          reason: 'Too many failed login attempts',
          lockedAt: new Date(),
          failedAttempts: 5,
        }

        // Act
        const result = isAccountLocked(lockedStatus)

        // Assert
        expect(result).toBe(true)
      })

      it('should return false for active account', () => {
        // Arrange
        const activeStatus: UserAccountStatus = {
          type: 'active',
        }

        // Act
        const result = isAccountLocked(activeStatus)

        // Assert
        expect(result).toBe(false)
      })

      it('should return false for unverified account', () => {
        // Arrange
        const unverifiedStatus: UserAccountStatus = {
          type: 'unverified',
          emailVerificationToken: 'token123',
          tokenExpiry: new Date(Date.now() + 86400000),
        }

        // Act
        const result = isAccountLocked(unverifiedStatus)

        // Assert
        expect(result).toBe(false)
      })

      it('should return false for suspended account', () => {
        // Arrange
        const suspendedStatus: UserAccountStatus = {
          type: 'suspended',
          reason: 'Terms violation',
          suspendedAt: new Date(),
        }

        // Act
        const result = isAccountLocked(suspendedStatus)

        // Assert
        expect(result).toBe(false)
      })

      it('should return false for deleted account', () => {
        // Arrange
        const deletedStatus: UserAccountStatus = {
          type: 'deleted',
          deletedAt: new Date(),
        }

        // Act
        const result = isAccountLocked(deletedStatus)

        // Assert
        expect(result).toBe(false)
      })

      it('should handle locked account with different reasons', () => {
        // Arrange
        const lockedStatuses: UserAccountStatus[] = [
          {
            type: 'locked',
            reason: 'Suspicious activity',
            lockedAt: new Date(),
            failedAttempts: 0,
          },
          {
            type: 'locked',
            reason: 'Admin action',
            lockedAt: new Date(),
            failedAttempts: 0,
          },
        ]

        // Act & Assert
        for (const status of lockedStatuses) {
          expect(isAccountLocked(status)).toBe(true)
        }
      })
    })
  })

  describe('isEmailVerified - AAA Pattern Tests', () => {
    describe('Email Verification Status', () => {
      it('should return true for verified email', () => {
        // Arrange
        const user = createTestUser({ type: 'active' }, { emailVerified: true })

        // Act
        const result = isEmailVerified(user)

        // Assert
        expect(result).toBe(true)
      })

      it('should return false for unverified email', () => {
        // Arrange
        const user = createTestUser(
          { type: 'active' },
          { emailVerified: false }
        )

        // Act
        const result = isEmailVerified(user)

        // Assert
        expect(result).toBe(false)
      })

      it('should check email verification regardless of account status', () => {
        // Arrange
        const testCases: Array<{
          status: UserAccountStatus
          emailVerified: boolean
        }> = [
          { status: { type: 'active' }, emailVerified: true },
          {
            status: {
              type: 'unverified',
              emailVerificationToken: 'token',
              tokenExpiry: new Date(),
            },
            emailVerified: false,
          },
          {
            status: {
              type: 'locked',
              reason: 'test',
              lockedAt: new Date(),
              failedAttempts: 5,
            },
            emailVerified: true,
          },
          {
            status: {
              type: 'suspended',
              reason: 'test',
              suspendedAt: new Date(),
            },
            emailVerified: false,
          },
        ]

        // Act & Assert
        for (const { status, emailVerified } of testCases) {
          const user = createTestUser(status, { emailVerified })
          expect(isEmailVerified(user)).toBe(emailVerified)
        }
      })
    })
  })

  describe('isTwoFactorEnabled - AAA Pattern Tests', () => {
    describe('Two-Factor Authentication Status', () => {
      it('should return true for enabled 2FA', () => {
        // Arrange
        const twoFactorStatus: TwoFactorStatus = {
          type: 'enabled',
          secret: 'secret123',
          backupCodes: ['code1', 'code2'],
        }
        const user = createTestUser({ type: 'active' }, { twoFactorStatus })

        // Act
        const result = isTwoFactorEnabled(user)

        // Assert
        expect(result).toBe(true)
      })

      it('should return false for disabled 2FA', () => {
        // Arrange
        const twoFactorStatus: TwoFactorStatus = {
          type: 'disabled',
        }
        const user = createTestUser({ type: 'active' }, { twoFactorStatus })

        // Act
        const result = isTwoFactorEnabled(user)

        // Assert
        expect(result).toBe(false)
      })

      it('should return false for pending 2FA', () => {
        // Arrange
        const twoFactorStatus: TwoFactorStatus = {
          type: 'pending',
          secret: 'secret123',
          qrCodeUrl: 'https://example.com/qr',
        }
        const user = createTestUser({ type: 'active' }, { twoFactorStatus })

        // Act
        const result = isTwoFactorEnabled(user)

        // Assert
        expect(result).toBe(false)
      })

      it('should handle enabled 2FA with empty backup codes', () => {
        // Arrange
        const twoFactorStatus: TwoFactorStatus = {
          type: 'enabled',
          secret: 'secret123',
          backupCodes: [],
        }
        const user = createTestUser({ type: 'active' }, { twoFactorStatus })

        // Act
        const result = isTwoFactorEnabled(user)

        // Assert
        expect(result).toBe(true)
      })

      it('should check 2FA status regardless of account status', () => {
        // Arrange
        const enabledTwoFactor: TwoFactorStatus = {
          type: 'enabled',
          secret: 'secret',
          backupCodes: ['code1'],
        }
        const accountStatuses: UserAccountStatus[] = [
          { type: 'active' },
          {
            type: 'locked',
            reason: 'test',
            lockedAt: new Date(),
            failedAttempts: 5,
          },
          { type: 'suspended', reason: 'test', suspendedAt: new Date() },
        ]

        // Act & Assert
        for (const status of accountStatuses) {
          const user = createTestUser(status, {
            twoFactorStatus: enabledTwoFactor,
          })
          expect(isTwoFactorEnabled(user)).toBe(true)
        }
      })
    })
  })

  describe('Time Duration Functions - AAA Pattern Tests', () => {
    it('should return 30 minutes for account lock duration', () => {
      // Arrange
      const expectedDuration = 30 * 60 * 1000

      // Act
      const duration = getAccountLockDuration()

      // Assert
      expect(duration).toBe(expectedDuration)
      expect(duration).toBe(1800000) // 30 minutes in milliseconds
    })

    it('should return 15 minutes for password reset token expiry', () => {
      // Arrange
      const expectedDuration = 15 * 60 * 1000

      // Act
      const duration = getPasswordResetTokenExpiry()

      // Assert
      expect(duration).toBe(expectedDuration)
      expect(duration).toBe(900000) // 15 minutes in milliseconds
    })

    it('should return 24 hours for email verification token expiry', () => {
      // Arrange
      const expectedDuration = 24 * 60 * 60 * 1000

      // Act
      const duration = getEmailVerificationTokenExpiry()

      // Assert
      expect(duration).toBe(expectedDuration)
      expect(duration).toBe(86400000) // 24 hours in milliseconds
    })
  })

  describe('generateBackupCodes - AAA Pattern Tests', () => {
    describe('Code Generation', () => {
      it('should generate 8 backup codes by default', () => {
        // Arrange
        const expectedCount = 8

        // Act
        const codes = generateBackupCodes()

        // Assert
        expect(codes).toHaveLength(expectedCount)
      })

      it('should generate specified number of backup codes', () => {
        // Arrange
        const requestedCount = 5

        // Act
        const codes = generateBackupCodes(requestedCount)

        // Assert
        expect(codes).toHaveLength(requestedCount)
      })

      it('should generate codes with 8 characters each', () => {
        // Arrange
        const expectedLength = 8

        // Act
        const codes = generateBackupCodes()

        // Assert
        for (const code of codes) {
          expect(code).toHaveLength(expectedLength)
        }
      })

      it('should generate codes with only uppercase letters and numbers', () => {
        // Arrange
        const validCharsPattern = /^[A-Z0-9]+$/

        // Act
        const codes = generateBackupCodes(10)

        // Assert
        for (const code of codes) {
          expect(code).toMatch(validCharsPattern)
        }
      })

      it('should generate unique codes', () => {
        // Arrange
        const codeCount = 10

        // Act
        const codes = generateBackupCodes(codeCount)
        const uniqueCodes = new Set(codes)

        // Assert
        expect(uniqueCodes.size).toBe(codeCount)
      })

      it('should generate different codes on each call', () => {
        // Arrange & Act
        const codes1 = generateBackupCodes()
        const codes2 = generateBackupCodes()

        // Assert
        expect(codes1).not.toEqual(codes2)
        // Check that at least one code is different
        const hasDifferentCode = codes1.some(
          (code, index) => code !== codes2[index]
        )
        expect(hasDifferentCode).toBe(true)
      })

      it('should handle generation of large number of codes', () => {
        // Arrange
        const largeCount = 100

        // Act
        const codes = generateBackupCodes(largeCount)

        // Assert
        expect(codes).toHaveLength(largeCount)
        const uniqueCodes = new Set(codes)
        expect(uniqueCodes.size).toBe(largeCount)
      })

      it('should generate codes that are not predictable', () => {
        // Arrange
        const iterations = 5
        const codesList: string[][] = []

        // Act
        for (let i = 0; i < iterations; i++) {
          codesList.push(generateBackupCodes(3))
        }

        // Assert
        // Check that codes are not sequential or following a pattern
        const firstCodes = codesList.map((codes) => codes[0])
        const uniqueFirstCodes = new Set(firstCodes)
        expect(uniqueFirstCodes.size).toBe(iterations)
      })
    })

    describe('Edge Cases', () => {
      it('should handle generation of 0 codes', () => {
        // Arrange
        const count = 0

        // Act
        const codes = generateBackupCodes(count)

        // Assert
        expect(codes).toHaveLength(0)
        expect(codes).toEqual([])
      })

      it('should handle generation of 1 code', () => {
        // Arrange
        const count = 1

        // Act
        const codes = generateBackupCodes(count)

        // Assert
        expect(codes).toHaveLength(1)
        expect(codes[0]).toMatch(/^[A-Z0-9]{8}$/)
      })
    })
  })

  describe('Complex User Scenarios - AAA Pattern Tests', () => {
    describe('User State Transitions', () => {
      it('should handle user with expired email verification token', () => {
        // Arrange
        const expiredTokenStatus: UserAccountStatus = {
          type: 'unverified',
          emailVerificationToken: 'expired-token',
          tokenExpiry: new Date(Date.now() - 1000), // Expired 1 second ago
        }
        const user = createTestUser(expiredTokenStatus, {
          emailVerified: false,
        })

        // Act
        const isLocked = isAccountLocked(user.status)
        const isVerified = isEmailVerified(user)

        // Assert
        expect(isLocked).toBe(false)
        expect(isVerified).toBe(false)
      })

      it('should handle user with password reset in progress', () => {
        // Arrange
        const passwordResetStatus: PasswordResetStatus = {
          type: 'requested',
          token: 'reset-token',
          tokenExpiry: new Date(Date.now() + getPasswordResetTokenExpiry()),
        }
        const user = createTestUser({ type: 'active' }, { passwordResetStatus })

        // Act
        const isLocked = isAccountLocked(user.status)
        const has2FA = isTwoFactorEnabled(user)

        // Assert
        expect(isLocked).toBe(false)
        expect(has2FA).toBe(false)
      })

      it('should handle admin user with all security features enabled', () => {
        // Arrange
        const adminUser = createTestUser(
          { type: 'active' },
          {
            role: 'admin',
            emailVerified: true,
            twoFactorStatus: {
              type: 'enabled',
              secret: 'admin-secret',
              backupCodes: generateBackupCodes(),
            },
            trustedIpAddresses: ['192.168.1.1', '10.0.0.1'],
            passwordHistory: ['old-hash-1', 'old-hash-2', 'old-hash-3'],
          }
        )

        // Act
        const isVerified = isEmailVerified(adminUser)
        const has2FA = isTwoFactorEnabled(adminUser)
        const isOldPasswordReused = isPasswordReused(
          'old-hash-2',
          adminUser.data.passwordHistory
        )

        // Assert
        expect(isVerified).toBe(true)
        expect(has2FA).toBe(true)
        expect(isOldPasswordReused).toBe(true)
      })

      it('should handle suspended user attempting to verify email', () => {
        // Arrange
        const suspendedUser = createTestUser(
          {
            type: 'suspended',
            reason: 'Policy violation',
            suspendedAt: new Date(),
          },
          {
            emailVerified: false,
          }
        )

        // Act
        const isLocked = isAccountLocked(suspendedUser.status)
        const isVerified = isEmailVerified(suspendedUser)

        // Assert
        expect(isLocked).toBe(false) // Suspended is different from locked
        expect(isVerified).toBe(false)
      })
    })
  })
})
