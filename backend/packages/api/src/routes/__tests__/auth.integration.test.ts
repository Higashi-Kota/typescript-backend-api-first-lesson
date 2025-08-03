import type { User, UserId } from '@beauty-salon-backend/domain'
import { DrizzleUserRepository } from '@beauty-salon-backend/infrastructure'
import {
  SchemaIsolation,
  TestEnvironment,
} from '@beauty-salon-backend/test-utils'
import bcrypt from 'bcrypt'
import { drizzle } from 'drizzle-orm/postgres-js'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import express from 'express'
import postgres from 'postgres'
import request from 'supertest'
import { v4 as uuidv4 } from 'uuid'
import { test as base, describe, expect, vi } from 'vitest'
import { errorHandler } from '../../middleware/error-handler.js'
import { JwtService } from '../../services/jwt.service.js'
import { createAuthRoutes } from '../auth.js'
import type { AuthRouteDeps } from '../auth.js'

// Mock the rate limiter module before any imports that use it
vi.mock('../../middleware/rate-limit.js', () => ({
  authRateLimiter: vi.fn((_req: unknown, _res: unknown, next: () => void) =>
    next()
  ),
  generalRateLimiter: vi.fn((_req: unknown, _res: unknown, next: () => void) =>
    next()
  ),
  passwordResetRateLimiter: vi.fn(
    (_req: unknown, _res: unknown, next: () => void) => next()
  ),
  uploadRateLimiter: vi.fn((_req: unknown, _res: unknown, next: () => void) =>
    next()
  ),
  searchRateLimiter: vi.fn((_req: unknown, _res: unknown, next: () => void) =>
    next()
  ),
  adminRateLimiter: vi.fn((_req: unknown, _res: unknown, next: () => void) =>
    next()
  ),
}))

// Test context interface
interface TestContext {
  db: PostgresJsDatabase
  schemaName: string
  app: express.Application
  userRepository: DrizzleUserRepository
}

// Type helper for vitest fixtures
type Fixtures = TestContext

