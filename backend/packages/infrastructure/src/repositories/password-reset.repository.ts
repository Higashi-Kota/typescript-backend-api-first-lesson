/**
 * Password Reset Token Repository Implementation
 * パスワードリセットトークンのリポジトリ実装
 * CLAUDEガイドラインに準拠
 */

import { randomBytes } from 'node:crypto'
import type { Result, UserId } from '@beauty-salon-backend/domain'
import { err, ok } from '@beauty-salon-backend/domain'
import { and, eq, gte, isNull, lte } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { passwordResetTokens } from '../database/schema.js'
import type {
  NewPasswordResetToken,
  PasswordResetToken,
} from '../database/schema.js'

export interface PasswordResetTokenRepository {
  create(
    userId: UserId,
    expiresInHours: number
  ): Promise<Result<PasswordResetToken, Error>>
  findByToken(token: string): Promise<Result<PasswordResetToken | null, Error>>
  markAsUsed(token: string): Promise<Result<void, Error>>
  deleteExpiredTokens(): Promise<Result<number, Error>>
  deleteByUserId(userId: UserId): Promise<Result<void, Error>>
}

export class DrizzlePasswordResetTokenRepository
  implements PasswordResetTokenRepository
{
  constructor(private db: PostgresJsDatabase) {}

  async create(
    userId: UserId,
    expiresInHours: number
  ): Promise<Result<PasswordResetToken, Error>> {
    try {
      // Generate secure random token
      const token = randomBytes(32).toString('hex')

      // Calculate expiration time
      const expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + expiresInHours)

      // Delete any existing tokens for this user
      await this.deleteByUserId(userId)

      // Create new token
      const newToken: NewPasswordResetToken = {
        userId,
        token,
        expiresAt,
      }

      const result = await this.db
        .insert(passwordResetTokens)
        .values(newToken)
        .returning()

      if (!result[0]) {
        return err(new Error('Failed to create password reset token'))
      }

      return ok(result[0])
    } catch (error) {
      console.error('Failed to create password reset token:', error)
      return err(new Error('Failed to create password reset token'))
    }
  }

  async findByToken(
    token: string
  ): Promise<Result<PasswordResetToken | null, Error>> {
    try {
      const [found] = await this.db
        .select()
        .from(passwordResetTokens)
        .where(
          and(
            eq(passwordResetTokens.token, token),
            isNull(passwordResetTokens.usedAt),
            gte(passwordResetTokens.expiresAt, new Date())
          )
        )
        .limit(1)

      return ok(found || null)
    } catch (error) {
      console.error('Failed to find password reset token:', error)
      return err(new Error('Failed to find password reset token'))
    }
  }

  async markAsUsed(token: string): Promise<Result<void, Error>> {
    try {
      const result = await this.db
        .update(passwordResetTokens)
        .set({ usedAt: new Date() })
        .where(eq(passwordResetTokens.token, token))

      if (result.length === 0) {
        return err(new Error('Token not found'))
      }

      return ok(undefined)
    } catch (error) {
      console.error('Failed to mark token as used:', error)
      return err(new Error('Failed to mark token as used'))
    }
  }

  async deleteExpiredTokens(): Promise<Result<number, Error>> {
    try {
      const result = await this.db
        .delete(passwordResetTokens)
        .where(
          and(
            lte(passwordResetTokens.expiresAt, new Date()),
            isNull(passwordResetTokens.usedAt)
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
        .delete(passwordResetTokens)
        .where(
          and(
            eq(passwordResetTokens.userId, userId),
            isNull(passwordResetTokens.usedAt)
          )
        )

      return ok(undefined)
    } catch (error) {
      console.error('Failed to delete tokens by user ID:', error)
      return err(new Error('Failed to delete tokens'))
    }
  }
}
