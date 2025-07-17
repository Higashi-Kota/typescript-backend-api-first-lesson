/**
 * 共通エラー型定義
 */

// リポジトリエラー
export type RepositoryError =
  | { type: 'notFound'; entity: string; id: string }
  | { type: 'databaseError'; message: string }
  | { type: 'connectionError'; message: string }
  | { type: 'constraintViolation'; constraint: string; message: string }
