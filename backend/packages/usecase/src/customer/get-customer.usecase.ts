/**
 * Get Customer Use Cases
 * 顧客取得のビジネスロジック
 */

import type {
  Customer,
  CustomerId,
  CustomerRepository,
  CustomerSearchCriteria,
  PaginatedResult,
  PaginationParams,
  RepositoryError,
  Result,
} from '@backend/domain'
import type { components } from '@beauty-salon-backend/types/api'
import { mapCustomerToResponse } from './create-customer.usecase.js'

// UseCase エラー型
export type GetCustomerUseCaseError = RepositoryError

// 個別顧客取得
export type GetCustomerByIdInput = {
  id: CustomerId
}

export type GetCustomerByIdOutput = Result<Customer, GetCustomerUseCaseError>

export type GetCustomerByIdDeps = {
  customerRepository: CustomerRepository
}

export const getCustomerByIdUseCase = async (
  input: GetCustomerByIdInput,
  deps: GetCustomerByIdDeps
): Promise<GetCustomerByIdOutput> => {
  return deps.customerRepository.findById(input.id)
}

// 顧客一覧取得
export type ListCustomersInput = {
  search?: string
  tags?: string[]
  membershipLevel?: string
  isActive?: boolean
  limit: number
  offset: number
}

export type ListCustomersOutput = Result<
  PaginatedResult<Customer>,
  GetCustomerUseCaseError
>

export type ListCustomersDeps = {
  customerRepository: CustomerRepository
}

export const listCustomersUseCase = async (
  input: ListCustomersInput,
  deps: ListCustomersDeps
): Promise<ListCustomersOutput> => {
  const criteria: CustomerSearchCriteria = {
    search: input.search,
    tags: input.tags,
    membershipLevel: input.membershipLevel,
    isActive: input.isActive,
  }

  const pagination: PaginationParams = {
    limit: input.limit,
    offset: input.offset,
  }

  return deps.customerRepository.search(criteria, pagination)
}

// 顧客プロフィール取得（拡張情報付き）
export type GetCustomerProfileInput = {
  id: CustomerId
}

export type CustomerProfile = Customer & {
  visitCount: number
  lastVisitDate?: Date
  totalSpent: number
  favoriteStaffIds?: string[]
  favoriteServiceIds?: string[]
}

export type GetCustomerProfileOutput = Result<
  CustomerProfile,
  GetCustomerUseCaseError
>

export type GetCustomerProfileDeps = {
  customerRepository: CustomerRepository
  // 将来的に予約履歴などから統計情報を取得するリポジトリを追加
}

export const getCustomerProfileUseCase = async (
  input: GetCustomerProfileInput,
  deps: GetCustomerProfileDeps
): Promise<GetCustomerProfileOutput> => {
  const customerResult = await deps.customerRepository.findById(input.id)
  if (customerResult.type === 'err') {
    return customerResult
  }

  // TODO: 予約履歴から統計情報を取得
  // 現在は仮の値を返す
  const profile: CustomerProfile = {
    ...customerResult.value,
    visitCount: 0,
    lastVisitDate: undefined,
    totalSpent: 0,
    favoriteStaffIds: [],
    favoriteServiceIds: [],
  }

  return { type: 'ok', value: profile }
}

/**
 * Customer一覧レスポンスへの変換
 */
export const mapCustomerListToResponse = (
  result: PaginatedResult<Customer>
): components['schemas']['Models.PaginationResponseModelsCustomer'] => {
  return {
    data: result.data.map((customer) => mapCustomerToResponse(customer)),
    total: result.total,
    limit: result.limit,
    offset: result.offset,
  }
}

/**
 * CustomerProfileレスポンスへの変換
 */
export const mapCustomerProfileToResponse = (
  profile: CustomerProfile
): components['schemas']['Models.CustomerProfile'] => {
  const base = mapCustomerToResponse(profile)
  return {
    ...base,
    visitCount: profile.visitCount,
    lastVisitDate: profile.lastVisitDate?.toISOString(),
    totalSpent: profile.totalSpent,
    favoriteStaffIds: profile.favoriteStaffIds || [],
    favoriteServiceIds: profile.favoriteServiceIds || [],
  }
}

// Re-export mapCustomerToResponse (already imported above)
