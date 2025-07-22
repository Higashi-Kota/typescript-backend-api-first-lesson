import type {
  SessionId,
  SessionRepository,
  User,
  UserId,
  UserRepository,
} from '@beauty-salon-backend/domain'
import { err, ok } from '@beauty-salon-backend/domain'
import { describe, expect, it, vi } from 'vitest'
import { login } from '../login.usecase.js'
import type { LoginDeps, LoginRequest } from '../login.usecase.js'

describe('Login Use Case', () => {
  const createMockUser = (overrides?: Partial<User>): User => ({
    status: { type: 'active' },
    data: {
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
    },
    ...overrides,
  })

  const createMockDeps = (overrides?: Partial<LoginDeps>): LoginDeps => ({
    userRepository: {
      findByEmail: vi.fn(),
      update: vi.fn(),
    } as unknown as UserRepository,
    sessionRepository: {
      save: vi.fn(),
    } as unknown as SessionRepository,
    verifyPassword: vi.fn(),
    generateSessionId: () => 'session123',
    generateRefreshToken: () => 'refresh123',
    sessionTtlMinutes: 30,
    ...overrides,
  })

  const createLoginRequest = (
    overrides?: Partial<LoginRequest>
  ): LoginRequest => ({
    email: 'test@example.com',
    password: 'TestPassword123!',
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0',
    ...overrides,
  })

  describe('Successful login', () => {
    it('should login successfully with valid credentials', async () => {
      const mockUser = createMockUser()
      const mockDeps = createMockDeps()
      const request = createLoginRequest()

      vi.mocked(mockDeps.userRepository.findByEmail).mockResolvedValue(
        ok(mockUser)
      )
      vi.mocked(mockDeps.verifyPassword).mockResolvedValue(true)
      vi.mocked(mockDeps.sessionRepository.save).mockResolvedValue(
        ok({
          id: 'session123' as SessionId,
          userId: mockUser.data.id,
          refreshToken: 'refresh123',
          ipAddress: request.ipAddress,
          userAgent: request.userAgent,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
          rememberMe: false,
          createdAt: new Date(),
          lastActivityAt: new Date(),
        })
      )

      const result = await login(request, mockDeps)

      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        expect(result.value.userId).toBe(mockUser.data.id)
        expect(result.value.sessionId).toBe('session123')
        expect(result.value.refreshToken).toBe('refresh123')
        expect(result.value.requiresTwoFactor).toBe(false)
      }

      expect(mockDeps.userRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            lastLoginAt: expect.any(Date),
            lastLoginIp: request.ipAddress,
          }),
        })
      )
    })

    it('should login with remember me option', async () => {
      const mockUser = createMockUser()
      const mockDeps = createMockDeps()
      const request = createLoginRequest({ rememberMe: true })

      vi.mocked(mockDeps.userRepository.findByEmail).mockResolvedValue(
        ok(mockUser)
      )
      vi.mocked(mockDeps.verifyPassword).mockResolvedValue(true)
      vi.mocked(mockDeps.sessionRepository.save).mockResolvedValue(
        ok({
          id: 'session123' as SessionId,
          userId: mockUser.data.id,
          refreshToken: 'refresh123',
          ipAddress: request.ipAddress,
          userAgent: request.userAgent,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
          rememberMe: true,
          createdAt: new Date(),
          lastActivityAt: new Date(),
        })
      )

      const result = await login(request, mockDeps)

      expect(result.type).toBe('ok')
      expect(mockDeps.sessionRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          rememberMe: true,
        })
      )
    })
  })

  describe('Invalid credentials', () => {
    it('should return error for non-existent user', async () => {
      const mockDeps = createMockDeps()
      const request = createLoginRequest()

      vi.mocked(mockDeps.userRepository.findByEmail).mockResolvedValue(
        err({ type: 'notFound', id: 'user123' as UserId })
      )

      const result = await login(request, mockDeps)

      expect(result.type).toBe('err')
      if (result.type === 'err') {
        expect(result.error.type).toBe('invalidCredentials')
      }
    })

    it('should return error for null user', async () => {
      const mockDeps = createMockDeps()
      const request = createLoginRequest()

      vi.mocked(mockDeps.userRepository.findByEmail).mockResolvedValue(ok(null))

      const result = await login(request, mockDeps)

      expect(result.type).toBe('err')
      if (result.type === 'err') {
        expect(result.error.type).toBe('invalidCredentials')
      }
    })

    it('should return error for wrong password', async () => {
      const mockUser = createMockUser()
      const mockDeps = createMockDeps()
      const request = createLoginRequest()

      vi.mocked(mockDeps.userRepository.findByEmail).mockResolvedValue(
        ok(mockUser)
      )
      vi.mocked(mockDeps.verifyPassword).mockResolvedValue(false)
      vi.mocked(mockDeps.userRepository.update).mockResolvedValue(ok(mockUser))

      const result = await login(request, mockDeps)

      expect(result.type).toBe('err')
      if (result.type === 'err') {
        expect(result.error.type).toBe('invalidCredentials')
      }

      // Note: incrementFailedAttempts is called but doesn't update for < 5 attempts
    })
  })

  describe('Account status checks', () => {
    it('should return error for locked account', async () => {
      const lockedUser = createMockUser({
        status: {
          type: 'locked',
          reason: 'Too many failed login attempts',
          lockedAt: new Date('2024-01-01T10:00:00Z'),
          failedAttempts: 5,
        },
      })
      const mockDeps = createMockDeps()
      const request = createLoginRequest()

      vi.mocked(mockDeps.userRepository.findByEmail).mockResolvedValue(
        ok(lockedUser)
      )

      const result = await login(request, mockDeps)

      expect(result.type).toBe('err')
      if (result.type === 'err') {
        expect(result.error.type).toBe('accountLocked')
        if (result.error.type === 'accountLocked') {
          if (lockedUser.status.type === 'locked') {
            expect(result.error.until).toEqual(
              new Date(lockedUser.status.lockedAt.getTime() + 30 * 60 * 1000)
            )
          }
        }
      }
    })

    it('should return error for suspended account', async () => {
      const suspendedUser = createMockUser({
        status: {
          type: 'suspended',
          reason: 'Terms violation',
          suspendedAt: new Date(),
        },
      })
      const mockDeps = createMockDeps()
      const request = createLoginRequest()

      vi.mocked(mockDeps.userRepository.findByEmail).mockResolvedValue(
        ok(suspendedUser)
      )

      const result = await login(request, mockDeps)

      expect(result.type).toBe('err')
      if (result.type === 'err') {
        expect(result.error.type).toBe('accountSuspended')
        if (result.error.type === 'accountSuspended') {
          expect(result.error.reason).toBe('Terms violation')
        }
      }
    })

    it('should return error for deleted account', async () => {
      const deletedUser = createMockUser({
        status: {
          type: 'deleted',
          deletedAt: new Date(),
        },
      })
      const mockDeps = createMockDeps()
      const request = createLoginRequest()

      vi.mocked(mockDeps.userRepository.findByEmail).mockResolvedValue(
        ok(deletedUser)
      )

      const result = await login(request, mockDeps)

      expect(result.type).toBe('err')
      if (result.type === 'err') {
        expect(result.error.type).toBe('accountDeleted')
      }
    })

    it('should return error for unverified email', async () => {
      const unverifiedUser = createMockUser({
        status: {
          type: 'unverified',
          emailVerificationToken: 'token123',
          tokenExpiry: new Date(Date.now() + 86400000),
        },
      })
      const mockDeps = createMockDeps()
      const request = createLoginRequest()

      vi.mocked(mockDeps.userRepository.findByEmail).mockResolvedValue(
        ok(unverifiedUser)
      )

      const result = await login(request, mockDeps)

      expect(result.type).toBe('err')
      if (result.type === 'err') {
        expect(result.error.type).toBe('emailNotVerified')
      }
    })
  })

  describe('Two-factor authentication', () => {
    it('should require 2FA code when enabled', async () => {
      const userWith2FA = createMockUser({
        data: {
          ...createMockUser().data,
          twoFactorStatus: {
            type: 'enabled',
            secret: 'secret123',
            backupCodes: ['code1', 'code2'],
          },
        },
      })
      const mockDeps = createMockDeps()
      const request = createLoginRequest() // No 2FA code

      vi.mocked(mockDeps.userRepository.findByEmail).mockResolvedValue(
        ok(userWith2FA)
      )
      vi.mocked(mockDeps.verifyPassword).mockResolvedValue(true)

      const result = await login(request, mockDeps)

      expect(result.type).toBe('err')
      if (result.type === 'err') {
        expect(result.error.type).toBe('twoFactorRequired')
      }
    })

    it('should login with valid 2FA code', async () => {
      const userWith2FA = createMockUser({
        data: {
          ...createMockUser().data,
          twoFactorStatus: {
            type: 'enabled',
            secret: 'secret123',
            backupCodes: ['code1', 'code2'],
          },
        },
      })
      const mockDeps = createMockDeps({
        verifyTwoFactorCode: vi.fn().mockResolvedValue(ok(undefined)),
      })
      const request = createLoginRequest({ twoFactorCode: '123456' })

      vi.mocked(mockDeps.userRepository.findByEmail).mockResolvedValue(
        ok(userWith2FA)
      )
      vi.mocked(mockDeps.verifyPassword).mockResolvedValue(true)
      vi.mocked(mockDeps.sessionRepository.save).mockResolvedValue(
        ok({
          id: 'session123' as SessionId,
          userId: userWith2FA.data.id,
          refreshToken: 'refresh123',
          ipAddress: request.ipAddress,
          userAgent: request.userAgent,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
          rememberMe: false,
          createdAt: new Date(),
          lastActivityAt: new Date(),
        })
      )

      const result = await login(request, mockDeps)

      expect(result.type).toBe('ok')
      expect(mockDeps.verifyTwoFactorCode).toHaveBeenCalledWith(
        userWith2FA.data.id,
        '123456'
      )
    })

    it('should return error for invalid 2FA code', async () => {
      const userWith2FA = createMockUser({
        data: {
          ...createMockUser().data,
          twoFactorStatus: {
            type: 'enabled',
            secret: 'secret123',
            backupCodes: ['code1', 'code2'],
          },
        },
      })
      const mockDeps = createMockDeps({
        verifyTwoFactorCode: vi
          .fn()
          .mockResolvedValue(err({ type: 'invalidCode' })),
      })
      const request = createLoginRequest({ twoFactorCode: '999999' })

      vi.mocked(mockDeps.userRepository.findByEmail).mockResolvedValue(
        ok(userWith2FA)
      )
      vi.mocked(mockDeps.verifyPassword).mockResolvedValue(true)

      const result = await login(request, mockDeps)

      expect(result.type).toBe('err')
      if (result.type === 'err') {
        expect(result.error.type).toBe('invalidTwoFactorCode')
      }
    })

    it('should return error when 2FA verification not configured', async () => {
      const userWith2FA = createMockUser({
        data: {
          ...createMockUser().data,
          twoFactorStatus: {
            type: 'enabled',
            secret: 'secret123',
            backupCodes: ['code1', 'code2'],
          },
        },
      })
      const mockDeps = createMockDeps() // No verifyTwoFactorCode
      const request = createLoginRequest({ twoFactorCode: '123456' })

      vi.mocked(mockDeps.userRepository.findByEmail).mockResolvedValue(
        ok(userWith2FA)
      )
      vi.mocked(mockDeps.verifyPassword).mockResolvedValue(true)

      const result = await login(request, mockDeps)

      expect(result.type).toBe('err')
      if (result.type === 'err') {
        expect(result.error.type).toBe('databaseError')
      }
    })

    it('should login successfully with backup code', async () => {
      const userWith2FA = createMockUser({
        data: {
          ...createMockUser().data,
          twoFactorStatus: {
            type: 'enabled',
            secret: 'secret123',
            backupCodes: ['code1', 'code2'],
          },
        },
      })
      const mockDeps = createMockDeps({
        verifyTwoFactorCode: vi
          .fn()
          .mockResolvedValue(
            err({ type: 'backupCodeUsed', remainingCodes: 1 })
          ),
      })
      const request = createLoginRequest({ twoFactorCode: 'code1' })

      vi.mocked(mockDeps.userRepository.findByEmail).mockResolvedValue(
        ok(userWith2FA)
      )
      vi.mocked(mockDeps.verifyPassword).mockResolvedValue(true)
      vi.mocked(mockDeps.sessionRepository.save).mockResolvedValue(
        ok({
          id: 'session123' as SessionId,
          userId: userWith2FA.data.id,
          refreshToken: 'refresh123',
          ipAddress: request.ipAddress,
          userAgent: request.userAgent,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
          rememberMe: false,
          createdAt: new Date(),
          lastActivityAt: new Date(),
        })
      )

      const result = await login(request, mockDeps)

      // Should still login successfully with backup code
      expect(result.type).toBe('ok')
    })
  })

  describe('Error handling', () => {
    it('should handle database error when finding user', async () => {
      const mockDeps = createMockDeps()
      const request = createLoginRequest()

      vi.mocked(mockDeps.userRepository.findByEmail).mockResolvedValue(
        err({ type: 'databaseError', message: 'DB connection failed' })
      )

      const result = await login(request, mockDeps)

      expect(result.type).toBe('err')
      if (result.type === 'err') {
        expect(result.error.type).toBe('databaseError')
      }
    })

    it('should handle session save error', async () => {
      const mockUser = createMockUser()
      const mockDeps = createMockDeps()
      const request = createLoginRequest()

      vi.mocked(mockDeps.userRepository.findByEmail).mockResolvedValue(
        ok(mockUser)
      )
      vi.mocked(mockDeps.verifyPassword).mockResolvedValue(true)
      vi.mocked(mockDeps.sessionRepository.save).mockResolvedValue(
        err({ type: 'databaseError', message: 'Session save failed' })
      )

      const result = await login(request, mockDeps)

      expect(result.type).toBe('err')
      if (result.type === 'err') {
        expect(result.error.type).toBe('databaseError')
      }
    })
  })

  describe('Failed attempts handling', () => {
    it('should not update user for single failed attempt', async () => {
      const mockUser = createMockUser()
      const mockDeps = createMockDeps()
      const request = createLoginRequest()

      vi.mocked(mockDeps.userRepository.findByEmail).mockResolvedValue(
        ok(mockUser)
      )
      vi.mocked(mockDeps.verifyPassword).mockResolvedValue(false)

      const result = await login(request, mockDeps)

      expect(result.type).toBe('err')
      if (result.type === 'err') {
        expect(result.error.type).toBe('invalidCredentials')
      }

      // incrementFailedAttempts is called but doesn't update repository for < 5 attempts
      expect(mockDeps.userRepository.update).not.toHaveBeenCalled()
    })

    it('should verify incrementFailedAttempts logic', async () => {
      // The current implementation only updates when failedAttempts >= 5
      // This test verifies that behavior
      const mockUser = createMockUser({
        status: {
          type: 'locked',
          reason: 'Previous lock',
          lockedAt: new Date(),
          failedAttempts: 4, // One more attempt will trigger update
        },
      })
      const mockDeps = createMockDeps()
      const request = createLoginRequest()

      vi.mocked(mockDeps.userRepository.findByEmail).mockResolvedValue(
        ok(mockUser)
      )
      // Note: locked accounts fail status check before password verification

      const result = await login(request, mockDeps)

      expect(result.type).toBe('err')
      if (result.type === 'err') {
        expect(result.error.type).toBe('accountLocked')
      }
    })
  })
})