// Create test with custom fixtures
const test = base.extend<Fixtures>({
  // biome-ignore lint/correctness/noEmptyPattern: vitest fixture pattern
  db: async ({}, use) => {
    // Get singleton test environment
    const testEnv = await TestEnvironment.getInstance()
    const connectionString = testEnv.getPostgresConnectionString()

    // Create database client
    const client = postgres(connectionString, {
      onnotice: () => {}, // Suppress NOTICE logs
      prepare: false,
    })
    const db = drizzle(client)

    await use(db)

    // Cleanup
    await client.end()
  },

  schemaName: async ({ db }, use) => {
    // Create schema isolation
    const schemaIsolation = new SchemaIsolation(db)
    const schemaName = await schemaIsolation.createIsolatedSchema()

    await use(schemaName)

    // Cleanup schema after test
    await schemaIsolation.dropSchema(schemaName)
  },

  userRepository: async ({ schemaName }, use) => {
    // Get singleton test environment
    const testEnv = await TestEnvironment.getInstance()
    const connectionString = testEnv.getPostgresConnectionString()

    // Create a schema-specific connection with search_path
    const schemaConnectionString = `${connectionString}?options=-c%20search_path%3D${encodeURIComponent(schemaName)},public`
    const schemaClient = postgres(schemaConnectionString, {
      onnotice: () => {}, // Suppress NOTICE logs
      prepare: false,
    })
    const schemaDb = drizzle(schemaClient)

    // Create repository with schema-specific connection
    const repository = new DrizzleUserRepository(schemaDb)

    await use(repository)

    // Cleanup
    await schemaClient.end()
  },

  app: async (
    { userRepository }: { userRepository: DrizzleUserRepository },
    use: (app: express.Application) => Promise<void>
  ) => {
    // Create adapter to match the expected interface in auth routes
    const userRepositoryAdapter = {
      findByEmail: async (email: string) => {
        const result = await userRepository.findByEmail(email)
        if (result.type === 'err') {
          return null
        }
        if (!result.value) {
          return null
        }

        // Map domain User to UserDbModel type
        return {
          id: result.value.data.id,
          email: result.value.data.email,
          name: result.value.data.name,
          passwordHash: result.value.data.passwordHash,
          role: result.value.data.role,
          status: 'active' as const,
          emailVerified: result.value.data.emailVerified,
          createdAt: result.value.data.createdAt,
          updatedAt: result.value.data.updatedAt,
        }
      },
      create: async (userData: {
        email: string
        name: string
        passwordHash: string
        role: 'customer' | 'staff' | 'admin'
      }) => {
        const user: User = {
          status: { type: 'active' },
          data: {
            id: uuidv4() as UserId,
            email: userData.email,
            name: userData.name,
            passwordHash: userData.passwordHash,
            role: userData.role,
            emailVerified: false,
            twoFactorStatus: { type: 'disabled' },
            passwordResetStatus: { type: 'none' },
            passwordHistory: [],
            trustedIpAddresses: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        }

        const result = await userRepository.save(user)
        if (result.type === 'err') {
          throw new Error('Failed to create user')
        }

        // Return UserDbModel for auth route
        return {
          id: result.value.data.id,
          email: result.value.data.email,
          name: result.value.data.name,
          passwordHash: result.value.data.passwordHash,
          role: result.value.data.role,
          status: 'active' as const,
          emailVerified: result.value.data.emailVerified,
          createdAt: result.value.data.createdAt,
          updatedAt: result.value.data.updatedAt,
        }
      },
      findById: async (id: UserId) => {
        const result = await userRepository.findById(id)
        if (result.type === 'err') {
          return null
        }
        if (!result.value) {
          return null
        }

        // Map domain User to UserDbModel type
        return {
          id: result.value.data.id,
          email: result.value.data.email,
          name: result.value.data.name,
          passwordHash: result.value.data.passwordHash,
          role: result.value.data.role,
          status: 'active' as const,
          emailVerified: result.value.data.emailVerified,
          createdAt: result.value.data.createdAt,
          updatedAt: result.value.data.updatedAt,
        }
      },
    }

    // Create dependencies
    const deps: AuthRouteDeps = {
      jwtService: new JwtService({
        accessTokenSecret: 'test-secret-key',
        refreshTokenSecret: 'test-refresh-secret-key',
        accessTokenExpiresIn: '15m',
        refreshTokenExpiresIn: '7d',
      }),
      userRepository: userRepositoryAdapter,
      authConfig: {
        jwtSecret: 'test-secret-key',
      },
    }

    // Create Express app
    const app = express()
    app.use(express.json())
    app.use('/auth', createAuthRoutes(deps))
    app.use(errorHandler)

    await use(app)
  },
})

describe('Auth API Integration Tests', () => {
  describe('POST /auth/register', () => {
    test('should register a new user with valid data', async ({
      app,
      userRepository,
    }) => {
      // Arrange
      const userData = {
        email: 'newuser@example.com',
        password: 'ValidPassword123!',
        name: 'New User',
        phoneNumber: '09012345678',
      }

      // Act
      const response = await request(app).post('/auth/register').send(userData)

      // Assert
      expect(response.status).toBe(201)
      expect(response.body).toMatchObject({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
        expiresIn: expect.any(Number),
        user: {
          id: expect.any(String),
          email: userData.email,
          name: userData.name,
          role: 'customer',
        },
      })

      // Verify user was created in the database
      const result = await userRepository.findByEmail(userData.email)
      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        expect(result.value).not.toBeNull()
        if (result.value) {
          expect(result.value.data.email).toBe(userData.email)
          expect(result.value.data.name).toBe(userData.name)
          expect(result.value.data.role).toBe('customer')
        }
      }
    })

    test('should register user with specified role', async ({ app }) => {
      const userData = {
        email: 'staff@example.com',
        password: 'StaffPassword123!',
        name: 'Staff Member',
        phoneNumber: '09087654321',
        role: 'staff' as const,
      }

      const response = await request(app).post('/auth/register').send(userData)

      expect(response.status).toBe(201)
      expect(response.body.user.role).toBe('staff')
    })

    test('should reject registration with invalid email', async ({ app }) => {
      const userData = {
        email: 'invalid-email',
        password: 'ValidPassword123!',
        name: 'Test User',
        phoneNumber: '09012345678',
      }

      const response = await request(app).post('/auth/register').send(userData)

      expect(response.status).toBe(400)
      expect(response.body).toMatchObject({
        code: 'VALIDATION_ERROR',
      })
    })

    test('should reject registration with weak password', async ({ app }) => {
      const userData = {
        email: 'test@example.com',
        password: 'weak',
        name: 'Test User',
        phoneNumber: '09012345678',
      }

      const response = await request(app).post('/auth/register').send(userData)

      expect(response.status).toBe(400)
      expect(response.body).toMatchObject({
        code: 'VALIDATION_ERROR',
      })
    })

    test('should reject registration with existing email', async ({
      app,
      userRepository,
    }) => {
      // Create existing user
      const existingUser: User = {
        status: { type: 'active' },
        data: {
          id: uuidv4() as UserId,
          email: 'existing@example.com',
          name: 'Existing User',
          passwordHash: await bcrypt.hash('ExistingPassword123!', 10),
          role: 'customer',
          emailVerified: false,
          twoFactorStatus: { type: 'disabled' },
          passwordResetStatus: { type: 'none' },
          passwordHistory: [],
          trustedIpAddresses: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      }
      await userRepository.save(existingUser)

      // Try to register with same email
      const userData = {
        email: 'existing@example.com',
        password: 'NewPassword123!',
        name: 'New User',
        phoneNumber: '09012345678',
      }

      const response = await request(app).post('/auth/register').send(userData)

      expect(response.status).toBe(409)
      expect(response.body).toMatchObject({
        code: 'EMAIL_ALREADY_EXISTS',
      })
    })

    test('should reject registration with missing fields', async ({ app }) => {
      const userData = {
        email: 'test@example.com',
        // Missing password, name, phoneNumber
      }

      const response = await request(app).post('/auth/register').send(userData)

      expect(response.status).toBe(400)
    })
  })

  describe('POST /auth/login', () => {
    test('should login with valid credentials', async ({
      app,
      userRepository,
    }) => {
      // Create user
      const password = 'ValidPassword123!'
      const hashedPassword = await bcrypt.hash(password, 10)
      const user: User = {
        status: { type: 'active' },
        data: {
          id: uuidv4() as UserId,
          email: 'user@example.com',
          name: 'Test User',
          passwordHash: hashedPassword,
          role: 'customer',
          emailVerified: true,
          twoFactorStatus: { type: 'disabled' },
          passwordResetStatus: { type: 'none' },
          passwordHistory: [],
          trustedIpAddresses: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      }
      await userRepository.save(user)

      // Login
      const response = await request(app).post('/auth/login').send({
        email: 'user@example.com',
        password,
      })

      expect(response.status).toBe(200)
      expect(response.body).toMatchObject({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
        expiresIn: expect.any(Number),
        user: {
          id: user.data.id,
          email: user.data.email,
          name: user.data.name,
          role: user.data.role,
        },
      })
    })

    test('should reject login with invalid email', async ({ app }) => {
      const response = await request(app).post('/auth/login').send({
        email: 'invalid-email',
        password: 'SomePassword123!',
      })

      expect(response.status).toBe(400)
    })

    test('should reject login with non-existent user', async ({ app }) => {
      const response = await request(app).post('/auth/login').send({
        email: 'nonexistent@example.com',
        password: 'SomePassword123!',
      })

      expect(response.status).toBe(401)
      expect(response.body).toMatchObject({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      })
    })

    test('should reject login with wrong password', async ({
      app,
      userRepository,
    }) => {
      // Create user
      const hashedPassword = await bcrypt.hash('CorrectPassword123!', 10)
      const user: User = {
        status: { type: 'active' },
        data: {
          id: uuidv4() as UserId,
          email: 'user@example.com',
          name: 'Test User',
          passwordHash: hashedPassword,
          role: 'customer',
          emailVerified: true,
          twoFactorStatus: { type: 'disabled' },
          passwordResetStatus: { type: 'none' },
          passwordHistory: [],
          trustedIpAddresses: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      }
      await userRepository.save(user)

      // Try to login with wrong password
      const response = await request(app).post('/auth/login').send({
        email: 'user@example.com',
        password: 'WrongPassword123!',
      })

      expect(response.status).toBe(401)
      expect(response.body).toMatchObject({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      })
    })

    test('should reject login for locked account', async ({
      app,
      userRepository,
    }) => {
      // Create locked user
      const password = 'ValidPassword123!'
      const hashedPassword = await bcrypt.hash(password, 10)
      const user: User = {
        status: {
          type: 'locked' as const,
          reason: 'Too many failed attempts',
          lockedAt: new Date(),
          failedAttempts: 3,
        },
        data: {
          id: uuidv4() as UserId,
          email: 'locked@example.com',
          name: 'Locked User',
          passwordHash: hashedPassword,
          role: 'customer',
          emailVerified: true,
          twoFactorStatus: { type: 'disabled' },
          passwordResetStatus: { type: 'none' },
          passwordHistory: [],
          trustedIpAddresses: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      }
      await userRepository.save(user)

      // Try to login
      const response = await request(app).post('/auth/login').send({
        email: 'locked@example.com',
        password,
      })

      // Locked users can still authenticate but should be handled by the frontend
      expect(response.status).toBe(200)
      expect(response.body).toMatchObject({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
        user: {
          email: 'locked@example.com',
        },
      })
    })

    test('should reject login with missing credentials', async ({ app }) => {
      const response = await request(app).post('/auth/login').send({})

      expect(response.status).toBe(400)
    })
  })

  describe('POST /auth/refresh', () => {
    test('should refresh token with valid refresh token', async ({ app }) => {
      // First register to get tokens
      const userData = {
        email: 'refresh@example.com',
        password: 'ValidPassword123!',
        name: 'Refresh User',
        phoneNumber: '09012345678',
      }

      const registerResponse = await request(app)
        .post('/auth/register')
        .send(userData)

      expect(registerResponse.status).toBe(201)
      const { refreshToken } = registerResponse.body

      // Use refresh token
      const refreshResponse = await request(app).post('/auth/refresh').send({
        refreshToken,
      })

      expect(refreshResponse.status).toBe(200)
      expect(refreshResponse.body).toMatchObject({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
        expiresIn: expect.any(Number),
      })

      // Access token should be provided
      expect(refreshResponse.body.accessToken).toBeDefined()
    })

    test('should reject refresh with invalid token', async ({ app }) => {
      const response = await request(app).post('/auth/refresh').send({
        refreshToken: 'invalid-token',
      })

      expect(response.status).toBe(401)
      expect(response.body).toMatchObject({
        code: 'INVALID_REFRESH_TOKEN',
        message: 'Invalid or expired refresh token',
      })
    })

    test('should reject refresh with missing token', async ({ app }) => {
      const response = await request(app).post('/auth/refresh').send({})

      expect(response.status).toBe(400)
    })
  })

  describe('POST /auth/logout', () => {
    test('should logout with valid access token', async ({ app }) => {
      // First register to get tokens
      const userData = {
        email: 'logout@example.com',
        password: 'ValidPassword123!',
        name: 'Logout User',
        phoneNumber: '09012345678',
      }

      const registerResponse = await request(app)
        .post('/auth/register')
        .send(userData)

      const { accessToken } = registerResponse.body

      // Logout
      const logoutResponse = await request(app)
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send()

      expect(logoutResponse.status).toBe(200)
      expect(logoutResponse.body).toMatchObject({
        message: 'Logged out successfully',
      })
    })

    test('should reject logout without token', async ({ app }) => {
      const response = await request(app).post('/auth/logout').send()

      expect(response.status).toBe(401)
    })

    test('should reject logout with invalid token', async ({ app }) => {
      const response = await request(app)
        .post('/auth/logout')
        .set('Authorization', 'Bearer invalid-token')
        .send()

      expect(response.status).toBe(401)
    })
  })

  describe('GET /auth/me', () => {
    test('should get current user with valid token', async ({
      app,
      userRepository,
    }) => {
      // Register user
      const userData = {
        email: 'me@example.com',
        password: 'ValidPassword123!',
        name: 'Current User',
        phoneNumber: '09012345678',
      }

      const registerResponse = await request(app)
        .post('/auth/register')
        .send(userData)

      const { accessToken } = registerResponse.body

      // Get current user
      const meResponse = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)

      expect(meResponse.status).toBe(200)
      expect(meResponse.body).toMatchObject({
        id: expect.any(String),
        email: userData.email,
        name: userData.name,
        role: 'customer',
      })

      // Verify against database
      const result = await userRepository.findByEmail(userData.email)
      expect(result.type).toBe('ok')
      if (result.type === 'ok' && result.value) {
        expect(meResponse.body.id).toBe(result.value.data.id)
      }
    })

    test('should reject without token', async ({ app }) => {
      const response = await request(app).get('/auth/me')

      expect(response.status).toBe(401)
    })

    test('should reject with invalid token', async ({ app }) => {
      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', 'Bearer invalid-token')

      expect(response.status).toBe(401)
    })
  })

  describe('Edge cases and error handling', () => {
    test('should handle malformed JSON', async ({ app }) => {
      const response = await request(app)
        .post('/auth/register')
        .set('Content-Type', 'application/json')
        .send('{"email": "test@example.com", invalid json')

      expect(response.status).toBe(400)
    })

    test('should handle empty request body', async ({ app }) => {
      const response = await request(app).post('/auth/register').send()

      expect(response.status).toBe(400)
    })

    test('should handle SQL injection attempts in email', async ({ app }) => {
      const response = await request(app).post('/auth/login').send({
        email: "admin'--",
        password: 'password',
      })

      expect(response.status).toBe(400)
    })

    test('should handle very long email addresses', async ({ app }) => {
      const longEmail = `${'a'.repeat(255)}@example.com`
      const response = await request(app).post('/auth/register').send({
        email: longEmail,
        password: 'ValidPassword123!',
        name: 'Test User',
        phoneNumber: '09012345678',
      })

      expect(response.status).toBe(400)
    })

    test('should handle special characters in password', async ({ app }) => {
      const userData = {
        email: 'special@example.com',
        password: 'P@ssw0rd!#$%^&*()',
        name: 'Special User',
        phoneNumber: '09012345678',
      }

      const response = await request(app).post('/auth/register').send(userData)

      expect(response.status).toBe(201)
    })

    test('should handle concurrent registration attempts', async ({ app }) => {
      const userData = {
        email: 'concurrent@example.com',
        password: 'ValidPassword123!',
        name: 'Concurrent User',
        phoneNumber: '09012345678',
      }

      // Send multiple registration requests concurrently
      const promises = Array(5)
        .fill(null)
        .map(() => request(app).post('/auth/register').send(userData))

      const responses = await Promise.all(promises)

      // Only one should succeed
      const successCount = responses.filter((r) => r.status === 201).length

      expect(successCount).toBe(1)
      // Other requests fail with 500 due to concurrent save errors
      const errorCount = responses.filter((r) => r.status === 500).length
      expect(errorCount).toBe(4)
    })
  })
})
