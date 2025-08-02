import type {
  Customer,
  CustomerError,
  CustomerId,
  CustomerRepository,
  RepositoryError,
  Result,
  UpdateCustomerInput,
} from '@beauty-salon-backend/domain'
import {
  err,
  updateCustomer as updateCustomerEntity,
} from '@beauty-salon-backend/domain'

// UseCase エラー型
export type UpdateCustomerUseCaseError =
  | CustomerError
  | RepositoryError
  | { type: 'duplicateEmail'; email: string }

// UseCase 入力型
export type UpdateCustomerUseCaseInput = {
  id: CustomerId
  updates: {
    name?: string
    email?: string
    phoneNumber?: string
    alternativePhone?: string | null
    preferences?: string | null
    notes?: string | null
    tags?: string[] | null
    birthDate?: string | null
  }
}

// UseCase 出力型
export type UpdateCustomerUseCaseOutput = Result<
  Customer,
  UpdateCustomerUseCaseError
>

// 依存関係の型
export type UpdateCustomerDeps = {
  customerRepository: CustomerRepository
}

/**
 * 顧客更新ユースケース
 */
export const updateCustomerUseCase = async (
  input: UpdateCustomerUseCaseInput,
  deps: UpdateCustomerDeps
): Promise<UpdateCustomerUseCaseOutput> => {
  const { customerRepository } = deps

  // 1. 既存の顧客を取得
  const existingResult = await customerRepository.findById(input.id)
  if (existingResult.type === 'err') {
    return existingResult
  }

  // 2. メールアドレスの重複チェック（変更がある場合）
  if (
    input.updates.email &&
    input.updates.email !== existingResult.value.data.contactInfo.email
  ) {
    const emailCheckResult = await customerRepository.findByEmail(
      input.updates.email
    )
    if (emailCheckResult.type === 'err') {
      return emailCheckResult
    }

    if (emailCheckResult.value !== null) {
      return err({
        type: 'duplicateEmail',
        email: input.updates.email,
      })
    }
  }

  // 3. ドメインモデルの更新
  const updateInput: UpdateCustomerInput = {
    name: input.updates.name,
    contactInfo:
      input.updates.email !== undefined ||
      input.updates.phoneNumber !== undefined ||
      input.updates.alternativePhone !== undefined
        ? {
            email:
              input.updates.email !== undefined
                ? input.updates.email
                : existingResult.value.data.contactInfo.email,
            phoneNumber:
              input.updates.phoneNumber !== undefined
                ? input.updates.phoneNumber
                : existingResult.value.data.contactInfo.phoneNumber,
            alternativePhone:
              input.updates.alternativePhone !== undefined
                ? input.updates.alternativePhone === null
                  ? undefined
                  : input.updates.alternativePhone
                : existingResult.value.data.contactInfo.alternativePhone,
          }
        : undefined,
    preferences: input.updates.preferences,
    notes: input.updates.notes,
    tags: input.updates.tags,
    birthDate:
      input.updates.birthDate !== undefined
        ? input.updates.birthDate
          ? new Date(input.updates.birthDate)
          : null
        : undefined,
  }

  const updateResult = updateCustomerEntity(existingResult.value, updateInput)
  if (updateResult.type === 'err') {
    return updateResult
  }

  // 4. リポジトリに保存
  const saveResult = await customerRepository.save(updateResult.value)
  return saveResult
}

// マッピング関数はmappersパッケージに移動済み
// 詳細は @beauty-salon-backend/mappers を参照
