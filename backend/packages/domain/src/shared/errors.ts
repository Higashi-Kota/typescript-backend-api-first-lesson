/**
 * 共通エラー型定義
 */

// Validation errors
export type ValidationError = {
  field: string
  message: string
  code?:
    | 'required'
    | 'format'
    | 'invalid'
    | 'duplicate'
    | 'tooLong'
    | 'tooShort'
    | 'range'
}

// Domain errors
export type DomainError =
  | { type: 'validation'; errors: ValidationError[] }
  | { type: 'notFound'; entity: string; id: string }
  | { type: 'conflict'; message: string }
  | { type: 'businessRule'; rule: string; message: string }
  | { type: 'system'; message: string }

// リポジトリエラー
export type RepositoryError =
  | { type: 'notFound'; entity: string; id: string }
  | { type: 'databaseError'; message: string }
  | { type: 'connectionError'; message: string }
  | { type: 'constraintViolation'; constraint: string; message: string }
