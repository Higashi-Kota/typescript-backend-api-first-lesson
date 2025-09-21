import { ListSalonsUseCase } from '@beauty-salon-backend/domain'
import { SalonRepository } from '@beauty-salon-backend/infrastructure'
import type { Database } from '@beauty-salon-backend/infrastructure'
import type { RequestHandler, Response } from 'express'
import { match } from 'ts-pattern'
import type {
  CursorPaginationResponse,
  ErrorResponse,
  ListSalonsQuery,
  Salon,
} from './_shared'
import { cursorToPage, handleDomainError } from './_shared'

/**
 * GET /api/v1/salons - List all salons with pagination
 *
 * Features:
 * - Cursor-based pagination with backward compatibility
 * - Configurable page size via limit parameter
 * - Returns salons sorted by creation date (newest first)
 */
export const listSalonsHandler: RequestHandler<
  Record<string, never>,
  CursorPaginationResponse<Salon> | ErrorResponse,
  unknown,
  Partial<ListSalonsQuery>
> = async (req, res, next) => {
  try {
    // Extract pagination parameters
    const limit = Number(req.query.limit) || 20
    const cursor = req.query.cursor || undefined
    const page = cursorToPage(cursor, limit)

    // Get dependencies and execute use case
    const db = req.app.locals.database as Database
    const repository = new SalonRepository(db)
    const useCase = new ListSalonsUseCase(repository)

    const result = await useCase.execute(page, limit)

    // Handle result with pattern matching
    match(result)
      .with({ type: 'success' }, ({ data }) => {
        const response: CursorPaginationResponse<Salon> = {
          data: data.data,
          meta: data.meta,
          links: data.links,
        }
        res.json(response)
      })
      .with({ type: 'error' }, ({ error }) =>
        handleDomainError(res as Response<ErrorResponse>, error)
      )
      .exhaustive()
  } catch (error) {
    next(error)
  }
}
