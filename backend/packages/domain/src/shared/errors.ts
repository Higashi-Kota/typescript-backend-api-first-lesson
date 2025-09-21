import type { components } from '@beauty-salon-backend/generated'

// ============================================================================
// Type remapping from auto-generated types for type safety
// ============================================================================

// Domain error types from TypeSpec
export type DomainErrorType = components['schemas']['Models.DomainErrorType']
type ErrorCodeType = components['schemas']['Models.ErrorCodeType']
type ProblemDetails = components['schemas']['Models.ProblemDetails']

// Domain error interface with proper typing
export interface DomainError {
  type: DomainErrorType
  message: string
  code: string
  details?: unknown
}

// ============================================================================
// Error code mapping from domain types to API error codes
// ============================================================================

const ERROR_CODE_MAP: Record<DomainErrorType, ErrorCodeType> = {
  VALIDATION_ERROR: '2001', // VALIDATION_FAILED
  NOT_FOUND: '3001', // RESOURCE_NOT_FOUND
  ALREADY_EXISTS: '3002', // RESOURCE_ALREADY_EXISTS
  BUSINESS_RULE_VIOLATION: '3004', // BUSINESS_RULE_VIOLATION
  UNAUTHORIZED: '1001', // AUTHENTICATION_REQUIRED
  FORBIDDEN: '1005', // INSUFFICIENT_PERMISSIONS
  INTERNAL_ERROR: '4001', // INTERNAL_SERVER_ERROR
  DATABASE_ERROR: '4003', // DATABASE_ERROR
  EXTERNAL_SERVICE_ERROR: '4004', // EXTERNAL_SERVICE_ERROR
}

// HTTP status mapping
const HTTP_STATUS_MAP: Record<DomainErrorType, number> = {
  VALIDATION_ERROR: 400,
  NOT_FOUND: 404,
  ALREADY_EXISTS: 409,
  BUSINESS_RULE_VIOLATION: 422,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  INTERNAL_ERROR: 500,
  DATABASE_ERROR: 500,
  EXTERNAL_SERVICE_ERROR: 502,
}

// ============================================================================
// Domain error factory with type-safe methods
// ============================================================================

export const DomainErrors = {
  /**
   * Create a validation error
   */
  validation(message: string, code: string, details?: unknown): DomainError {
    return {
      type: 'VALIDATION_ERROR' as DomainErrorType,
      message,
      code,
      details,
    }
  },

  /**
   * Create a not found error
   */
  notFound(entity: string, id: string): DomainError {
    return {
      type: 'NOT_FOUND' as DomainErrorType,
      message: `${entity} with ID ${id} not found`,
      code: `${entity.toUpperCase()}_NOT_FOUND`,
      details: { entity, id },
    }
  },

  /**
   * Create an already exists error
   */
  alreadyExists(entity: string, field: string, value: string): DomainError {
    return {
      type: 'ALREADY_EXISTS' as DomainErrorType,
      message: `${entity} with ${field} '${value}' already exists`,
      code: `${entity.toUpperCase()}_ALREADY_EXISTS`,
      details: { entity, field, value },
    }
  },

  /**
   * Create a business rule violation error
   */
  businessRule(message: string, code: string, details?: unknown): DomainError {
    return {
      type: 'BUSINESS_RULE_VIOLATION' as DomainErrorType,
      message,
      code,
      details,
    }
  },

  /**
   * Create an unauthorized error
   */
  unauthorized(message = 'Unauthorized'): DomainError {
    return {
      type: 'UNAUTHORIZED' as DomainErrorType,
      message,
      code: 'UNAUTHORIZED',
    }
  },

  /**
   * Create a forbidden error
   */
  forbidden(message = 'Forbidden'): DomainError {
    return {
      type: 'FORBIDDEN' as DomainErrorType,
      message,
      code: 'FORBIDDEN',
    }
  },

  /**
   * Create an internal error
   */
  internal(message: string, details?: unknown): DomainError {
    return {
      type: 'INTERNAL_ERROR' as DomainErrorType,
      message,
      code: 'INTERNAL_ERROR',
      details,
    }
  },

  /**
   * Create a database error
   */
  database(message: string, details?: unknown): DomainError {
    return {
      type: 'DATABASE_ERROR' as DomainErrorType,
      message,
      code: 'DATABASE_ERROR',
      details,
    }
  },

  /**
   * Create an external service error
   */
  externalService(
    service: string,
    message: string,
    details?: unknown
  ): DomainError {
    return {
      type: 'EXTERNAL_SERVICE_ERROR' as DomainErrorType,
      message: `${service}: ${message}`,
      code: `${service.toUpperCase()}_ERROR`,
      details,
    }
  },
}

// ============================================================================
// Conversion utilities for API responses
// ============================================================================

/**
 * Convert domain error to problem details for API response
 */
export function toProblemDetails(
  error: DomainError,
  instance?: string
): ProblemDetails {
  const errorCode = ERROR_CODE_MAP[error.type] || '4001'
  const httpStatus = HTTP_STATUS_MAP[error.type] || 500

  return {
    type: `https://api.beauty-salon.com/errors/${error.type.toLowerCase()}`,
    title: error.type.replace(/_/g, ' ').toLowerCase(),
    status: httpStatus,
    detail: error.message,
    instance: instance || `urn:error:${Date.now()}`,
    code: errorCode as ErrorCodeType,
    timestamp: new Date().toISOString(),
    errors: error.details
      ? [
          {
            field: 'unknown',
            rule: error.code,
            message: error.message,
            value: undefined,
            constraint: undefined,
          },
        ]
      : undefined,
  }
}

/**
 * Get HTTP status code for domain error type
 */
export function getHttpStatus(errorType: DomainErrorType): number {
  return HTTP_STATUS_MAP[errorType] || 500
}

/**
 * Get error code for domain error type
 */
export function getErrorCode(errorType: DomainErrorType): ErrorCodeType {
  return ERROR_CODE_MAP[errorType] || ('4001' as ErrorCodeType)
}
