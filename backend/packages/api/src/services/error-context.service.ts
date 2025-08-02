import type { Request } from 'express'
import { match } from 'ts-pattern'
import type { AuthenticatedUser } from '../types/auth'
import type { SentryContext } from './sentry.service'

export type ErrorContextSource =
  | { type: 'request'; request: Request; user?: AuthenticatedUser }
  | {
      type: 'job'
      jobName: string
      jobId: string
      params: Record<string, unknown>
    }
  | {
      type: 'webhook'
      source: string
      eventType: string
      payload: Record<string, unknown>
    }
  | { type: 'scheduled'; taskName: string; schedule: string }
  | { type: 'manual'; context: Record<string, unknown> }

export type ErrorContextService = {
  extractContext: (source: ErrorContextSource) => SentryContext
  sanitizeData: (data: Record<string, unknown>) => Record<string, unknown>
}

const SENSITIVE_FIELDS = [
  'password',
  'token',
  'secret',
  'apiKey',
  'api_key',
  'authorization',
  'cookie',
  'session',
  'creditCard',
  'credit_card',
  'cvv',
  'ssn',
  'socialSecurityNumber',
  'social_security_number',
]

const SENSITIVE_PATTERNS = [
  /^Bearer\s+.+$/i,
  /^Basic\s+.+$/i,
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
  /\b\d{3}-\d{2}-\d{4}\b/g,
]

export const createErrorContextService = (): ErrorContextService => {
  const sanitizeValue = (value: unknown): unknown => {
    if (typeof value === 'string') {
      for (const pattern of SENSITIVE_PATTERNS) {
        if (pattern.test(value)) {
          return '[Redacted]'
        }
      }
      return value
    }

    if (Array.isArray(value)) {
      return value.map(sanitizeValue)
    }

    if (value && typeof value === 'object') {
      return sanitizeData(value as Record<string, unknown>)
    }

    return value
  }

  const sanitizeData = (
    data: Record<string, unknown>
  ): Record<string, unknown> => {
    const sanitized: Record<string, unknown> = {}

    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase()

      if (SENSITIVE_FIELDS.some((field) => lowerKey.includes(field))) {
        sanitized[key] = '[Redacted]'
      } else {
        sanitized[key] = sanitizeValue(value)
      }
    }

    return sanitized
  }

  const extractRequestContext = (
    request: Request,
    user?: AuthenticatedUser
  ): SentryContext => {
    const context: SentryContext = {
      tags: {
        method: request.method,
        path: request.path,
        route: request.route?.path ?? 'unknown',
        ip: request.ip ?? 'unknown',
      },
      extra: {
        url: request.originalUrl,
        query: sanitizeData(request.query as Record<string, unknown>),
        body: request.body ? sanitizeData(request.body) : undefined,
        headers: sanitizeData(request.headers as Record<string, unknown>),
        userAgent: request.get('user-agent') ?? 'unknown',
      },
    }

    if (user) {
      context.user = {
        id: user.id,
        email: user.email,
        username: user.email.split('@')[0],
      }
    }

    return context
  }

  const extractJobContext = (
    jobName: string,
    jobId: string,
    params: Record<string, unknown>
  ): SentryContext => {
    return {
      tags: {
        jobName,
        jobId,
        contextType: 'job',
      },
      extra: {
        params: sanitizeData(params),
      },
    }
  }

  const extractWebhookContext = (
    source: string,
    eventType: string,
    payload: Record<string, unknown>
  ): SentryContext => {
    return {
      tags: {
        webhookSource: source,
        eventType,
        contextType: 'webhook',
      },
      extra: {
        payload: sanitizeData(payload),
      },
    }
  }

  const extractScheduledContext = (
    taskName: string,
    schedule: string
  ): SentryContext => {
    return {
      tags: {
        taskName,
        schedule,
        contextType: 'scheduled',
      },
      extra: {
        executedAt: new Date().toISOString(),
      },
    }
  }

  const extractContext = (source: ErrorContextSource): SentryContext => {
    return match(source)
      .with({ type: 'request' }, ({ request, user }) =>
        extractRequestContext(request, user)
      )
      .with({ type: 'job' }, ({ jobName, jobId, params }) =>
        extractJobContext(jobName, jobId, params)
      )
      .with({ type: 'webhook' }, ({ source, eventType, payload }) =>
        extractWebhookContext(source, eventType, payload)
      )
      .with({ type: 'scheduled' }, ({ taskName, schedule }) =>
        extractScheduledContext(taskName, schedule)
      )
      .with({ type: 'manual' }, ({ context }) => ({
        extra: sanitizeData(context),
      }))
      .exhaustive()
  }

  return {
    extractContext,
    sanitizeData,
  }
}
