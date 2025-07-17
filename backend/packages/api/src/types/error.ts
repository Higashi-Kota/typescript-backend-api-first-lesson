/**
 * エラーレスポンス型定義
 */

export type ErrorResponse = {
  code: string
  message: string
  details?: unknown
  stack?: string
}
