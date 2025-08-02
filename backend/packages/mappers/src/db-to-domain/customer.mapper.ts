/**
 * Customer DB to Domain Mappers
 * DBエンティティからドメインモデルへの変換
 */

import type { InferSelectModel } from '@beauty-salon-backend/database'
import type { customers } from '@beauty-salon-backend/database'
import type { Customer } from '@beauty-salon-backend/domain'
import { createCustomerId } from '@beauty-salon-backend/domain'

// DB Schema Types - Drizzle ORMから自動推論
export type DbCustomer = InferSelectModel<typeof customers>

/**
 * DBモデルからドメインモデルへの変換
 * @param dbCustomer DBから取得したCustomerデータ（Drizzle推論型）
 * @returns ドメインモデルのCustomer、またはnull（無効なデータの場合）
 */
export const mapDbCustomerToDomain = (
  dbCustomer: DbCustomer
): Customer | null => {
  const id = createCustomerId(dbCustomer.id)
  if (id == null) {
    return null
  }

  // preferencesはそのまま文字列として扱う
  // （JSON文字列が保存されている場合もそのまま）
  const preferences = dbCustomer.preferences

  // tagsの処理
  const tags = Array.isArray(dbCustomer.tags)
    ? (dbCustomer.tags as string[])
    : []

  // 削除済みフラグやステータスがDBに存在しない場合は、すべてactiveとして扱う
  // 実際のプロジェクトでは、DBスキーマに status, deletedAt, suspendedAt などのカラムを追加
  return {
    type: 'active' as const,
    data: {
      id,
      name: dbCustomer.name,
      contactInfo: {
        email: dbCustomer.email,
        phoneNumber: dbCustomer.phone_number,
        alternativePhone: dbCustomer.alternative_phone ?? undefined,
      },
      preferences,
      notes: dbCustomer.notes,
      tags,
      birthDate: dbCustomer.birth_date ? new Date(dbCustomer.birth_date) : null,
      loyaltyPoints: dbCustomer.loyalty_points ?? 0,
      membershipLevel: (dbCustomer.membership_level ??
        'regular') as Customer['data']['membershipLevel'],
      createdAt: new Date(dbCustomer.created_at),
      updatedAt: new Date(dbCustomer.updated_at),
    },
  }
}

/**
 * 暗号化されたDBモデルからドメインモデルへの変換
 * 暗号化サービスで復号化後のデータを受け取る
 * @param dbCustomer 復号化済みのCustomerデータ
 * @returns ドメインモデルのCustomer、またはnull（無効なデータの場合）
 */
export const mapDecryptedDbCustomerToDomain = (
  dbCustomer: DbCustomer
): Customer | null => {
  // 復号化済みのデータなので、そのまま通常のマッピングを使用
  return mapDbCustomerToDomain(dbCustomer)
}

/**
 * 複数のDBモデルからドメインモデルへの変換
 * @param dbCustomers DBから取得した複数のCustomerデータ
 * @returns ドメインモデルのCustomer配列（無効なデータは除外）
 */
export const mapDbCustomersToDomain = (
  dbCustomers: DbCustomer[]
): Customer[] => {
  return dbCustomers
    .map(mapDbCustomerToDomain)
    .filter((customer): customer is Customer => customer !== null)
}
