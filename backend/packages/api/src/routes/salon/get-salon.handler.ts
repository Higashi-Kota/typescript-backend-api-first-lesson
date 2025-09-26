import type { SalonId } from '@beauty-salon-backend/domain'
import { GetSalonUseCase } from '@beauty-salon-backend/domain'
import type { Database } from '@beauty-salon-backend/infrastructure'
import { SalonRepository } from '@beauty-salon-backend/infrastructure'
import type { RequestHandler, Response } from 'express'
import { match } from 'ts-pattern'
import type { ErrorResponse, GetSalonResponse } from './_shared'
import { handleDomainError } from './_shared'

/**
 * GET /api/v1/salons/:id - Get a single salon by ID
 *
 * Features:
 * - Retrieves complete salon details including opening hours
 * - Returns 404 if salon not found or soft deleted
 * - Validates UUID format in use case
 */
export const getSalonHandler: RequestHandler<
  { id: SalonId },
  GetSalonResponse | ErrorResponse
> = async (req, res, next) => {
  try {
    const { id } = req.params

    // Get dependencies and execute use case
    const db = req.app.locals.database as Database
    const repository = new SalonRepository(db)
    const useCase = new GetSalonUseCase(repository)

    const result = await useCase.execute(id)

    // Handle result with pattern matching
    match(result)
      .with({ type: 'success' }, ({ data }) => {
        const response: GetSalonResponse = {
          data,
          meta: {
            correlationId: `req-${Date.now()}`,
            timestamp: new Date().toISOString(),
            version: '1.0.0',
          },
          links: {
            self: `/salons/${data.id}`,
            update: `/salons/${data.id}`,
            delete: `/salons/${data.id}`,
          },
        }
        res.json(response)
      })
      .with({ type: 'error' }, ({ error }) =>
        handleDomainError(res as Response<ErrorResponse>, error),
      )
      .exhaustive()
  } catch (error) {
    next(error)
  }
}
