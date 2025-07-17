/**
 * Brand型ユーティリティ
 * 異なるエンティティのIDを型レベルで区別する
 */

const brand = Symbol('brand')
export type Brand<T, B> = T & { [brand]: B }

// 基本的なバリデーション関数
export const isValidUuid = (value: string): boolean => {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(value)
}

// Brand型作成の基本関数
export const createBrand = <B extends string>(
  value: string,
  _brandName: B,
  validator: (value: string) => boolean = isValidUuid
): Brand<string, B> | null => {
  if (!validator(value)) {
    return null
  }
  return value as Brand<string, B>
}

// Brand型作成の安全な関数（Result型を返す）
import type { Result } from './result.js'
import { err, ok } from './result.js'

export type BrandError = {
  type: 'invalidFormat'
  brand: string
  value: string
  message: string
}

export const createBrandSafe = <B extends string>(
  value: string,
  brandName: B,
  validator: (value: string) => boolean = isValidUuid
): Result<Brand<string, B>, BrandError> => {
  if (!validator(value)) {
    return err({
      type: 'invalidFormat',
      brand: brandName,
      value,
      message: `Invalid ${brandName} format: ${value}`,
    })
  }
  return ok(value as Brand<string, B>)
}

// よく使うBrand型の定義
export type CustomerId = Brand<string, 'CustomerId'>
export type SalonId = Brand<string, 'SalonId'>
export type StaffId = Brand<string, 'StaffId'>
export type ServiceId = Brand<string, 'ServiceId'>
export type ReservationId = Brand<string, 'ReservationId'>
export type BookingId = Brand<string, 'BookingId'>
export type ReviewId = Brand<string, 'ReviewId'>
export type CategoryId = Brand<string, 'CategoryId'>

// Brand型作成関数
export const createCustomerId = (value: string) =>
  createBrand(value, 'CustomerId')
export const createSalonId = (value: string) => createBrand(value, 'SalonId')
export const createStaffId = (value: string) => createBrand(value, 'StaffId')
export const createServiceId = (value: string) =>
  createBrand(value, 'ServiceId')
export const createReservationId = (value: string) =>
  createBrand(value, 'ReservationId')
export const createBookingId = (value: string) =>
  createBrand(value, 'BookingId')
export const createReviewId = (value: string) => createBrand(value, 'ReviewId')
export const createCategoryId = (value: string) =>
  createBrand(value, 'CategoryId')

// 安全なBrand型作成関数
export const createCustomerIdSafe = (value: string) =>
  createBrandSafe(value, 'CustomerId')
export const createSalonIdSafe = (value: string) =>
  createBrandSafe(value, 'SalonId')
export const createStaffIdSafe = (value: string) =>
  createBrandSafe(value, 'StaffId')
export const createServiceIdSafe = (value: string) =>
  createBrandSafe(value, 'ServiceId')
export const createReservationIdSafe = (value: string) =>
  createBrandSafe(value, 'ReservationId')
export const createBookingIdSafe = (value: string) =>
  createBrandSafe(value, 'BookingId')
export const createReviewIdSafe = (value: string) =>
  createBrandSafe(value, 'ReviewId')
export const createCategoryIdSafe = (value: string) =>
  createBrandSafe(value, 'CategoryId')
