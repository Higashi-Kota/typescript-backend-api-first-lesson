/**
 * ページネーション関連の共通型定義
 */

// ページネーションパラメータ
export type PaginationParams = {
  limit: number
  offset: number
}

// ページネーション結果
export type PaginatedResult<T> = {
  data: T[]
  total: number
  limit: number
  offset: number
}
