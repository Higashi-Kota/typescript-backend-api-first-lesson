import { env as config } from '@beauty-salon-backend/config'
import type { Result } from '@beauty-salon-backend/domain'
import { err, ok } from '@beauty-salon-backend/domain'
import * as Sentry from '@sentry/node'
import type { NodeOptions } from '@sentry/node'
import { match } from 'ts-pattern'

export type SentryErrorLevel = 'fatal' | 'error' | 'warning' | 'info' | 'debug'

export type SentryErrorEvent =
  | { type: 'unhandledRejection'; error: Error; promise: Promise<unknown> }
  | { type: 'uncaughtException'; error: Error }
  | {
      type: 'apiError'
      error: Error
      endpoint: string
      method: string
      statusCode: number
    }
  | { type: 'validationError'; error: Error; fields: Record<string, unknown> }
  | { type: 'authenticationError'; error: Error; userId?: string }
  | {
      type: 'authorizationError'
      error: Error
      userId: string
      resource: string
    }
  | { type: 'databaseError'; error: Error; query?: string }
  | { type: 'externalServiceError'; error: Error; service: string }
  | {
      type: 'businessLogicError'
      error: Error
      context: Record<string, unknown>
    }
  | { type: 'rateLimitError'; error: Error; endpoint: string; userId?: string }

export type SentryContext = {
  user?: {
    id: string
    email?: string
    username?: string
  }
  tags?: Record<string, string>
  extra?: Record<string, unknown>
  fingerprint?: string[]
  level?: SentryErrorLevel
}

export type SentryService = {
  init: () => Result<void, Error>
  captureError: (event: SentryErrorEvent, context?: SentryContext) => void
  captureMessage: (
    message: string,
    level: SentryErrorLevel,
    context?: SentryContext
  ) => void
  setUser: (user: SentryContext['user']) => void
  addBreadcrumb: (breadcrumb: Sentry.Breadcrumb) => void
  startTransaction: (name: string, op: string) => Sentry.Span | undefined
  flush: (timeout?: number) => Promise<boolean>
}

const determineSeverityLevel = (
  event: SentryErrorEvent
): Sentry.SeverityLevel => {
  return match(event)
    .with({ type: 'unhandledRejection' }, () => 'fatal' as const)
    .with({ type: 'uncaughtException' }, () => 'fatal' as const)
    .with({ type: 'apiError' }, ({ statusCode }) =>
      statusCode >= 500 ? ('error' as const) : ('warning' as const)
    )
    .with({ type: 'validationError' }, () => 'warning' as const)
    .with({ type: 'authenticationError' }, () => 'warning' as const)
    .with({ type: 'authorizationError' }, () => 'warning' as const)
    .with({ type: 'databaseError' }, () => 'error' as const)
    .with({ type: 'externalServiceError' }, () => 'error' as const)
    .with({ type: 'businessLogicError' }, () => 'warning' as const)
    .with({ type: 'rateLimitError' }, () => 'info' as const)
    .exhaustive()
}

const createErrorFingerprint = (event: SentryErrorEvent): string[] => {
  return match(event)
    .with({ type: 'apiError' }, ({ endpoint, method, statusCode }) => [
      'api-error',
      endpoint,
      method,
      statusCode.toString(),
    ])
    .with({ type: 'validationError' }, ({ fields }) => [
      'validation-error',
      ...Object.keys(fields).sort(),
    ])
    .with({ type: 'authenticationError' }, () => [
      'auth-error',
      'authentication',
    ])
    .with({ type: 'authorizationError' }, ({ resource }) => [
      'auth-error',
      'authorization',
      resource,
    ])
    .with({ type: 'databaseError' }, ({ query }) => [
      'database-error',
      query ? 'query' : 'connection',
    ])
    .with({ type: 'externalServiceError' }, ({ service }) => [
      'external-service-error',
      service,
    ])
    .with({ type: 'businessLogicError' }, ({ error }) => [
      'business-logic-error',
      error.name,
    ])
    .with({ type: 'rateLimitError' }, ({ endpoint }) => [
      'rate-limit-error',
      endpoint,
    ])
    .with({ type: 'unhandledRejection' }, ({ error }) => [
      'unhandled-rejection',
      error.name,
    ])
    .with({ type: 'uncaughtException' }, ({ error }) => [
      'uncaught-exception',
      error.name,
    ])
    .exhaustive()
}

