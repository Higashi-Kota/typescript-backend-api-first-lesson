/**
 * Express エラーハンドリングミドルウェア
 * CLAUDE.mdのガイドラインに準拠
 */

import type { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'
import type { ErrorResponse } from '../types/error'

const isDevelopment = process.env.NODE_ENV === 'development'

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response<ErrorResponse>,
  _next: NextFunction
): void => {
  // Handle Zod validation errors
  if (err instanceof ZodError) {
    res.status(400).json({
      code: 'VALIDATION_ERROR',
      message: 'Invalid request data',
      details: err.flatten(),
    })
    return
  }

  // Log error
  console.error('Unhandled error:', err)

  // Handle generic errors
  res.status(500).json({
    code: 'INTERNAL_SERVER_ERROR',
    message: isDevelopment ? err.message : 'An unexpected error occurred',
    ...(isDevelopment && { stack: err.stack }),
  })
}
