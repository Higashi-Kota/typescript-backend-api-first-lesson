import { CreateSalonUseCase } from '@beauty-salon-backend/domain'
import type { Database } from '@beauty-salon-backend/infrastructure'
import { SalonRepository } from '@beauty-salon-backend/infrastructure'
import type { RequestHandler, Response } from 'express'
import { match } from 'ts-pattern'
import type {
  CreateSalonRequest,
  CreateSalonResponse,
  ErrorResponse,
} from './_shared'
import { handleDomainError } from './_shared'

/**
 * POST /api/v1/salons - Create a new salon
 *
 * Features:
 * - Validates all required fields in use case
 * - Creates salon with opening hours
 * - Returns created salon with metadata and links
 */
export const createSalonHandler: RequestHandler<
  Record<string, never>,
  CreateSalonResponse | ErrorResponse,
  CreateSalonRequest
> = async (req, res, next) => {
  try {
    // Get dependencies and execute use case
    const db = req.app.locals.database as Database
    const salonRepository = new SalonRepository(db)
    const useCase = new CreateSalonUseCase({ salonRepository })

    const result = await useCase.execute(req.body)

    // Handle result with pattern matching
    match(result)
      .with({ type: 'success' }, ({ data }) => {
        const response: CreateSalonResponse = {
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
        res.status(201).json(response)
      })
      .with({ type: 'error' }, ({ error }) =>
        handleDomainError(res as Response<ErrorResponse>, error),
      )
      .exhaustive()
  } catch (error) {
    next(error)
  }
}
