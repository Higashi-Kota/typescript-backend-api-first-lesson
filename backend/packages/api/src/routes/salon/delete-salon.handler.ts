import { DeleteSalonUseCase } from '@beauty-salon-backend/domain'
import type { SalonId } from '@beauty-salon-backend/domain'
import { SalonRepository } from '@beauty-salon-backend/infrastructure'
import type { Database } from '@beauty-salon-backend/infrastructure'
import type { RequestHandler, Response } from 'express'
import { match } from 'ts-pattern'
import type { DeleteSalonResponse, ErrorResponse } from './_shared'
import { handleDomainError } from './_shared'

/**
 * DELETE /api/v1/salons/:id - Delete a salon (soft delete)
 *
 * Features:
 * - Performs soft delete (sets deletedAt timestamp)
 * - Returns 204 No Content on success
 * - Returns 404 if salon not found
 * - Idempotent - deleting already deleted salon succeeds
 */
export const deleteSalonHandler: RequestHandler<
  { id: SalonId },
  DeleteSalonResponse | ErrorResponse
> = async (req, res, next) => {
  try {
    const { id } = req.params

    // Get dependencies and execute use case
    const db = req.app.locals.database as Database
    const repository = new SalonRepository(db)
    const useCase = new DeleteSalonUseCase(repository)

    const result = await useCase.execute(id)

    // Handle result with pattern matching
    match(result)
      .with({ type: 'success' }, () => {
        res.status(204).send()
      })
      .with({ type: 'error' }, ({ error }) =>
        handleDomainError(res as Response<ErrorResponse>, error)
      )
      .exhaustive()
  } catch (error) {
    next(error)
  }
}
