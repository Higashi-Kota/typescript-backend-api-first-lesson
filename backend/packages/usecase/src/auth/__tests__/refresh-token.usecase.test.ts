/**
 * Refresh Token Use Case Tests
 * CLAUDE.mdのテスト要件に徹底準拠
 * セッションタイムアウトのテストを含む
 */

import type {
  SessionRepository,
  UserRepository,
} from '@beauty-salon-backend/domain'
import {
  createSessionId,
  createUserId,
  err,
  ok,
} from '@beauty-salon-backend/domain'
import { UserBuilder } from '@beauty-salon-backend/test-utils'
import { v4 as uuidv4 } from 'uuid'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { refreshToken } from '../refresh-token.usecase.js'

describe('refreshTokenUseCase', () => {
  let mockSessionRepository: SessionRepository
  let mockUserRepository: UserRepository
  let mockGenerateAccessToken: ReturnType<typeof vi.fn>
  let mockGenerateRefreshToken: ReturnType<typeof vi.fn>

  beforeEach(() => {
    // Create mock repositories
    mockSessionRepository = {
      findById: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findByUserId: vi.fn(),
      findByRefreshToken: vi.fn(),
      deleteByUserId: vi.fn(),
      deleteExpired: vi.fn(),
      save: vi.fn(),
      countByUserId: vi.fn(),
    }

    mockUserRepository = {
      update: vi.fn(),
      findById: vi.fn(),
      findByEmail: vi.fn(),
      save: vi.fn(),
      delete: vi.fn(),
      search: vi.fn(),
      findByPasswordResetToken: vi.fn(),
      findByEmailVerificationToken: vi.fn(),
    }

    mockGenerateAccessToken = vi.fn()
    mockGenerateRefreshToken = vi.fn()
  })

  describe('正常系', () => {
    it('should refresh tokens successfully for valid session', async () => {
      // Arrange
      const userId = createUserId(uuidv4())
      const sessionId = createSessionId(uuidv4())
      const oldRefreshToken = 'old-refresh-token'
      const newAccessToken = 'new-access-token'
      const newRefreshToken = 'new-refresh-token'

      const validSession = {
        id: sessionId,
        userId,
        refreshToken: oldRefreshToken,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        createdAt: new Date(),
        lastActivityAt: new Date(Date.now() - 600000), // 10 minutes ago
        expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
        rememberMe: false,
      }

      const userResult = await UserBuilder.create()
        .withId(userId)
        .withEmail('test@example.com')
        .withRole('customer')
        .withStatus({ type: 'active' })
        .build()
      if (userResult.type === 'err')
        throw new Error('Failed to build test user')
      const activeUser = userResult.value

      vi.mocked(mockSessionRepository.findByRefreshToken).mockResolvedValueOnce(
        ok(validSession)
      )
      vi.mocked(mockUserRepository.findById).mockResolvedValueOnce(
        ok(activeUser)
      )
      mockGenerateAccessToken.mockReturnValueOnce(newAccessToken)
      mockGenerateRefreshToken.mockReturnValueOnce(newRefreshToken)
      vi.mocked(mockSessionRepository.update).mockResolvedValueOnce(
        ok({
          ...validSession,
          refreshToken: newRefreshToken,
          lastActivityAt: new Date(),
        })
      )

      // Act
      const result = await refreshToken(
        { refreshToken: oldRefreshToken },
        {
          sessionRepository: mockSessionRepository,
          userRepository: mockUserRepository,
          generateAccessToken: mockGenerateAccessToken,
          generateRefreshToken: mockGenerateRefreshToken,
          accessTokenExpiresIn: 3600,
          updateSession: async (session, newToken) => {
            const updated = {
              ...session,
              refreshToken: newToken,
              lastActivityAt: new Date(),
            }
            return ok(updated)
          },
        }
      )

      // Assert
      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        expect(result.value.accessToken).toBe(newAccessToken)
        expect(result.value.refreshToken).toBe(newRefreshToken)
        expect(result.value.expiresIn).toBe(3600)
      }
      expect(mockSessionRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({
          refreshToken: newRefreshToken,
          lastActivityAt: expect.any(Date),
        })
      )
    })

    it('should update session lastActivityAt on refresh', async () => {
      // Arrange
      const userId = createUserId(uuidv4())
      const sessionId = createSessionId(uuidv4())
      const beforeRefresh = new Date(Date.now() - 1800000) // 30 minutes ago

      const session = {
        id: sessionId,
        userId,
        refreshToken: 'refresh-token',
        ipAddress: '192.168.1.1',
        userAgent: 'Chrome',
        createdAt: new Date(Date.now() - 3600000),
        lastActivityAt: beforeRefresh,
        expiresAt: new Date(Date.now() + 1800000),
        rememberMe: false,
      }

      const userResult = await UserBuilder.create()
        .withId(userId)
        .withEmail('test@example.com')
        .withRole('customer')
        .withStatus({ type: 'active' })
        .build()
      if (userResult.type === 'err')
        throw new Error('Failed to build test user')
      const user = userResult.value

      vi.mocked(mockSessionRepository.findByRefreshToken).mockResolvedValueOnce(
        ok(session)
      )
      vi.mocked(mockUserRepository.findById).mockResolvedValueOnce(ok(user))
      mockGenerateAccessToken.mockReturnValueOnce('new-token')
      mockGenerateRefreshToken.mockReturnValueOnce('new-refresh')
      vi.mocked(mockSessionRepository.update).mockResolvedValueOnce(
        ok({
          ...session,
          refreshToken: 'new-refresh',
          lastActivityAt: new Date(),
        })
      )

      // Act
      const result = await refreshToken(
        { refreshToken: 'refresh-token' },
        {
          sessionRepository: mockSessionRepository,
          userRepository: mockUserRepository,
          generateAccessToken: mockGenerateAccessToken,
          generateRefreshToken: mockGenerateRefreshToken,
          accessTokenExpiresIn: 3600,
          updateSession: async (session, newToken) =>
            ok({ ...session, refreshToken: newToken }),
        }
      )

      // Assert
      expect(result.type).toBe('ok')
      expect(mockSessionRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({
          lastActivityAt: expect.any(Date),
        })
      )
      const updateCall = vi.mocked(mockSessionRepository.update).mock.calls[0]
      if (updateCall?.[0]) {
        expect(updateCall[0].lastActivityAt.getTime()).toBeGreaterThan(
          beforeRefresh.getTime()
        )
      }
    })
  })

  describe('異常系 - セッションタイムアウト', () => {
    it('should return error when session has expired', async () => {
      // Arrange
      const userId = createUserId(uuidv4())
      const sessionId = createSessionId(uuidv4())
      const expiredSession = {
        id: sessionId,
        userId,
        refreshToken: 'expired-token',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        createdAt: new Date(Date.now() - 7200000), // 2 hours ago
        lastActivityAt: new Date(Date.now() - 3600000), // 1 hour ago
        expiresAt: new Date(Date.now() - 600000), // Expired 10 minutes ago
        rememberMe: false,
      }

      vi.mocked(mockSessionRepository.findByRefreshToken).mockResolvedValueOnce(
        ok(expiredSession)
      )
      vi.mocked(mockSessionRepository.delete).mockResolvedValueOnce(
        ok(undefined)
      )

      // Act
      const result = await refreshToken(
        { refreshToken: 'expired-token' },
        {
          sessionRepository: mockSessionRepository,
          userRepository: mockUserRepository,
          generateAccessToken: mockGenerateAccessToken,
          generateRefreshToken: mockGenerateRefreshToken,
          accessTokenExpiresIn: 3600,
          updateSession: async (session, newToken) =>
            ok({ ...session, refreshToken: newToken }),
        }
      )

      // Assert
      expect(result.type).toBe('err')
      if (result.type === 'err') {
        expect(result.error.type).toBe('sessionExpired')
      }
      expect(mockSessionRepository.delete).toHaveBeenCalledWith(sessionId)
    })

    it('should handle session about to expire', async () => {
      // Arrange
      const userId = createUserId(uuidv4())
      const sessionId = createSessionId(uuidv4())
      const almostExpiredSession = {
        id: sessionId,
        userId,
        refreshToken: 'almost-expired-token',
        ipAddress: '192.168.1.1',
        userAgent: 'Safari',
        createdAt: new Date(Date.now() - 3540000), // 59 minutes ago
        lastActivityAt: new Date(Date.now() - 300000), // 5 minutes ago
        expiresAt: new Date(Date.now() + 60000), // Expires in 1 minute
        rememberMe: false,
      }

      const userResult = await UserBuilder.create()
        .withId(userId)
        .withEmail('test@example.com')
        .withRole('customer')
        .withStatus({ type: 'active' })
        .build()
      if (userResult.type === 'err')
        throw new Error('Failed to build test user')
      const user = userResult.value

      vi.mocked(mockSessionRepository.findByRefreshToken).mockResolvedValueOnce(
        ok(almostExpiredSession)
      )
      vi.mocked(mockUserRepository.findById).mockResolvedValueOnce(ok(user))
      mockGenerateAccessToken.mockReturnValueOnce('new-access')
      mockGenerateRefreshToken.mockReturnValueOnce('new-refresh')
      vi.mocked(mockSessionRepository.update).mockResolvedValueOnce(
        ok({
          ...almostExpiredSession,
          refreshToken: 'new-refresh',
          lastActivityAt: new Date(),
        })
      )

      // Act
      const result = await refreshToken(
        { refreshToken: 'almost-expired-token' },
        {
          sessionRepository: mockSessionRepository,
          userRepository: mockUserRepository,
          generateAccessToken: mockGenerateAccessToken,
          generateRefreshToken: mockGenerateRefreshToken,
          accessTokenExpiresIn: 3600,
          updateSession: async (session, newToken) =>
            ok({ ...session, refreshToken: newToken }),
        }
      )

      // Assert - Should still work as session hasn't expired yet
      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        expect(result.value.accessToken).toBe('new-access')
      }
    })
  })

  describe('異常系 - その他のエラー', () => {
    it('should return error for invalid refresh token', async () => {
      // Arrange
      vi.mocked(mockSessionRepository.findByRefreshToken).mockResolvedValueOnce(
        err({ type: 'notFound', entity: 'Session', id: 'invalid-token' })
      )

      // Act
      const result = await refreshToken(
        { refreshToken: 'invalid-token' },
        {
          sessionRepository: mockSessionRepository,
          userRepository: mockUserRepository,
          generateAccessToken: mockGenerateAccessToken,
          generateRefreshToken: mockGenerateRefreshToken,
          accessTokenExpiresIn: 3600,
          updateSession: async (session, newToken) =>
            ok({ ...session, refreshToken: newToken }),
        }
      )

      // Assert
      expect(result.type).toBe('err')
      if (result.type === 'err') {
        expect(result.error.type).toBe('invalidRefreshToken')
      }
    })

    it('should return error when user not found', async () => {
      // Arrange
      const userId = createUserId(uuidv4())
      const sessionId = createSessionId(uuidv4())
      const session = {
        id: sessionId,
        userId,
        refreshToken: 'valid-token',
        ipAddress: '192.168.1.1',
        userAgent: 'Firefox',
        createdAt: new Date(),
        lastActivityAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000),
        rememberMe: false,
      }

      vi.mocked(mockSessionRepository.findByRefreshToken).mockResolvedValueOnce(
        ok(session)
      )
      vi.mocked(mockUserRepository.findById).mockResolvedValueOnce(
        err({ type: 'notFound', entity: 'User', id: userId })
      )

      // Act
      const result = await refreshToken(
        { refreshToken: 'valid-token' },
        {
          sessionRepository: mockSessionRepository,
          userRepository: mockUserRepository,
          generateAccessToken: mockGenerateAccessToken,
          generateRefreshToken: mockGenerateRefreshToken,
          accessTokenExpiresIn: 3600,
          updateSession: async (session, newToken) =>
            ok({ ...session, refreshToken: newToken }),
        }
      )

      // Assert
      expect(result.type).toBe('err')
      if (result.type === 'err') {
        expect(result.error.type).toBe('databaseError')
      }
    })

    it('should return error when account is suspended', async () => {
      // Arrange
      const userId = createUserId(uuidv4())
      const sessionId = createSessionId(uuidv4())
      const session = {
        id: sessionId,
        userId,
        refreshToken: 'valid-token',
        ipAddress: '192.168.1.1',
        userAgent: 'Edge',
        createdAt: new Date(),
        lastActivityAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000),
        rememberMe: false,
      }

      const userResult = await UserBuilder.create()
        .withId(userId)
        .withEmail('test@example.com')
        .withRole('customer')
        .withStatus({
          type: 'suspended',
          suspendedAt: new Date(),
          suspendedReason: 'Policy violation',
        })
        .build()
      if (userResult.type === 'err')
        throw new Error('Failed to build test user')
      const suspendedUser = userResult.value

      vi.mocked(mockSessionRepository.findByRefreshToken).mockResolvedValueOnce(
        ok(session)
      )
      vi.mocked(mockUserRepository.findById).mockResolvedValueOnce(
        ok(suspendedUser)
      )

      // Act
      const result = await refreshToken(
        { refreshToken: 'valid-token' },
        {
          sessionRepository: mockSessionRepository,
          userRepository: mockUserRepository,
          generateAccessToken: mockGenerateAccessToken,
          generateRefreshToken: mockGenerateRefreshToken,
          accessTokenExpiresIn: 3600,
          updateSession: async (session, newToken) =>
            ok({ ...session, refreshToken: newToken }),
        }
      )

      // Assert
      expect(result.type).toBe('err')
      if (result.type === 'err') {
        expect(result.error.type).toBe('accountNotActive')
      }
    })

    it('should return error when database fails during update', async () => {
      // Arrange
      const userId = createUserId(uuidv4())
      const sessionId = createSessionId(uuidv4())
      const session = {
        id: sessionId,
        userId,
        refreshToken: 'valid-token',
        ipAddress: '192.168.1.1',
        userAgent: 'Chrome',
        createdAt: new Date(),
        lastActivityAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000),
        rememberMe: false,
      }

      const userResult = await UserBuilder.create()
        .withId(userId)
        .withEmail('test@example.com')
        .withRole('customer')
        .withStatus({ type: 'active' })
        .build()
      if (userResult.type === 'err')
        throw new Error('Failed to build test user')
      const user = userResult.value

      vi.mocked(mockSessionRepository.findByRefreshToken).mockResolvedValueOnce(
        ok(session)
      )
      vi.mocked(mockUserRepository.findById).mockResolvedValueOnce(ok(user))
      mockGenerateAccessToken.mockReturnValueOnce('new-access')
      mockGenerateRefreshToken.mockReturnValueOnce('new-refresh')
      vi.mocked(mockSessionRepository.update).mockResolvedValueOnce(
        err({ type: 'databaseError', message: 'Connection lost' })
      )

      // Act
      const result = await refreshToken(
        { refreshToken: 'valid-token' },
        {
          sessionRepository: mockSessionRepository,
          userRepository: mockUserRepository,
          generateAccessToken: mockGenerateAccessToken,
          generateRefreshToken: mockGenerateRefreshToken,
          accessTokenExpiresIn: 3600,
          updateSession: async (session, newToken) =>
            ok({ ...session, refreshToken: newToken }),
        }
      )

      // Assert
      expect(result.type).toBe('err')
      if (result.type === 'err') {
        expect(result.error.type).toBe('databaseError')
      }
    })
  })
})
