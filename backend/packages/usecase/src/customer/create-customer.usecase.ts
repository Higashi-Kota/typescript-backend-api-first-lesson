/**
 * Create Customer Use Case
 * 顧客作成のビジネスロジック
 */

import type {
  CreateCustomerInput,
  Customer,
  CustomerError,
  CustomerRepository,
  RepositoryError,
  Result,
} from '@beauty-salon-backend/domain'
import {
  createCustomer as createCustomerEntity,
  createCustomerIdSafe,
  err,
} from '@beauty-salon-backend/domain'
import { v4 as uuidv4 } from 'uuid'

// UseCase エラー型
export type CreateCustomerUseCaseError =
  | CustomerError
  | RepositoryError
  | { type: 'duplicateEmail'; email: string }

// UseCase 入力型（OpenAPIの型から変換）
export type CreateCustomerUseCaseInput = {
  name: string
  email: string
  phoneNumber: string
  preferences?: string | null
  notes?: string | null
  tags?: string[]
  birthDate?: string | null
}

// UseCase 出力型
export type CreateCustomerUseCaseOutput = Result<
  Customer,
  CreateCustomerUseCaseError
>

// 依存関係の型
export type CreateCustomerDeps = {
  customerRepository: CustomerRepository
  generateId?: () => string
}

/**
 * 顧客作成ユースケース
 */
export const createCustomerUseCase = async (
  input: CreateCustomerUseCaseInput,
  deps: CreateCustomerDeps
): Promise<CreateCustomerUseCaseOutput> => {
  const { customerRepository, generateId = uuidv4 } = deps

  // 1. メールアドレスの重複チェック
  const existingCustomerResult = await customerRepository.findByEmail(
    input.email
  )
  if (existingCustomerResult.type === 'err') {
    return existingCustomerResult
  }

  if (existingCustomerResult.value !== null) {
    return err({
      type: 'duplicateEmail',
      email: input.email,
    })
  }

  // 2. IDの生成
  const customerIdResult = createCustomerIdSafe(generateId())
  if (customerIdResult.type === 'err') {
    // IDの生成に失敗した場合（通常は起こらないが、念のため）
    return err({
      type: 'databaseError',
      message: 'Failed to generate customer ID',
    } as RepositoryError)
  }

  // 3. ドメインモデルの作成
  const createInput: CreateCustomerInput = {
    name: input.name,
    contactInfo: {
      email: input.email,
      phoneNumber: input.phoneNumber,
    },
    preferences: input.preferences ?? undefined,
    notes: input.notes ?? undefined,
    tags: input.tags ?? undefined,
    birthDate: input.birthDate ? new Date(input.birthDate) : undefined,
  }

  const customerResult = createCustomerEntity(
    customerIdResult.value,
    createInput
  )
  if (customerResult.type === 'err') {
    return customerResult
  }

  // 4. リポジトリに保存
  const saveResult = await customerRepository.save(customerResult.value)
  return saveResult
}

// マッピング関数はmappersパッケージに移動済み
// 詳細は @beauty-salon-backend/mappers を参照
