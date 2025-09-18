/**
 * 構造化ログ実装
 * CLAUDE.mdのSum型パターンに従った構造化ログシステム
 */

import type { Logger } from 'pino'
import { P, match } from 'ts-pattern'
import { v4 as uuidv4 } from 'uuid'
import { logger as pinoLogger } from './logger'

// Sentryサービスのシングルトンインスタンス
const _sentryService = null // Disabled temporarily

// ログイベントをSum型で表現
export type LogEvent =
  | {
      type: 'request'
      method: string
      path: string
      userId?: string
      ip?: string
    }
  | { type: 'response'; statusCode: number; duration: number; path: string }
  | { type: 'error'; error: Error; context?: Record<string, unknown> }
  | {
      type: 'unhandledError'
      error: Error
      request?: {
        method: string
        path: string
        query?: unknown
        body?: unknown
      }
      user?: { id: string; email: string }
    }
  | { type: 'business'; action: string; details: Record<string, unknown> }
  | { type: 'security'; event: SecurityEvent }
  | { type: 'database'; operation: DatabaseOperation }
  | { type: 'email'; event: EmailEvent }
  | { type: 'storage'; event: StorageEvent }

export type SecurityEvent =
  | { kind: 'authFailure'; reason: string; ip: string; username?: string }
  | {
      kind: 'permissionDenied'
      resource: string
      action: string
      userId: string
    }
  | {
      kind: 'suspiciousActivity'
      description: string
      userId?: string
      ip?: string
    }
  | { kind: 'accountLocked'; userId: string; reason: string }
  | { kind: 'passwordReset'; userId: string; ip: string }
  | { kind: 'twoFactorEnabled'; userId: string }
  | { kind: 'twoFactorDisabled'; userId: string }

export type DatabaseOperation =
  | {
      kind: 'query'
      table: string
      operation: 'select' | 'insert' | 'update' | 'delete'
      duration: number
    }
  | {
      kind: 'transaction'
      status: 'start' | 'commit' | 'rollback'
      duration?: number
    }
  | {
      kind: 'migration'
      version: string
      direction: 'up' | 'down'
      status: 'start' | 'complete' | 'error'
    }
  | { kind: 'connectionPool'; active: number; idle: number; waiting: number }

export type EmailEvent =
  | { kind: 'sent'; to: string; subject: string; provider: string }
  | {
      kind: 'failed'
      to: string
      subject: string
      error: string
      provider: string
    }
  | { kind: 'queued'; to: string; subject: string; queueId: string }
  | { kind: 'bounced'; to: string; reason: string }

export type StorageEvent =
  | { kind: 'uploaded'; key: string; size: number; userId: string }
  | { kind: 'downloaded'; key: string; userId?: string; shareToken?: string }
  | { kind: 'deleted'; key: string; userId: string }
  | { kind: 'quotaExceeded'; userId: string; used: number; limit: number }
  | {
      kind: 'virusScanResult'
      key: string
      status: 'clean' | 'infected'
      message?: string
    }

// ログレベルの決定
export function getLogLevel(event: LogEvent): string {
  return match(event)
    .with({ type: 'request' }, () => 'info')
    .with(
      { type: 'response', statusCode: P.when((code) => code >= 500) },
      () => 'error'
    )
    .with(
      { type: 'response', statusCode: P.when((code) => code >= 400) },
      () => 'warn'
    )
    .with({ type: 'response' }, () => 'info')
    .with({ type: 'error' }, () => 'error')
    .with({ type: 'unhandledError' }, () => 'error')
    .with({ type: 'business' }, () => 'info')
    .with({ type: 'security', event: { kind: 'authFailure' } }, () => 'warn')
    .with(
      { type: 'security', event: { kind: 'suspiciousActivity' } },
      () => 'warn'
    )
    .with({ type: 'security' }, () => 'error')
    .with(
      { type: 'database', operation: { kind: 'query' } },
      ({ operation }) => (operation.duration > 1000 ? 'warn' : 'debug')
    )
    .with(
      { type: 'database', operation: { kind: 'migration', status: 'error' } },
      () => 'error'
    )
    .with({ type: 'database' }, () => 'debug')
    .with({ type: 'email', event: { kind: 'failed' } }, () => 'error')
    .with({ type: 'email', event: { kind: 'bounced' } }, () => 'warn')
    .with({ type: 'email' }, () => 'info')
    .with({ type: 'storage', event: { kind: 'quotaExceeded' } }, () => 'warn')
    .with(
      {
        type: 'storage',
        event: { kind: 'virusScanResult', status: 'infected' },
      },
      () => 'error'
    )
    .with({ type: 'storage' }, () => 'info')
    .exhaustive()
}

