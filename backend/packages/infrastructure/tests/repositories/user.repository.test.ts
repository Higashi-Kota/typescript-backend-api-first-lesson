import { randomUUID } from 'node:crypto'
import type { UserId } from '@beauty-salon-backend/domain'
import {
  SchemaIsolation,
  TestEnvironment,
  UserBuilder,
} from '@beauty-salon-backend/test-utils'
import { sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest'
import { DrizzleUserRepository } from '../../src/repositories/user.repository.js'

describe('UserRepository Integration Tests', () => {
  let testEnv: TestEnvironment
  let db: PostgresJsDatabase
  let repository: DrizzleUserRepository
  let client: postgres.Sql
  let schemaIsolation: SchemaIsolation
  let schemaName: string

  beforeAll(async () => {
    // Start test containers
    testEnv = await TestEnvironment.getInstance()
    const connectionString = testEnv.getPostgresConnectionString()

    // Create database client and setup
    client = postgres(connectionString)
    db = drizzle(client)
    schemaIsolation = new SchemaIsolation(db)

    // Create extensions once
    await db.execute(sql`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`)
    await db.execute(sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`)
  }, 30000) // 30秒のタイムアウト

  afterAll(async () => {
    if (client) {
      await client.end()
    }
    if (testEnv) {
      await testEnv.stop()
    }
  })

  beforeEach(async () => {
    // Create isolated schema for each test (this also runs migrations)
    schemaName = await schemaIsolation.createIsolatedSchema()

    repository = new DrizzleUserRepository(db)
  })

  afterEach(async () => {
    // Drop the isolated schema
    await schemaIsolation.dropSchema(schemaName)
  })

  describe('save', () => {
    it('should save a new user with active status', async () => {
      const userBuilder = UserBuilder.create()
        .withEmail('test@example.com')
        .withName('Test User')
        .withRole('customer')

      const buildResult = await userBuilder.build()
      expect(buildResult.type).toBe('ok')

      if (buildResult.type === 'ok') {
        const result = await repository.save(buildResult.value)

        expect(result.type).toBe('ok')
        if (result.type === 'ok') {
          expect(result.value.data.email).toBe('test@example.com')
          expect(result.value.data.name).toBe('Test User')
          expect(result.value.data.role).toBe('customer')
          expect(result.value.status.type).toBe('active')
        }
      }
    })

    it('should save a user with unverified status', async () => {
      const userBuilder = UserBuilder.create()
        .withEmail('unverified@example.com')
        .withUnverifiedEmail('verification_token_123')

      const buildResult = await userBuilder.build()
      expect(buildResult.type).toBe('ok')

      if (buildResult.type === 'ok') {
        const result = await repository.save(buildResult.value)

        expect(result.type).toBe('ok')
        if (result.type === 'ok') {
          expect(result.value.status.type).toBe('unverified')
          if (result.value.status.type === 'unverified') {
            expect(result.value.status.emailVerificationToken).toBe(
              'verification_token_123'
            )
            expect(result.value.status.tokenExpiry).toBeInstanceOf(Date)
          }
        }
      }
    })

    it('should save a user with 2FA enabled', async () => {
      const userBuilder = UserBuilder.create()
        .withEmail('2fa@example.com')
        .withTwoFactorEnabled('secret123', ['CODE1', 'CODE2'])

      const buildResult = await userBuilder.build()
      expect(buildResult.type).toBe('ok')

      if (buildResult.type === 'ok') {
        const result = await repository.save(buildResult.value)

        expect(result.type).toBe('ok')
        if (result.type === 'ok') {
          expect(result.value.data.twoFactorStatus.type).toBe('enabled')
          if (result.value.data.twoFactorStatus.type === 'enabled') {
            expect(result.value.data.twoFactorStatus.secret).toBe('secret123')
            expect(result.value.data.twoFactorStatus.backupCodes).toEqual([
              'CODE1',
              'CODE2',
            ])
          }
        }
      }
    })

    it('should return error when email already exists', async () => {
      const email = 'duplicate@example.com'

      // Save first user
      const user1 = await UserBuilder.create().withEmail(email).build()
      expect(user1.type).toBe('ok')
      if (user1.type === 'ok') {
        await repository.save(user1.value)
      }

      // Try to save second user with same email
      const user2 = await UserBuilder.create().withEmail(email).build()
      expect(user2.type).toBe('ok')
      if (user2.type === 'ok') {
        const result = await repository.save(user2.value)

        expect(result.type).toBe('err')
        if (result.type === 'err') {
          expect(result.error.type).toBe('alreadyExists')
          if (result.error.type === 'alreadyExists') {
            expect(result.error.email).toBe(email)
          }
        }
      }
    })
  })

  describe('findById', () => {
    it('should find user by id', async () => {
      const user = await UserBuilder.create()
        .withEmail('findbyid@example.com')
        .build()

      expect(user.type).toBe('ok')
      if (user.type === 'ok') {
        const saveResult = await repository.save(user.value)
        expect(saveResult.type).toBe('ok')

        if (saveResult.type === 'ok') {
          const findResult = await repository.findById(saveResult.value.data.id)

          expect(findResult.type).toBe('ok')
          if (findResult.type === 'ok') {
            expect(findResult.value).not.toBeNull()
            expect(findResult.value?.data.id).toBe(saveResult.value.data.id)
            expect(findResult.value?.data.email).toBe('findbyid@example.com')
          }
        }
      }
    })

    it('should return null for non-existent id', async () => {
      const nonExistentId = randomUUID() as UserId
      const result = await repository.findById(nonExistentId)

      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        expect(result.value).toBeNull()
      }
    })
  })

  describe('findByEmail', () => {
    it('should find user by email', async () => {
      const email = 'findbyemail@example.com'
      const user = await UserBuilder.create().withEmail(email).build()

      expect(user.type).toBe('ok')
      if (user.type === 'ok') {
        await repository.save(user.value)

        const result = await repository.findByEmail(email)

        expect(result.type).toBe('ok')
        if (result.type === 'ok') {
          expect(result.value).not.toBeNull()
          expect(result.value?.data.email).toBe(email)
        }
      }
    })

    it('should return null for non-existent email', async () => {
      const result = await repository.findByEmail('nonexistent@example.com')

      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        expect(result.value).toBeNull()
      }
    })

    it('should handle case-sensitive email search', async () => {
      const email = 'CaseSensitive@example.com'
      const user = await UserBuilder.create().withEmail(email).build()

      expect(user.type).toBe('ok')
      if (user.type === 'ok') {
        await repository.save(user.value)

        // Search with different case
        const result = await repository.findByEmail('casesensitive@example.com')

        expect(result.type).toBe('ok')
        if (result.type === 'ok') {
          expect(result.value).toBeNull()
        }
      }
    })
  })

  describe('update', () => {
    it('should update user data', async () => {
      const user = await UserBuilder.create()
        .withEmail('update@example.com')
        .withName('Original Name')
        .build()

      expect(user.type).toBe('ok')
      if (user.type === 'ok') {
        const saveResult = await repository.save(user.value)
        expect(saveResult.type).toBe('ok')

        if (saveResult.type === 'ok') {
          // Update user
          const updatedUser = {
            ...saveResult.value,
            data: {
              ...saveResult.value.data,
              name: 'Updated Name',
              updatedAt: new Date(),
            },
          }

          const updateResult = await repository.update(updatedUser)

          expect(updateResult.type).toBe('ok')
          if (updateResult.type === 'ok') {
            expect(updateResult.value.data.name).toBe('Updated Name')
            expect(updateResult.value.data.email).toBe('update@example.com')
          }
        }
      }
    })

    it('should update user status from active to locked', async () => {
      const user = await UserBuilder.create()
        .withEmail('lock@example.com')
        .build()

      expect(user.type).toBe('ok')
      if (user.type === 'ok') {
        const saveResult = await repository.save(user.value)
        expect(saveResult.type).toBe('ok')

        if (saveResult.type === 'ok') {
          // Lock the user
          const lockedUser = {
            ...saveResult.value,
            status: {
              type: 'locked' as const,
              reason: 'Too many failed attempts',
              lockedAt: new Date(),
              failedAttempts: 5,
            },
            data: {
              ...saveResult.value.data,
              updatedAt: new Date(),
            },
          }

          const updateResult = await repository.update(lockedUser)

          expect(updateResult.type).toBe('ok')
          if (updateResult.type === 'ok') {
            expect(updateResult.value.status.type).toBe('locked')
            if (updateResult.value.status.type === 'locked') {
              expect(updateResult.value.status.failedAttempts).toBe(5)
            }
          }
        }
      }
    })

    it('should return error when user not found', async () => {
      const user = await UserBuilder.create()
        .withId(randomUUID() as UserId)
        .build()

      expect(user.type).toBe('ok')
      if (user.type === 'ok') {
        const result = await repository.update(user.value)

        expect(result.type).toBe('err')
        if (result.type === 'err') {
          expect(result.error.type).toBe('notFound')
        }
      }
    })
  })

  describe('delete', () => {
    it('should delete user by id', async () => {
      const user = await UserBuilder.create()
        .withEmail('delete@example.com')
        .build()

      expect(user.type).toBe('ok')
      if (user.type === 'ok') {
        const saveResult = await repository.save(user.value)
        expect(saveResult.type).toBe('ok')

        if (saveResult.type === 'ok') {
          const deleteResult = await repository.delete(saveResult.value.data.id)

          expect(deleteResult.type).toBe('ok')

          // Verify user is deleted
          const findResult = await repository.findById(saveResult.value.data.id)
          expect(findResult.type).toBe('ok')
          if (findResult.type === 'ok') {
            expect(findResult.value).toBeNull()
          }
        }
      }
    })
  })

  describe('search', () => {
    beforeEach(async () => {
      // Create multiple users for search tests
      const users = [
        UserBuilder.create()
          .withEmail('admin@example.com')
          .withRole('admin')
          .withName('Admin User'),
        UserBuilder.create()
          .withEmail('staff1@example.com')
          .withRole('staff')
          .withName('Staff One'),
        UserBuilder.create()
          .withEmail('staff2@example.com')
          .withRole('staff')
          .withName('Staff Two'),
        UserBuilder.create()
          .withEmail('customer1@example.com')
          .withRole('customer')
          .withName('Customer One'),
        UserBuilder.create()
          .withEmail('customer2@test.com')
          .withRole('customer')
          .withName('Customer Two'),
        UserBuilder.create()
          .withEmail('locked@example.com')
          .withRole('customer')
          .withLockedAccount()
          .withName('Locked User'),
      ]

      for (const builder of users) {
        const user = await builder.build()
        if (user.type === 'ok') {
          await repository.save(user.value)
        }
      }
    })

    it('should search users by email pattern', async () => {
      // Create multiple users for this specific test
      const users = [
        UserBuilder.create()
          .withEmail('admin@example.com')
          .withRole('admin')
          .withName('Admin User'),
        UserBuilder.create()
          .withEmail('staff1@example.com')
          .withRole('staff')
          .withName('Staff One'),
        UserBuilder.create()
          .withEmail('staff2@example.com')
          .withRole('staff')
          .withName('Staff Two'),
        UserBuilder.create()
          .withEmail('customer1@example.com')
          .withRole('customer')
          .withName('Customer One'),
        UserBuilder.create()
          .withEmail('customer2@test.com')
          .withRole('customer')
          .withName('Customer Two'),
        UserBuilder.create()
          .withEmail('locked@example.com')
          .withRole('customer')
          .withLockedAccount()
          .withName('Locked User'),
      ]

      for (const builder of users) {
        const user = await builder.build()
        if (user.type === 'ok') {
          await repository.save(user.value)
        }
      }

      const result = await repository.search(
        { email: '%@example.com' },
        { limit: 10, offset: 0 }
      )

      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        expect(result.value.total).toBe(5) // All @example.com users
        expect(result.value.data.length).toBe(5)
        expect(
          result.value.data.every((u) => u.data.email.includes('@example.com'))
        ).toBe(true)
      }
    })

    it('should search users by role', async () => {
      const result = await repository.search(
        { role: 'staff' },
        { limit: 10, offset: 0 }
      )

      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        expect(result.value.total).toBe(2)
        expect(result.value.data.length).toBe(2)
        expect(result.value.data.every((u) => u.data.role === 'staff')).toBe(
          true
        )
      }
    })

    it('should search users by status', async () => {
      const result = await repository.search(
        { status: 'locked' },
        { limit: 10, offset: 0 }
      )

      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        expect(result.value.total).toBe(1)
        expect(result.value.data.length).toBe(1)
        expect(result.value.data[0]?.status.type).toBe('locked')
      }
    })

    it('should handle pagination', async () => {
      const page1 = await repository.search(
        { role: 'customer' },
        { limit: 2, offset: 0 }
      )

      expect(page1.type).toBe('ok')
      if (page1.type === 'ok') {
        expect(page1.value.data.length).toBe(2)
        expect(page1.value.total).toBe(3) // 3 customers total

        const page2 = await repository.search(
          { role: 'customer' },
          { limit: 2, offset: 2 }
        )

        expect(page2.type).toBe('ok')
        if (page2.type === 'ok') {
          expect(page2.value.data.length).toBe(1) // Only 1 remaining
          expect(page2.value.total).toBe(3)
        }
      }
    })

    it('should combine multiple search criteria', async () => {
      const result = await repository.search(
        {
          email: '%@example.com',
          role: 'customer',
          emailVerified: true,
        },
        { limit: 10, offset: 0 }
      )

      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        expect(
          result.value.data.every(
            (u) =>
              u.data.email.includes('@example.com') &&
              u.data.role === 'customer' &&
              u.data.emailVerified === true
          )
        ).toBe(true)
      }
    })

    it('should return empty results for no matches', async () => {
      const result = await repository.search(
        { email: '%nonexistent%' },
        { limit: 10, offset: 0 }
      )

      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        expect(result.value.total).toBe(0)
        expect(result.value.data.length).toBe(0)
      }
    })
  })

  describe('findByPasswordResetToken', () => {
    it('should find user by password reset token', async () => {
      const token = 'reset_token_123'
      const user = await UserBuilder.create()
        .withEmail('reset@example.com')
        .withPasswordResetRequested(token)
        .build()

      expect(user.type).toBe('ok')
      if (user.type === 'ok') {
        await repository.save(user.value)

        const result = await repository.findByPasswordResetToken(token)

        expect(result.type).toBe('ok')
        if (result.type === 'ok') {
          expect(result.value).not.toBeNull()
          expect(result.value?.data.email).toBe('reset@example.com')
          expect(result.value?.data.passwordResetStatus.type).toBe('requested')
        }
      }
    })

    it('should return null for invalid token', async () => {
      const result = await repository.findByPasswordResetToken('invalid_token')

      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        expect(result.value).toBeNull()
      }
    })
  })

  describe('findByEmailVerificationToken', () => {
    it('should find user by email verification token', async () => {
      const token = 'verify_token_123'
      const user = await UserBuilder.create()
        .withEmail('verify@example.com')
        .withUnverifiedEmail(token)
        .build()

      expect(user.type).toBe('ok')
      if (user.type === 'ok') {
        await repository.save(user.value)

        const result = await repository.findByEmailVerificationToken(token)

        expect(result.type).toBe('ok')
        if (result.type === 'ok') {
          expect(result.value).not.toBeNull()
          expect(result.value?.data.email).toBe('verify@example.com')
          expect(result.value?.status.type).toBe('unverified')
        }
      }
    })
  })
})
