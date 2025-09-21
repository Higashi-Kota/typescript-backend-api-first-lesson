import { toProblemDetails } from '@beauty-salon-backend/domain'
import type { DomainError } from '@beauty-salon-backend/domain'
import type { Response } from 'express'
import type { ErrorResponse } from './types'

/**
 * Standard error handler for domain errors
 * Converts domain errors to Problem Details format (RFC 7807)
 */
export const handleDomainError = (
  res: Response<ErrorResponse>,
  error: DomainError
): Response<ErrorResponse> => {
  const problemDetails = toProblemDetails(error)
  return res.status(problemDetails.status).json(problemDetails)
}

/**
 * Convert cursor to page number for backward compatibility
 * @param cursor - Cursor string (e.g., "offset:20")
 * @param limit - Items per page
 * @returns Page number (1-based)
 */
export const cursorToPage = (
  cursor: string | undefined,
  limit: number
): number => {
  if (!cursor) {
    return 1
  }

  if (cursor.startsWith('offset:')) {
    const offset = Number(cursor.replace('offset:', ''))
    return Math.floor(offset / limit) + 1
  }

  return 1
}
