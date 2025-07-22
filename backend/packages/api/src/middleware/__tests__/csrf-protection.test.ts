/**
 * CSRF Protection Middleware Tests
 * AAA（Arrange-Act-Assert）パターンに準拠したセキュリティテスト
 */

import type { NextFunction, Request, Response } from 'express'
import type { Session } from 'express-session'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  csrfProtection,
  csrfTokenHandler,
  generateCsrfToken,
  getCsrfTokenFromRequest,
  getCsrfTokenFromSession,
  isMethodRequiresProtection,
  isPathExcluded,
  saveCsrfTokenToSession,
} from '../csrf-protection.js'

describe('CSRF Protection Middleware - Security Tests', () => {
  let mockReq: Partial<Request>
  let mockRes: Partial<Response>
  let mockNext: NextFunction

  // Helper to create a mock session with proper Express session structure
  const createMockSession = (data: Record<string, unknown> = {}): Session => {
    const mockSession = {
      id: 'test-session-id',
      cookie: {
        originalMaxAge: null,
        httpOnly: true,
        secure: false,
        sameSite: 'lax' as const,
        path: '/',
      },
      regenerate: vi.fn(function (
        this: Session,
        cb: (err?: Error | null) => void
      ) {
        cb()
        return this
      }),
      destroy: vi.fn(function (
        this: Session,
        cb: (err?: Error | null) => void
      ) {
        cb()
        return this
      }),
      reload: vi.fn(function (this: Session, cb: (err?: Error | null) => void) {
        cb()
        return this
      }),
      save: vi.fn(function (this: Session, cb: (err?: Error | null) => void) {
        cb()
        return this
      }),
      touch: vi.fn(function (this: Session) {
        return this
      }),
      resetMaxAge: vi.fn(function (this: Session) {
        return this
      }),
      ...data,
    } as unknown as Session
    return mockSession
  }

  beforeEach(() => {
    mockReq = {
      method: 'GET',
      path: '/api/v1/users',
      headers: {},
      body: {},
      query: {},
      session: createMockSession({ _csrf: undefined }),
    }
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      setHeader: vi.fn(),
    }
    mockNext = vi.fn()
  })

  /**
   * Token Generation and Management
   */
  describe('Token Generation and Management', () => {
    it('should generate unique CSRF tokens', () => {
      // Arrange & Act
      const token1 = generateCsrfToken()
      const token2 = generateCsrfToken()
      const token3 = generateCsrfToken()

      // Assert
      expect(token1).toBeTruthy()
      expect(token1).toHaveLength(64) // 32 bytes = 64 hex chars
      expect(token1).not.toBe(token2)
      expect(token2).not.toBe(token3)
      expect(token1).not.toBe(token3)
    })

    it('should save token to session', () => {
      // Arrange
      const token = 'test-csrf-token'
      mockReq.session = createMockSession({ _csrf: undefined })

      // Act
      saveCsrfTokenToSession(mockReq as Request, token)

      // Assert
      expect(mockReq.session?._csrf).toBe(token)
    })

    it('should retrieve token from session', () => {
      // Arrange
      const expectedToken = 'stored-csrf-token'
      mockReq.session = createMockSession({ _csrf: expectedToken })

      // Act
      const result = getCsrfTokenFromSession(mockReq as Request)

      // Assert
      expect(result).toBe(expectedToken)
    })

    it('should handle missing session gracefully', () => {
      // Arrange
      mockReq.session = undefined

      // Act
      saveCsrfTokenToSession(mockReq as Request, 'token')
      const result = getCsrfTokenFromSession(mockReq as Request)

      // Assert
      expect(result).toBeUndefined()
    })
  })

  /**
   * Token Extraction from Request
   */
  describe('Token Extraction from Request', () => {
    it('should extract token from header', () => {
      // Arrange
      const token = 'header-csrf-token'
      mockReq.headers = { 'x-csrf-token': token }

      // Act
      const result = getCsrfTokenFromRequest(mockReq as Request)

      // Assert
      expect(result).toBe(token)
    })

    it('should extract token from body', () => {
      // Arrange
      const token = 'body-csrf-token'
      mockReq.body = { _csrf: token }
      mockReq.headers = {}

      // Act
      const result = getCsrfTokenFromRequest(mockReq as Request)

      // Assert
      expect(result).toBe(token)
    })

    it('should extract token from query parameters', () => {
      // Arrange
      const token = 'query-csrf-token'
      mockReq.query = { _csrf: token }
      mockReq.headers = {}
      mockReq.body = {}

      // Act
      const result = getCsrfTokenFromRequest(mockReq as Request)

      // Assert
      expect(result).toBe(token)
    })

    it('should prioritize header over body and query', () => {
      // Arrange
      mockReq.headers = { 'x-csrf-token': 'header-token' }
      mockReq.body = { _csrf: 'body-token' }
      mockReq.query = { _csrf: 'query-token' }

      // Act
      const result = getCsrfTokenFromRequest(mockReq as Request)

      // Assert
      expect(result).toBe('header-token')
    })

    it('should return undefined when no token present', () => {
      // Arrange
      mockReq.headers = {}
      mockReq.body = {}
      mockReq.query = {}

      // Act
      const result = getCsrfTokenFromRequest(mockReq as Request)

      // Assert
      expect(result).toBeUndefined()
    })
  })

  /**
   * Method and Path Checks
   */
  describe('Method and Path Checks', () => {
    it('should identify protected methods', () => {
      // Arrange
      const protectedMethods = ['POST', 'PUT', 'DELETE', 'PATCH']
      const unprotectedMethods = ['GET', 'HEAD', 'OPTIONS']

      // Act & Assert
      for (const method of protectedMethods) {
        expect(isMethodRequiresProtection(method)).toBe(true)
        expect(isMethodRequiresProtection(method.toLowerCase())).toBe(true)
      }

      for (const method of unprotectedMethods) {
        expect(isMethodRequiresProtection(method)).toBe(false)
      }
    })

    it('should check excluded paths correctly', () => {
      // Arrange
      const excludePaths = ['/auth/login', '/auth/register', '/public/*']

      // Act & Assert
      expect(isPathExcluded('/auth/login', excludePaths)).toBe(true)
      expect(isPathExcluded('/auth/register', excludePaths)).toBe(true)
      expect(isPathExcluded('/public/images/logo.png', excludePaths)).toBe(true)
      expect(isPathExcluded('/api/users', excludePaths)).toBe(false)
      expect(isPathExcluded('/auth/logout', excludePaths)).toBe(false)
    })
  })

  /**
   * CSRF Protection Middleware - Safe Methods
   */
  describe('CSRF Protection Middleware - Safe Methods', () => {
    it('should generate and set token for GET requests', async () => {
      // Arrange
      const middleware = csrfProtection()
      mockReq.method = 'GET'
      mockReq.session = createMockSession()

      // Act
      await middleware(mockReq as Request, mockRes as Response, mockNext)

      // Assert
      expect(mockNext).toHaveBeenCalled()
      expect(mockReq.session?._csrf).toBeTruthy()
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'X-CSRF-Token',
        mockReq.session?._csrf
      )
    })

    it('should reuse existing token for GET requests', async () => {
      // Arrange
      const middleware = csrfProtection()
      const existingToken = 'existing-token'
      mockReq.method = 'GET'
      mockReq.session = createMockSession({ _csrf: existingToken })

      // Act
      await middleware(mockReq as Request, mockRes as Response, mockNext)

      // Assert
      expect(mockNext).toHaveBeenCalled()
      expect(mockReq.session?._csrf).toBe(existingToken)
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'X-CSRF-Token',
        existingToken
      )
    })

    it('should handle GET requests without session when not required', async () => {
      // Arrange
      const middleware = csrfProtection({ sessionRequired: false })
      mockReq.method = 'GET'
      mockReq.session = undefined

      // Act
      await middleware(mockReq as Request, mockRes as Response, mockNext)

      // Assert
      expect(mockNext).toHaveBeenCalled()
      // セッションがないのでsetHeaderは呼ばれない
    })
  })

  /**
   * CSRF Protection Middleware - Protected Methods
   */
  describe('CSRF Protection Middleware - Protected Methods', () => {
    it('should allow POST with valid token', async () => {
      // Arrange
      const middleware = csrfProtection()
      const validToken = 'valid-csrf-token'
      mockReq.method = 'POST'
      mockReq.session = createMockSession({ _csrf: validToken })
      mockReq.headers = { 'x-csrf-token': validToken }

      // Act
      await middleware(mockReq as Request, mockRes as Response, mockNext)

      // Assert
      expect(mockNext).toHaveBeenCalled()
      expect(mockRes.status).not.toHaveBeenCalled()
    })

    it('should reject POST without token', async () => {
      // Arrange
      const middleware = csrfProtection()
      mockReq.method = 'POST'
      mockReq.session = createMockSession({ _csrf: 'stored-token' })

      // Act
      await middleware(mockReq as Request, mockRes as Response, mockNext)

      // Assert
      expect(mockNext).not.toHaveBeenCalled()
      expect(mockRes.status).toHaveBeenCalledWith(403)
      expect(mockRes.json).toHaveBeenCalledWith({
        code: 'INVALID_CSRF_TOKEN',
        message: 'Invalid or missing CSRF token',
      })
    })

    it('should reject POST with invalid token', async () => {
      // Arrange
      const middleware = csrfProtection()
      mockReq.method = 'POST'
      mockReq.session = createMockSession({ _csrf: 'correct-token' })
      mockReq.headers = { 'x-csrf-token': 'wrong-token' }

      // Act
      await middleware(mockReq as Request, mockRes as Response, mockNext)

      // Assert
      expect(mockNext).not.toHaveBeenCalled()
      expect(mockRes.status).toHaveBeenCalledWith(403)
    })

    it('should reject POST without session when required', async () => {
      // Arrange
      const middleware = csrfProtection({ sessionRequired: true })
      mockReq.method = 'POST'
      mockReq.session = undefined

      // Act
      await middleware(mockReq as Request, mockRes as Response, mockNext)

      // Assert
      expect(mockNext).not.toHaveBeenCalled()
      expect(mockRes.status).toHaveBeenCalledWith(403)
      expect(mockRes.json).toHaveBeenCalledWith({
        code: 'SESSION_REQUIRED',
        message: 'Session is required for CSRF protection',
      })
    })

    it('should handle all protected methods', async () => {
      // Arrange
      const middleware = csrfProtection()
      const methods = ['PUT', 'DELETE', 'PATCH']
      const token = 'valid-token'

      for (const method of methods) {
        // Reset mocks
        ;(mockNext as ReturnType<typeof vi.fn>).mockClear()
        mockRes.status = vi.fn().mockReturnThis()
        mockRes.json = vi.fn().mockReturnThis()

        mockReq.method = method
        mockReq.session = createMockSession({ _csrf: token })
        mockReq.headers = { 'x-csrf-token': token }

        // Act
        await middleware(mockReq as Request, mockRes as Response, mockNext)

        // Assert
        expect(mockNext).toHaveBeenCalled()
        expect(mockRes.status).not.toHaveBeenCalled()
      }
    })
  })

  /**
   * Path Exclusion Tests
   */
  describe('Path Exclusion', () => {
    it('should skip CSRF check for excluded paths', async () => {
      // Arrange
      const middleware = csrfProtection({
        excludePaths: ['/api/v1/auth/login', '/api/v1/auth/register'],
        sessionRequired: false,
      })
      mockReq.method = 'POST'
      // Use Object.defineProperty to set readonly path property
      Object.defineProperty(mockReq, 'path', {
        value: '/api/v1/auth/login',
        writable: true,
        configurable: true,
      })
      mockReq.session = undefined

      // Act
      await middleware(mockReq as Request, mockRes as Response, mockNext)

      // Assert
      expect(mockNext).toHaveBeenCalled()
      expect(mockRes.status).not.toHaveBeenCalled()
    })

    it('should apply CSRF check for non-excluded paths', async () => {
      // Arrange
      const middleware = csrfProtection({
        excludePaths: ['/api/v1/auth/login'],
      })
      mockReq.method = 'POST'
      // Use Object.defineProperty to set readonly path property
      Object.defineProperty(mockReq, 'path', {
        value: '/api/v1/users',
        writable: true,
        configurable: true,
      })
      mockReq.session = createMockSession({ _csrf: 'token' })

      // Act
      await middleware(mockReq as Request, mockRes as Response, mockNext)

      // Assert
      expect(mockNext).not.toHaveBeenCalled()
      expect(mockRes.status).toHaveBeenCalledWith(403)
    })
  })

  /**
   * CSRF Token Handler Tests
   */
  describe('CSRF Token Handler', () => {
    it('should generate and return new token', () => {
      // Arrange
      mockReq.session = createMockSession()

      // Act
      csrfTokenHandler(mockReq as Request, mockRes as Response)

      // Assert
      expect(mockRes.json).toHaveBeenCalled()
      const jsonMock = mockRes.json as ReturnType<typeof vi.fn>
      const response = jsonMock.mock.calls[0]?.[0]
      expect(response).toHaveProperty('csrfToken')
      expect(response.csrfToken).toBeTruthy()
      if (mockReq.session) {
        expect(mockReq.session._csrf).toBe(response.csrfToken)
      }
    })

    it('should return existing token', () => {
      // Arrange
      const existingToken = 'existing-csrf-token'
      mockReq.session = createMockSession({ _csrf: existingToken })

      // Act
      csrfTokenHandler(mockReq as Request, mockRes as Response)

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        csrfToken: existingToken,
      })
    })

    it('should handle missing session', () => {
      // Arrange
      mockReq.session = undefined

      // Act
      csrfTokenHandler(mockReq as Request, mockRes as Response)

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400)
      expect(mockRes.json).toHaveBeenCalledWith({
        code: 'SESSION_REQUIRED',
        message: 'Session is required to generate CSRF token',
      })
    })
  })

  /**
   * Attack Scenario Tests
   */
  describe('CSRF Attack Scenarios', () => {
    it('should prevent cross-origin POST without token', async () => {
      // Arrange
      const middleware = csrfProtection()
      mockReq.method = 'POST'
      // Use Object.defineProperty to set readonly path property
      Object.defineProperty(mockReq, 'path', {
        value: '/api/v1/users/profile',
        writable: true,
        configurable: true,
      })
      mockReq.headers = {
        origin: 'http://malicious-site.com',
        referer: 'http://malicious-site.com/attack',
      }
      mockReq.session = createMockSession({ _csrf: 'valid-token' })
      // No CSRF token in request

      // Act
      await middleware(mockReq as Request, mockRes as Response, mockNext)

      // Assert
      expect(mockNext).not.toHaveBeenCalled()
      expect(mockRes.status).toHaveBeenCalledWith(403)
    })

    it('should prevent token fixation attacks', async () => {
      // Arrange
      const middleware = csrfProtection()
      const attackerToken = 'attacker-provided-token'
      const legitimateToken = 'server-generated-token'

      mockReq.method = 'POST'
      mockReq.session = createMockSession({ _csrf: legitimateToken })
      mockReq.headers = { 'x-csrf-token': attackerToken }

      // Act
      await middleware(mockReq as Request, mockRes as Response, mockNext)

      // Assert
      expect(mockNext).not.toHaveBeenCalled()
      expect(mockRes.status).toHaveBeenCalledWith(403)
    })

    it('should prevent token leakage through GET requests', async () => {
      // Arrange
      const middleware = csrfProtection()
      mockReq.method = 'GET'
      mockReq.query = { _csrf: 'leaked-token' } // Token in URL
      mockReq.session = createMockSession()

      // Act
      await middleware(mockReq as Request, mockRes as Response, mockNext)

      // Assert
      expect(mockNext).toHaveBeenCalled()
      // Should generate new token, not use the leaked one
      expect(mockReq.session?._csrf).toBeTruthy()
      expect(mockReq.session?._csrf).not.toBe('leaked-token')
    })

    it('should handle sophisticated attack with multiple tokens', async () => {
      // Arrange
      const middleware = csrfProtection()
      const validToken = 'valid-session-token'

      mockReq.method = 'POST'
      mockReq.session = createMockSession({ _csrf: validToken })
      mockReq.headers = { 'x-csrf-token': 'header-token' }
      mockReq.body = { _csrf: 'body-token' }
      mockReq.query = { _csrf: validToken } // Correct token in wrong place

      // Act
      await middleware(mockReq as Request, mockRes as Response, mockNext)

      // Assert
      expect(mockNext).not.toHaveBeenCalled()
      expect(mockRes.status).toHaveBeenCalledWith(403)
      // Should fail because header token doesn't match
    })
  })
})
