/**
 * Delete Customer Use Case
 * 顧客削除のビジネスロジック
 */

import type {
  CustomerId,
  CustomerRepository,
  RepositoryError,
  Result,
} from '@beauty-salon-backend/domain'
import { deleteCustomer as deleteCustomerEntity } from '@beauty-salon-backend/domain'

// UseCase エラー型
export type DeleteCustomerUseCaseError =
  | RepositoryError
  | { type: 'hasActiveReservations'; customerId: CustomerId }

// UseCase 入力型
export type DeleteCustomerUseCaseInput = {
  id: CustomerId
  force?: boolean // 強制削除フラグ（予約がある場合でも削除）
}

// UseCase 出力型
export type DeleteCustomerUseCaseOutput = Result<
  void,
  DeleteCustomerUseCaseError
>

// 依存関係の型
export type DeleteCustomerDeps = {
  customerRepository: CustomerRepository
  // 将来的に予約リポジトリを追加して、アクティブな予約のチェックを行う
}

/**
 * 顧客削除ユースケース（論理削除）
 */
export const deleteCustomerUseCase = async (
  input: DeleteCustomerUseCaseInput,
  deps: DeleteCustomerDeps
): Promise<DeleteCustomerUseCaseOutput> => {
  const { customerRepository } = deps

  // 1. 既存の顧客を取得
  const existingResult = await customerRepository.findById(input.id)
  if (existingResult.type === 'err') {
    return existingResult
  }

  // 2. アクティブな予約のチェック（将来的に実装）
  // TODO: 予約リポジトリを追加したら、ここでチェック
  // if (!input.force) {
  //   const hasActiveReservations = await checkActiveReservations(input.id)
  //   if (hasActiveReservations) {
  //     return err({
  //       type: 'hasActiveReservations',
  //       customerId: input.id,
  //     })
  //   }
  // }

  // 3. 論理削除の実行
  const deletedCustomer = deleteCustomerEntity(existingResult.value)
  if (deletedCustomer.type === 'err') {
    // deleteCustomerEntityは常に成功するため、ここには到達しない
    return {
      type: 'err',
      error: {
        type: 'databaseError',
        message: 'Unexpected error',
      } as RepositoryError,
    }
  }

  // 4. リポジトリに保存
  const saveResult = await customerRepository.save(deletedCustomer.value)
  if (saveResult.type === 'err') {
    return saveResult
  }

  return { type: 'ok', value: undefined }
}

/**
 * 顧客削除ユースケース（物理削除）
 *
 * 注意: 通常は論理削除を使用すべき。物理削除は特別な場合のみ。
 */
export const hardDeleteCustomerUseCase = async (
  input: { id: CustomerId },
  deps: DeleteCustomerDeps
): Promise<DeleteCustomerUseCaseOutput> => {
  return deps.customerRepository.delete(input.id)
}
