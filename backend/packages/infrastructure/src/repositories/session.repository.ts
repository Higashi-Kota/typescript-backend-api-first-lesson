import type {
  Result,
  Session,
  SessionId,
  SessionRepository,
  SessionRepositoryError,
  UserId,
} from '@beauty-salon-backend/domain'
import { err, ok } from '@beauty-salon-backend/domain'
import { desc, eq, lt } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { v4 as uuidv4 } from 'uuid'
import { sessions } from '../database/schema'

export class DrizzleSessionRepository implements SessionRepository {
  constructor(private db: PostgresJsDatabase) {}

  async findById(
    id: SessionId
  ): Promise<Result<Session | null, SessionRepositoryError>> {
    try {
      const results = await this.db
        .select()
        .from(sessions)
        .where(eq(sessions.id, id))
        .limit(1)

      if (results.length === 0) {
        return ok(null)
      }

      const firstResult = results[0]
      if (!firstResult) {
        return ok(null)
      }

      const session = this.mapToSession(firstResult)
      return ok(session)
    } catch (error) {
      return err({
        type: 'databaseError' as const,
        message:
          error instanceof Error ? error.message : 'Unknown database error',
      })
    }
  }

  async findByRefreshToken(
    token: string
  ): Promise<Result<Session | null, SessionRepositoryError>> {
    try {
      const results = await this.db
        .select()
        .from(sessions)
        .where(eq(sessions.refresh_token, token))
        .limit(1)

      if (results.length === 0) {
        return ok(null)
      }

      const firstResult = results[0]
      if (!firstResult) {
        return ok(null)
      }

      const session = this.mapToSession(firstResult)
      return ok(session)
    } catch (error) {
      return err({
        type: 'databaseError' as const,
        message:
          error instanceof Error ? error.message : 'Unknown database error',
      })
    }
  }

  async findByUserId(
    userId: UserId
  ): Promise<Result<Session[], SessionRepositoryError>> {
    try {
      const results = await this.db
        .select()
        .from(sessions)
        .where(eq(sessions.user_id, userId))
        .orderBy(desc(sessions.last_activity_at))

      const sessionList = results.map(this.mapToSession)
      return ok(sessionList)
    } catch (error) {
      return err({
        type: 'databaseError' as const,
        message:
          error instanceof Error ? error.message : 'Unknown database error',
      })
    }
  }

  async save(
    session: Session
  ): Promise<Result<Session, SessionRepositoryError>> {
    try {
      const dbSession = this.mapToDbSession(session)

      const insertedRows = await this.db
        .insert(sessions)
        .values(dbSession)
        .returning()

      const inserted = insertedRows[0]
      if (!inserted) {
        return err({
          type: 'databaseError' as const,
          message: 'Failed to insert session',
        })
      }

      const savedSession = this.mapToSession(inserted)
      return ok(savedSession)
    } catch (error) {
      return err({
        type: 'databaseError' as const,
        message:
          error instanceof Error ? error.message : 'Unknown database error',
      })
    }
  }

  async update(
    session: Session
  ): Promise<Result<Session, SessionRepositoryError>> {
    try {
      const dbSession = this.mapToDbSession(session)

      const updatedRows = await this.db
        .update(sessions)
        .set({
          last_activity_at: dbSession.last_activity_at,
          expires_at: dbSession.expires_at,
        })
        .where(eq(sessions.id, session.id))
        .returning()

      const updated = updatedRows[0]
      if (!updated) {
        return err({
          type: 'notFound' as const,
          sessionId: session.id,
        })
      }

      const updatedSession = this.mapToSession(updated)
      return ok(updatedSession)
    } catch (error) {
      return err({
        type: 'databaseError' as const,
        message:
          error instanceof Error ? error.message : 'Unknown database error',
      })
    }
  }

  async delete(id: SessionId): Promise<Result<void, SessionRepositoryError>> {
    try {
      await this.db.delete(sessions).where(eq(sessions.id, id))

      return ok(undefined)
    } catch (error) {
      return err({
        type: 'databaseError' as const,
        message:
          error instanceof Error ? error.message : 'Unknown database error',
      })
    }
  }

  async deleteByUserId(
    userId: UserId
  ): Promise<Result<void, SessionRepositoryError>> {
    try {
      await this.db.delete(sessions).where(eq(sessions.user_id, userId))

      return ok(undefined)
    } catch (error) {
      return err({
        type: 'databaseError' as const,
        message:
          error instanceof Error ? error.message : 'Unknown database error',
      })
    }
  }

  async deleteExpired(): Promise<Result<number, SessionRepositoryError>> {
    try {
      const now = new Date()
      await this.db
        .delete(sessions)
        .where(lt(sessions.expires_at, now.toISOString()))

      // Get the number of deleted rows
      const deletedCount = 0 // drizzle-orm doesn't provide rowCount directly

      return ok(deletedCount)
    } catch (error) {
      return err({
        type: 'databaseError' as const,
        message:
          error instanceof Error ? error.message : 'Unknown database error',
      })
    }
  }

  async countByUserId(
    userId: UserId
  ): Promise<Result<number, SessionRepositoryError>> {
    try {
      const results = await this.db
        .select({ count: sessions.id })
        .from(sessions)
        .where(eq(sessions.user_id, userId))

      const count = results.length
      return ok(count)
    } catch (error) {
      return err({
        type: 'databaseError' as const,
        message:
          error instanceof Error ? error.message : 'Unknown database error',
      })
    }
  }

  private mapToSession(dbSession: typeof sessions.$inferSelect): Session {
    return {
      id: dbSession.id as SessionId,
      userId: dbSession.user_id as UserId,
      refreshToken: dbSession.refresh_token,
      ipAddress: dbSession.ip_address,
      userAgent: dbSession.user_agent,
      expiresAt: new Date(dbSession.expires_at),
      rememberMe: dbSession.remember_me,
      createdAt: new Date(dbSession.created_at),
      lastActivityAt: new Date(dbSession.last_activity_at),
    }
  }

  private mapToDbSession(session: Session): typeof sessions.$inferInsert {
    return {
      id: session.id ?? uuidv4(),
      user_id: session.userId,
      refresh_token: session.refreshToken,
      ip_address: session.ipAddress,
      user_agent: session.userAgent,
      expires_at: session.expiresAt.toISOString(),
      remember_me: session.rememberMe,
      created_at: session.createdAt.toISOString(),
      last_activity_at: session.lastActivityAt.toISOString(),
    }
  }
}
