import { randomUUID } from 'node:crypto'
import type { User, UserId, UserRepository } from '@beauty-salon-backend/domain'
import {
  SchemaIsolation,
  TestEnvironment,
  UserBuilder,
} from '@beauty-salon-backend/test-utils'
import { sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { test as base, describe, expect } from 'vitest'
import { DrizzleUserRepository } from '../../src/repositories/user.repository.js'

// カスタムテストコンテキスト
interface TestContext {
  db: PostgresJsDatabase
  repository: UserRepository
  schemaName: string
}

// vitest.extend でカスタムフィクスチャを定義
const test = base.extend<TestContext>({
  // biome-ignore lint/correctness/noEmptyPattern: vitest fixture pattern
  schemaName: async ({}, use) => {
    // Generate unique schema name
    const schemaName = `test_${randomUUID().replace(/-/g, '_')}`
    await use(schemaName)
  },

  db: async ({ schemaName }, use) => {
    // テスト環境のセットアップ
    const testEnv = await TestEnvironment.getInstance()
    const connectionString = testEnv.getPostgresConnectionString()

    // Create admin connection for schema creation
    const adminClient = postgres(connectionString, {
      onnotice: () => {},
    })
    const adminDb = drizzle(adminClient)

    // Create isolated schema with the specific name
    await adminDb.execute(
      sql`CREATE SCHEMA IF NOT EXISTS ${sql.identifier(schemaName)}`
    )

    // Create test connection with search_path configured via options parameter
    // Use double quotes for schema name to handle special characters
    const testConnectionString = `${connectionString}?options=-c search_path="${schemaName}",public`
    const testClient = postgres(testConnectionString, {
      onnotice: () => {},
    })
    const db = drizzle(testClient)

    // Apply migrations to the new schema
    const schemaIsolation = new SchemaIsolation(db)
    await schemaIsolation.applyMigrations(schemaName)

    // テストで使用
    await use(db)

    // クリーンアップ
    await testClient.end()
    await adminDb.execute(
      sql`DROP SCHEMA IF EXISTS ${sql.identifier(schemaName)} CASCADE`
    )
    await adminClient.end()
  },

  repository: async ({ db }, use) => {
    // Create repository with the db connection
    const repository = new DrizzleUserRepository(db)
    await use(repository)
  },
})

describe('UserRepository Integration Tests', () => {
  describe('save', () => {
    test('should save a new user with active status', async ({
      repository,
    }) => {
      const userBuilder = UserBuilder.create()
        .withEmail('test@example.com')
        .withName('Test User')
        .withRole('customer')

      const user = userBuilder.build()
      const result = await repository.save(user)

      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        expect(result.value.data.email).toBe('test@example.com')
        expect(result.value.data.name).toBe('Test User')
        expect(result.value.data.role).toBe('customer')
        expect(result.value.status.type).toBe('active')
      }
    })

    test('should save a user with unverified status', async ({
      repository,
    }) => {
      const userBuilder = UserBuilder.create()
        .withEmail('unverified@example.com')
        .withUnverifiedEmail('verification_token_123')

      const user = userBuilder.build()
      const result = await repository.save(user)

      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        expect(result.value.status.type).toBe('unverified')
        if (result.value.status.type === 'unverified') {
          expect(result.value.status.emailVerificationToken).toBe(
            'verification_token_123'
          )
        }
      }
    })

    test('should save a user with 2FA enabled', async ({ repository }) => {
      const userBuilder = UserBuilder.create()
        .withEmail('2fa@example.com')
        .with2FAEnabled()

      const user = userBuilder.build()
      const result = await repository.save(user)

      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        expect(result.value.data.twoFactorStatus.type).toBe('enabled')
      }
    })

    test('should return error when email already exists', async ({
      repository,
    }) => {
      const userBuilder = UserBuilder.create().withEmail(
        'duplicate@example.com'
      )

      const user = userBuilder.build()

      // Save first user
      const firstResult = await repository.save(user)
      expect(firstResult.type).toBe('ok')

      // Try to save second user with same email
      const secondResult = await repository.save(user)
      expect(secondResult.type).toBe('err')
      if (secondResult.type === 'err') {
        expect(secondResult.error.type).toBe('alreadyExists')
      }
    })
  })

  // シードデータを使用するテスト用の拡張
  interface SeededContext {
    userSeeds: {
      admin: User
      staff1: User
      staff2: User
      customer1: User
      customer2: User
      locked: User
      unverified: User
    }
  }

  const testWithSeeds = test.extend<SeededContext>({
    userSeeds: async ({ repository }, use) => {
      // テスト用ユーザーを作成
      const users = {
        admin: await createUser(
          repository,
          UserBuilder.create()
            .withEmail('admin@example.com')
            .withRole('admin')
            .withName('Admin User')
        ),
        staff1: await createUser(
          repository,
          UserBuilder.create()
            .withEmail('staff1@example.com')
            .withRole('staff')
            .withName('Staff One')
        ),
        staff2: await createUser(
          repository,
          UserBuilder.create()
            .withEmail('staff2@example.com')
            .withRole('staff')
            .withName('Staff Two')
        ),
        customer1: await createUser(
          repository,
          UserBuilder.create()
            .withEmail('customer1@example.com')
            .withRole('customer')
            .withName('Customer One')
        ),
        customer2: await createUser(
          repository,
          UserBuilder.create()
            .withEmail('customer2@test.com')
            .withRole('customer')
            .withName('Customer Two')
        ),
        locked: await createUser(
          repository,
          UserBuilder.create()
            .withEmail('locked@example.com')
            .withRole('customer')
            .withLockedAccount()
            .withName('Locked User')
        ),
        unverified: await createUser(
          repository,
          UserBuilder.create()
            .withEmail('unverified@example.com')
            .withUnverifiedEmail('verification_token_123')
            .withName('Unverified User')
        ),
      }

      await use(users)
    },
  })

  describe('with seeded users', () => {
    describe('findById', () => {
      testWithSeeds(
        'should find user by id',
        async ({ repository, userSeeds }) => {
          const result = await repository.findById(userSeeds.admin.data.id)

          expect(result.type).toBe('ok')
          if (result.type === 'ok') {
            expect(result.value).not.toBeNull()
            expect(result.value?.data.email).toBe('admin@example.com')
          }
        }
      )

      test('should return null for non-existent id', async ({ repository }) => {
        const nonExistentId = randomUUID() as UserId

        const result = await repository.findById(nonExistentId)

        expect(result.type).toBe('ok')
        if (result.type === 'ok') {
          expect(result.value).toBeNull()
        }
      })
    })

    describe('findByEmail', () => {
      testWithSeeds.skip(
        'should find user by email',
        async ({ repository }) => {
          const result = await repository.findByEmail('staff1@example.com')

          expect(result.type).toBe('ok')
          if (result.type === 'ok') {
            expect(result.value).not.toBeNull()
            expect(result.value?.data.name).toBe('Staff One')
          }
        }
      )

      test('should return null for non-existent email', async ({
        repository,
      }) => {
        const result = await repository.findByEmail('nonexistent@example.com')

        expect(result.type).toBe('ok')
        if (result.type === 'ok') {
          expect(result.value).toBeNull()
        }
      })
    })

    describe('update', () => {
      testWithSeeds(
        'should update user data',
        async ({ repository, userSeeds }) => {
          const userId = userSeeds.customer1.data.id
          const updatedUser = UserBuilder.create()
            .withId(userId)
            .withEmail('updated@example.com')
            .withName('Updated User')
            .build()

          const result = await repository.update(updatedUser)

          expect(result.type).toBe('ok')
          if (result.type === 'ok') {
            expect(result.value.data.email).toBe('updated@example.com')
            expect(result.value.data.name).toBe('Updated User')
          }
        }
      )

      testWithSeeds(
        'should update user status from active to locked',
        async ({ repository, userSeeds }) => {
          const userId = userSeeds.customer2.data.id
          const lockedUser = UserBuilder.create()
            .withId(userId)
            .withEmail(userSeeds.customer2.data.email)
            .withLockedAccount()
            .build()

          const result = await repository.update(lockedUser)

          expect(result.type).toBe('ok')
          if (result.type === 'ok') {
            expect(result.value.status.type).toBe('locked')
          }
        }
      )

      test('should return error when user not found', async ({
        repository,
      }) => {
        const nonExistentId = randomUUID() as UserId
        const user = UserBuilder.create()
          .withId(nonExistentId)
          .withEmail('test@example.com')
          .build()

        const result = await repository.update(user)

        expect(result.type).toBe('err')
        if (result.type === 'err') {
          expect(result.error.type).toBe('notFound')
        }
      })
    })

    describe('delete', () => {
      test('should delete user by id', async ({ repository }) => {
        // Create a user to delete
        const userBuilder = UserBuilder.create().withEmail(
          'todelete@example.com'
        )
        const user = userBuilder.build()

        const saveResult = await repository.save(user)
        expect(saveResult.type).toBe('ok')

        if (saveResult.type === 'ok') {
          const userId = saveResult.value.data.id

          // Delete the user
          const deleteResult = await repository.delete(userId)
          expect(deleteResult.type).toBe('ok')

          // Verify user is deleted
          const findResult = await repository.findById(userId)
          expect(findResult.type).toBe('ok')
          if (findResult.type === 'ok') {
            expect(findResult.value).toBeNull()
          }
        }
      })
    })

    describe('search', () => {
      testWithSeeds.skip(
        'should search users by email pattern',
        async ({ repository }) => {
          const result = await repository.search(
            { email: '@example.com' },
            { limit: 10, offset: 0 }
          )

          expect(result.type).toBe('ok')
          if (result.type === 'ok') {
            expect(result.value.total).toBe(6) // unverified@example.comも含まれる
            expect(result.value.data.length).toBe(6)
            expect(
              result.value.data.every((u) =>
                u.data.email.includes('@example.com')
              )
            ).toBe(true)
          }
        }
      )

      testWithSeeds.skip(
        'should search users by role',
        async ({ repository }) => {
          const result = await repository.search(
            { role: 'staff' },
            { limit: 10, offset: 0 }
          )

          expect(result.type).toBe('ok')
          if (result.type === 'ok') {
            expect(result.value.total).toBe(2)
            expect(result.value.data.length).toBe(2)
            expect(
              result.value.data.every((u) => u.data.role === 'staff')
            ).toBe(true)
          }
        }
      )

      testWithSeeds.skip(
        'should search users by status',
        async ({ repository }) => {
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
        }
      )

      testWithSeeds.skip('should handle pagination', async ({ repository }) => {
        const result1 = await repository.search({}, { limit: 3, offset: 0 })

        const result2 = await repository.search({}, { limit: 3, offset: 3 })

        expect(result1.type).toBe('ok')
        expect(result2.type).toBe('ok')
        if (result1.type === 'ok' && result2.type === 'ok') {
          expect(result1.value.data.length).toBe(3)
          expect(result2.value.data.length).toBeGreaterThan(0)
          expect(result1.value.total).toBe(result2.value.total)
        }
      })

      testWithSeeds.skip(
        'should combine multiple search criteria',
        async ({ repository }) => {
          const result = await repository.search(
            { email: '@example.com', role: 'customer' },
            { limit: 10, offset: 0 }
          )

          expect(result.type).toBe('ok')
          if (result.type === 'ok') {
            expect(result.value.total).toBe(3) // customer1, customer2, locked user
            expect(
              result.value.data.every(
                (u) =>
                  u.data.email.includes('@example.com') &&
                  u.data.role === 'customer'
              )
            ).toBe(true)
          }
        }
      )

      testWithSeeds.skip(
        'should return empty results for no matches',
        async ({ repository }) => {
          const result = await repository.search(
            { email: 'nonexistent@domain.com' },
            { limit: 10, offset: 0 }
          )

          expect(result.type).toBe('ok')
          if (result.type === 'ok') {
            expect(result.value.total).toBe(0)
            expect(result.value.data.length).toBe(0)
          }
        }
      )
    })

    describe('findByPasswordResetToken', () => {
      test('should find user by password reset token', async ({
        repository,
      }) => {
        // Create user with password reset token
        const userBuilder = UserBuilder.create()
          .withEmail('reset@example.com')
          .withPasswordResetToken('reset_token_123')

        const user = userBuilder.build()
        const saveResult = await repository.save(user)
        expect(saveResult.type).toBe('ok')

        // Find by token
        const result =
          await repository.findByPasswordResetToken('reset_token_123')
        expect(result.type).toBe('ok')
        if (result.type === 'ok') {
          expect(result.value).not.toBeNull()
          expect(result.value?.data.email).toBe('reset@example.com')
        }
      })

      test('should return null for invalid token', async ({ repository }) => {
        const result =
          await repository.findByPasswordResetToken('invalid_token')

        expect(result.type).toBe('ok')
        if (result.type === 'ok') {
          expect(result.value).toBeNull()
        }
      })
    })

    describe('findByEmailVerificationToken', () => {
      testWithSeeds.skip(
        'should find user by email verification token',
        async ({ repository }) => {
          const result = await repository.findByEmailVerificationToken(
            'verification_token_123'
          )

          expect(result.type).toBe('ok')
          if (result.type === 'ok') {
            expect(result.value).not.toBeNull()
            expect(result.value?.data.email).toBe('unverified@example.com')
          }
        }
      )
    })
  })
})

// ヘルパー関数
async function createUser(
  repository: UserRepository,
  builder: UserBuilder
): Promise<User> {
  const user = builder.build()

  const saveResult = await repository.save(user)
  if (saveResult.type !== 'ok') {
    throw new Error('Failed to save user')
  }

  return saveResult.value
}