const enrichErrorContext = (
  event: SentryErrorEvent
): Record<string, unknown> => {
  return match(event)
    .with({ type: 'apiError' }, ({ endpoint, method, statusCode }) => ({
      endpoint,
      method,
      statusCode,
      errorType: 'API Error',
    }))
    .with({ type: 'validationError' }, ({ fields }) => ({
      fields,
      errorType: 'Validation Error',
    }))
    .with({ type: 'authenticationError' }, ({ userId }) => ({
      userId,
      errorType: 'Authentication Error',
    }))
    .with({ type: 'authorizationError' }, ({ userId, resource }) => ({
      userId,
      resource,
      errorType: 'Authorization Error',
    }))
    .with({ type: 'databaseError' }, ({ query }) => ({
      query: query ? '[Redacted]' : undefined,
      errorType: 'Database Error',
    }))
    .with({ type: 'externalServiceError' }, ({ service }) => ({
      service,
      errorType: 'External Service Error',
    }))
    .with({ type: 'businessLogicError' }, ({ context }) => ({
      ...context,
      errorType: 'Business Logic Error',
    }))
    .with({ type: 'rateLimitError' }, ({ endpoint, userId }) => ({
      endpoint,
      userId,
      errorType: 'Rate Limit Error',
    }))
    .with({ type: 'unhandledRejection' }, () => ({
      errorType: 'Unhandled Promise Rejection',
    }))
    .with({ type: 'uncaughtException' }, () => ({
      errorType: 'Uncaught Exception',
    }))
    .exhaustive()
}

export const createSentryService = (): SentryService => {
  let isInitialized = false

  const init = (): Result<void, Error> => {
    if (!config.SENTRY_DSN) {
      return err(new Error('SENTRY_DSN is not configured'))
    }

    if (isInitialized) {
      return ok(undefined)
    }

    try {
      const options: NodeOptions = {
        dsn: config.SENTRY_DSN,
        environment: config.SENTRY_ENVIRONMENT ?? config.NODE_ENV,
        release: config.SENTRY_RELEASE,
        tracesSampleRate: config.SENTRY_TRACES_SAMPLE_RATE ?? 0.1,
        enabled: config.NODE_ENV !== 'test',
        integrations: [
          Sentry.httpIntegration(),
          Sentry.requestDataIntegration({
            include: {
              cookies: false,
              data: true,
              headers: true,
              ip: true,
              query_string: true,
              url: true,
            },
          }),
        ],
        beforeSend: (event, _hint) => {
          // 機密情報をフィルタリング
          if (event.request?.cookies) {
            event.request.cookies = undefined
          }
          if (event.request?.headers) {
            const { authorization, cookie, ...sanitizedHeaders } =
              event.request.headers
            event.request.headers = sanitizedHeaders
          }
          if (event.extra?.query) {
            event.extra.query = '[Redacted]'
          }
          return event
        },
      }

      Sentry.init(options)
      isInitialized = true
      return ok(undefined)
    } catch (error) {
      return err(
        error instanceof Error
          ? error
          : new Error('Failed to initialize Sentry')
      )
    }
  }

  const captureError = (
    event: SentryErrorEvent,
    context?: SentryContext
  ): void => {
    if (!isInitialized) {
      console.error('Sentry is not initialized', event)
      return
    }

    const severity = context?.level ?? determineSeverityLevel(event)
    const fingerprint = context?.fingerprint ?? createErrorFingerprint(event)
    const extra = {
      ...enrichErrorContext(event),
      ...context?.extra,
    }

    Sentry.withScope((scope) => {
      scope.setLevel(severity)
      scope.setFingerprint(fingerprint)

      if (context?.user) {
        scope.setUser(context.user)
      }

      if (context?.tags) {
        for (const [key, value] of Object.entries(context.tags)) {
          scope.setTag(key, value)
        }
      }

      for (const [key, value] of Object.entries(extra)) {
        scope.setExtra(key, value)
      }

      Sentry.captureException(event.error)
    })
  }

  const captureMessage = (
    message: string,
    level: SentryErrorLevel,
    context?: SentryContext
  ): void => {
    if (!isInitialized) {
      console.log(`[${level}] ${message}`)
      return
    }

    Sentry.withScope((scope) => {
      scope.setLevel(level)

      if (context?.user) {
        scope.setUser(context.user)
      }

      if (context?.tags) {
        for (const [key, value] of Object.entries(context.tags)) {
          scope.setTag(key, value)
        }
      }

      if (context?.extra) {
        for (const [key, value] of Object.entries(context.extra)) {
          scope.setExtra(key, value)
        }
      }

      Sentry.captureMessage(message, level)
    })
  }

  const setUser = (user: SentryContext['user']): void => {
    if (!isInitialized) {
      return
    }
    Sentry.setUser(user ?? null)
  }

  const addBreadcrumb = (breadcrumb: Sentry.Breadcrumb): void => {
    if (!isInitialized) {
      return
    }
    Sentry.addBreadcrumb(breadcrumb)
  }

  const startTransaction = (
    name: string,
    op: string
  ): Sentry.Span | undefined => {
    if (!isInitialized) {
      return undefined
    }
    return Sentry.startSpan({ name, op }, () => {
      return undefined as never
    })
  }

  const flush = async (timeout?: number): Promise<boolean> => {
    if (!isInitialized) {
      return true
    }
    return Sentry.flush(timeout)
  }

  return {
    init,
    captureError,
    captureMessage,
    setUser,
    addBreadcrumb,
    startTransaction,
    flush,
  }
}
