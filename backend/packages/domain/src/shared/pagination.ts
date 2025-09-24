import type { components } from '@beauty-salon-backend/generated'

// Re-map generated types for type safety
export type PaginationParams = Pick<
  components['schemas']['Models.OffsetPaginationParams'],
  'limit' | 'offset'
>

export type PaginationMeta = components['schemas']['Models.PaginationMeta']

export type PaginatedResult<T> = {
  data: T[]
  meta: PaginationMeta
  links: components['schemas']['Models.PaginationLinks']
}

export const Pagination = {
  create(page = 1, limit = 20): PaginationParams {
    const validatedLimit = Math.min(100, Math.max(1, limit))
    const validatedPage = Math.max(1, page)
    return {
      limit: validatedLimit,
      offset: (validatedPage - 1) * validatedLimit,
    }
  },

  getOffset(params: PaginationParams): number {
    return params.offset
  },

  createResult<T>(
    items: T[],
    totalItems: number,
    params: PaginationParams,
  ): PaginatedResult<T> {
    const currentPage = Math.floor(params.offset / params.limit) + 1
    const totalPages = Math.ceil(totalItems / params.limit)
    const hasNextPage = currentPage < totalPages
    const hasPreviousPage = currentPage > 1

    return {
      data: items,
      meta: {
        total: totalItems,
        limit: params.limit,
        hasMore: hasNextPage,
        cursor: null,
        nextCursor: hasNextPage
          ? `offset:${params.offset + params.limit}`
          : null,
        prevCursor: hasPreviousPage
          ? `offset:${Math.max(0, params.offset - params.limit)}`
          : null,
      },
      links: {
        self: `?limit=${params.limit}&offset=${params.offset}`,
        first: `?limit=${params.limit}&offset=0`,
        last: `?limit=${params.limit}&offset=${Math.max(0, (totalPages - 1) * params.limit)}`,
        next: hasNextPage
          ? `?limit=${params.limit}&offset=${params.offset + params.limit}`
          : null,
        prev: hasPreviousPage
          ? `?limit=${params.limit}&offset=${Math.max(0, params.offset - params.limit)}`
          : null,
      },
    }
  },
}
