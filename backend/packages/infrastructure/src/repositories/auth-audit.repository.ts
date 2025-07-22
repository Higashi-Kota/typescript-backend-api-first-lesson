/**
 * Authentication Audit Log Repository Implementation
 * 認証監査ログのリポジトリ実装
 * CLAUDEガイドラインに準拠
 */

import type { Result, UserId } from '@beauty-salon-backend/domain'
import { err, ok } from '@beauty-salon-backend/domain'
import { desc, eq, gte, lte } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { authAuditLogs } from '../database/schema.js'
import type { AuthAuditLog, NewAuthAuditLog } from '../database/schema.js'

export type AuthEventType =
  | 'login'
  | 'logout'
  | 'login_failed'
  | 'password_reset_requested'
  | 'password_reset_completed'
  | 'password_changed'
  | 'email_verification_sent'
  | 'email_verified'
  | '2fa_enabled'
  | '2fa_disabled'
  | '2fa_verified'
  | '2fa_failed'
  | 'account_locked'
  | 'account_unlocked'
  | 'session_created'
  | 'session_deleted'
  | 'suspicious_activity'
  | 'user_registered'

export interface AuditLogEntry {
  userId?: UserId
  eventType: AuthEventType
  eventData?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
  success: boolean
  errorMessage?: string
}

export interface AuthAuditRepository {
  log(entry: AuditLogEntry): Promise<Result<AuthAuditLog, Error>>
  findByUserId(
    userId: UserId,
    limit?: number
  ): Promise<Result<AuthAuditLog[], Error>>
  findByEventType(
    eventType: AuthEventType,
    limit?: number
  ): Promise<Result<AuthAuditLog[], Error>>
  findRecentEvents(
    hours: number,
    limit?: number
  ): Promise<Result<AuthAuditLog[], Error>>
  deleteOldLogs(daysToKeep: number): Promise<Result<number, Error>>
}

export class DrizzleAuthAuditRepository implements AuthAuditRepository {
  constructor(private db: PostgresJsDatabase) {}

  async log(entry: AuditLogEntry): Promise<Result<AuthAuditLog, Error>> {
    try {
      const newLog: NewAuthAuditLog = {
        userId: entry.userId,
        eventType: entry.eventType,
        eventData: entry.eventData,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
        success: entry.success,
        errorMessage: entry.errorMessage,
      }

      const result = await this.db
        .insert(authAuditLogs)
        .values(newLog)
        .returning()

      if (!result[0]) {
        return err(new Error('Failed to create audit log'))
      }

      return ok(result[0])
    } catch (error) {
      console.error('Failed to create audit log:', error)
      return err(new Error('Failed to create audit log'))
    }
  }

  async findByUserId(
    userId: UserId,
    limit = 100
  ): Promise<Result<AuthAuditLog[], Error>> {
    try {
      const logs = await this.db
        .select()
        .from(authAuditLogs)
        .where(eq(authAuditLogs.userId, userId))
        .orderBy(desc(authAuditLogs.createdAt))
        .limit(limit)

      return ok(logs)
    } catch (error) {
      console.error('Failed to find audit logs by user ID:', error)
      return err(new Error('Failed to find audit logs'))
    }
  }

  async findByEventType(
    eventType: AuthEventType,
    limit = 100
  ): Promise<Result<AuthAuditLog[], Error>> {
    try {
      const logs = await this.db
        .select()
        .from(authAuditLogs)
        .where(eq(authAuditLogs.eventType, eventType))
        .orderBy(desc(authAuditLogs.createdAt))
        .limit(limit)

      return ok(logs)
    } catch (error) {
      console.error('Failed to find audit logs by event type:', error)
      return err(new Error('Failed to find audit logs'))
    }
  }

  async findRecentEvents(
    hours: number,
    limit = 100
  ): Promise<Result<AuthAuditLog[], Error>> {
    try {
      const since = new Date()
      since.setHours(since.getHours() - hours)

      const logs = await this.db
        .select()
        .from(authAuditLogs)
        .where(gte(authAuditLogs.createdAt, since))
        .orderBy(desc(authAuditLogs.createdAt))
        .limit(limit)

      return ok(logs)
    } catch (error) {
      console.error('Failed to find recent audit logs:', error)
      return err(new Error('Failed to find recent audit logs'))
    }
  }

  async deleteOldLogs(daysToKeep: number): Promise<Result<number, Error>> {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

      const result = await this.db
        .delete(authAuditLogs)
        .where(lte(authAuditLogs.createdAt, cutoffDate))

      return ok(result.length)
    } catch (error) {
      console.error('Failed to delete old audit logs:', error)
      return err(new Error('Failed to delete old audit logs'))
    }
  }
}
