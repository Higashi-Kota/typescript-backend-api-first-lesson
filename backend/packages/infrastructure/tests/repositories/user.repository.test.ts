/**
 * UserRepository Integration Tests - withIsolatedSchemaを使用した統一実装
 *
 * このテストファイルは、test-utilsのwithIsolatedSchemaヘルパーを使用して
 * 各テストが完全に独立した環境で実行される実装です。
 *
 * 特徴:
 * - 各test()が独自のPostgreSQLスキーマを持つ
 * - シンプルで読みやすい
 * - 必要なデータだけを作成
 * - 自動的にクリーンアップ
 */

import { randomUUID } from 'node:crypto'
import type { User, UserId, UserRepository } from '@beauty-salon-backend/domain'
import {
  withIsolatedSchema,
  UserBuilder,
} from '@beauty-salon-backend/test-utils'
import { describe, test, expect } from 'vitest'
import { DrizzleUserRepository } from '../../src/repositories/user.repository.js'

// ヘルパー関数: テストユーザーを作成
async function createTestUser(
  repository: UserRepository,
  options: {
    email?: string
    name?: string
    role?: 'customer' | 'staff' | 'admin'
    status?: 'active' | 'unverified' | 'locked'
    passwordResetToken?: string
    emailVerificationToken?: string
  } = {}
): Promise<User> {
  let builder = UserBuilder.create()
    .withEmail(
      options.email || `test-${Date.now()}-${randomUUID()}@example.com`
    )
    .withName(options.name || 'Test User')
    .withRole(options.role || 'customer')

  // ステータスに応じてビルダーを設定
  if (options.status === 'unverified' && options.emailVerificationToken) {
    builder = builder.withUnverifiedEmail(options.emailVerificationToken)
  } else if (options.status === 'locked') {
    builder = builder.withLockedAccount()
  }

  // パスワードリセットトークンを設定
  if (options.passwordResetToken) {
    builder = builder.withPasswordResetToken(options.passwordResetToken)
  }

  const result = await repository.save(builder.build())
  if (result.type !== 'ok') {
    throw new Error(`Failed to create test user: ${result.error.type}`)
  }
  return result.value
}

// ヘルパー関数: 標準的なテストユーザーセットを作成
async function createStandardUsers(repository: UserRepository) {
  const admin = await createTestUser(repository, {
    email: 'admin@example.com',
    name: 'Admin User',
    role: 'admin',
  })

  const staff1 = await createTestUser(repository, {
    email: 'staff1@example.com',
    name: 'Staff One',
    role: 'staff',
  })

  const staff2 = await createTestUser(repository, {
    email: 'staff2@example.com',
    name: 'Staff Two',
    role: 'staff',
  })

  const customer1 = await createTestUser(repository, {
    email: 'customer1@example.com',
    name: 'Customer One',
    role: 'customer',
  })

  const customer2 = await createTestUser(repository, {
    email: 'customer2@test.com',
    name: 'Customer Two',
    role: 'customer',
    passwordResetToken: 'reset_token_456',
  })

  const locked = await createTestUser(repository, {
    email: 'locked@example.com',
    name: 'Locked User',
    role: 'customer',
    status: 'locked',
  })

  const unverified = await createTestUser(repository, {
    email: 'unverified@example.com',
    name: 'Unverified User',
    status: 'unverified',
    emailVerificationToken: 'verification_token_123',
  })

  return { admin, staff1, staff2, customer1, customer2, locked, unverified }
}

