import type {
  PaginatedResult,
  PaginationParams,
  PasswordResetStatus,
  Result,
  TwoFactorStatus,
  User,
  UserAccountStatus,
  UserId,
  UserRepository,
  UserRepositoryError,
  UserSearchCriteria,
} from '@beauty-salon-backend/domain'
import { err, ok } from '@beauty-salon-backend/domain'
import { and, desc, eq } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { v4 as uuidv4 } from 'uuid'
import { users } from '../database/schema'
import { safeLike } from './security-patches'

export class DrizzleUserRepository implements UserRepository {
  constructor(private db: PostgresJsDatabase) {}

  async findById(
    id: UserId
  ): Promise<Result<User | null, UserRepositoryError>> {
    try {
      const results = await this.db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1)

      if (results.length === 0) {
        return ok(null)
      }

      const firstResult = results[0]
      if (!firstResult) {
        return ok(null)
      }

      const user = this.mapToUser(firstResult)
      return ok(user)
    } catch (error) {
      return err({
        type: 'databaseError',
        message:
          error instanceof Error ? error.message : 'Unknown database error',
      })
    }
  }

  async findByEmail(
    email: string
  ): Promise<Result<User | null, UserRepositoryError>> {
    try {
      const results = await this.db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1)

      if (results.length === 0) {
        return ok(null)
      }

      const firstResult = results[0]
      if (!firstResult) {
        return ok(null)
      }

      const user = this.mapToUser(firstResult)
      return ok(user)
    } catch (error) {
      return err({
        type: 'databaseError',
        message:
          error instanceof Error ? error.message : 'Unknown database error',
      })
    }
  }

  async findByPasswordResetToken(
    token: string
  ): Promise<Result<User | null, UserRepositoryError>> {
    try {
      const results = await this.db
        .select()
        .from(users)
        .where(eq(users.passwordResetToken, token))
        .limit(1)

      if (results.length === 0) {
        return ok(null)
      }

      const firstResult = results[0]
      if (!firstResult) {
        return ok(null)
      }

      const user = this.mapToUser(firstResult)
      return ok(user)
    } catch (error) {
      return err({
        type: 'databaseError',
        message:
          error instanceof Error ? error.message : 'Unknown database error',
      })
    }
  }

  async findByEmailVerificationToken(
    token: string
  ): Promise<Result<User | null, UserRepositoryError>> {
    try {
      const results = await this.db
        .select()
        .from(users)
        .where(eq(users.emailVerificationToken, token))
        .limit(1)

      if (results.length === 0) {
        return ok(null)
      }

      const firstResult = results[0]
      if (!firstResult) {
        return ok(null)
      }

      const user = this.mapToUser(firstResult)
      return ok(user)
    } catch (error) {
      return err({
        type: 'databaseError',
        message:
          error instanceof Error ? error.message : 'Unknown database error',
      })
    }
  }

  async save(user: User): Promise<Result<User, UserRepositoryError>> {
    try {
      const dbUser = this.mapToDbUser(user)

      const existing = await this.db
        .select()
        .from(users)
        .where(eq(users.email, dbUser.email))
        .limit(1)

      if (existing.length > 0) {
        return err({
          type: 'alreadyExists',
          email: dbUser.email,
        })
      }

      const insertedRows = await this.db
        .insert(users)
        .values(dbUser)
        .returning()

      const inserted = insertedRows[0]
      if (!inserted) {
        return err({
          type: 'databaseError',
          message: 'Failed to insert user',
        })
      }

      const savedUser = this.mapToUser(inserted)
      return ok(savedUser)
    } catch (error) {
      console.error('User save error:', error)
      if (error instanceof Error && error.message.includes('Failed query')) {
        return err({
          type: 'databaseError',
          message: error.message,
        })
      }
      return err({
        type: 'databaseError',
        message:
          error instanceof Error ? error.message : 'Unknown database error',
      })
    }
  }

  async update(user: User): Promise<Result<User, UserRepositoryError>> {
    try {
      const dbUser = this.mapToDbUser(user)

      const updatedRows = await this.db
        .update(users)
        .set(dbUser)
        .where(eq(users.id, user.data.id))
        .returning()

      const updated = updatedRows[0]
      if (!updated) {
        return err({
          type: 'notFound',
          userId: user.data.id,
        })
      }

      const updatedUser = this.mapToUser(updated)
      return ok(updatedUser)
    } catch (error) {
      return err({
        type: 'databaseError',
        message:
          error instanceof Error ? error.message : 'Unknown database error',
      })
    }
  }

  async delete(id: UserId): Promise<Result<void, UserRepositoryError>> {
    try {
      await this.db.delete(users).where(eq(users.id, id))

      return ok(undefined)
    } catch (error) {
      return err({
        type: 'databaseError',
        message:
          error instanceof Error ? error.message : 'Unknown database error',
      })
    }
  }

  async search(
    criteria: UserSearchCriteria,
    pagination: PaginationParams
  ): Promise<Result<PaginatedResult<User>, UserRepositoryError>> {
    try {
      const conditions = []

      if (criteria.email) {
        conditions.push(safeLike(users.email, criteria.email))
      }

      if (criteria.role) {
        conditions.push(
          eq(users.role, criteria.role as 'customer' | 'staff' | 'admin')
        )
      }

      if (criteria.status) {
        conditions.push(
          eq(
            users.status,
            criteria.status as
              | 'active'
              | 'unverified'
              | 'locked'
              | 'suspended'
              | 'deleted'
          )
        )
      }

      if (criteria.emailVerified !== undefined) {
        conditions.push(eq(users.emailVerified, criteria.emailVerified))
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined

      const [results, countResult] = await Promise.all([
        this.db
          .select()
          .from(users)
          .where(whereClause)
          .orderBy(desc(users.createdAt))
          .limit(pagination.limit)
          .offset(pagination.offset),
        this.db.select({ count: users.id }).from(users).where(whereClause),
      ])

      const items = results.map(this.mapToUser)
      const total = countResult.length

      return ok({
        data: items,
        total,
        limit: pagination.limit,
        offset: pagination.offset,
      })
    } catch (error) {
      return err({
        type: 'databaseError',
        message:
          error instanceof Error ? error.message : 'Unknown database error',
      })
    }
  }

  private mapToUser(dbUser: typeof users.$inferSelect): User {
    // Map account status
    let status: UserAccountStatus
    switch (dbUser.status) {
      case 'active':
        status = { type: 'active' }
        break
      case 'unverified':
        status = {
          type: 'unverified',
          emailVerificationToken: dbUser.emailVerificationToken || '',
          tokenExpiry: dbUser.emailVerificationTokenExpiry || new Date(),
        }
        break
      case 'locked':
        status = {
          type: 'locked',
          reason: 'Too many failed login attempts',
          lockedAt: dbUser.lockedAt || new Date(),
          failedAttempts: dbUser.failedLoginAttempts,
        }
        break
      case 'suspended':
        status = {
          type: 'suspended',
          reason: 'Account suspended by administrator',
          suspendedAt: dbUser.updatedAt,
        }
        break
      case 'deleted':
        status = {
          type: 'deleted',
          deletedAt: dbUser.updatedAt,
        }
        break
      default:
        status = { type: 'active' }
    }

    // Map 2FA status
    let twoFactorStatus: TwoFactorStatus
    switch (dbUser.twoFactorStatus) {
      case 'disabled':
        twoFactorStatus = { type: 'disabled' }
        break
      case 'pending':
        twoFactorStatus = {
          type: 'pending',
          secret: dbUser.twoFactorSecret || '',
          qrCodeUrl: '', // Generated dynamically when needed
        }
        break
      case 'enabled':
        twoFactorStatus = {
          type: 'enabled',
          secret: dbUser.twoFactorSecret || '',
          backupCodes: dbUser.backupCodes || [],
        }
        break
      default:
        twoFactorStatus = { type: 'disabled' }
    }

    // Map password reset status
    let passwordResetStatus: PasswordResetStatus
    if (dbUser.passwordResetToken && dbUser.passwordResetTokenExpiry) {
      passwordResetStatus = {
        type: 'requested',
        token: dbUser.passwordResetToken,
        tokenExpiry: dbUser.passwordResetTokenExpiry,
      }
    } else {
      passwordResetStatus = { type: 'none' }
    }

    return {
      status,
      data: {
        id: dbUser.id as UserId,
        email: dbUser.email,
        name: dbUser.name,
        passwordHash: dbUser.passwordHash,
        role: dbUser.role as 'customer' | 'staff' | 'admin',
        emailVerified: dbUser.emailVerified,
        twoFactorStatus,
        passwordResetStatus,
        lastPasswordChangeAt: dbUser.lastPasswordChangeAt || undefined,
        passwordHistory: dbUser.passwordHistory || [],
        trustedIpAddresses: dbUser.trustedIpAddresses || [],
        customerId: dbUser.customerId || undefined,
        staffId: dbUser.staffId || undefined,
        createdAt: dbUser.createdAt,
        updatedAt: dbUser.updatedAt,
        lastLoginAt: dbUser.lastLoginAt || undefined,
        lastLoginIp: dbUser.lastLoginIp || undefined,
      },
    }
  }

  private mapToDbUser(user: User): typeof users.$inferInsert {
    const dbUser: typeof users.$inferInsert = {
      id: user.data.id || uuidv4(),
      email: user.data.email,
      name: user.data.name,
      passwordHash: user.data.passwordHash,
      role: user.data.role,
      status: this.getDbStatus(user.status),
      emailVerified: user.data.emailVerified,
      emailVerificationToken:
        user.status.type === 'unverified'
          ? user.status.emailVerificationToken
          : null,
      emailVerificationTokenExpiry:
        user.status.type === 'unverified' ? user.status.tokenExpiry : null,
      twoFactorStatus: this.getDbTwoFactorStatus(user.data.twoFactorStatus),
      twoFactorSecret:
        user.data.twoFactorStatus.type !== 'disabled'
          ? user.data.twoFactorStatus.secret
          : null,
      backupCodes:
        user.data.twoFactorStatus.type === 'enabled'
          ? user.data.twoFactorStatus.backupCodes
          : null,
      failedLoginAttempts:
        user.status.type === 'locked' ? user.status.failedAttempts : 0,
      lockedAt: user.status.type === 'locked' ? user.status.lockedAt : null,
      passwordResetToken:
        user.data.passwordResetStatus.type === 'requested'
          ? user.data.passwordResetStatus.token
          : null,
      passwordResetTokenExpiry:
        user.data.passwordResetStatus.type === 'requested'
          ? user.data.passwordResetStatus.tokenExpiry
          : null,
      lastPasswordChangeAt: user.data.lastPasswordChangeAt ?? null,
      passwordHistory: user.data.passwordHistory,
      trustedIpAddresses: user.data.trustedIpAddresses,
      customerId: user.data.customerId ?? null,
      staffId: user.data.staffId ?? null,
      createdAt: user.data.createdAt,
      updatedAt: user.data.updatedAt,
      lastLoginAt: user.data.lastLoginAt ?? null,
      lastLoginIp: user.data.lastLoginIp ?? null,
    }

    return dbUser
  }

  private getDbStatus(
    status: UserAccountStatus
  ): 'active' | 'unverified' | 'locked' | 'suspended' | 'deleted' {
    switch (status.type) {
      case 'active':
        return 'active'
      case 'unverified':
        return 'unverified'
      case 'locked':
        return 'locked'
      case 'suspended':
        return 'suspended'
      case 'deleted':
        return 'deleted'
      default:
        return 'active'
    }
  }

  private getDbTwoFactorStatus(
    status: TwoFactorStatus
  ): 'disabled' | 'pending' | 'enabled' {
    switch (status.type) {
      case 'disabled':
        return 'disabled'
      case 'pending':
        return 'pending'
      case 'enabled':
        return 'enabled'
      default:
        return 'disabled'
    }
  }
}
