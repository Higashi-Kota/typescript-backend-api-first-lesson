/**
 * Type Validation Utilities
 *
 * Utilities for validating and ensuring type safety between OpenAPI types and runtime values.
 * This enforces compile-time guarantees that API implementations match the OpenAPI contract.
 */

import type { ZodSchema } from 'zod'
import type { Result } from '@beauty-salon-backend/domain'

/**
 * Validates request data against a Zod schema and returns a Result type
 */
export function validateRequest<T>(
  data: unknown,
  schema: ZodSchema<T>
): Result<
  T,
  { type: 'validationError'; errors: Array<{ field: string; message: string }> }
> {
  const result = schema.safeParse(data)

  if (result.success) {
    return { type: 'ok', value: result.data }
  }

  const errors = result.error.errors.map((error) => ({
    field: error.path.join('.'),
    message: error.message,
  }))

  return {
    type: 'err',
    error: {
      type: 'validationError',
      errors,
    },
  }
}

/**
 * Type guard for ensuring a value conforms to an expected type at compile time
 */
export function assertType<T>(value: T): T {
  return value
}

/**
 * Maps validation errors to OpenAPI-compliant error responses
 */
export function mapValidationErrorsToResponse(
  errors: Array<{ field: string; message: string }>
): {
  code: string
  message: string
  errors: Array<{ field: string; message: string }>
} {
  return {
    code: 'VALIDATION_ERROR',
    message: 'Request validation failed',
    errors,
  }
}

/**
 * Creates a type-safe response handler
 */
export function createTypedResponse<T>(
  statusCode: number,
  data: T
): {
  statusCode: number
  body: T
} {
  return {
    statusCode,
    body: data,
  }
}

/**
 * Type-safe error response builders
 */
export const apiErrorResponse = {
  badRequest: (code: string, message: string, details?: unknown) => {
    return createTypedResponse(400, {
      code,
      message,
      details,
    })
  },

  unauthorized: (code: string, message: string) => {
    return createTypedResponse(401, {
      code,
      message,
    })
  },

  forbidden: (code: string, message: string) => {
    return createTypedResponse(403, {
      code,
      message,
    })
  },

  notFound: (code: string, message: string) => {
    return createTypedResponse(404, {
      code,
      message,
    })
  },

  conflict: (code: string, message: string, details?: unknown) => {
    return createTypedResponse(409, {
      code,
      message,
      details,
    })
  },

  internalError: (code: string, message: string) => {
    return createTypedResponse(500, {
      code,
      message,
    })
  },
} as const

/**
 * Type assertion helper for OpenAPI response types
 */
export function assertOpenApiResponse<T>(response: unknown): T {
  // In development, we could add runtime validation here
  // For production, this is a compile-time type assertion
  return response as T
}

/**
 * Helper to ensure exhaustive pattern matching for API responses
 */
export function exhaustiveCheck(value: never): never {
  throw new Error(`Unhandled case: ${JSON.stringify(value)}`)
}
