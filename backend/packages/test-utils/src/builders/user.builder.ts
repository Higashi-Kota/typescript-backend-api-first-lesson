import { randomUUID } from 'node:crypto'
import { err, ok } from '@beauty-salon-backend/domain'
import type {
  PasswordResetStatus,
  Result,
  TwoFactorStatus,
  User,
  UserAccountStatus,
  UserId,
  UserRole,
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
      status: { type: 'active' },
      data: {
        id: randomUUID() as UserId,
        email: `test-${randomUUID()}@example.com`,
        name: 'Test User',
        passwordHash: '$2b$10$YourHashedPasswordHere',
        role: 'customer' as UserRole,
        emailVerified: true,
        twoFactorStatus: { type: 'disabled' },
        passwordResetStatus: { type: 'none' },
        passwordHistory: [],
        trustedIpAddresses: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    }

    return new UserBuilder({
      type: 'building',
      partial: defaultUser,
    })
  }

  withId(id: UserId): UserBuilder {
    return match(this.state)
      .with({ type: 'building' }, ({ partial }) => {
        if (partial.data == null) {
          return new UserBuilder({
            type: 'error',
            error: 'User data not initialized',
          })
        }
        return new UserBuilder({
          type: 'building',
          partial: {
            ...partial,
            data: { ...partial.data, id },
          },
        })
      })
      .otherwise(() => this)
  }

  withEmail(email: string): UserBuilder {
    return match(this.state)
      .with({ type: 'building' }, ({ partial }) => {
        if (partial.data == null) {
          return new UserBuilder({
            type: 'error',
            error: 'User data not initialized',
          })
        }
        return new UserBuilder({
          type: 'building',
          partial: {
            ...partial,
            data: { ...partial.data, email },
          },
        })
      })
      .otherwise(() => this)
  }

  withName(name: string): UserBuilder {
    return match(this.state)
      .with({ type: 'building' }, ({ partial }) => {
        if (partial.data == null) {
          return new UserBuilder({
            type: 'error',
            error: 'User data not initialized',
          })
        }
        return new UserBuilder({
          type: 'building',
          partial: {
            ...partial,
            data: { ...partial.data, name },
          },
        })
      })
      .otherwise(() => this)
  }

  withRole(role: UserRole): UserBuilder {
    return match(this.state)
      .with({ type: 'building' }, ({ partial }) => {
        if (partial.data == null) {
          return new UserBuilder({
            type: 'error',
            error: 'User data not initialized',
          })
        }
        return new UserBuilder({
          type: 'building',
          partial: {
            ...partial,
            data: { ...partial.data, role },
          },
        })
      })
      .otherwise(() => this)
  }

  withStatus(status: UserAccountStatus): UserBuilder {
    return match(this.state)
      .with(
        { type: 'building' },
        ({ partial }) =>
          new UserBuilder({
            type: 'building',
            partial: {
              ...partial,
              status,
            },
          })
      )
      .otherwise(() => this)
  }

  with2FAEnabled(secret?: string, backupCodes?: string[]): UserBuilder {
    return this.withTwoFactorEnabled(secret, backupCodes)
  }

  withTwoFactorEnabled(secret?: string, backupCodes?: string[]): UserBuilder {
    const twoFactorStatus: TwoFactorStatus = {
      type: 'enabled',
      secret: secret ?? `test_secret_${randomUUID()}`,
      backupCodes: backupCodes ?? ['CODE1', 'CODE2', 'CODE3', 'CODE4'],
    }

    return match(this.state)
      .with({ type: 'building' }, ({ partial }) => {
        if (partial.data == null) {
          return new UserBuilder({
            type: 'error',
            error: 'User data not initialized',
          })
        }
        return new UserBuilder({
          type: 'building',
          partial: {
            ...partial,
            data: { ...partial.data, twoFactorStatus },
          },
        })
      })
      .otherwise(() => this)
  }

  withUnverifiedEmail(token?: string): UserBuilder {
    const status: UserAccountStatus = {
      type: 'unverified',
      emailVerificationToken: token || `token_${randomUUID()}`,
      tokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
    }

    return match(this.state)
      .with({ type: 'building' }, ({ partial }) => {
        if (partial.data == null) {
          return new UserBuilder({
            type: 'error',
            error: 'User data not initialized',
          })
        }
        return new UserBuilder({
          type: 'building',
          partial: {
            ...partial,
            status,
            data: { ...partial.data, emailVerified: false },
          },
        })
      })
      .otherwise(() => this)
  }

  withLockedAccount(reason?: string, failedAttempts?: number): UserBuilder {
    const status: UserAccountStatus = {
      type: 'locked',
      reason: reason ?? 'Too many failed login attempts',
      lockedAt: new Date(),
      failedAttempts: failedAttempts ?? 5,
    }

    return match(this.state)
      .with(
        { type: 'building' },
        ({ partial }) =>
          new UserBuilder({
            type: 'building',
            partial: {
              ...partial,
              status,
            },
          })
      )
      .otherwise(() => this)
  }

  withPasswordResetToken(token?: string): UserBuilder {
    return this.withPasswordResetRequested(token)
  }

  withPasswordResetRequested(token?: string): UserBuilder {
    const passwordResetStatus: PasswordResetStatus = {
      type: 'requested',
      token: token || `reset_${randomUUID()}`,
      tokenExpiry: new Date(Date.now() + 15 * 60 * 1000),
    }

    return match(this.state)
      .with({ type: 'building' }, ({ partial }) => {
        if (partial.data == null) {
          return new UserBuilder({
            type: 'error',
            error: 'User data not initialized',
          })
        }
        return new UserBuilder({
          type: 'building',
          partial: {
            ...partial,
            data: { ...partial.data, passwordResetStatus },
          },
        })
      })
      .otherwise(() => this)
  }

  build(): User {
    return match(this.state)
      .with({ type: 'building' }, ({ partial }) => {
        if (partial.status == null || partial.data == null) {
          throw new Error('User data is incomplete')
        }

        const user: User = {
          status: partial.status,
          data: partial.data,
        }

        return user
      })
      .with({ type: 'built' }, ({ data }) => data)
      .with({ type: 'error' }, ({ error }) => {
        throw new Error(error)
      })
      .exhaustive()
  }

  async buildAsync(): Promise<Result<User, string>> {
    return match(this.state)
      .with({ type: 'building' }, ({ partial }) => {
        if (partial.status == null || partial.data == null) {
          return err('User data is incomplete')
        }

        const user: User = {
          status: partial.status,
          data: partial.data,
        }

        return ok(user)
      })
      .with({ type: 'built' }, ({ data }) => ok(data))
      .with({ type: 'error' }, ({ error }) => err(error))
      .exhaustive()
  }
}
