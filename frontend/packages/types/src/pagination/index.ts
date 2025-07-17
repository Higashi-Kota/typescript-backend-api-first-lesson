import { z } from 'zod'

export type Pagination<T, K extends string = 'data'> = {
  pagination: {
    /**
     * 総件数
     */
    total: number
    /**
     * レスポンスしたページ番号
     */
    page: number
    /**
     * 1ページあたりの件数
     */
    per_page: number
  }
} & {
  [key in K]: T[]
}

export const PaginationParamsSchema = z.object({
  page: z.coerce.number().optional(),
  pageSize: z.coerce.number().optional(),
})

export type PaginationData<T, K extends string = 'data'> =
  | Pagination<T, K>
  | undefined

export const generateDefaultPaginationData = <
  T = unknown,
  K extends string = 'data',
>(
  dataKey: K = 'data' as K
): Pagination<T, K> =>
  ({
    pagination: { page: 0, per_page: 0, total: 0 },
    [dataKey]: [],
  }) as Pagination<T, K>