describe('UserRepository Integration Tests', () => {
  describe('save', () => {
    test('should save a new user with active status', async () => {
      await withIsolatedSchema(async ({ db }) => {
        // Arrange
        const repository = new DrizzleUserRepository(db)
        const newUser = UserBuilder.create()
          .withEmail('test@example.com')
          .withName('Test User')
          .withRole('customer')
          .build()

        // Act
        const result = await repository.save(newUser)

        // Assert
        expect(result.type).toBe('ok')
        if (result.type === 'ok') {
          expect(result.value.data.email).toBe('test@example.com')
          expect(result.value.data.name).toBe('Test User')
          expect(result.value.data.role).toBe('customer')
          expect(result.value.status.type).toBe('active')
        }
      })
    })

    test('should save a user with unverified status', async () => {
      await withIsolatedSchema(async ({ db }) => {
        // Arrange
        const repository = new DrizzleUserRepository(db)
        const userBuilder = UserBuilder.create()
          .withEmail('unverified@example.com')
          .withUnverifiedEmail('verification_token_123')
        const user = userBuilder.build()

        // Act
        const result = await repository.save(user)

        // Assert
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
    })

    test('should save a user with 2FA enabled', async () => {
      await withIsolatedSchema(async ({ db }) => {
        // Arrange
        const repository = new DrizzleUserRepository(db)
        const userBuilder = UserBuilder.create()
          .withEmail('2fa@example.com')
          .with2FAEnabled()
        const user = userBuilder.build()

        // Act
        const result = await repository.save(user)

        // Assert
        expect(result.type).toBe('ok')
        if (result.type === 'ok') {
          expect(result.value.data.twoFactorStatus.type).toBe('enabled')
        }
      })
    })

    test('should return error when email already exists', async () => {
      await withIsolatedSchema(async ({ db }) => {
        // Arrange
        const repository = new DrizzleUserRepository(db)
        const user = UserBuilder.create()
          .withEmail('duplicate@example.com')
          .build()

        // Act
        // Save first user
        const firstResult = await repository.save(user)
        expect(firstResult.type).toBe('ok')

        // Try to save second user with same email
        const secondResult = await repository.save(user)

        // Assert
        expect(secondResult.type).toBe('err')
        if (secondResult.type === 'err') {
          expect(secondResult.error.type).toBe('alreadyExists')
        }
      })
    })
  })

  describe('findByEmail', () => {
    test('should find user by email', async () => {
      await withIsolatedSchema(async ({ db }) => {
        // Arrange
        const repository = new DrizzleUserRepository(db)
        const users = await createStandardUsers(repository)

        // Act
        const result = await repository.findByEmail('admin@example.com')

        // Assert
        expect(result.type).toBe('ok')
        if (result.type === 'ok' && result.value) {
          expect(result.value.data.id).toBe(users.admin.data.id)
          expect(result.value.data.email).toBe('admin@example.com')
          expect(result.value.data.role).toBe('admin')
        }
      })
    })

    test('should return null for non-existent email', async () => {
      await withIsolatedSchema(async ({ db }) => {
        // Arrange
        const repository = new DrizzleUserRepository(db)

        // Act
        const result = await repository.findByEmail('nonexistent@example.com')

        // Assert
        expect(result.type).toBe('ok')
        if (result.type === 'ok') {
          expect(result.value).toBeNull()
        }
      })
    })
  })

  describe('update', () => {
    test('should update user data', async () => {
      await withIsolatedSchema(async ({ db }) => {
        // Arrange
        const repository = new DrizzleUserRepository(db)
        const user = await createTestUser(repository, {
          email: 'original@example.com',
          name: 'Original Name',
        })

        // Act
        const updatedUser = UserBuilder.create()
          .withId(user.data.id)
          .withEmail('updated@example.com')
          .withName('Updated User')
          .build()
        const result = await repository.update(updatedUser)

        // Assert
        expect(result.type).toBe('ok')
        if (result.type === 'ok') {
          expect(result.value.data.email).toBe('updated@example.com')
          expect(result.value.data.name).toBe('Updated User')
        }
      })
    })

    test('should update user status from active to locked', async () => {
      await withIsolatedSchema(async ({ db }) => {
        // Arrange
        const repository = new DrizzleUserRepository(db)
        const user = await createTestUser(repository, {
          email: 'tolock@example.com',
        })

        // Act
        const lockedUser = UserBuilder.create()
          .withId(user.data.id)
          .withEmail(user.data.email)
          .withLockedAccount()
          .build()
        const result = await repository.update(lockedUser)

        // Assert
        expect(result.type).toBe('ok')
        if (result.type === 'ok') {
          expect(result.value.status.type).toBe('locked')
        }
      })
    })

    test('should return error when user not found', async () => {
      await withIsolatedSchema(async ({ db }) => {
        // Arrange
        const repository = new DrizzleUserRepository(db)
        const nonExistentId = randomUUID() as UserId
        const user = UserBuilder.create()
          .withId(nonExistentId)
          .withEmail('test@example.com')
          .build()

        // Act
        const result = await repository.update(user)

        // Assert
        expect(result.type).toBe('err')
        if (result.type === 'err') {
          expect(result.error.type).toBe('notFound')
        }
      })
    })
  })

  describe('search', () => {
    test('should search users by email pattern', async () => {
      await withIsolatedSchema(async ({ db }) => {
        // Arrange
        const repository = new DrizzleUserRepository(db)
        await createStandardUsers(repository)

        // Act
        const result = await repository.search(
          { email: '@example.com' },
          { limit: 10, offset: 0 }
        )

        // Assert
        expect(result.type).toBe('ok')
        if (result.type === 'ok') {
          // @example.comを持つユーザーは6人（customer2は@test.com）
          expect(result.value.total).toBe(6)
          expect(result.value.data.length).toBe(6)
          expect(
            result.value.data.every((u) =>
              u.data.email.includes('@example.com')
            )
          ).toBe(true)
        }
      })
    })

    test('should search users by role', async () => {
      await withIsolatedSchema(async ({ db }) => {
        // Arrange
        const repository = new DrizzleUserRepository(db)
        await createStandardUsers(repository)

        // Act
        const result = await repository.search(
          { role: 'staff' },
          { limit: 10, offset: 0 }
        )

        // Assert
        expect(result.type).toBe('ok')
        if (result.type === 'ok') {
          expect(result.value.total).toBe(2)
          expect(result.value.data.length).toBe(2)
          expect(result.value.data.every((u) => u.data.role === 'staff')).toBe(
            true
          )
        }
      })
    })

    test('should search users by status', async () => {
      await withIsolatedSchema(async ({ db }) => {
        // Arrange
        const repository = new DrizzleUserRepository(db)
        await createStandardUsers(repository)

        // Act
        const result = await repository.search(
          { status: 'locked' },
          { limit: 10, offset: 0 }
        )

        // Assert
        expect(result.type).toBe('ok')
        if (result.type === 'ok') {
          expect(result.value.total).toBe(1)
          expect(result.value.data.length).toBe(1)
          expect(result.value.data[0]?.status.type).toBe('locked')
        }
      })
    })

    test('should handle pagination', async () => {
      await withIsolatedSchema(async ({ db }) => {
        // Arrange
        const repository = new DrizzleUserRepository(db)
        await createStandardUsers(repository)

        // Act
        const result1 = await repository.search({}, { limit: 3, offset: 0 })
        const result2 = await repository.search({}, { limit: 3, offset: 3 })

        // Assert
        expect(result1.type).toBe('ok')
        expect(result2.type).toBe('ok')
        if (result1.type === 'ok' && result2.type === 'ok') {
          expect(result1.value.data.length).toBe(3)
          expect(result2.value.data.length).toBeGreaterThan(0)
          expect(result1.value.total).toBe(result2.value.total)
          // データが重複していないことを確認
          const ids1 = result1.value.data.map((u) => u.data.id)
          const ids2 = result2.value.data.map((u) => u.data.id)
          const intersection = ids1.filter((id) => ids2.includes(id))
          expect(intersection).toHaveLength(0)
        }
      })
    })

    test('should combine multiple search criteria', async () => {
      await withIsolatedSchema(async ({ db }) => {
        // Arrange
        const repository = new DrizzleUserRepository(db)
        await createStandardUsers(repository)

        // Act
        const result = await repository.search(
          { email: '@example.com', role: 'customer' },
          { limit: 10, offset: 0 }
        )

        // Assert
        expect(result.type).toBe('ok')
        if (result.type === 'ok') {
          expect(result.value.total).toBe(3) // customer1, locked user, unverified (customer2はtest.com)
          expect(
            result.value.data.every(
              (u) =>
                u.data.email.includes('@example.com') &&
                u.data.role === 'customer'
            )
          ).toBe(true)
        }
      })
    })

    test('should return empty results for no matches', async () => {
      await withIsolatedSchema(async ({ db }) => {
        // Arrange
        const repository = new DrizzleUserRepository(db)
        await createStandardUsers(repository)

        // Act
        const result = await repository.search(
          { email: 'nonexistent@domain.com' },
          { limit: 10, offset: 0 }
        )

        // Assert
        expect(result.type).toBe('ok')
        if (result.type === 'ok') {
          expect(result.value.total).toBe(0)
          expect(result.value.data.length).toBe(0)
        }
      })
    })
  })

  describe('findByPasswordResetToken', () => {
    test('should find user by password reset token', async () => {
      await withIsolatedSchema(async ({ db }) => {
        // Arrange
        const repository = new DrizzleUserRepository(db)
        const user = await createTestUser(repository, {
          email: 'reset@example.com',
          passwordResetToken: 'reset_token_123',
        })

        // Act
        const result =
          await repository.findByPasswordResetToken('reset_token_123')

        // Assert
        expect(result.type).toBe('ok')
        if (result.type === 'ok' && result.value) {
          expect(result.value.data.id).toBe(user.data.id)
          expect(result.value.data.email).toBe('reset@example.com')
        }
      })
    })

    test('should return null for invalid token', async () => {
      await withIsolatedSchema(async ({ db }) => {
        // Arrange
        const repository = new DrizzleUserRepository(db)

        // Act
        const result =
          await repository.findByPasswordResetToken('invalid_token')

        // Assert
        expect(result.type).toBe('ok')
        if (result.type === 'ok') {
          expect(result.value).toBeNull()
        }
      })
    })
  })

  describe('findByEmailVerificationToken', () => {
    test('should find user by email verification token', async () => {
      await withIsolatedSchema(async ({ db }) => {
        // Arrange
        const repository = new DrizzleUserRepository(db)
        const user = await createTestUser(repository, {
          email: 'verify@example.com',
          status: 'unverified',
          emailVerificationToken: 'verify_token_123',
        })

        // Act
        const result =
          await repository.findByEmailVerificationToken('verify_token_123')

        // Assert
        expect(result.type).toBe('ok')
        if (result.type === 'ok' && result.value) {
          expect(result.value.data.id).toBe(user.data.id)
          expect(result.value.data.email).toBe('verify@example.com')
          expect(result.value.status.type).toBe('unverified')
        }
      })
    })
  })

  describe('findById', () => {
    test('should find user by id', async () => {
      await withIsolatedSchema(async ({ db }) => {
        // Arrange
        const repository = new DrizzleUserRepository(db)
        const user = await createTestUser(repository, {
          email: 'findbyid@example.com',
        })

        // Act
        const result = await repository.findById(user.data.id)

        // Assert
        expect(result.type).toBe('ok')
        if (result.type === 'ok' && result.value) {
          expect(result.value.data.email).toBe('findbyid@example.com')
        }
      })
    })

    test('should return null when user not found', async () => {
      await withIsolatedSchema(async ({ db }) => {
        // Arrange
        const repository = new DrizzleUserRepository(db)
        const nonExistentId = randomUUID() as UserId

        // Act
        const result = await repository.findById(nonExistentId)

        // Assert
        expect(result.type).toBe('ok')
        if (result.type === 'ok') {
          expect(result.value).toBeNull()
        }
      })
    })
  })

  describe('delete', () => {
    test('should delete user', async () => {
      await withIsolatedSchema(async ({ db }) => {
        // Arrange
        const repository = new DrizzleUserRepository(db)
        const user = await createTestUser(repository, {
          email: 'todelete@example.com',
        })

        // Act
        const deleteResult = await repository.delete(user.data.id)

        // Assert
        expect(deleteResult.type).toBe('ok')

        // Verify user is deleted
        const findResult = await repository.findById(user.data.id)
        expect(findResult.type).toBe('ok')
        if (findResult.type === 'ok') {
          expect(findResult.value).toBeNull()
        }
      })
    })

    test('should return ok even when user not found', async () => {
      await withIsolatedSchema(async ({ db }) => {
        // Arrange
        const repository = new DrizzleUserRepository(db)
        const nonExistentId = randomUUID() as UserId

        // Act
        const result = await repository.delete(nonExistentId)

        // Assert
        // TODO: Current implementation returns ok for non-existent users
        // This might need to be changed to return an error in the repository
        expect(result.type).toBe('ok')
      })
    })
  })
})
