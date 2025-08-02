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
import type { components } from '@beauty-salon-backend/types/api'

// TypeSpecで定義された型
type UpdateCustomerRequest =
  components['schemas']['Models.UpdateCustomerRequest']
type UpdateCustomerRequestWithReset =
  components['schemas']['Models.UpdateCustomerRequestWithReset']

// UseCase エラー型
export type UpdateCustomerUseCaseError = CustomerError | RepositoryError

// UseCase 入力型
export type UpdateCustomerUseCaseInput = {
  id: CustomerId
  updates: {
    name?: string
    email?: string
    phoneNumber?: string
    preferences?: string | null
    notes?: string | null
    tags?: string[]
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
      input.updates.phoneNumber !== undefined
        ? {
            email:
              input.updates.email !== undefined
                ? input.updates.email
                : existingResult.value.data.contactInfo.email,
            phoneNumber:
              input.updates.phoneNumber !== undefined
                ? input.updates.phoneNumber
                : existingResult.value.data.contactInfo.phoneNumber,
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

/**
 * OpenAPI Request型からUseCase入力型への変換（通常の更新）
 */
export const mapUpdateCustomerRequest = (
  id: CustomerId,
  request: UpdateCustomerRequest
): UpdateCustomerUseCaseInput => {
  const updates: UpdateCustomerUseCaseInput['updates'] = {}

  // undefined のフィールドは更新しない
  if (request.name !== undefined) {
    updates.name = request.name
  }
  if (request.contactInfo?.email !== undefined) {
    updates.email = request.contactInfo.email
  }
  if (request.contactInfo?.phoneNumber !== undefined) {
    updates.phoneNumber = request.contactInfo.phoneNumber
  }
  if (request.preferences !== undefined) {
    updates.preferences = request.preferences
  }
  if (request.notes !== undefined) {
    updates.notes = request.notes
  }
  if (request.tags !== undefined) {
    updates.tags = request.tags
  }
  if (request.birthDate !== undefined) {
    updates.birthDate = request.birthDate
  }

  return { id, updates }
}

/**
 * OpenAPI Request型からUseCase入力型への変換（リセット機能付き）
 */
export const mapUpdateCustomerRequestWithReset = (
  id: CustomerId,
  request: UpdateCustomerRequestWithReset
): UpdateCustomerUseCaseInput => {
  const updates: UpdateCustomerUseCaseInput['updates'] = {}

  // undefined = 更新しない、null = リセット、値あり = 更新
  if (request.name !== undefined) {
    updates.name = request.name
  }
  if (request.contactInfo?.email !== undefined) {
    updates.email = request.contactInfo.email
  }
  if (request.contactInfo?.phoneNumber !== undefined) {
    updates.phoneNumber = request.contactInfo.phoneNumber
  }
  if (request.preferences !== undefined) {
    updates.preferences = request.preferences
  }
  if (request.notes !== undefined) {
    updates.notes = request.notes
  }
  if (request.tags !== undefined) {
    updates.tags = request.tags
  }
  if (request.birthDate !== undefined) {
    updates.birthDate = request.birthDate
  }

  return { id, updates }
}
