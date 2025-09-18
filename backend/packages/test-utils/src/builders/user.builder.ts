import { randomUUID } from 'node:crypto'
import { err, ok } from '@beauty-salon-backend/domain'
import type {
  AuthUserRole,
  Result,
  User,
  UserId,
} from '@beauty-salon-backend/domain'
import { match } from 'ts-pattern'

export type TestUser = User

export type TestDataState<T> =
  | { type: 'building'; partial: Partial<T> }
  | { type: 'built'; data: T }
  | { type: 'error'; error: string }

export class UserBuilder {
  private constructor(private readonly state: TestDataState<TestUser>) {}

  static create(): UserBuilder {
    const defaultUser: Partial<TestUser> = {
      id: randomUUID() as UserId,
      email: `test-${randomUUID()}@example.com`,
      name: 'Test User',
      role: 'customer',
      accountStatus: 'active',
      emailVerified: true,
      twoFactorEnabled: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    return new UserBuilder({
      type: 'building',
      partial: defaultUser,
    })
  }

  withId(id: UserId): UserBuilder {
    return match(this.state)
      .with({ type: 'building' }, ({ partial }) => {
        return new UserBuilder({
          type: 'building',
          partial: {
            ...partial,
            id,
          },
        })
      })
      .otherwise(() => this)
  }

  withEmail(email: string): UserBuilder {
    return match(this.state)
      .with({ type: 'building' }, ({ partial }) => {
        return new UserBuilder({
          type: 'building',
          partial: {
            ...partial,
            email,
          },
        })
      })
      .otherwise(() => this)
  }

  withName(name: string): UserBuilder {
    return match(this.state)
      .with({ type: 'building' }, ({ partial }) => {
        return new UserBuilder({
          type: 'building',
          partial: {
            ...partial,
            name,
          },
        })
      })
      .otherwise(() => this)
  }

  withRole(role: AuthUserRole): UserBuilder {
    return match(this.state)
      .with({ type: 'building' }, ({ partial }) => {
        return new UserBuilder({
          type: 'building',
          partial: {
            ...partial,
            role,
          },
        })
      })
      .otherwise(() => this)
  }

  withAccountStatus(status: 'active' | 'suspended' | 'locked'): UserBuilder {
    return match(this.state)
      .with(
        { type: 'building' },
        ({ partial }) =>
          new UserBuilder({
            type: 'building',
            partial: {
              ...partial,
              accountStatus: status,
            },
          })
      )
      .otherwise(() => this)
  }

  withTwoFactorEnabled(enabled = true): UserBuilder {
    return match(this.state)
      .with({ type: 'building' }, ({ partial }) => {
        return new UserBuilder({
          type: 'building',
          partial: {
            ...partial,
            twoFactorEnabled: enabled,
          },
        })
      })
      .otherwise(() => this)
  }

  withEmailVerified(verified: boolean): UserBuilder {
    return match(this.state)
      .with({ type: 'building' }, ({ partial }) => {
        return new UserBuilder({
          type: 'building',
          partial: {
            ...partial,
            emailVerified: verified,
          },
        })
      })
      .otherwise(() => this)
  }

  withPasswordHash(passwordHash: string): UserBuilder {
    return match(this.state)
      .with({ type: 'building' }, ({ partial }) => {
        return new UserBuilder({
          type: 'building',
          partial: {
            ...partial,
            passwordHash,
          },
        })
      })
      .otherwise(() => this)
  }

  withLastLoginAt(lastLoginAt: string): UserBuilder {
    return match(this.state)
      .with({ type: 'building' }, ({ partial }) => {
        return new UserBuilder({
          type: 'building',
          partial: {
            ...partial,
            lastLoginAt,
          },
        })
      })
      .otherwise(() => this)
  }

  build(): Result<TestUser, string> {
    return match(this.state)
      .with({ type: 'building' }, ({ partial }) => {
        // Validate required fields
        if (!partial.id) {
          return err('Missing required field: id')
        }
        if (!partial.email) {
          return err('Missing required field: email')
        }
        if (!partial.role) {
          return err('Missing required field: role')
        }
        if (!partial.accountStatus) {
          return err('Missing required field: accountStatus')
        }
        if (partial.emailVerified === undefined) {
          return err('Missing required field: emailVerified')
        }
        if (partial.twoFactorEnabled === undefined) {
          return err('Missing required field: twoFactorEnabled')
        }
        if (!partial.createdAt) {
          return err('Missing required field: createdAt')
        }
        if (!partial.updatedAt) {
          return err('Missing required field: updatedAt')
        }

        return ok(partial as TestUser)
      })
      .with({ type: 'built' }, ({ data }) => ok(data))
      .with({ type: 'error' }, ({ error }) => err(error))
      .exhaustive()
  }

  buildOrThrow(): TestUser {
    const result = this.build()
    return match(result)
      .with({ type: 'ok' }, ({ value }) => value)
      .with({ type: 'err' }, ({ error }) => {
        throw new Error(`Failed to build user: ${error}`)
      })
      .exhaustive()
  }
}
