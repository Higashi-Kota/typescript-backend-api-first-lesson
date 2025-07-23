/**
 * Failed Login Attempts Repository Implementation
 * ログイン失敗記録のリポジトリ実装
 * CLAUDEガイドラインに準拠
 */

import type { Result } from '@beauty-salon-backend/domain'
import { err, ok } from '@beauty-salon-backend/domain'
import { and, eq, gte, lte, or, sql } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { failedLoginAttempts } from '../database/schema.js'
import type {
  FailedLoginAttempt,
  NewFailedLoginAttempt,
} from '../database/schema.js'

export interface FailedLoginRepository {
  recordAttempt(
    email: string,
    ipAddress?: string
  ): Promise<Result<FailedLoginAttempt, Error>>
  getRecentAttempts(
    email: string,
    withinMinutes: number,
    ipAddress?: string
  ): Promise<Result<FailedLoginAttempt | null, Error>>
  lockAccount(
    email: string,
    lockDurationMinutes: number
  ): Promise<Result<void, Error>>
  isAccountLocked(email: string): Promise<Result<boolean, Error>>
  clearAttempts(email: string): Promise<Result<void, Error>>
  deleteOldRecords(daysToKeep: number): Promise<Result<number, Error>>
}

export class DrizzleFailedLoginRepository implements FailedLoginRepository {
  constructor(private db: PostgresJsDatabase) {}

  async recordAttempt(
    email: string,
    ipAddress?: string
  ): Promise<Result<FailedLoginAttempt, Error>> {
    try {
      // Check if there's an existing record within the last hour
      const oneHourAgo = new Date()
      oneHourAgo.setHours(oneHourAgo.getHours() - 1)

      const existingResult = await this.getRecentAttempts(email, 60, ipAddress)
      if (existingResult.type === 'err') {
        return existingResult
      }

      const existing = existingResult.value

      if (existing) {
        // Update existing record
        const result = await this.db
          .update(failedLoginAttempts)
          .set({
            attemptCount: existing.attemptCount + 1,
            lastAttemptAt: new Date(),
            ipAddress: ipAddress || existing.ipAddress,
          })
          .where(eq(failedLoginAttempts.id, existing.id))
          .returning()

        if (!result[0]) {
          return err(new Error('Failed to update login attempt'))
        }

        return ok(result[0])
      }
      // Create new record
      const newAttempt: NewFailedLoginAttempt = {
        email,
        ipAddress,
        attemptCount: 1,
        lastAttemptAt: new Date(),
      }

      const result = await this.db
        .insert(failedLoginAttempts)
        .values(newAttempt)
        .returning()

      if (!result[0]) {
        return err(new Error('Failed to create login attempt'))
      }

      return ok(result[0])
    } catch (error) {
      console.error('Failed to record login attempt:', error)
      return err(new Error('Failed to record login attempt'))
    }
  }

  async getRecentAttempts(
    email: string,
    withinMinutes: number,
    ipAddress?: string
  ): Promise<Result<FailedLoginAttempt | null, Error>> {
    try {
      const cutoffTime = new Date()
      cutoffTime.setMinutes(cutoffTime.getMinutes() - withinMinutes)

      const conditions = [
        eq(failedLoginAttempts.email, email),
        gte(failedLoginAttempts.lastAttemptAt, cutoffTime),
      ]

      // Include IP address in the search if provided
      if (ipAddress) {
        conditions.push(
          or(
            eq(failedLoginAttempts.ipAddress, ipAddress),
            eq(failedLoginAttempts.email, email)
          ) ?? sql`TRUE`
        )
      }

      const [found] = await this.db
        .select()
        .from(failedLoginAttempts)
        .where(and(...conditions))
        .orderBy(failedLoginAttempts.lastAttemptAt)
        .limit(1)

      return ok(found ?? null)
    } catch (error) {
      console.error('Failed to get recent attempts:', error)
      return err(new Error('Failed to get recent attempts'))
    }
  }

  async lockAccount(
    email: string,
    lockDurationMinutes: number
  ): Promise<Result<void, Error>> {
    try {
      const lockedUntil = new Date()
      lockedUntil.setMinutes(lockedUntil.getMinutes() + lockDurationMinutes)

      await this.db
        .update(failedLoginAttempts)
        .set({ lockedUntil })
        .where(eq(failedLoginAttempts.email, email))

      return ok(undefined)
    } catch (error) {
      console.error('Failed to lock account:', error)
      return err(new Error('Failed to lock account'))
    }
  }

  async isAccountLocked(email: string): Promise<Result<boolean, Error>> {
    try {
      const [record] = await this.db
        .select()
        .from(failedLoginAttempts)
        .where(
          and(
            eq(failedLoginAttempts.email, email),
            gte(failedLoginAttempts.lockedUntil, new Date())
          )
        )
        .limit(1)

      return ok(!!record)
    } catch (error) {
      console.error('Failed to check account lock status:', error)
      return err(new Error('Failed to check account lock status'))
    }
  }

  async clearAttempts(email: string): Promise<Result<void, Error>> {
    try {
      await this.db
        .delete(failedLoginAttempts)
        .where(eq(failedLoginAttempts.email, email))

      return ok(undefined)
    } catch (error) {
      console.error('Failed to clear attempts:', error)
      return err(new Error('Failed to clear attempts'))
    }
  }

  async deleteOldRecords(daysToKeep: number): Promise<Result<number, Error>> {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

      const result = await this.db
        .delete(failedLoginAttempts)
        .where(lte(failedLoginAttempts.lastAttemptAt, cutoffDate))

      return ok(result.length)
    } catch (error) {
      console.error('Failed to delete old records:', error)
      return err(new Error('Failed to delete old records'))
    }
  }
}
