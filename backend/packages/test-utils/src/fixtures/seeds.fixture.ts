import type { User, UserRepository } from '@beauty-salon-backend/domain'
import { UserBuilder } from '../builders/user.builder.js'
import { test as databaseTest } from './database.fixture.js'

export interface UserSeeds {
  admin: User
  staff1: User
  staff2: User
  customer1: User
  customer2: User
  locked: User
  unverified: User
}

export interface SeedingFixture {
  /**
   * テスト用ユーザーをシードする
   */
  seedUsers: (repository: UserRepository) => Promise<UserSeeds>
}

export const testWithSeeds = databaseTest.extend<{
  seeding: SeedingFixture
}>({
  // biome-ignore lint/correctness/noEmptyPattern: vitestのfixtureパターン
  seeding: async ({}, use) => {
    const seedingFixture: SeedingFixture = {
      seedUsers: async (repository: UserRepository) => {
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
              .withAccountStatus('locked')
              .withName('Locked User')
          ),
          unverified: await createUser(
            repository,
            UserBuilder.create()
              .withEmail('unverified@example.com')
              .withEmailVerified(false)
              .withName('Unverified User')
          ),
        }

        return users
      },
    }

    await use(seedingFixture)
  },
})

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
