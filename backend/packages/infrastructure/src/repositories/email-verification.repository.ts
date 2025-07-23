/**
 * Email Verification Token Repository Implementation
 * メール検証トークンのリポジトリ実装
 * CLAUDEガイドラインに準拠
 */

import { randomBytes } from 'node:crypto'
import type { Result, UserId } from '@beauty-salon-backend/domain'
import { err, ok } from '@beauty-salon-backend/domain'
import { and, eq, gte, isNull, lte } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { emailVerificationTokens } from '../database/schema.js'
import type {
  EmailVerificationToken,
  NewEmailVerificationToken,
} from '../database/schema.js'

export interface EmailVerificationTokenRepository {
  create(
    userId: UserId,
    email: string,
    expiresInDays: number
  ): Promise<Result<EmailVerificationToken, Error>>
  findByToken(
    token: string
  ): Promise<Result<EmailVerificationToken | null, Error>>
  markAsVerified(token: string): Promise<Result<void, Error>>
  deleteExpiredTokens(): Promise<Result<number, Error>>
  deleteByUserId(userId: UserId): Promise<Result<void, Error>>
}

export class DrizzleEmailVerificationTokenRepository
  implements EmailVerificationTokenRepository
{
  constructor(private db: PostgresJsDatabase) {}

  async create(
    userId: UserId,
    email: string,
    expiresInDays: number
  ): Promise<Result<EmailVerificationToken, Error>> {
    try {
      // Generate secure random token
      const token = randomBytes(32).toString('hex')

      // Calculate expiration time
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + expiresInDays)

      // Delete any existing tokens for this user
      await this.deleteByUserId(userId)

      // Create new token
      const newToken: NewEmailVerificationToken = {
        userId,
        email,
        token,
        expiresAt,
      }

      const result = await this.db
        .insert(emailVerificationTokens)
        .values(newToken)
        .returning()

      if (!result[0]) {
        return err(new Error('Failed to create email verification token'))
      }

      return ok(result[0])
    } catch (error) {
      console.error('Failed to create email verification token:', error)
      return err(new Error('Failed to create email verification token'))
    }
  }

  async findByToken(
    token: string
  ): Promise<Result<EmailVerificationToken | null, Error>> {
    try {
      const [found] = await this.db
        .select()
        .from(emailVerificationTokens)
        .where(
          and(
            eq(emailVerificationTokens.token, token),
            isNull(emailVerificationTokens.verifiedAt),
            gte(emailVerificationTokens.expiresAt, new Date())
          )
        )
        .limit(1)

      return ok(found ?? null)
    } catch (error) {
      console.error('Failed to find email verification token:', error)
      return err(new Error('Failed to find email verification token'))
    }
  }

  async markAsVerified(token: string): Promise<Result<void, Error>> {
    try {
      const result = await this.db
        .update(emailVerificationTokens)
        .set({ verifiedAt: new Date() })
        .where(eq(emailVerificationTokens.token, token))

      if (result.length === 0) {
        return err(new Error('Token not found'))
      }

      return ok(undefined)
    } catch (error) {
      console.error('Failed to mark token as verified:', error)
      return err(new Error('Failed to mark token as verified'))
    }
  }

  async deleteExpiredTokens(): Promise<Result<number, Error>> {
    try {
      const result = await this.db
        .delete(emailVerificationTokens)
        .where(
          and(
            lte(emailVerificationTokens.expiresAt, new Date()),
            isNull(emailVerificationTokens.verifiedAt)
          )
        )

      return ok(result.length)
    } catch (error) {
      console.error('Failed to delete expired tokens:', error)
      return err(new Error('Failed to delete expired tokens'))
    }
  }

  async deleteByUserId(userId: UserId): Promise<Result<void, Error>> {
    try {
      await this.db
        .delete(emailVerificationTokens)
        .where(
          and(
            eq(emailVerificationTokens.userId, userId),
            isNull(emailVerificationTokens.verifiedAt)
          )
        )

      return ok(undefined)
    } catch (error) {
      console.error('Failed to delete tokens by user ID:', error)
      return err(new Error('Failed to delete tokens'))
    }
  }
}
