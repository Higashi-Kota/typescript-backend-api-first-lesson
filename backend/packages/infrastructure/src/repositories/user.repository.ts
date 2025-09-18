/**
 * User Repository Implementation
 * Uses the new Sum type-based User domain model
 */

import { users } from '@beauty-salon-backend/database'
import type {
  PaginatedResult,
  PaginationParams,
  Result,
  User,
  UserId,
  UserRepository,
  UserRepositoryError,
  UserSearchCriteria,
} from '@beauty-salon-backend/domain'
import { err, ok } from '@beauty-salon-backend/domain'
import { and, desc, eq, or, sql } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { safeLike } from './security-patches'

// Simple mapper functions until proper mappers are implemented
const mapDbUserToDomain = (dbUser: typeof users.$inferSelect): User => {
  return dbUser as any // Temporary - should use proper mapping
}

const mapUserToDbInsert = (user: User): typeof users.$inferInsert => {
  return user as any // Temporary - should use proper mapping
}

const mapUserToDbUpdate = (
  user: Partial<User>
): Partial<typeof users.$inferSelect> => {
  return user as any // Temporary - should use proper mapping
}

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

      const user = mapDbUserToDomain(firstResult)
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

      const user = mapDbUserToDomain(firstResult)
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
        .where(eq(users.passwordResetToken, token))
        .limit(1)

      if (results.length === 0) {
        return ok(null)
      }

      const firstResult = results[0]
      if (firstResult === undefined) {
        return ok(null)
      }

      const user = mapDbUserToDomain(firstResult)
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
        .where(eq(users.emailVerificationToken, token))
        .limit(1)

      if (results.length === 0) {
        return ok(null)
      }

      const firstResult = results[0]
      if (firstResult === undefined) {
        return ok(null)
      }

      const user = mapDbUserToDomain(firstResult)
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
      // Check if user with email already exists
      const existing = await this.db
        .select()
        .from(users)
        .where(eq(users.email, user.email))
        .limit(1)

      if (existing.length > 0 && existing[0]?.id !== user.id) {
        return err({
          type: 'alreadyExists' as const,
          email: user.email,
        })
      }

      const dbUser = mapUserToDbInsert(user)

      // Upsert operation
      const insertedRows = await this.db
        .insert(users)
        .values(dbUser)
        .onConflictDoUpdate({
          target: users.id,
          set: mapUserToDbUpdate(user),
        })
        .returning()

      const inserted = insertedRows[0]
      if (inserted === undefined) {
        return err({
          type: 'databaseError' as const,
          message: 'Failed to save user',
        })
      }

      const savedUser = mapDbUserToDomain(inserted)
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
      const dbUpdates = mapUserToDbUpdate(user)

      const updatedRows = await this.db
        .update(users)
        .set(dbUpdates)
        .where(eq(users.id, user.id))
        .returning()

      const updated = updatedRows[0]
      if (updated === undefined) {
        return err({
          type: 'notFound' as const,
          userId: user.id,
        })
      }

      const updatedUser = mapDbUserToDomain(updated)
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
      // Soft delete by updating status
      const deletedRows = await this.db
        .update(users)
        .set({
          status: 'deleted',
          deletedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .where(eq(users.id, id))
        .returning()

      if (deletedRows.length === 0) {
        return err({
          type: 'notFound' as const,
          userId: id,
        })
      }

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

      if (criteria.status) {
        conditions.push(
          eq(
            users.status,
            criteria.status as 'active' | 'inactive' | 'suspended' | 'deleted'
          )
        )
      }

      if (criteria.emailVerified !== undefined) {
        conditions.push(eq(users.emailVerified, criteria.emailVerified))
      }

      // Exclude soft-deleted users by default
      conditions.push(
        or(
          eq(users.status, 'active'),
          eq(users.status, 'inactive'),
          eq(users.status, 'suspended')
        )
      )

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined

      // Count query
      const countResult = await this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(users)
        .where(whereClause)

      const total = countResult[0]?.count ?? 0

      // Data query
      const results = await this.db
        .select()
        .from(users)
        .where(whereClause)
        .orderBy(desc(users.createdAt))
        .limit(pagination.limit)
        .offset(pagination.offset)

      const mappedUsers = results.map(mapDbUserToDomain)

      return ok({
        data: mappedUsers,
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
}
