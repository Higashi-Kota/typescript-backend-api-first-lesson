/**
 * Error Context Service
 * Provides structured error context for debugging
 */

import type { Request } from 'express'

export interface ErrorContext {
  requestId?: string
  method: string
  path: string
  query: Record<string, unknown>
  body?: unknown
  headers: Record<string, string | string[] | undefined>
  userId?: string
  timestamp: string
  ip?: string
  userAgent?: string
}

export function createErrorContext(req: Request, _error: Error): ErrorContext {
  // Get request ID from various possible locations
  const requestId =
    (req.headers['x-request-id'] as string) ??
    (req as any).id ??
    (req as any).requestId

  // Get user ID from various possible locations
  const userId =
    (req as any).user?.id ?? (req as any).userId ?? (req as any).auth?.userId

  // Sanitize headers to remove sensitive information
  const sanitizedHeaders = { ...req.headers }
  sanitizedHeaders.authorization = undefined
  sanitizedHeaders.cookie = undefined
  sanitizedHeaders['x-api-key'] = undefined

  // Sanitize body to remove sensitive fields
  let sanitizedBody: unknown = req.body
  if (req.body && typeof req.body === 'object') {
    sanitizedBody = { ...req.body }
    const sensitiveFields = [
      'password',
      'passwordHash',
      'newPassword',
      'currentPassword',
      'confirmPassword',
      'token',
      'refreshToken',
      'apiKey',
      'secret',
    ]
    for (const field of sensitiveFields) {
      if (field in (sanitizedBody as any)) {
        ;(sanitizedBody as any)[field] = '[REDACTED]'
      }
    }
  }

  return {
    requestId,
    method: req.method,
    path: req.path,
    query: req.query as Record<string, unknown>,
    body: sanitizedBody,
    headers: sanitizedHeaders,
    userId,
    timestamp: new Date().toISOString(),
    ip: req.ip ?? req.socket.remoteAddress,
    userAgent: req.headers['user-agent'],
  }
}

export function formatErrorForLogging(
  error: Error,
  context: ErrorContext
): Record<string, unknown> {
  return {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    context,
  }
}
