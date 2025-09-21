import { UpdateSalonUseCase } from '@beauty-salon-backend/domain'
import type { SalonId } from '@beauty-salon-backend/domain'
import { SalonRepository } from '@beauty-salon-backend/infrastructure'
import type { Database } from '@beauty-salon-backend/infrastructure'
import type { RequestHandler, Response } from 'express'
import { match } from 'ts-pattern'
import type {
  ErrorResponse,
  UpdateSalonRequest,
  UpdateSalonResponse,
} from './_shared'
import { handleDomainError } from './_shared'

/**
 * PUT /api/v1/salons/:id - Update an existing salon
 *
 * Features:
 * - Partial update support (only provided fields are updated)
 * - Returns updated salon with all fields
 * - Returns 404 if salon not found
 * - Validates all fields in use case
 */
export const updateSalonHandler: RequestHandler<
  { id: SalonId },
  UpdateSalonResponse | ErrorResponse,
  UpdateSalonRequest
> = async (req, res, next) => {
  try {
    const { id } = req.params

    // Get dependencies and execute use case
    const db = req.app.locals.database as Database
    const repository = new SalonRepository(db)
    const useCase = new UpdateSalonUseCase(repository)

    const result = await useCase.execute(id, req.body)

    // Handle result with pattern matching
    match(result)
      .with({ type: 'success' }, ({ data }) => {
        const response: UpdateSalonResponse = {
          data,
          meta: {
            correlationId: `req-${Date.now()}`,
            timestamp: new Date().toISOString(),
            version: '1.0.0',
          },
          links: {
            self: `/salons/${data.id}`,
            list: '/salons',
          },
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
