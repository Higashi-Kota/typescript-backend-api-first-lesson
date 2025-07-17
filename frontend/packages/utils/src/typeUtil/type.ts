import type {
  Except,
  KeysOfUnion,
  Simplify,
  DistributedOmit as _DistributedOmit,
  DistributedPick as _DistributedPick,
} from 'type-fest'
import type {
  DeepNonNullable as _DeepNonNullable,
  DeepRequired as _DeepRequired,
} from 'utility-types'

/**
 * @see https://github.com/sindresorhus/type-fest/issues/132#issuecomment-1278045631
 */
export type DistributedOmit<T, K extends KeysOfUnion<T>> = Simplify<
  _DistributedOmit<T, K>
>
export type DistributedPick<T, K extends KeysOfUnion<T>> = Simplify<
  _DistributedPick<T, K>
>

type Builtin =
  | number
  | string
  | boolean
  | bigint
  | symbol
  // biome-ignore lint/complexity/noBannedTypes: <explanation>
  | Function
  | Date
  | Error
  | RegExp
  | null
  | undefined

type BuiltinOmitNull = Exclude<Builtin, null>

type BuiltinOmitUndefined = Exclude<Builtin, undefined>

export type DeepNullish<T> = T extends Builtin
  ? T
  : { [key in keyof T]?: DeepNullish<T[key]> | null | undefined }

type DeepNonUndefinable<T> = T extends BuiltinOmitNull
  ? NonNullable<T>
  : { [key in keyof T]-?: DeepNonUndefinable<T[key]> }

type DeepNonNullable<T> = T extends BuiltinOmitUndefined
  ? NonNullable<T>
  : { [key in keyof T]: DeepNonNullable<T[key]> }

export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object
    ? Simplify<DeepReadonly<T[P]>>
    : T[P]
}
export type DeepRequired<T> = _DeepRequired<T>
export type DeepNonNullish<T> = _DeepNonNullable<T>
export type DeepNullable<T> = DeepNonUndefinable<DeepNullish<T>>
export type DeepPartial<T> = DeepNonNullable<DeepNullish<T>>

export type ValueUnion<T> = {
  [K in keyof T]: T[K]
}[keyof T]

export type OmitFromUnion<T, K extends keyof T> = T extends unknown
  ? Omit<T, K>
  : never

export type ShallowNullish<T> = {
  [P in keyof T]: T[P] | null | undefined
}

export type Omit<ObjectType, KeysType extends keyof ObjectType> = Except<
  ObjectType,
  KeysType
>

export type ToColumnRecord<T extends { id: string }> = {
  [K in T['id']]: unknown
}

type RemoveIndexSignature<T> = {
  [K in keyof T as string extends K
    ? never
    : number extends K
      ? never
      : K]: T[K]
}

/**
 * @remarks 自動生成されたAPI定義のレスポンスからOptionalを排除します
 */
export type StrictType<T> = DeepRequired<RemoveIndexSignature<T>>

export type NoParams = Simplify<Record<string, unknown>>

/**
 * K に対して、キーとして唯一無二のシンボル型 B をマーカー付けするユーティリティ
 *
 * @example
 *
 * // 使いたいブランドごとに「型レベルの unique symbol」を宣言
 * export const userIdBrand: unique symbol = Symbol('UserID')
 * export const orderIdBrand: unique symbol = Symbol('OrderID')
 *
 * // それを使って型を定義
 * export type UserID = Brand<string, typeof userIdBrand>
 * export type OrderID = Brand<number, typeof orderIdBrand>
 *
 * // ファクトリ関数も用意しておくと便利
 * export function toUserID(maybeID: unknown): UserID {
 *   return String(maybeID) as UserID
 * }
 * export function toOrderID(maybeID: unknown): OrderID {
 *   return Number(maybeID) as OrderID
 * }
 */
export type Brand<K, B extends symbol> = K & { readonly [P in B]: unknown }
