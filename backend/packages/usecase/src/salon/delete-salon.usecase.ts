/**
 * Delete Salon Use Case
 * サロン削除のビジネスロジック
 * CLAUDEガイドラインに準拠した実装
 */

import type { SalonId, SalonRepository } from '@beauty-salon-backend/domain'
import { createSalonIdSafe } from '@beauty-salon-backend/domain'
import type { RepositoryError, Result } from '@beauty-salon-backend/domain'
import { err, ok } from '@beauty-salon-backend/domain'
import { match } from 'ts-pattern'

// UseCase 入力型
export type DeleteSalonUseCaseInput = {
  id: SalonId
  deletedBy: string
}

// UseCase 出力型
export type DeleteSalonUseCaseOutput = Result<void, DeleteSalonUseCaseError>

// UseCase エラー型
export type DeleteSalonUseCaseError = RepositoryError

// UseCase 依存関係
export type DeleteSalonDeps = {
  salonRepository: SalonRepository
}

/**
 * サロン削除ユースケース（論理削除）
 * 1. 既存サロンの存在確認
 * 2. リポジトリでの論理削除
 */
export const deleteSalonUseCase = async (
  input: DeleteSalonUseCaseInput,
  deps: DeleteSalonDeps
): Promise<DeleteSalonUseCaseOutput> => {
  // 1. 既存サロンの存在確認
  const existingResult = await deps.salonRepository.findById(input.id)
  if (existingResult.type === 'err') {
    return existingResult
  }

  // 既に削除済みの場合
  if (existingResult.value.type === 'deleted') {
    return err({
      type: 'notFound',
      entity: 'Salon',
      id: input.id,
    })
  }

  // 2. リポジトリで論理削除
  return deps.salonRepository.delete(input.id, input.deletedBy)
}

/**
 * OpenAPIパラメータからUseCaseInputへの変換
 */
export const mapDeleteSalonRequest = (
  id: string,
  deletedBy: string
): Result<DeleteSalonUseCaseInput, { type: 'invalidId'; message: string }> => {
  const salonIdResult = createSalonIdSafe(id)
  if (salonIdResult.type === 'err') {
    return err({
      type: 'invalidId',
      message: salonIdResult.error.message,
    })
  }
  return ok({
    id: salonIdResult.value,
    deletedBy,
  })
}

/**
 * エラーレスポンスの作成
 */
export const createDeleteSalonErrorResponse = (
  error: DeleteSalonUseCaseError
): { code: string; message: string } => {
  return match(error)
    .with({ type: 'databaseError' }, (e) => ({
      code: 'DATABASE_ERROR',
      message: e.message,
    }))
    .with({ type: 'notFound' }, (e) => ({
      code: 'NOT_FOUND',
      message: `Entity ${e.entity} not found with id ${e.id}`,
    }))
    .with({ type: 'constraintViolation' }, (e) => ({
      code: 'CONSTRAINT_VIOLATION',
      message: e.message,
    }))
    .with({ type: 'connectionError' }, (e) => ({
      code: 'CONNECTION_ERROR',
      message: e.message,
    }))
    .exhaustive()
}
