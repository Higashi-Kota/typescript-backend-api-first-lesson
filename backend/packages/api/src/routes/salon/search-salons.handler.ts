import { SearchSalonsUseCase } from '@beauty-salon-backend/domain'
import { SalonRepository } from '@beauty-salon-backend/infrastructure'
import type { Database } from '@beauty-salon-backend/infrastructure'
import type { RequestHandler, Response } from 'express'
import { match } from 'ts-pattern'
import type {
  ErrorResponse,
  SearchSalonsQuery,
  SearchSalonsResponse,
  ServiceCategoryType,
} from './_shared'
import { cursorToPage, handleDomainError } from './_shared'

/**
 * GET /api/v1/salons/search - Search salons with filters
 *
 * Features:
 * - Keyword search across salon names and descriptions
 * - Filter by city location
 * - Filter by service categories
 * - Paginated results with metadata
 */
export const searchSalonsHandler: RequestHandler<
  Record<string, never>,
  SearchSalonsResponse | ErrorResponse,
  unknown,
  Partial<SearchSalonsQuery>
> = async (req, res, next) => {
  try {
    // Extract search parameters
    const { keyword, city, categories } = req.query
    const limit = Number(req.query.limit) || 20
    const cursor = req.query.cursor || undefined
    const page = cursorToPage(cursor, limit)

    // Get dependencies and execute use case
    const db = req.app.locals.database as Database
    const repository = new SalonRepository(db)
    const useCase = new SearchSalonsUseCase(repository)

    // Extract first category if array (API expects single category)
    const category = categories?.[0] as ServiceCategoryType | undefined
    const result = await useCase.execute(keyword, city, category, page, limit)

    // Handle result with pattern matching
    match(result)
      .with({ type: 'success' }, ({ data }) => {
        const response: SearchSalonsResponse = {
          results: data.data,
          meta: {
            total: data.meta?.total ?? 0,
            query: keyword,
            filters: [city, category].filter(Boolean) as string[],
            duration: 0, // Could be calculated if needed
          },
          facets: {}, // Could add faceted search later
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
