import type { User, UserId } from '@beauty-salon-backend/domain'
import { DrizzleUserRepository } from '@beauty-salon-backend/infrastructure'
import {
  SchemaIsolation,
  TestDatabaseSetup,
  TestEnvironment,
} from '@beauty-salon-backend/test-utils'
import bcrypt from 'bcrypt'
import { drizzle } from 'drizzle-orm/postgres-js'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import express from 'express'
import postgres from 'postgres'
import request from 'supertest'
import { v4 as uuidv4 } from 'uuid'
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
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

describe('Auth API Integration Tests', () => {
  let testEnv: TestEnvironment
  let app: express.Application
  let db: PostgresJsDatabase
  let schemaIsolation: SchemaIsolation
  let schemaName: string
  let client: postgres.Sql
  let deps: AuthRouteDeps
  let userRepository: DrizzleUserRepository
  let dbSetup: TestDatabaseSetup

  beforeAll(async () => {
    // Start test containers
    testEnv = await TestEnvironment.getInstance()
    const connectionString = testEnv.getPostgresConnectionString()

    // Create database client
    client = postgres(connectionString)
    db = drizzle(client)

    schemaIsolation = new SchemaIsolation(db)
  })

  afterAll(async () => {
    await client.end()
  })

  beforeEach(async () => {
    // Create isolated schema for each test
    schemaName = await schemaIsolation.createIsolatedSchema()

    // Create dbSetup with the schema name
    dbSetup = new TestDatabaseSetup(db, schemaName)

    // Setup database tables
    await dbSetup.setupDatabase()

    // Create real repository
    userRepository = new DrizzleUserRepository(db)

    // Create adapter to match the expected interface in auth routes
    const userRepositoryAdapter = {
      findByEmail: async (email: string) => {
        const result = await userRepository.findByEmail(email)
        if (result.type === 'err') return null
        if (!result.value) return null

        // Map domain User to the auth route's User type
        return {
          id: result.value.data.id,
          email: result.value.data.email,
          name: result.value.data.name,
          passwordHash: result.value.data.passwordHash,
          role: result.value.data.role,
          createdAt: result.value.data.createdAt,
        }
      },
      create: async (userData: Omit<User, 'id' | 'createdAt'>) => {
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

        // Return simplified user for auth route
        return {
          id: result.value.data.id,
          email: result.value.data.email,
          name: result.value.data.name,
          passwordHash: result.value.data.passwordHash,
          role: result.value.data.role,
          createdAt: result.value.data.createdAt,
        }
      },
      findById: async (id: UserId) => {
        const result = await userRepository.findById(id)
        if (result.type === 'err') return null
        if (!result.value) return null

        // Map domain User to the auth route's User type
        return {
          id: result.value.data.id,
          email: result.value.data.email,
          name: result.value.data.name,
          passwordHash: result.value.data.passwordHash,
          role: result.value.data.role,
          createdAt: result.value.data.createdAt,
        }
      },
    }

    // Create dependencies
    deps = {
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
    app = express()
    app.use(express.json())
    app.use('/auth', createAuthRoutes(deps))
    app.use(errorHandler)
  })

  afterEach(async () => {
    // Clean up schema after each test
    await schemaIsolation.dropSchema(schemaName)
  })

  describe('POST /auth/register', () => {
    it('should register a new user with valid data', async () => {
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
      expect(result.value).not.toBeNull()
      if (result.type === 'ok' && result.value) {
        expect(result.value.data.email).toBe(userData.email)
        expect(result.value.data.name).toBe(userData.name)
        expect(result.value.data.role).toBe('customer')
      }
    })

    it('should register user with specified role', async () => {
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

    it('should reject registration with invalid email', async () => {
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
        message: 'Validation failed',
        errors: expect.arrayContaining([
          expect.objectContaining({
            field: 'email',
            message: expect.any(String),
          }),
        ]),
      })
    })

    it('should reject registration with weak password', async () => {
      const userData = {
        email: 'weakpass@example.com',
        password: 'weak',
        name: 'Test User',
        phoneNumber: '09012345678',
      }

      const response = await request(app).post('/auth/register').send(userData)

      expect(response.status).toBe(400)
      expect(response.body).toMatchObject({
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        errors: expect.arrayContaining([
          expect.objectContaining({
            field: 'password',
            message: expect.any(String),
          }),
        ]),
      })
    })

    it('should reject registration with existing email', async () => {
      // Arrange: Create existing user
      const existingEmail = 'existing@example.com'
      const existingUser: User = {
        status: { type: 'active' },
        data: {
          id: uuidv4() as UserId,
          email: existingEmail,
          name: 'Existing User',
          passwordHash: await bcrypt.hash('password', 10),
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

      const userData = {
        email: existingEmail,
        password: 'NewPassword123!',
        name: 'Another User',
        phoneNumber: '09012345678',
      }

      // Act
      const response = await request(app).post('/auth/register').send(userData)

      // Assert
      expect(response.status).toBe(409)
      expect(response.body).toMatchObject({
        code: 'EMAIL_ALREADY_EXISTS',
        message: 'Email already registered',
      })
    })

    it('should reject registration with invalid phone number', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'ValidPassword123!',
        name: 'Test User',
        phoneNumber: '123', // Too short
      }

      const response = await request(app).post('/auth/register').send(userData)

      expect(response.status).toBe(400)
      expect(response.body).toMatchObject({
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        errors: expect.arrayContaining([
          expect.objectContaining({
            field: 'phoneNumber',
            message: expect.any(String),
          }),
        ]),
      })
    })

    it('should reject registration with empty name', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'ValidPassword123!',
        name: '',
        phoneNumber: '09012345678',
      }

      const response = await request(app).post('/auth/register').send(userData)

      expect(response.status).toBe(400)
      expect(response.body).toMatchObject({
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        errors: expect.arrayContaining([
          expect.objectContaining({
            field: 'name',
            message: expect.any(String),
          }),
        ]),
      })
    })
  })

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      // Create test user
      const passwordHash = await bcrypt.hash('TestPassword123!', 10)
      const testUser: User = {
        status: { type: 'active' },
        data: {
          id: uuidv4() as UserId,
          email: 'test@example.com',
          name: 'Test User',
          passwordHash,
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
      await userRepository.save(testUser)
    })

    it('should login successfully with valid credentials', async () => {
      // Arrange
      const credentials = {
        email: 'test@example.com',
        password: 'TestPassword123!',
      }

      // Act
      const response = await request(app).post('/auth/login').send(credentials)

      // Assert
      expect(response.status).toBe(200)
      expect(response.body).toMatchObject({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
        expiresIn: expect.any(Number),
        user: {
          id: expect.any(String),
          email: credentials.email,
          name: 'Test User',
          role: 'customer',
        },
      })
    })

    it('should reject login with invalid email', async () => {
      const credentials = {
        email: 'nonexistent@example.com',
        password: 'TestPassword123!',
      }

      const response = await request(app).post('/auth/login').send(credentials)

      expect(response.status).toBe(401)
      expect(response.body).toMatchObject({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      })
    })

    it('should reject login with wrong password', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'WrongPassword123!',
      }

      const response = await request(app).post('/auth/login').send(credentials)

      expect(response.status).toBe(401)
      expect(response.body).toMatchObject({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      })
    })

    it('should reject login with invalid email format', async () => {
      const credentials = {
        email: 'invalid-email',
        password: 'TestPassword123!',
      }

      const response = await request(app).post('/auth/login').send(credentials)

      expect(response.status).toBe(400)
      expect(response.body).toMatchObject({
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        errors: expect.arrayContaining([
          expect.objectContaining({
            field: 'email',
            message: expect.any(String),
          }),
        ]),
      })
    })

    it('should reject login with empty password', async () => {
      const credentials = {
        email: 'test@example.com',
        password: '',
      }

      const response = await request(app).post('/auth/login').send(credentials)

      expect(response.status).toBe(400)
      expect(response.body).toMatchObject({
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        errors: expect.arrayContaining([
          expect.objectContaining({
            field: 'password',
            message: expect.any(String),
          }),
        ]),
      })
    })

    it('should reject login with missing credentials', async () => {
      const response = await request(app).post('/auth/login').send({})

      expect(response.status).toBe(400)
      expect(response.body).toMatchObject({
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        errors: expect.arrayContaining([
          expect.objectContaining({
            field: 'email',
            message: expect.any(String),
          }),
          expect.objectContaining({
            field: 'password',
            message: expect.any(String),
          }),
        ]),
      })
    })
  })

  describe('POST /auth/refresh', () => {
    let validRefreshToken: string
    let userId: UserId

    beforeEach(async () => {
      // Create test user and get tokens
      const testUser: User = {
        status: { type: 'active' },
        data: {
          id: uuidv4() as UserId,
          email: 'refresh@example.com',
          name: 'Refresh User',
          passwordHash: await bcrypt.hash('password', 10),
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
      const result = await userRepository.save(testUser)
      if (result.type === 'err') {
        throw new Error('Failed to create test user')
      }
      const user = result.value
      userId = user.data.id

      const tokenResult = deps.jwtService.generateTokens({
        userId: user.data.id,
        email: user.data.email,
        role: user.data.role,
      })

      if (tokenResult.type === 'ok') {
        validRefreshToken = tokenResult.value.refreshToken
      }
    })

    it('should refresh tokens with valid refresh token', async () => {
      const response = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken: validRefreshToken })

      expect(response.status).toBe(200)
      expect(response.body).toMatchObject({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
        expiresIn: expect.any(Number),
      })

      // Verify tokens are valid
      expect(response.body.accessToken).toBeTruthy()
      expect(response.body.refreshToken).toBeTruthy()
    })

    it('should reject refresh with invalid token', async () => {
      const response = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken: 'invalid-token' })

      expect(response.status).toBe(401)
      expect(response.body).toMatchObject({
        code: 'INVALID_REFRESH_TOKEN',
        message: 'Invalid or expired refresh token',
      })
    })

    it('should reject refresh with missing token', async () => {
      const response = await request(app).post('/auth/refresh').send({})

      expect(response.status).toBe(400)
      expect(response.body).toMatchObject({
        code: 'INVALID_REQUEST',
        message: 'Refresh token is required',
      })
    })

    it('should reject refresh when user not found', async () => {
      // Delete user to simulate deleted account
      await userRepository.delete(userId)

      const response = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken: validRefreshToken })

      expect(response.status).toBe(401)
      expect(response.body).toMatchObject({
        code: 'INVALID_REFRESH_TOKEN',
        message: 'Invalid or expired refresh token',
      })
    })
  })

  describe('GET /auth/me', () => {
    let validAccessToken: string
    let testUserId: UserId
    let testUserData: DomainUser

    beforeEach(async () => {
      // Create test user and get access token
      const user: User = {
        status: { type: 'active' },
        data: {
          id: uuidv4() as UserId,
          email: 'me@example.com',
          name: 'Me User',
          passwordHash: await bcrypt.hash('password', 10),
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
      const result = await userRepository.save(user)
      if (result.type === 'err') {
        throw new Error('Failed to create test user')
      }
      testUserId = result.value.data.id
      testUserData = {
        id: result.value.data.id,
        email: result.value.data.email,
        name: result.value.data.name,
        role: result.value.data.role,
      }

      const tokenResult = deps.jwtService.generateTokens({
        userId: testUserId,
        email: testUserData.email,
        role: testUserData.role,
      })

      if (tokenResult.type === 'ok') {
        validAccessToken = tokenResult.value.accessToken
      }
    })

    it('should return current user info with valid token', async () => {
      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${validAccessToken}`)

      expect(response.status).toBe(200)
      expect(response.body).toEqual(testUserData)
    })

    it('should reject request without token', async () => {
      const response = await request(app).get('/auth/me')

      expect(response.status).toBe(401)
      expect(response.body).toMatchObject({
        code: 'UNAUTHORIZED',
        message: expect.any(String),
      })
    })

    it('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', 'Bearer invalid-token')

      expect(response.status).toBe(401)
      expect(response.body).toMatchObject({
        code: 'UNAUTHORIZED',
        message: expect.any(String),
      })
    })

    it('should return 404 when user not found', async () => {
      // Delete user to simulate deleted account
      await userRepository.delete(testUserId)

      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${validAccessToken}`)

      expect(response.status).toBe(404)
      expect(response.body).toMatchObject({
        code: 'USER_NOT_FOUND',
        message: 'User not found',
      })
    })
  })

  describe('POST /auth/logout', () => {
    let validAccessToken: string

    beforeEach(async () => {
      // Create test user and get access token
      const user: User = {
        status: { type: 'active' },
        data: {
          id: uuidv4() as UserId,
          email: 'logout@example.com',
          name: 'Logout User',
          passwordHash: await bcrypt.hash('password', 10),
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
      const result = await userRepository.save(user)
      if (result.type === 'err') {
        throw new Error('Failed to create test user')
      }

      const tokenResult = deps.jwtService.generateTokens({
        userId: result.value.data.id,
        email: result.value.data.email,
        role: result.value.data.role,
      })

      if (tokenResult.type === 'ok') {
        validAccessToken = tokenResult.value.accessToken
      }
    })

    it('should logout successfully with valid token', async () => {
      const response = await request(app)
        .post('/auth/logout')
        .set('Authorization', `Bearer ${validAccessToken}`)

      expect(response.status).toBe(200)
      expect(response.body).toEqual({
        message: 'Logged out successfully',
      })
    })

    it('should reject logout without token', async () => {
      const response = await request(app).post('/auth/logout')

      expect(response.status).toBe(401)
      expect(response.body).toMatchObject({
        code: 'UNAUTHORIZED',
        message: expect.any(String),
      })
    })
  })
})
