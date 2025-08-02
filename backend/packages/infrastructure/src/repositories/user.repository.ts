import { users } from '@beauty-salon-backend/database'
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
import { and, desc, eq, sql } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { v4 as uuidv4 } from 'uuid'
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
      if (firstResult === undefined) {
        return ok(null)
      }

      const user = this.mapToUser(firstResult)
      return ok(user)
    } catch (error) {
      return err({
        type: 'databaseError' as const,
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
      if (firstResult === undefined) {
        return ok(null)
      }

      const user = this.mapToUser(firstResult)
      return ok(user)
    } catch (error) {
      return err({
        type: 'databaseError' as const,
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
        .where(eq(users.password_reset_token, token))
        .limit(1)

      if (results.length === 0) {
        return ok(null)
      }

      const firstResult = results[0]
      if (firstResult === undefined) {
        return ok(null)
      }

      const user = this.mapToUser(firstResult)
      return ok(user)
    } catch (error) {
      return err({
        type: 'databaseError' as const,
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
        .where(eq(users.email_verification_token, token))
        .limit(1)

      if (results.length === 0) {
        return ok(null)
      }

      const firstResult = results[0]
      if (firstResult === undefined) {
        return ok(null)
      }

      const user = this.mapToUser(firstResult)
      return ok(user)
    } catch (error) {
      return err({
        type: 'databaseError' as const,
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
          type: 'alreadyExists' as const,
          email: dbUser.email,
        })
      }

      const insertedRows = await this.db
        .insert(users)
        .values(dbUser)
        .returning()

      const inserted = insertedRows[0]
      if (inserted === undefined) {
        return err({
          type: 'databaseError' as const,
          message: 'Failed to insert user',
        })
      }

      const savedUser = this.mapToUser(inserted)
      return ok(savedUser)
    } catch (error) {
      return err({
        type: 'databaseError' as const,
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
      if (updated === undefined) {
        return err({
          type: 'notFound' as const,
          userId: user.data.id,
        })
      }

      const updatedUser = this.mapToUser(updated)
      return ok(updatedUser)
    } catch (error) {
      return err({
        type: 'databaseError' as const,
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
        type: 'databaseError' as const,
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

      // Note: status column doesn't exist in the current schema
      // if (criteria.status) {
      //   conditions.push(
      //     eq(
      //       users.status,
      //       criteria.status as
      //         | 'active'
      //         | 'unverified'
      //         | 'locked'
      //         | 'suspended'
      //         | 'deleted'
      //     )
      //   )
      // }

      if (criteria.emailVerified !== undefined) {
        conditions.push(eq(users.email_verified, criteria.emailVerified))
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined

      // Count total matching records
      const countResult = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(whereClause)

      const total = Number(countResult[0]?.count ?? 0)

      // Get paginated results
      const results = await this.db
        .select()
        .from(users)
        .where(whereClause)
        .orderBy(desc(users.created_at))
        .limit(pagination.limit)
        .offset(pagination.offset)

      // Map to domain objects and filter by derived fields (status only)
      let items = results.map(this.mapToUser)

      // Filter by status if specified (still needs to be done in memory as it's derived)
      if (criteria.status) {
        items = items.filter((user) => user.status.type === criteria.status)
        // Adjust total count if filtering by status
        const allForStatus = await this.db
          .select()
          .from(users)
          .where(whereClause)
        const allMapped = allForStatus.map(this.mapToUser)
        const statusFiltered = allMapped.filter(
          (user) => user.status.type === criteria.status
        )
        return ok({
          data: items,
          total: statusFiltered.length,
          limit: pagination.limit,
          offset: pagination.offset,
        })
      }

      return ok({
        data: items,
        total,
        limit: pagination.limit,
        offset: pagination.offset,
      })
    } catch (error) {
      return err({
        type: 'databaseError' as const,
        message:
          error instanceof Error ? error.message : 'Unknown database error',
      })
    }
  }

  private mapToUser(dbUser: typeof users.$inferSelect): User {
    // Map account status
    const status: UserAccountStatus = (() => {
      // Note: status column doesn't exist in schema, deriving from other fields
      if (dbUser.locked_at) {
        return {
          type: 'locked' as const,
          reason: 'Too many failed login attempts',
          lockedAt: new Date(dbUser.locked_at),
          failedAttempts: dbUser.failed_login_attempts,
        }
      }
      if (!dbUser.email_verified) {
        return {
          type: 'unverified' as const,
          emailVerificationToken: dbUser.email_verification_token ?? '',
          tokenExpiry: dbUser.email_verification_token_expiry
            ? new Date(dbUser.email_verification_token_expiry)
            : new Date(),
        }
      }
      return { type: 'active' as const }
    })()

    // Map 2FA status
    const twoFactorStatus: TwoFactorStatus = (() => {
      // Note: two_factor_status column doesn't exist, deriving from two_factor_secret
      if (dbUser.two_factor_secret) {
        return {
          type: 'enabled' as const,
          secret: dbUser.two_factor_secret,
          backupCodes: Array.isArray(dbUser.backup_codes)
            ? dbUser.backup_codes
            : [],
        }
      }
      return { type: 'disabled' as const }
    })()

    // Map password reset status
    const passwordResetStatus: PasswordResetStatus = (() => {
      if (dbUser.password_reset_token && dbUser.password_reset_token_expiry) {
        return {
          type: 'requested' as const,
          token: dbUser.password_reset_token,
          tokenExpiry: new Date(dbUser.password_reset_token_expiry),
        }
      }
      return { type: 'none' as const }
    })()

    return {
      status,
      data: {
        id: dbUser.id as UserId,
        email: dbUser.email,
        name: dbUser.name,
        passwordHash: dbUser.password_hash,
        role: dbUser.role as 'customer' | 'staff' | 'admin',
        emailVerified: dbUser.email_verified,
        twoFactorStatus,
        passwordResetStatus,
        lastPasswordChangeAt: dbUser.last_password_change_at
          ? new Date(dbUser.last_password_change_at)
          : undefined,
        passwordHistory: Array.isArray(dbUser.password_history)
          ? dbUser.password_history
          : [],
        trustedIpAddresses: Array.isArray(dbUser.trusted_ip_addresses)
          ? dbUser.trusted_ip_addresses
          : [],
        customerId: dbUser.customer_id ?? undefined,
        staffId: dbUser.staff_id ?? undefined,
        createdAt: new Date(dbUser.created_at),
        updatedAt: new Date(dbUser.updated_at),
        lastLoginAt: dbUser.last_login_at
          ? new Date(dbUser.last_login_at)
          : undefined,
        lastLoginIp: dbUser.last_login_ip ?? undefined,
      },
    }
  }

  private mapToDbUser(user: User): typeof users.$inferInsert {
    const dbUser: typeof users.$inferInsert = {
      id: user.data.id ?? uuidv4(),
      email: user.data.email,
      name: user.data.name,
      password_hash: user.data.passwordHash,
      role: user.data.role,
      email_verified: user.data.emailVerified,
      email_verification_token:
        user.status.type === 'unverified'
          ? user.status.emailVerificationToken
          : null,
      email_verification_token_expiry:
        user.status.type === 'unverified'
          ? user.status.tokenExpiry.toISOString()
          : null,
      // Note: two_factor_status column doesn't exist in schema
      two_factor_secret:
        user.data.twoFactorStatus.type !== 'disabled'
          ? user.data.twoFactorStatus.secret
          : null,
      backup_codes:
        user.data.twoFactorStatus.type === 'enabled'
          ? user.data.twoFactorStatus.backupCodes
          : null,
      failed_login_attempts:
        user.status.type === 'locked' ? user.status.failedAttempts : 0,
      locked_at:
        user.status.type === 'locked'
          ? user.status.lockedAt.toISOString()
          : null,
      password_reset_token:
        user.data.passwordResetStatus.type === 'requested'
          ? user.data.passwordResetStatus.token
          : null,
      password_reset_token_expiry:
        user.data.passwordResetStatus.type === 'requested'
          ? user.data.passwordResetStatus.tokenExpiry.toISOString()
          : null,
      last_password_change_at:
        user.data.lastPasswordChangeAt?.toISOString() ?? null,
      password_history: user.data.passwordHistory,
      trusted_ip_addresses: user.data.trustedIpAddresses,
      customer_id: user.data.customerId ?? null,
      staff_id: user.data.staffId ?? null,
      created_at: user.data.createdAt.toISOString(),
      updated_at: user.data.updatedAt.toISOString(),
      last_login_at: user.data.lastLoginAt?.toISOString() ?? null,
      last_login_ip: user.data.lastLoginIp ?? null,
    }

    return dbUser
  }

  // Removed unused methods - status columns don't exist in schema
}
