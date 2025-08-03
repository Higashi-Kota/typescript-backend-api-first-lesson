/**
 * OpenAPI Type Utilities
 *
 * Helper types for extracting request/response types from OpenAPI-generated definitions.
 * This follows the API-first development pattern from the architecture guidelines.
 */

import type { operations, components } from '@beauty-salon-backend/types/api'

/**
 * Extract request body type from an operation
 */
export type ExtractRequestBody<T> = T extends {
  requestBody: {
    content: {
      'application/json': infer R
    }
  }
}
  ? R
  : never

/**
 * Extract successful response type from an operation
 */
export type ExtractSuccessResponse<T> = T extends {
  responses: {
    200?: {
      content: {
        'application/json': unknown
      }
    }
    201?: {
      content: {
        'application/json': unknown
      }
    }
  }
}
  ? T['responses'][200] extends { content: { 'application/json': infer R } }
    ? R
    : T['responses'][201] extends { content: { 'application/json': infer R } }
      ? R
      : never
  : never

/**
 * Extract path parameters from an operation
 */
export type ExtractPathParams<T> = T extends {
  parameters: {
    path: infer P
  }
}
  ? P
  : never

/**
 * Extract query parameters from an operation
 */
export type ExtractQueryParams<T> = T extends {
  parameters: {
    query: infer Q
  }
}
  ? Q
  : never

// Auth operation types
export type LoginRequest = ExtractRequestBody<
  operations['AuthOperations_login']
>
export type LoginResponse = ExtractSuccessResponse<
  operations['AuthOperations_login']
>
export type RegisterRequest = ExtractRequestBody<
  operations['AuthOperations_register']
>
export type RegisterResponse = ExtractSuccessResponse<
  operations['AuthOperations_register']
>
export type TokenRefreshRequest =
  components['schemas']['Models.TokenRefreshRequest']
export type TokenRefreshResponse = ExtractSuccessResponse<
  operations['AuthOperations_refreshToken']
>

// Customer operation types
export type CreateCustomerRequest = ExtractRequestBody<
  operations['CustomerOperations_create']
>
export type CreateCustomerResponse = ExtractSuccessResponse<
  operations['CustomerOperations_create']
>
export type UpdateCustomerRequest = ExtractRequestBody<
  operations['CustomerOperations_update']
>
export type UpdateCustomerResponse = ExtractSuccessResponse<
  operations['CustomerOperations_update']
>
export type GetCustomerResponse = ExtractSuccessResponse<
  operations['CustomerOperations_get']
>
export type GetCustomerProfileResponse = ExtractSuccessResponse<
  operations['CustomerOperations_getProfile']
>
export type ListCustomersResponse = ExtractSuccessResponse<
  operations['CustomerOperations_list']
>
export type CustomerPathParams = ExtractPathParams<
  operations['CustomerOperations_get']
>
export type CustomerListQueryParams = ExtractQueryParams<
  operations['CustomerOperations_list']
>

// Re-export commonly used schema types
export type User = components['schemas']['Models.User']
export type Customer = components['schemas']['Models.Customer']
export type CustomerProfile = components['schemas']['Models.CustomerProfile']
export type ContactInfo = components['schemas']['Models.ContactInfo']
export type Address = components['schemas']['Models.Address']
export type UserRole = components['schemas']['Models.UserRole']
export type UserAccountStatus =
  components['schemas']['Models.UserAccountStatus']

// Error response types
export type ErrorResponse = components['schemas']['Models.Error']
export type ValidationError = {
  field: string
  message: string
}
