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
        type: 'databaseError',
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
        .where(eq(sessions.refreshToken, token))
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
        type: 'databaseError',
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
        .where(eq(sessions.userId, userId))
        .orderBy(desc(sessions.lastActivityAt))

      const sessionList = results.map(this.mapToSession)
      return ok(sessionList)
    } catch (error) {
      return err({
        type: 'databaseError',
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
          type: 'databaseError',
          message: 'Failed to insert session',
        })
      }

      const savedSession = this.mapToSession(inserted)
      return ok(savedSession)
    } catch (error) {
      return err({
        type: 'databaseError',
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
          refreshToken: dbSession.refreshToken,
          lastActivityAt: dbSession.lastActivityAt,
          expiresAt: dbSession.expiresAt,
        })
        .where(eq(sessions.id, session.id))
        .returning()

      const updated = updatedRows[0]
      if (!updated) {
        return err({
          type: 'notFound',
          sessionId: session.id,
        })
      }

      const updatedSession = this.mapToSession(updated)
      return ok(updatedSession)
    } catch (error) {
      return err({
        type: 'databaseError',
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
        type: 'databaseError',
        message:
          error instanceof Error ? error.message : 'Unknown database error',
      })
    }
  }

  async deleteByUserId(
    userId: UserId
  ): Promise<Result<void, SessionRepositoryError>> {
    try {
      await this.db.delete(sessions).where(eq(sessions.userId, userId))

      return ok(undefined)
    } catch (error) {
      return err({
        type: 'databaseError',
        message:
          error instanceof Error ? error.message : 'Unknown database error',
      })
    }
  }

  async deleteExpired(): Promise<Result<number, SessionRepositoryError>> {
    try {
      const now = new Date()
      await this.db.delete(sessions).where(lt(sessions.expiresAt, now))

      // Get the number of deleted rows
      const deletedCount = 0 // drizzle-orm doesn't provide rowCount directly

      return ok(deletedCount)
    } catch (error) {
      return err({
        type: 'databaseError',
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
        .where(eq(sessions.userId, userId))

      const count = results.length
      return ok(count)
    } catch (error) {
      return err({
        type: 'databaseError',
        message:
          error instanceof Error ? error.message : 'Unknown database error',
      })
    }
  }

  private mapToSession(dbSession: typeof sessions.$inferSelect): Session {
    return {
      id: dbSession.id as SessionId,
      userId: dbSession.userId as UserId,
      refreshToken: dbSession.refreshToken,
      ipAddress: dbSession.ipAddress,
      userAgent: dbSession.userAgent,
      expiresAt: dbSession.expiresAt,
      rememberMe: dbSession.rememberMe,
      createdAt: dbSession.createdAt,
      lastActivityAt: dbSession.lastActivityAt,
    }
  }

  private mapToDbSession(session: Session): typeof sessions.$inferInsert {
    return {
      id: session.id || uuidv4(),
      userId: session.userId,
      refreshToken: session.refreshToken,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      expiresAt: session.expiresAt,
      rememberMe: session.rememberMe,
      createdAt: session.createdAt,
      lastActivityAt: session.lastActivityAt,
    }
  }
}
