/**
 * Customer Domain to API Mappers
 * ドメインモデルからAPIレスポンスへの変換
 */

import type {
  Customer,
  CustomerError,
  PaginatedResult,
  RepositoryError,
} from '@beauty-salon-backend/domain'
import type { components } from '@beauty-salon-backend/types/api'
import { match } from 'ts-pattern'

// API Response Types
type CustomerResponse = components['schemas']['Models.Customer']
type CustomerListResponse = components['schemas']['Responses.CustomerList']
type CustomerProfileResponse =
  components['schemas']['Responses.CustomerProfile']
type ErrorResponse = components['schemas']['Models.Error']

// UseCase Error Types (matching those from @beauty-salon-backend/usecase)
type CreateCustomerUseCaseError =
  | CustomerError
  | RepositoryError
  | { type: 'duplicateEmail'; email: string }

type UpdateCustomerUseCaseError =
  | CustomerError
  | RepositoryError
  | { type: 'duplicateEmail'; email: string }

/**
 * CustomerドメインモデルからAPIレスポンスへの変換
 */
export const mapCustomerToResponse = (customer: Customer): CustomerResponse => {
  const data = customer.data
  return {
    id: data.id,
    name: data.name,
    contactInfo: {
      email: data.contactInfo.email,
      phoneNumber: data.contactInfo.phoneNumber,
      alternativePhone: data.contactInfo.alternativePhone,
    },
    preferences: data.preferences,
    notes: data.notes,
    tags: data.tags,
    loyaltyPoints: data.loyaltyPoints,
    membershipLevel: data.membershipLevel,
    birthDate: data.birthDate?.toISOString().split('T')[0],
    createdAt: data.createdAt.toISOString(),
    createdBy: undefined,
    updatedAt: data.updatedAt.toISOString(),
    updatedBy: undefined,
  }
}

/**
 * Customer一覧レスポンスへの変換
 */
export const mapCustomerListToResponse = (
  result: PaginatedResult<Customer>
): CustomerListResponse => {
  return {
    items: result.data.map(mapCustomerToResponse),
    total: result.total,
    limit: result.limit,
    offset: result.offset,
  }
}

/**
 * Customerプロファイルレスポンスへの変換
 */
export const mapCustomerProfileToResponse = (
  customer: Customer
): CustomerProfileResponse => {
  const base = mapCustomerToResponse(customer)

  return {
    ...base,
    reservationHistory: {
      totalReservations: 0,
      completedReservations: 0,
      cancelledReservations: 0,
      lastReservationDate: undefined,
    },
    reviewHistory: {
      totalReviews: 0,
      averageRating: undefined,
    },
  }
}

/**
 * Customer作成エラーレスポンスの生成
 */
export type CreateCustomerError =
  | { type: 'invalidEmail'; email: string }
  | { type: 'invalidPhoneNumber'; phoneNumber: string }
  | { type: 'invalidName'; name: string }
  | { type: 'duplicateEmail'; email: string }
  | { type: 'databaseError'; message: string }

export const mapCreateCustomerErrorToResponse = (
  error: CreateCustomerError
): ErrorResponse => {
  return match(error)
    .with({ type: 'invalidEmail' }, (e) => ({
      code: 'INVALID_EMAIL',
      message: `Invalid email address: ${e.email}`,
    }))
    .with({ type: 'invalidPhoneNumber' }, (e) => ({
      code: 'INVALID_PHONE_NUMBER',
      message: `Invalid phone number: ${e.phoneNumber}`,
    }))
    .with({ type: 'invalidName' }, (e) => ({
      code: 'INVALID_NAME',
      message: `Invalid name: ${e.name}`,
    }))
    .with({ type: 'duplicateEmail' }, (e) => ({
      code: 'DUPLICATE_EMAIL',
      message: `Email already exists: ${e.email}`,
    }))
    .with({ type: 'databaseError' }, (e) => ({
      code: 'DATABASE_ERROR',
      message: e.message,
    }))
    .exhaustive()
}

/**
 * Customer更新エラーレスポンスの生成
 */
export type UpdateCustomerError =
  | { type: 'customerNotFound'; id: string }
  | { type: 'invalidEmail'; email: string }
  | { type: 'invalidPhoneNumber'; phoneNumber: string }
  | { type: 'invalidName'; name: string }
  | { type: 'duplicateEmail'; email: string }
  | { type: 'databaseError'; message: string }

