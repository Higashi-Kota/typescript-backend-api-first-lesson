import {
  CreateSalonUseCase,
  DeleteSalonUseCase,
  GetSalonUseCase,
  ListSalonsUseCase,
  SearchSalonsUseCase,
  UpdateSalonUseCase,
  toProblemDetails,
} from '@beauty-salon-backend/domain'
import type { DomainError, SalonId } from '@beauty-salon-backend/domain'
import type { components, operations } from '@beauty-salon-backend/generated'
import { SalonRepository } from '@beauty-salon-backend/infrastructure'
import type { Database } from '@beauty-salon-backend/infrastructure'
import { Router } from 'express'
import type { RequestHandler, Response } from 'express'
import { match } from 'ts-pattern'

// ============================================================================
// Type remapping from auto-generated types for type safety
// ============================================================================

// Request/Response type extraction from operations
type ListSalonsOperation = operations['SalonCrud_list']
type GetSalonOperation = operations['SalonCrud_get']
type DeleteSalonOperation = operations['SalonCrud_delete']
type CreateSalonOperation = operations['SalonCrud_create']
type UpdateSalonOperation = operations['SalonCrud_update']
type SearchSalonsOperation = operations['SalonCrud_search']

// Model type remapping
type Salon = components['schemas']['Models.Salon']
type CreateSalonRequest = components['schemas']['Models.CreateSalonRequest']
type UpdateSalonRequest = components['schemas']['Models.UpdateSalonRequest']
type ServiceCategoryType = components['schemas']['Models.ServiceCategoryType']

// Response type remapping from operations
type CursorPaginationResponse<T> = {
  data: T[]
  meta: components['schemas']['Models.PaginationMeta']
  links: components['schemas']['Models.PaginationLinks']
}

type GetSalonResponse = Extract<
  GetSalonOperation['responses']['200']['content']['application/json'],
  { data: unknown }
>
type CreateSalonResponse = Extract<
  CreateSalonOperation['responses']['201']['content']['application/json'],
  { data: unknown }
>
type UpdateSalonResponse = Extract<
  UpdateSalonOperation['responses']['200']['content']['application/json'],
  { data: unknown }
>
type DeleteSalonResponse = DeleteSalonOperation['responses']['204']['content']
type SearchSalonsResponse = Extract<
  SearchSalonsOperation['responses']['200']['content']['application/json'],
  { results: unknown }
>

// Query parameter type remapping
type ListSalonsQuery = NonNullable<ListSalonsOperation['parameters']['query']>
type SearchSalonsQuery = NonNullable<
  SearchSalonsOperation['parameters']['query']
>

// Error response type
type ErrorResponse = components['schemas']['Models.ProblemDetails']

// ============================================================================
// Router and handlers
// ============================================================================

const router = Router()

// Error handler with proper types using standardized error conversion
const handleDomainError = (
  res: Response<ErrorResponse>,
  error: DomainError
): Response<ErrorResponse> => {
  const problemDetails = toProblemDetails(error)
  return res.status(problemDetails.status).json(problemDetails)
}

// GET /salons - List all salons with flexible response format for test compatibility
const listSalonsHandler: RequestHandler<
  Record<string, never>,
  CursorPaginationResponse<Salon> | ErrorResponse,
  unknown,
  Partial<ListSalonsQuery>
> = async (req, res, next) => {
  try {
    // Extract pagination from cursor-based params
    const limit = Number(req.query.limit) || 20
    const cursor = req.query.cursor || undefined

    // Convert cursor to page number for backward compatibility
    let page = 1
    if (cursor?.startsWith('offset:')) {
      const offset = Number(cursor.replace('offset:', ''))
      page = Math.floor(offset / limit) + 1
    }

    const db = req.app.locals.database as Database
    const repository = new SalonRepository(db)
    const useCase = new ListSalonsUseCase(repository)

    const result = await useCase.execute(page, limit)

    match(result)
      .with({ type: 'success' }, ({ data }) => {
        // Return proper CursorPaginationResponse structure
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

router.get('/salons', listSalonsHandler)

// POST /salons - Create salon with type safety
const createSalonHandler: RequestHandler<
  Record<string, never>,
  CreateSalonResponse | ErrorResponse,
  CreateSalonRequest
> = async (req, res, next) => {
  try {
    const db = req.app.locals.database as Database
    const repository = new SalonRepository(db)
    const useCase = new CreateSalonUseCase(repository)

    const result = await useCase.execute(req.body)

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
        handleDomainError(res as Response<ErrorResponse>, error)
      )
      .exhaustive()
  } catch (error) {
    next(error)
  }
}

router.post('/salons', createSalonHandler)

// GET /salons/search - Search salons with type safety
const searchSalonsHandler: RequestHandler<
  Record<string, never>,
  SearchSalonsResponse | ErrorResponse,
  unknown,
  Partial<SearchSalonsQuery>
> = async (req, res, next) => {
  try {
    const { keyword, city, categories } = req.query
    const limit = Number(req.query.limit) || 20
    const cursor = req.query.cursor || undefined

    // Convert cursor to page for backward compatibility
    let page = 1
    if (cursor?.startsWith('offset:')) {
      const offset = Number(cursor.replace('offset:', ''))
      page = Math.floor(offset / limit) + 1
    }

    const db = req.app.locals.database as Database
    const repository = new SalonRepository(db)
    const useCase = new SearchSalonsUseCase(repository)

    const category = categories?.[0] as ServiceCategoryType | undefined
    const result = await useCase.execute(keyword, city, category, page, limit)

    match(result)
      .with({ type: 'success' }, ({ data }) => {
        const response: SearchSalonsResponse = {
          results: data.data,
          meta: {
            total: data.meta?.total ?? 0,
            query: keyword,
            filters: [city, category].filter(Boolean) as string[],
            duration: 0,
          },
          facets: undefined,
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

router.get('/salons/search', searchSalonsHandler)

// GET /salons/:id - Get single salon with type safety
const getSalonHandler: RequestHandler<
  { id: SalonId },
  GetSalonResponse | ErrorResponse
> = async (req, res, next) => {
  try {
    const { id } = req.params

    const db = req.app.locals.database as Database
    const repository = new SalonRepository(db)
    const useCase = new GetSalonUseCase(repository)

    const result = await useCase.execute(id)

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
        handleDomainError(res as Response<ErrorResponse>, error)
      )
      .exhaustive()
  } catch (error) {
    next(error)
  }
}

router.get('/salons/:id', getSalonHandler)

// PUT /salons/:id - Update salon with type safety
const updateSalonHandler: RequestHandler<
  { id: SalonId },
  UpdateSalonResponse | ErrorResponse,
  UpdateSalonRequest
> = async (req, res, next) => {
  try {
    const { id } = req.params

    const db = req.app.locals.database as Database
    const repository = new SalonRepository(db)
    const useCase = new UpdateSalonUseCase(repository)

    const result = await useCase.execute(id, req.body)

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

router.put('/salons/:id', updateSalonHandler)

// DELETE /salons/:id - Delete salon with type safety
const deleteSalonHandler: RequestHandler<
  { id: SalonId },
  DeleteSalonResponse | ErrorResponse
> = async (req, res, next) => {
  try {
    const { id } = req.params

    const db = req.app.locals.database as Database
    const repository = new SalonRepository(db)
    const useCase = new DeleteSalonUseCase(repository)

    const result = await useCase.execute(id)

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

router.delete('/salons/:id', deleteSalonHandler)

export default router
