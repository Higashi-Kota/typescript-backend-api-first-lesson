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
import type { Result } from './result'
import { err, ok } from './result'

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
