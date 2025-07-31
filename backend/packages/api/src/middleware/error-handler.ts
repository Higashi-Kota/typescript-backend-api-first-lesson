/**
 * Express エラーハンドリングミドルウェア
 * CLAUDE.mdのガイドラインに準拠
 */

import type { NextFunction, Request, Response } from 'express'
import type { Request as ExpressRequest } from 'express'
import { match } from 'ts-pattern'
import { ZodError } from 'zod'
import { createErrorContextService } from '../services/error-context.service'
import {
  type SentryErrorEvent,
  createSentryService,
} from '../services/sentry.service'
import type { AuthenticatedUser } from '../types/auth'
import type { ErrorResponse } from '../types/error'
import { createStructuredLogger } from '../utils/structured-logger'

const isDevelopment = process.env.NODE_ENV === 'development'
const sentryService = createSentryService()
const errorContextService = createErrorContextService()
const logger = createStructuredLogger('error-handler')

// カスタムエラータイプの定義
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export class ValidationError extends ApiError {
  constructor(message: string, details: unknown) {
    super(400, 'VALIDATION_ERROR', message, details)
    this.name = 'ValidationError'
  }
}

export class AuthenticationError extends ApiError {
  constructor(message = 'Authentication required') {
    super(401, 'AUTHENTICATION_ERROR', message)
    this.name = 'AuthenticationError'
  }
}

export class AuthorizationError extends ApiError {
  constructor(message = 'Insufficient permissions', resource?: string) {
    super(403, 'AUTHORIZATION_ERROR', message, { resource })
    this.name = 'AuthorizationError'
  }
}

export class NotFoundError extends ApiError {
  constructor(resource: string) {
    super(404, 'NOT_FOUND', `${resource} not found`)
    this.name = 'NotFoundError'
  }
}

export class ConflictError extends ApiError {
  constructor(message: string, details?: unknown) {
    super(409, 'CONFLICT', message, details)
    this.name = 'ConflictError'
  }
}

export class RateLimitError extends ApiError {
  constructor(message = 'Too many requests') {
    super(429, 'RATE_LIMIT_EXCEEDED', message)
    this.name = 'RateLimitError'
  }
}

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response<ErrorResponse>,
  _next: NextFunction
): void => {
  const user = (req as ExpressRequest & { user?: AuthenticatedUser }).user
  // エラーの分類とSentryイベントの作成
  const sentryEvent: SentryErrorEvent | null = match(err)
    .when(
      (e): e is ZodError => e instanceof ZodError,
      (e) => ({
        type: 'validationError' as const,
        error: new Error(`Validation failed: ${e.message}`),
        fields: e.flatten().fieldErrors,
      })
    )
    .when(
      (e): e is ValidationError => e instanceof ValidationError,
      (e) => ({
        type: 'validationError' as const,
        error: e,
        fields: e.details as Record<string, unknown>,
      })
    )
    .when(
      (e): e is AuthenticationError => e instanceof AuthenticationError,
      (e) => ({
        type: 'authenticationError' as const,
        error: e,
        userId: user?.id,
      })
    )
    .when(
      (e): e is AuthorizationError => e instanceof AuthorizationError,
      (e) =>
        user
          ? {
              type: 'authorizationError' as const,
              error: e,
              userId: user.id,
              resource:
                (e.details as { resource?: string })?.resource || 'unknown',
            }
          : null
    )
    .when(
      (e): e is RateLimitError => e instanceof RateLimitError,
      (e) => ({
        type: 'rateLimitError' as const,
        error: e,
        endpoint: req.path,
        userId: user?.id,
      })
    )
    .when(
      (e): e is ApiError => e instanceof ApiError,
      (e) => ({
        type: 'apiError' as const,
        error: e,
        endpoint: req.path,
        method: req.method,
        statusCode: e.statusCode,
      })
    )
    .otherwise((e) => ({
      type: 'apiError' as const,
      error: e,
      endpoint: req.path,
      method: req.method,
      statusCode: 500,
    }))

  // エラーコンテキストの収集
  const context = errorContextService.extractContext({
    type: 'request',
    request: req,
    user,
  })

  // Sentryへのエラー送信
  if (sentryEvent) {
    sentryService.captureError(sentryEvent, context)
  }

  // 構造化ログへの記録
  logger.logUnhandledError(
    err,
    {
      method: req.method,
      path: req.path,
      query: req.query,
      body: req.body,
    },
    user
  )

  // レスポンスの生成
  match(err)
    .when(
      (e): e is ZodError => e instanceof ZodError,
      (e) => {
        res.status(400).json({
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: e.flatten(),
        })
      }
    )
    .when(
      (e): e is ApiError => e instanceof ApiError,
      (e) => {
        res.status(e.statusCode).json({
          code: e.code,
          message: e.message,
          ...(isDevelopment && e.details ? { details: e.details } : {}),
        })
      }
    )
    .when(
      // Handle body-parser JSON syntax errors
      (e): e is SyntaxError & { status?: number; body?: string } =>
        e instanceof SyntaxError &&
        'status' in e &&
        (e as SyntaxError & { status?: number }).status === 400 &&
        'body' in e,
      (_e) => {
        res.status(400).json({
          code: 'INVALID_JSON',
          message: 'Invalid JSON in request body',
        })
      }
    )
    .otherwise((e) => {
      const error = e as Error
      res.status(500).json({
        code: 'INTERNAL_SERVER_ERROR',
        message: isDevelopment ? error.message : 'An unexpected error occurred',
        ...(isDevelopment && error.stack ? { stack: error.stack } : {}),
      })
    })
}
