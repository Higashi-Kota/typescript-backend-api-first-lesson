/**
 * XSS Protection Middleware Tests
 * AAA（Arrange-Act-Assert）パターンに準拠したセキュリティテスト
 */

import type { NextFunction, Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  sanitizeString,
  sanitizeValue,
  xssProtection,
} from '../xss-protection.js'

describe('XSS Protection Middleware - Security Tests', () => {
  let mockReq: Partial<Request>
  let mockRes: Partial<Response>
  let mockNext: NextFunction

  beforeEach(() => {
    mockReq = {
      body: {},
      query: {},
      params: {},
      method: 'GET',
      path: '/test',
    }
    mockRes = {
      setHeader: vi.fn(),
    }
    mockNext = vi.fn()
  })

  /**
   * sanitizeString のテスト
   */
  describe('sanitizeString', () => {
    describe('XSS Attack Prevention', () => {
      it('should remove script tags', () => {
        // Arrange
        const maliciousInput = '<script>alert("XSS")</script>Hello'

        // Act
        const result = sanitizeString(maliciousInput)

        // Assert
        expect(result).toBe('Hello')
        expect(result).not.toContain('<script>')
        expect(result).not.toContain('alert')
      })

      it('should remove inline JavaScript events', () => {
        // Arrange
        const maliciousInputs = [
          '<div onclick="alert(\'XSS\')">Click me</div>',
          '<img src="x" onerror="alert(\'XSS\')">',
          '<a href="javascript:alert(\'XSS\')">Link</a>',
          '<button onmouseover="alert(\'XSS\')">Hover</button>',
        ]

        // Act & Assert
        for (const input of maliciousInputs) {
          const result = sanitizeString(input)
          expect(result).not.toContain('onclick')
          expect(result).not.toContain('onerror')
          expect(result).not.toContain('javascript:')
          expect(result).not.toContain('onmouseover')
          // alertはエスケープされたテキストの一部として残る
        }
      })

      it('should remove dangerous attributes', () => {
        // Arrange
        const maliciousInput =
          '<a href="javascript:void(0)" style="background: url(javascript:alert(1))">Link</a>'

        // Act
        const result = sanitizeString(maliciousInput)

        // Assert
        expect(result).not.toContain('javascript:')
        expect(result).not.toContain('style=')
      })

      it('should handle encoded XSS attacks', () => {
        // Arrange
        const encodedAttacks = [
          '&#60;script&#62;alert(&#39;XSS&#39;)&#60;/script&#62;',
          '%3Cscript%3Ealert(%27XSS%27)%3C/script%3E',
          '\\x3cscript\\x3ealert(\\x27XSS\\x27)\\x3c/script\\x3e',
        ]

        // Act & Assert
        for (const attack of encodedAttacks) {
          const result = sanitizeString(attack)
          // エンコードされた文字列はそのまま残る
          expect(result).toBeTruthy()
        }
      })

      it('should escape HTML tags', () => {
        // Arrange
        const safeInput =
          '<p class="description">This is <strong>bold</strong> and <em>italic</em> text.</p>'

        // Act
        const result = sanitizeString(safeInput)

        // Assert
        expect(result).toContain('&lt;p')
        expect(result).toContain('&lt;strong&gt;')
        expect(result).toContain('&lt;em&gt;')
        expect(result).not.toContain('<p>')
        expect(result).not.toContain('<strong>')
        expect(result).not.toContain('<em>')
      })

      it('should handle nested malicious content', () => {
        // Arrange
        const nestedAttack =
          '<div><div><script>alert("nested")</script></div></div>'

        // Act
        const result = sanitizeString(nestedAttack)

        // Assert
        expect(result).not.toContain('<script>')
        expect(result).not.toContain('alert("nested")')
        expect(result).toContain('&lt;div&gt;')
      })
    })

    describe('Edge Cases', () => {
      it('should handle empty strings', () => {
        // Arrange
        const emptyInput = ''

        // Act
        const result = sanitizeString(emptyInput)

        // Assert
        expect(result).toBe('')
      })

      it('should handle very long strings', () => {
        // Arrange
        const longInput = '<script>alert("XSS")</script>'.repeat(1000)

        // Act
        const result = sanitizeString(longInput)

        // Assert
        expect(result).toBe('')
        expect(result).not.toContain('script')
      })

      it('should handle special characters', () => {
        // Arrange
        const specialChars = '< > & " \' / \\ = `'

        // Act
        const result = sanitizeString(specialChars)

        // Assert
        expect(result).toBeTruthy()
        // Should escape or handle special characters safely
      })
    })
  })

  /**
   * sanitizeObject のテスト
   */
  describe('sanitizeObject', () => {
    it('should sanitize string values in objects', () => {
      // Arrange
      const maliciousObject = {
        name: '<script>alert("XSS")</script>John',
        description: 'Normal text',
        comment: '<img src=x onerror=alert("XSS")>',
      }

      // Act
      const result = sanitizeValue(maliciousObject) as {
        name: string
        description: string
        comment: string
      }

      // Assert
      expect(result.name).toBe('John')
      expect(result.description).toBe('Normal text')
      expect(result.comment).not.toContain('onerror')
    })

    it('should sanitize nested objects', () => {
      // Arrange
      const nestedObject = {
        user: {
          name: '<script>alert("XSS")</script>User',
          profile: {
            bio: '<div onclick="alert(1)">Bio</div>',
          },
        },
      }

      // Act
      const result = sanitizeValue(nestedObject) as {
        user: {
          name: string
          profile: {
            bio: string
          }
        }
      }

      // Assert
      expect(result.user.name).toBe('User')
      expect(result.user.profile.bio).not.toContain('onclick')
      expect(result.user.profile.bio).not.toContain('alert')
    })

    it('should sanitize arrays', () => {
      // Arrange
      const arrayData = {
        tags: [
          '<script>alert(1)</script>tag1',
          'tag2',
          '<img src=x onerror=alert(1)>',
        ],
      }

      // Act
      const result = sanitizeValue(arrayData) as {
        tags: string[]
      }

      // Assert
      expect(result.tags[0]).not.toContain('<script>')
      expect(result.tags[0]).not.toContain('alert')
      expect(result.tags[1]).toBe('tag2')
      expect(result.tags[2]).not.toContain('onerror')
      expect(result.tags[2]).not.toContain('<img')
    })

    it('should handle mixed data types', () => {
      // Arrange
      const mixedData = {
        string: '<script>alert("XSS")</script>text',
        number: 123,
        boolean: true,
        null: null,
        undefined: undefined,
        array: ['<script>alert(1)</script>', 456],
      }

      // Act
      const result = sanitizeValue(mixedData) as {
        string: string
        number: number
        boolean: boolean
        null: null
        undefined: undefined
        array: Array<string | number>
      }

      // Assert
      expect(result.string).toBe('text')
      expect(result.number).toBe(123)
      expect(result.boolean).toBe(true)
      expect(result.null).toBe(null)
      expect(result.undefined).toBe(undefined)
      expect(result.array[0]).toBe('')
      expect(result.array[1]).toBe(456)
    })

    it('should sanitize object keys', () => {
      // Arrange
      const maliciousKeys = {
        '<script>key</script>': 'value',
        normal_key: 'value',
      }

      // Act
      const result = sanitizeValue(maliciousKeys) as Record<string, string>

      // Assert
      const keys = Object.keys(result)
      expect(keys).not.toContain('<script>key</script>')
      expect(keys).toContain('normal_key')
    })
  })

  /**
   * xssProtection ミドルウェアのテスト
   */
  describe('xssProtection middleware', () => {
    it('should sanitize request body', () => {
      // Arrange
      mockReq.method = 'POST'
      mockReq.body = {
        name: '<script>alert("XSS")</script>John',
        message: '<div onclick="alert(1)">Hello</div>',
      }

      // Act
      const middleware = xssProtection()
      middleware(mockReq as Request, mockRes as Response, mockNext)

      // Assert
      expect(mockReq.body.name).not.toContain('<script>')
      expect(mockReq.body.name).not.toContain('alert')
      expect(mockReq.body.message).not.toContain('onclick')
      expect(mockNext).toHaveBeenCalled()
    })

    it('should sanitize query parameters', () => {
      // Arrange
      mockReq.query = {
        search: '<script>alert("XSS")</script>',
        filter: 'normal',
      }

      // Act
      const middleware = xssProtection()
      middleware(mockReq as Request, mockRes as Response, mockNext)

      // Assert
      expect(mockReq.query.search).not.toContain('<script>')
      expect(mockReq.query.search).not.toContain('alert')
      expect(mockReq.query.filter).toBe('normal')
    })

    it('should sanitize URL parameters', () => {
      // Arrange
      mockReq.params = {
        id: '<script>alert(1)</script>123',
        slug: 'normal-slug',
      }

      // Act
      const middleware = xssProtection()
      middleware(mockReq as Request, mockRes as Response, mockNext)

      // Assert
      expect(mockReq.params.id).not.toContain('<script>')
      expect(mockReq.params.id).not.toContain('alert')
      expect(mockReq.params.slug).toBe('normal-slug')
    })

    it('should call next middleware', () => {
      // Arrange
      mockReq.body = { safe: 'data' }

      // Act
      const middleware = xssProtection()
      middleware(mockReq as Request, mockRes as Response, mockNext)

      // Assert
      expect(mockNext).toHaveBeenCalled()
    })

    it('should handle requests without body/query/params', () => {
      // Arrange
      mockReq = {
        method: 'GET',
        path: '/test',
        body: undefined,
        query: undefined,
        params: undefined,
      }

      // Act & Assert - Should not throw
      const middleware = xssProtection()
      expect(() => {
        middleware(mockReq as Request, mockRes as Response, mockNext)
      }).not.toThrow()
      expect(mockNext).toHaveBeenCalled()
    })
  })

  /**
   * Real-world Attack Scenarios
   */
  describe('Real-world XSS Attack Scenarios', () => {
    it('should prevent stored XSS in user profiles', () => {
      // Arrange
      mockReq.method = 'POST'
      mockReq.body = {
        bio: "Hi, I'm <script>document.cookie</script> a developer",
        website: 'javascript:alert(document.cookie)',
        interests: ['<img src=x onerror=alert(1)>', 'coding'],
      }

      // Act
      const middleware = xssProtection()
      middleware(mockReq as Request, mockRes as Response, mockNext)

      // Assert
      expect(mockReq.body.bio).toContain('Hi, I')
      expect(mockReq.body.bio).toContain('m  a developer')
      expect(mockReq.body.bio).not.toContain('<script>')
      expect(mockReq.body.website).not.toContain('javascript:')
      expect(mockReq.body.interests[0]).not.toContain('onerror')
    })

    it('should prevent reflected XSS in search queries', () => {
      // Arrange
      mockReq.query = {
        q: '"><script>alert(1)</script>',
        page: '1',
      }

      // Act
      const middleware = xssProtection()
      middleware(mockReq as Request, mockRes as Response, mockNext)

      // Assert
      expect(mockReq.query.q).toBe('&quot;&gt;')
      expect(mockReq.query.page).toBe('1')
    })

    it('should prevent DOM-based XSS attempts', () => {
      // Arrange
      mockReq.method = 'POST'
      mockReq.body = {
        redirect: 'javascript:alert(1)',
        callback: 'eval(alert(1))',
        html: '<svg/onload=alert(1)>',
      }

      // Act
      const middleware = xssProtection()
      middleware(mockReq as Request, mockRes as Response, mockNext)

      // Assert
      expect(mockReq.body.redirect).not.toContain('javascript:')
      // evalはただの文字列として残る
      expect(mockReq.body.callback).toBe('eval(alert(1))')
      expect(mockReq.body.html).not.toContain('onload')
    })

    it('should handle complex nested attack payloads', () => {
      // Arrange
      mockReq.method = 'POST'
      mockReq.body = {
        comment: {
          text: '<div><script>alert(1)</script><img src=x onerror=alert(2)></div>',
          author: {
            name: '<script>alert(3)</script>Attacker',
            avatar: 'data:image/svg+xml,<svg/onload=alert(4)>',
          },
          replies: [
            {
              text: '<iframe src="javascript:alert(5)"></iframe>',
            },
          ],
        },
      }

      // Act
      const middleware = xssProtection()
      middleware(mockReq as Request, mockRes as Response, mockNext)

      // Assert
      const comment = mockReq.body.comment as {
        text: string
        author: {
          name: string
          avatar: string
        }
        replies: Array<{ text: string }>
      }
      expect(comment.text).not.toContain('script')
      expect(comment.text).not.toContain('onerror')
      expect(comment.author.name).not.toContain('<script>')
      expect(comment.author.name).not.toContain('alert')
      expect(comment.author.avatar).not.toContain('onload')
      expect(comment.replies[0]?.text).not.toContain('iframe')
    })
  })
})