export const mapUpdateCustomerErrorToResponse = (
  error: UpdateCustomerError
): ErrorResponse => {
  return match(error)
    .with({ type: 'customerNotFound' }, (e) => ({
      code: 'CUSTOMER_NOT_FOUND',
      message: `Customer not found: ${e.id}`,
    }))
    .with({ type: 'invalidEmail' }, (e) => ({
      code: 'INVALID_EMAIL',
      message: `Invalid email address: ${e.email}`,
    }))
    .with({ type: 'invalidPhoneNumber' }, (e) => ({
      code: 'INVALID_PHONE_NUMBER',
      message: `Invalid phone number: ${e.phoneNumber}`,
    }))
    .with({ type: 'invalidName' }, (e) => ({
      code: 'INVALID_NAME',
      message: `Invalid name: ${e.name}`,
    }))
    .with({ type: 'duplicateEmail' }, (e) => ({
      code: 'DUPLICATE_EMAIL',
      message: `Email already exists: ${e.email}`,
    }))
    .with({ type: 'databaseError' }, (e) => ({
      code: 'DATABASE_ERROR',
      message: e.message,
    }))
    .exhaustive()
}

/**
 * CreateCustomerUseCaseErrorからAPIエラーレスポンスへの変換
 */
export const mapCreateCustomerUseCaseErrorToResponse = (
  error: CreateCustomerUseCaseError
): ErrorResponse => {
  return (
    match(error)
      // CustomerError
      .with({ type: 'invalidEmail' }, (e) => ({
        code: 'INVALID_EMAIL',
        message: `Invalid email address: ${e.email}`,
      }))
      .with({ type: 'invalidPhoneNumber' }, (e) => ({
        code: 'INVALID_PHONE_NUMBER',
        message: `Invalid phone number: ${e.phoneNumber}`,
      }))
      .with({ type: 'invalidName' }, (e) => ({
        code: 'INVALID_NAME',
        message: `Invalid name: ${e.name}`,
      }))
      .with({ type: 'duplicateEmail' }, (e) => ({
        code: 'DUPLICATE_EMAIL',
        message: `Email already exists: ${e.email}`,
      }))
      .with({ type: 'customerNotFound' }, (e) => ({
        code: 'CUSTOMER_NOT_FOUND',
        message: `Customer not found: ${e.id}`,
      }))
      .with({ type: 'customerSuspended' }, (e) => ({
        code: 'CUSTOMER_SUSPENDED',
        message: `Customer is suspended: ${e.id}`,
      }))
      // RepositoryError
      .with({ type: 'notFound' }, (e) => ({
        code: 'NOT_FOUND',
        message: `${e.entity} not found: ${e.id}`,
      }))
      .with({ type: 'databaseError' }, (e) => ({
        code: 'DATABASE_ERROR',
        message: e.message,
      }))
      .with({ type: 'connectionError' }, (e) => ({
        code: 'CONNECTION_ERROR',
        message: e.message,
      }))
      .with({ type: 'constraintViolation' }, (e) => ({
        code: 'CONSTRAINT_VIOLATION',
        message: e.message,
      }))
      .exhaustive()
  )
}

/**
 * UpdateCustomerUseCaseErrorからAPIエラーレスポンスへの変換
 */
export const mapUpdateCustomerUseCaseErrorToResponse = (
  error: UpdateCustomerUseCaseError
): ErrorResponse => {
  return (
    match(error)
      // CustomerError
      .with({ type: 'invalidEmail' }, (e) => ({
        code: 'INVALID_EMAIL',
        message: `Invalid email address: ${e.email}`,
      }))
      .with({ type: 'invalidPhoneNumber' }, (e) => ({
        code: 'INVALID_PHONE_NUMBER',
        message: `Invalid phone number: ${e.phoneNumber}`,
      }))
      .with({ type: 'invalidName' }, (e) => ({
        code: 'INVALID_NAME',
        message: `Invalid name: ${e.name}`,
      }))
      .with({ type: 'duplicateEmail' }, (e) => ({
        code: 'DUPLICATE_EMAIL',
        message: `Email already exists: ${e.email}`,
      }))
      .with({ type: 'customerNotFound' }, (e) => ({
        code: 'CUSTOMER_NOT_FOUND',
        message: `Customer not found: ${e.id}`,
      }))
      .with({ type: 'customerSuspended' }, (e) => ({
        code: 'CUSTOMER_SUSPENDED',
        message: `Customer is suspended: ${e.id}`,
      }))
      // RepositoryError
      .with({ type: 'notFound' }, (e) => ({
        code: 'NOT_FOUND',
        message: `${e.entity} not found: ${e.id}`,
      }))
      .with({ type: 'databaseError' }, (e) => ({
        code: 'DATABASE_ERROR',
        message: e.message,
      }))
      .with({ type: 'connectionError' }, (e) => ({
        code: 'CONNECTION_ERROR',
        message: e.message,
      }))
      .with({ type: 'constraintViolation' }, (e) => ({
        code: 'CONSTRAINT_VIOLATION',
        message: e.message,
      }))
      .exhaustive()
  )
}
