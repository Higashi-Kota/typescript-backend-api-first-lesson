/**
 * Get Sessions Use Case Tests
 * CLAUDE.mdのテスト要件に徹底準拠
 */

import type { SessionRepository } from '@beauty-salon-backend/domain'
import {
  createSessionId,
  createUserId,
  err,
  ok,
} from '@beauty-salon-backend/domain'
import { v4 as uuidv4 } from 'uuid'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getSessions } from '../get-sessions.usecase.js'

describe('getSessionsUseCase', () => {
  let mockSessionRepository: SessionRepository

  beforeEach(() => {
    // Create mock repository
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
  })

  describe('正常系', () => {
    it('should return active sessions for a user', async () => {
      // Arrange
      const userId = createUserId(uuidv4())
      const now = new Date()
      const sessions = [
        {
          id: createSessionId(uuidv4()),
          userId,
          refreshToken: 'token1',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          createdAt: new Date(now.getTime() - 3600000), // 1 hour ago
          lastActivityAt: new Date(now.getTime() - 600000), // 10 minutes ago
          expiresAt: new Date(now.getTime() + 3600000), // 1 hour from now
          rememberMe: false,
        },
        {
          id: createSessionId(uuidv4()),
          userId,
          refreshToken: 'token2',
          ipAddress: '192.168.1.2',
          userAgent: 'Chrome/120.0',
          createdAt: new Date(now.getTime() - 7200000), // 2 hours ago
          lastActivityAt: new Date(now.getTime() - 1800000), // 30 minutes ago
          expiresAt: new Date(now.getTime() + 1800000), // 30 minutes from now
          rememberMe: false,
        },
      ]
      vi.mocked(mockSessionRepository.findByUserId).mockResolvedValueOnce(
        ok(sessions)
      )

      // Act
      const result = await getSessions(
        { userId },
        { sessionRepository: mockSessionRepository }
      )

      // Assert
      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        expect(result.value.sessions).toHaveLength(2)
        expect(result.value.total).toBe(2)
        // Should be sorted by lastActivityAt (most recent first)
        const firstSession = result.value.sessions[0]
        const secondSession = result.value.sessions[1]
        if (firstSession && secondSession) {
          expect(firstSession.lastActivityAt.getTime()).toBeGreaterThan(
            secondSession.lastActivityAt.getTime()
          )
        }
      }
    })

    it('should mark current session correctly', async () => {
      // Arrange
      const userId = createUserId(uuidv4())
      const currentSessionId = createSessionId(uuidv4())
      const sessions = [
        {
          id: currentSessionId,
          userId,
          refreshToken: 'token1',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          createdAt: new Date(),
          lastActivityAt: new Date(),
          expiresAt: new Date(Date.now() + 3600000),
          rememberMe: false,
        },
        {
          id: createSessionId(uuidv4()),
          userId,
          refreshToken: 'token2',
          ipAddress: '192.168.1.2',
          userAgent: 'Chrome/120.0',
          createdAt: new Date(),
          lastActivityAt: new Date(),
          expiresAt: new Date(Date.now() + 3600000),
          rememberMe: false,
        },
      ]
      vi.mocked(mockSessionRepository.findByUserId).mockResolvedValueOnce(
        ok(sessions)
      )

      // Act
      const result = await getSessions(
        { userId },
        {
          sessionRepository: mockSessionRepository,
          currentSessionId: currentSessionId.toString(),
        }
      )

      // Assert
      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        const currentSession = result.value.sessions.find((s) => s.isCurrent)
        expect(currentSession).toBeDefined()
        expect(currentSession?.id).toBe(currentSessionId.toString())

        const otherSessions = result.value.sessions.filter((s) => !s.isCurrent)
        expect(otherSessions).toHaveLength(1)
      }
    })

    it('should filter out expired sessions', async () => {
      // Arrange
      const userId = createUserId(uuidv4())
      const now = new Date()
      const sessions = [
        {
          id: createSessionId(uuidv4()),
          userId,
          refreshToken: 'token1',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          createdAt: new Date(now.getTime() - 7200000), // 2 hours ago
          lastActivityAt: new Date(now.getTime() - 3600000), // 1 hour ago
          expiresAt: new Date(now.getTime() - 600000), // Expired 10 minutes ago
          rememberMe: false,
        },
        {
          id: createSessionId(uuidv4()),
          userId,
          refreshToken: 'token2',
          ipAddress: '192.168.1.2',
          userAgent: 'Chrome/120.0',
          createdAt: new Date(),
          lastActivityAt: new Date(),
          expiresAt: new Date(now.getTime() + 3600000), // Active
          rememberMe: false,
        },
      ]
      vi.mocked(mockSessionRepository.findByUserId).mockResolvedValueOnce(
        ok(sessions)
      )

      // Act
      const result = await getSessions(
        { userId },
        { sessionRepository: mockSessionRepository }
      )

      // Assert
      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        expect(result.value.sessions).toHaveLength(1)
        expect(result.value.total).toBe(1)
        const activeSession = result.value.sessions[0]
        if (activeSession) {
          expect(activeSession.expiresAt.getTime()).toBeGreaterThan(
            now.getTime()
          )
        }
      }
    })

    it('should return empty array when user has no sessions', async () => {
      // Arrange
      const userId = createUserId(uuidv4())
      vi.mocked(mockSessionRepository.findByUserId).mockResolvedValueOnce(
        ok([])
      )

      // Act
      const result = await getSessions(
        { userId },
        { sessionRepository: mockSessionRepository }
      )

      // Assert
      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        expect(result.value.sessions).toHaveLength(0)
        expect(result.value.total).toBe(0)
      }
    })

    it('should return only active sessions when mix of expired and active exist', async () => {
      // Arrange
      const userId = createUserId(uuidv4())
      const now = new Date()
      const sessions = [
        // Expired session
        {
          id: createSessionId(uuidv4()),
          userId,
          refreshToken: 'expired1',
          ipAddress: '192.168.1.1',
          userAgent: 'Old Browser',
          createdAt: new Date(now.getTime() - 86400000), // 1 day ago
          lastActivityAt: new Date(now.getTime() - 43200000), // 12 hours ago
          expiresAt: new Date(now.getTime() - 3600000), // Expired 1 hour ago
          rememberMe: false,
        },
        // Active session
        {
          id: createSessionId(uuidv4()),
          userId,
          refreshToken: 'active1',
          ipAddress: '192.168.1.2',
          userAgent: 'Firefox',
          createdAt: new Date(now.getTime() - 3600000), // 1 hour ago
          lastActivityAt: new Date(now.getTime() - 300000), // 5 minutes ago
          expiresAt: new Date(now.getTime() + 3300000), // 55 minutes from now
          rememberMe: false,
        },
        // Another expired session
        {
          id: createSessionId(uuidv4()),
          userId,
          refreshToken: 'expired2',
          ipAddress: '192.168.1.3',
          userAgent: 'Safari',
          createdAt: new Date(now.getTime() - 172800000), // 2 days ago
          lastActivityAt: new Date(now.getTime() - 86400000), // 1 day ago
          expiresAt: new Date(now.getTime() - 86400000), // Expired 1 day ago
          rememberMe: false,
        },
        // Another active session
        {
          id: createSessionId(uuidv4()),
          userId,
          refreshToken: 'active2',
          ipAddress: '192.168.1.4',
          userAgent: 'Chrome',
          createdAt: new Date(now.getTime() - 1800000), // 30 minutes ago
          lastActivityAt: new Date(now.getTime() - 60000), // 1 minute ago
          expiresAt: new Date(now.getTime() + 3540000), // 59 minutes from now
          rememberMe: true,
        },
      ]
      vi.mocked(mockSessionRepository.findByUserId).mockResolvedValueOnce(
        ok(sessions)
      )

      // Act
      const result = await getSessions(
        { userId },
        { sessionRepository: mockSessionRepository }
      )

      // Assert
      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        expect(result.value.sessions).toHaveLength(2)
        expect(result.value.total).toBe(2)
        // Verify only active sessions are returned
        for (const session of result.value.sessions) {
          expect(session.expiresAt.getTime()).toBeGreaterThan(now.getTime())
        }
        // Verify sorted by lastActivityAt (most recent first)
        const firstSession = result.value.sessions[0]
        const secondSession = result.value.sessions[1]
        if (firstSession && secondSession) {
          expect(firstSession.userAgent).toBe('Chrome')
          expect(secondSession.userAgent).toBe('Firefox')
        }
      }
    })
  })

  describe('異常系', () => {
    it('should return error when repository fails', async () => {
      // Arrange
      const userId = createUserId(uuidv4())
      vi.mocked(mockSessionRepository.findByUserId).mockResolvedValueOnce(
        err({ type: 'databaseError', message: 'Connection lost' })
      )

      // Act
      const result = await getSessions(
        { userId },
        { sessionRepository: mockSessionRepository }
      )

      // Assert
      expect(result.type).toBe('err')
      if (result.type === 'err') {
        expect(result.error.type).toBe('databaseError')
      }
    })

    it('should handle repository timeout', async () => {
      // Arrange
      const userId = createUserId(uuidv4())
      vi.mocked(mockSessionRepository.findByUserId).mockResolvedValueOnce(
        err({ type: 'databaseError', message: 'Query timeout' })
      )

      // Act
      const result = await getSessions(
        { userId },
        { sessionRepository: mockSessionRepository }
      )

      // Assert
      expect(result.type).toBe('err')
      if (result.type === 'err') {
        expect(result.error.type).toBe('databaseError')
      }
    })
  })
})
