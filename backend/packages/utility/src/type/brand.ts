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
 * export function toUserID(raw: string): UserID {
 *   return raw as UserID
 * }
 * export function toOrderID(raw: number): OrderID {
 *   return raw as OrderID
 * }
 */
export type Brand<K, B extends symbol> = K & { readonly [P in B]: unknown }