// ログメッセージの生成
export function formatLogMessage(event: LogEvent): string {
  return match(event)
    .with(
      { type: 'request' },
      ({ method, path, userId }) =>
        `${method} ${path}${userId ? ` - User: ${userId}` : ''} - Request started`
    )
    .with(
      { type: 'response' },
      ({ statusCode, duration, path }) =>
        `Response ${statusCode} - ${path} - ${duration}ms`
    )
    .with({ type: 'error' }, ({ error }) => `Error: ${error.message}`)
    .with(
      { type: 'unhandledError' },
      ({ error, request }) =>
        `Unhandled error${request ? ` at ${request.method} ${request.path}` : ''}: ${error.message}`
    )
    .with({ type: 'business' }, ({ action }) => `Business action: ${action}`)
    .with(
      { type: 'security', event: { kind: 'authFailure' } },
      ({ event }) =>
        `Authentication failed: ${event.reason} from ${event.ip}${event.username ? ` - User: ${event.username}` : ''}`
    )
    .with(
      { type: 'security', event: { kind: 'permissionDenied' } },
      ({ event }) =>
        `Permission denied: ${event.action} on ${event.resource} by user ${event.userId}`
    )
    .with(
      { type: 'security', event: { kind: 'suspiciousActivity' } },
      ({ event }) =>
        `Suspicious activity: ${event.description}${event.userId ? ` - User: ${event.userId}` : ''}${event.ip ? ` from ${event.ip}` : ''}`
    )
    .with(
      { type: 'security', event: { kind: 'accountLocked' } },
      ({ event }) => `Account locked: User ${event.userId} - ${event.reason}`
    )
    .with(
      { type: 'security', event: { kind: 'passwordReset' } },
      ({ event }) =>
        `Password reset requested: User ${event.userId} from ${event.ip}`
    )
    .with(
      { type: 'security', event: { kind: 'twoFactorEnabled' } },
      ({ event }) => `Two-factor authentication enabled: User ${event.userId}`
    )
    .with(
      { type: 'security', event: { kind: 'twoFactorDisabled' } },
      ({ event }) => `Two-factor authentication disabled: User ${event.userId}`
    )
    .with(
      { type: 'database', operation: { kind: 'query' } },
      ({ operation }) =>
        `Database ${operation.operation} on ${operation.table} - ${operation.duration}ms`
    )
    .with(
      { type: 'database', operation: { kind: 'transaction' } },
      ({ operation }) =>
        `Database transaction ${operation.status}${operation.duration ? ` - ${operation.duration}ms` : ''}`
    )
    .with(
      { type: 'database', operation: { kind: 'migration' } },
      ({ operation }) =>
        `Migration ${operation.version} ${operation.direction} - ${operation.status}`
    )
    .with(
      { type: 'database', operation: { kind: 'connectionPool' } },
      ({ operation }) =>
        `Connection pool: ${operation.active} active, ${operation.idle} idle, ${operation.waiting} waiting`
    )
    .with(
      { type: 'email', event: { kind: 'sent' } },
      ({ event }) =>
        `Email sent to ${event.to} - Subject: ${event.subject} - Provider: ${event.provider}`
    )
    .with(
      { type: 'email', event: { kind: 'failed' } },
      ({ event }) =>
        `Email failed to ${event.to} - Subject: ${event.subject} - Error: ${event.error} - Provider: ${event.provider}`
    )
    .with(
      { type: 'email', event: { kind: 'queued' } },
      ({ event }) =>
        `Email queued to ${event.to} - Subject: ${event.subject} - Queue ID: ${event.queueId}`
    )
    .with(
      { type: 'email', event: { kind: 'bounced' } },
      ({ event }) => `Email bounced from ${event.to} - Reason: ${event.reason}`
    )
    .with(
      { type: 'storage', event: { kind: 'uploaded' } },
      ({ event }) =>
        `File uploaded: ${event.key} - Size: ${event.size} bytes - User: ${event.userId}`
    )
    .with(
      { type: 'storage', event: { kind: 'downloaded' } },
      ({ event }) =>
        `File downloaded: ${event.key}${event.userId ? ` - User: ${event.userId}` : ''}${event.shareToken ? ` - Share token: ${event.shareToken}` : ''}`
    )
    .with(
      { type: 'storage', event: { kind: 'deleted' } },
      ({ event }) => `File deleted: ${event.key} - User: ${event.userId}`
    )
    .with(
      { type: 'storage', event: { kind: 'quotaExceeded' } },
      ({ event }) =>
        `Storage quota exceeded: User ${event.userId} - Used: ${event.used} bytes of ${event.limit} bytes`
    )
    .with(
      { type: 'storage', event: { kind: 'virusScanResult' } },
      ({ event }) =>
        `Virus scan result for ${event.key}: ${event.status}${event.message ? ` - ${event.message}` : ''}`
    )
    .exhaustive()
}

