/**
 * Brand Type Utilities
 * Provides type-safe utilities for working with branded types
 */

import type { Brand } from './brand'
import { createBrandSafe, isValidUuid } from './brand'
import type { ValidationError } from './errors'
import type { Result } from './result'
import { err, ok } from './result'

// Re-export branded ID types from models for convenience
export type {
  SalonId,
  CustomerId,
  StaffId,
  ServiceId,
  BookingId,
  ReservationId,
  AttachmentId,
  ReviewId,
  CategoryId,
} from '../models'

// Type-safe brand creation functions with proper typing
export function brandSalonId(
  value: string
): Result<Brand<string, 'SalonId'>, ValidationError> {
  if (!isValidUuid(value)) {
    return err({
      field: 'salonId',
      message: `Invalid salon ID format: ${value}`,
    })
  }
  return ok(value as Brand<string, 'SalonId'>)
}

export function brandCustomerId(
  value: string
): Result<Brand<string, 'CustomerId'>, ValidationError> {
  if (!isValidUuid(value)) {
    return err({
      field: 'customerId',
      message: `Invalid customer ID format: ${value}`,
    })
  }
  return ok(value as Brand<string, 'CustomerId'>)
}

export function brandStaffId(
  value: string
): Result<Brand<string, 'StaffId'>, ValidationError> {
  if (!isValidUuid(value)) {
    return err({
      field: 'staffId',
      message: `Invalid staff ID format: ${value}`,
    })
  }
  return ok(value as Brand<string, 'StaffId'>)
}

export function brandServiceId(
  value: string
): Result<Brand<string, 'ServiceId'>, ValidationError> {
  if (!isValidUuid(value)) {
    return err({
      field: 'serviceId',
      message: `Invalid service ID format: ${value}`,
    })
  }
  return ok(value as Brand<string, 'ServiceId'>)
}

export function brandBookingId(
  value: string
): Result<Brand<string, 'BookingId'>, ValidationError> {
  if (!isValidUuid(value)) {
    return err({
      field: 'bookingId',
      message: `Invalid booking ID format: ${value}`,
    })
  }
  return ok(value as Brand<string, 'BookingId'>)
}

export function brandReservationId(
  value: string
): Result<Brand<string, 'ReservationId'>, ValidationError> {
  if (!isValidUuid(value)) {
    return err({
      field: 'reservationId',
      message: `Invalid reservation ID format: ${value}`,
    })
  }
  return ok(value as Brand<string, 'ReservationId'>)
}

export function brandAttachmentId(
  value: string
): Result<Brand<string, 'AttachmentId'>, ValidationError> {
  if (!isValidUuid(value)) {
    return err({
      field: 'attachmentId',
      message: `Invalid attachment ID format: ${value}`,
    })
  }
  return ok(value as Brand<string, 'AttachmentId'>)
}

export function brandReviewId(
  value: string
): Result<Brand<string, 'ReviewId'>, ValidationError> {
  if (!isValidUuid(value)) {
    return err({
      field: 'reviewId',
      message: `Invalid review ID format: ${value}`,
    })
  }
  return ok(value as Brand<string, 'ReviewId'>)
}

export function brandCategoryId(
  value: string
): Result<Brand<string, 'CategoryId'>, ValidationError> {
  if (!isValidUuid(value)) {
    return err({
      field: 'categoryId',
      message: `Invalid category ID format: ${value}`,
    })
  }
  return ok(value as Brand<string, 'CategoryId'>)
}

// Batch brand validation for arrays
export function brandIdArray<B extends string>(
  values: string[],
  brandName: B,
  fieldName: string
): Result<Array<Brand<string, B>>, ValidationError> {
  const branded: Array<Brand<string, B>> = []

  for (const value of values) {
    const result = createBrandSafe(value, brandName)
    if (result.type === 'err') {
      return err({
        field: fieldName,
        message: `Invalid ${brandName} in array: ${value}`,
      })
    }
    branded.push(result.value)
  }

  return ok(branded)
}

// Unsafe brand creation for trusted sources (e.g., database reads)
// These should only be used when the data is coming from a trusted source
export function unsafeBrandSalonId(value: string): Brand<string, 'SalonId'> {
  return value as Brand<string, 'SalonId'>
}

export function unsafeBrandCustomerId(
  value: string
): Brand<string, 'CustomerId'> {
  return value as Brand<string, 'CustomerId'>
}

export function unsafeBrandStaffId(value: string): Brand<string, 'StaffId'> {
  return value as Brand<string, 'StaffId'>
}

export function unsafeBrandServiceId(
  value: string
): Brand<string, 'ServiceId'> {
  return value as Brand<string, 'ServiceId'>
}

export function unsafeBrandBookingId(
  value: string
): Brand<string, 'BookingId'> {
  return value as Brand<string, 'BookingId'>
}

export function unsafeBrandReservationId(
  value: string
): Brand<string, 'ReservationId'> {
  return value as Brand<string, 'ReservationId'>
}

export function unsafeBrandAttachmentId(
  value: string
): Brand<string, 'AttachmentId'> {
  return value as Brand<string, 'AttachmentId'>
}

export function unsafeBrandReviewId(value: string): Brand<string, 'ReviewId'> {
  return value as Brand<string, 'ReviewId'>
}

export function unsafeBrandCategoryId(
  value: string
): Brand<string, 'CategoryId'> {
  return value as Brand<string, 'CategoryId'>
}

// Type guards for branded types
export function isSalonId(value: unknown): value is Brand<string, 'SalonId'> {
  return typeof value === 'string' && isValidUuid(value)
}

export function isCustomerId(
  value: unknown
): value is Brand<string, 'CustomerId'> {
  return typeof value === 'string' && isValidUuid(value)
}

export function isStaffId(value: unknown): value is Brand<string, 'StaffId'> {
  return typeof value === 'string' && isValidUuid(value)
}

export function isServiceId(
  value: unknown
): value is Brand<string, 'ServiceId'> {
  return typeof value === 'string' && isValidUuid(value)
}

export function isBookingId(
  value: unknown
): value is Brand<string, 'BookingId'> {
  return typeof value === 'string' && isValidUuid(value)
}

export function isReservationId(
  value: unknown
): value is Brand<string, 'ReservationId'> {
  return typeof value === 'string' && isValidUuid(value)
}

export function isAttachmentId(
  value: unknown
): value is Brand<string, 'AttachmentId'> {
  return typeof value === 'string' && isValidUuid(value)
}

export function isReviewId(value: unknown): value is Brand<string, 'ReviewId'> {
  return typeof value === 'string' && isValidUuid(value)
}

export function isCategoryId(
  value: unknown
): value is Brand<string, 'CategoryId'> {
  return typeof value === 'string' && isValidUuid(value)
}
