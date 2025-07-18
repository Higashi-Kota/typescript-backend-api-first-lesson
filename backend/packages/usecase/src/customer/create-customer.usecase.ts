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
import type { components } from '@beauty-salon-backend/types/api'
import { match } from 'ts-pattern'
import { v4 as uuidv4 } from 'uuid'

// TypeSpecで定義された型
type CreateCustomerRequest =
  components['schemas']['Models.CreateCustomerRequest']

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
    preferences: input.preferences || undefined,
    notes: input.notes || undefined,
    tags: input.tags || undefined,
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

/**
 * OpenAPI Request型からUseCase入力型への変換
 */
export const mapCreateCustomerRequest = (
  request: CreateCustomerRequest
): CreateCustomerUseCaseInput => {
  return {
    name: request.name,
    email: request.contactInfo.email,
    phoneNumber: request.contactInfo.phoneNumber,
    preferences: request.preferences,
    notes: request.notes,
    tags: request.tags,
    birthDate: request.birthDate,
  }
}

/**
 * Customer型からOpenAPI Response型への変換
 */
export const mapCustomerToResponse = (
  customer: Customer
): components['schemas']['Models.Customer'] => {
  const data = customer.data
  return {
    id: data.id,
    name: data.name,
    contactInfo: {
      email: data.contactInfo.email,
      phoneNumber: data.contactInfo.phoneNumber,
    },
    preferences: data.preferences,
    notes: data.notes,
    tags: data.tags,
    loyaltyPoints: data.loyaltyPoints,
    membershipLevel: data.membershipLevel,
    birthDate: data.birthDate?.toISOString().split('T')[0],
    createdAt: data.createdAt.toISOString(),
    createdBy: null,
    updatedAt: data.updatedAt.toISOString(),
    updatedBy: null,
  }
}

/**
 * エラーレスポンスの生成
 */
export const createCustomerErrorResponse = (
  error: CreateCustomerUseCaseError
): components['schemas']['Models.Error'] => {
  return match(error)
    .with({ type: 'invalidEmail' }, (e) => ({
      code: 'INVALID_EMAIL',
      message: `Invalid email format: ${e.email}`,
      target: 'email',
    }))
    .with({ type: 'invalidPhoneNumber' }, (e) => ({
      code: 'INVALID_PHONE_NUMBER',
      message: `Invalid phone number format: ${e.phoneNumber}`,
      target: 'phoneNumber',
    }))
    .with({ type: 'invalidName' }, (e) => ({
      code: 'INVALID_NAME',
      message: `Invalid name: ${e.name}`,
      target: 'name',
    }))
    .with({ type: 'duplicateEmail' }, (e) => ({
      code: 'DUPLICATE_EMAIL',
      message: `Email already exists: ${e.email}`,
      target: 'email',
    }))
    .with({ type: 'notFound' }, (e) => ({
      code: 'NOT_FOUND',
      message: `${e.entity} not found: ${e.id}`,
      target: null,
    }))
    .with({ type: 'databaseError' }, (e) => ({
      code: 'DATABASE_ERROR',
      message: e.message,
      target: null,
    }))
    .otherwise(() => ({
      code: 'UNKNOWN_ERROR',
      message: 'An unexpected error occurred',
      target: null,
    }))
}