// ログコンテキストの生成
export function getLogContext(event: LogEvent): Record<string, unknown> {
  return match(event)
    .with({ type: 'request' }, (e) => ({
      method: e.method,
      path: e.path,
      userId: e.userId,
      ip: e.ip,
    }))
    .with({ type: 'response' }, (e) => ({
      statusCode: e.statusCode,
      duration: e.duration,
      path: e.path,
    }))
    .with({ type: 'error' }, (e) => ({
      error: {
        name: e.error.name,
        message: e.error.message,
        stack: e.error.stack,
      },
      ...e.context,
    }))
    .with({ type: 'unhandledError' }, (e) => ({
      error: {
        name: e.error.name,
        message: e.error.message,
        stack: e.error.stack,
      },
      ...(e.request && { request: e.request }),
      ...(e.user && { user: e.user }),
    }))
    .with({ type: 'business' }, (e) => ({
      action: e.action,
      ...e.details,
    }))
    .with({ type: 'security' }, (e) => ({
      security: e.event,
    }))
    .with({ type: 'database' }, (e) => ({
      database: e.operation,
    }))
    .with({ type: 'email' }, (e) => ({
      email: e.event,
    }))
    .with({ type: 'storage' }, (e) => ({
      storage: e.event,
    }))
    .exhaustive()
}

// 構造化ログクラス
export class StructuredLogger {
  private logger: Logger
  private correlationId: string | undefined
  private readonly module: string

  constructor(moduleName: string) {
    this.module = moduleName
    this.logger = pinoLogger.child({ module: this.module })
  }

  // 相関IDの設定（リクエスト単位でトレース）
  setCorrelationId(id: string): void {
    this.correlationId = id
  }

  // 新しい相関IDを生成
  generateCorrelationId(): string {
    this.correlationId = uuidv4()
    return this.correlationId
  }

  log(event: LogEvent): void {
    const level = getLogLevel(event)
    const message = formatLogMessage(event)
    const context = {
      ...getLogContext(event),
      ...(this.correlationId && { correlationId: this.correlationId }),
    }

    // Use the appropriate logging method based on level
    switch (level) {
      case 'fatal':
        this.logger.fatal(context, message)
        break
      case 'error':
        this.logger.error(context, message)
        // Sentryへのエラー送信
        this.sendErrorToSentry(event)
        break
      case 'warn':
        this.logger.warn(context, message)
        break
      case 'info':
        this.logger.info(context, message)
        break
      case 'debug':
        this.logger.debug(context, message)
        break
      case 'trace':
        this.logger.trace(context, message)
        break
      default:
        this.logger.info(context, message)
    }
  }

  // 便利メソッド
  logRequest(method: string, path: string, userId?: string, ip?: string): void {
    this.log({ type: 'request', method, path, userId, ip })
  }

  logResponse(statusCode: number, duration: number, path: string): void {
    this.log({ type: 'response', statusCode, duration, path })
  }

  logError(error: Error, context?: Record<string, unknown>): void {
    this.log({ type: 'error', error, context })
  }

  // unhandledErrorの場合の特別なログメソッド
  logUnhandledError(
    error: Error,
    request?: { method: string; path: string; query?: unknown; body?: unknown },
    user?: { id: string; email: string }
  ): void {
    this.log({ type: 'unhandledError', error, request, user })
  }

  // Sentryへのエラー送信
  private sendErrorToSentry(event: LogEvent): void {
    if (event.type !== 'error' && event.type !== 'unhandledError') {
      return
    }

    // const sentryContext = {
    //   tags: {
    //     module: this.module,
    //     ...(this.correlationId && { correlationId: this.correlationId }),
    //   },
    //   extra: {
    //     ...(event.type === 'error' ? event.context : {}),
    //     ...(event.type === 'unhandledError' && event.request
    //       ? {
    //           request: {
    //             method: event.request.method,
    //             path: event.request.path,
    //             query: event.request.query,
    //             body: event.request.body,
    //           },
    //         }
    //       : {}),
    //   },
    //   ...(event.type === 'unhandledError' && event.user
    //     ? {
    //         user: {
    //           id: event.user.id,
    //           email: event.user.email,
    //         },
    //       }
    //     : {}),
    // }

    // Disabled Sentry temporarily
    // const sentryEvent: SentryErrorEvent =
    //   event.type === 'unhandledError' && event.request
    //     ? {
    //         type: 'apiError',
    //         error: event.error,
    //         endpoint: event.request.path,
    //         method: event.request.method,
    //         statusCode: 500,
    //       }
    //     : {
    //         type: 'businessLogicError',
    //         error: event.error,
    //         context: event.type === 'error' ? (event.context ?? {}) : {},
    //       }
    //
    // sentryService?.captureError(sentryEvent, sentryContext)
  }

  logBusiness(action: string, details: Record<string, unknown>): void {
    this.log({ type: 'business', action, details })
  }

  logSecurity(event: SecurityEvent): void {
    this.log({ type: 'security', event })
  }

  logDatabase(operation: DatabaseOperation): void {
    this.log({ type: 'database', operation })
  }

  logEmail(event: EmailEvent): void {
    this.log({ type: 'email', event })
  }

  logStorage(event: StorageEvent): void {
    this.log({ type: 'storage', event })
  }
}

// ファクトリ関数
export function createStructuredLogger(moduleName: string): StructuredLogger {
  return new StructuredLogger(moduleName)
}
