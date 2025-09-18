/**
 * Sentry Error Tracking Service
 * Provides error tracking and monitoring
 */

import type { Result } from '@beauty-salon-backend/domain'
import { err, ok } from '@beauty-salon-backend/domain'
import * as Sentry from '@sentry/node'

export interface SentryConfig {
  dsn?: string
  environment?: string
  release?: string
  tracesSampleRate?: number
  debug?: boolean
}

export interface SentryService {
  init(): Result<void, { type: 'initError'; message: string }>
  captureException(error: Error, context?: Record<string, unknown>): void
  captureMessage(message: string, level?: Sentry.SeverityLevel): void
  setUser(user: { id: string; email?: string; username?: string }): void
  clearUser(): void
  addBreadcrumb(breadcrumb: Sentry.Breadcrumb): void
  withScope(callback: (scope: Sentry.Scope) => void): void
  startTransaction(context: Sentry.TransactionContext): Sentry.Transaction
}

export function createSentryService(config?: SentryConfig): SentryService {
  const dsn = config?.dsn ?? process.env.SENTRY_DSN
  const environment =
    config?.environment ?? process.env.NODE_ENV ?? 'development'
  const release = config?.release ?? process.env.APP_VERSION
  const tracesSampleRate = config?.tracesSampleRate ?? 0.1
  const debug = config?.debug ?? process.env.NODE_ENV === 'development'

  return {
    init(): Result<void, { type: 'initError'; message: string }> {
      if (!dsn) {
        // Sentry is optional, so this is not an error
        return ok(undefined)
      }

      try {
        Sentry.init({
          dsn,
          environment,
          release,
          tracesSampleRate,
          debug,
          integrations: [
            // Default integrations
            ...Sentry.autoDiscoverNodePerformanceMonitoringIntegrations(),
          ],
          beforeSend(event, _hint) {
            // Filter out sensitive information
            if (event.request?.cookies) {
              event.request.cookies = undefined
            }
            if (event.request?.headers) {
              event.request.headers.authorization = undefined
              event.request.headers.cookie = undefined
            }
            return event
          },
        })
        return ok(undefined)
      } catch (error) {
        return err({
          type: 'initError',
          message:
            error instanceof Error
              ? error.message
              : 'Failed to initialize Sentry',
        })
      }
    },

    captureException(error: Error, context?: Record<string, unknown>): void {
      if (!dsn) {
        return
      }

      if (context) {
        Sentry.withScope((scope) => {
          scope.setContext('additional', context)
          Sentry.captureException(error)
        })
      } else {
        Sentry.captureException(error)
      }
    },

    captureMessage(
      message: string,
      level: Sentry.SeverityLevel = 'info'
    ): void {
      if (!dsn) {
        return
      }
      Sentry.captureMessage(message, level)
    },

    setUser(user: { id: string; email?: string; username?: string }): void {
      if (!dsn) {
        return
      }
      Sentry.setUser(user)
    },

    clearUser(): void {
      if (!dsn) {
        return
      }
      Sentry.setUser(null)
    },

    addBreadcrumb(breadcrumb: Sentry.Breadcrumb): void {
      if (!dsn) {
        return
      }
      Sentry.addBreadcrumb(breadcrumb)
    },

    withScope(callback: (scope: Sentry.Scope) => void): void {
      if (!dsn) {
        return
      }
      Sentry.withScope(callback)
    },

    startTransaction(context: Sentry.TransactionContext): Sentry.Transaction {
      return Sentry.startTransaction(context)
    },
  }
}
