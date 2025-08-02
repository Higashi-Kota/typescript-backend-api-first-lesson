/**
 * Customer Domain to DB Mappers
 * ドメインモデルからDBエンティティへの変換
 */

import type { InferInsertModel } from '@beauty-salon-backend/database'
import type { customers } from '@beauty-salon-backend/database'
import type { Customer } from '@beauty-salon-backend/domain'

// DB Insert/Update Types - Drizzle ORMから自動推論
export type DbNewCustomer = InferInsertModel<typeof customers>
export type DbUpdateCustomer = Partial<Omit<DbNewCustomer, 'id'>>

/**
 * ドメインモデルからDB挿入用モデルへの変換
 * @param customer ドメインモデルのCustomer
 * @param createdBy 作成者ID（オプション）
 * @returns DB挿入用のCustomerデータ（Drizzle推論型に準拠）
 */
export const mapDomainCustomerToDbInsert = (
  customer: Customer,
  createdBy?: string
): DbNewCustomer => {
  const data = customer.data
  const birthDateString = data.birthDate
    ? data.birthDate.toISOString().split('T')[0]
    : null

  return {
    id: data.id,
    name: data.name,
    email: data.contactInfo.email,
    phone_number: data.contactInfo.phoneNumber,
    alternative_phone: data.contactInfo.alternativePhone ?? null,
    preferences: data.preferences ?? null,
    notes: data.notes ?? null,
    tags: data.tags.length > 0 ? data.tags : null,
    loyalty_points: data.loyaltyPoints ?? 0, // デフォルト値を0に設定
    membership_level: data.membershipLevel,
    birth_date: birthDateString ?? null,
    created_at: data.createdAt.toISOString(),
    created_by: createdBy ?? null,
    updated_at: data.updatedAt.toISOString(),
    updated_by: createdBy ?? null,
  }
}

/**
 * ドメインモデルからDB更新用モデルへの変換
 * @param customer ドメインモデルのCustomer
 * @param updatedBy 更新者ID（オプション）
 * @returns DB更新用のCustomerデータ（Drizzle推論型に準拠）
 */
export const mapDomainCustomerToDbUpdate = (
  customer: Customer,
  updatedBy?: string
): DbUpdateCustomer => {
  const data = customer.data
  const birthDateString = data.birthDate
    ? data.birthDate.toISOString().split('T')[0]
    : null

  return {
    name: data.name,
    email: data.contactInfo.email,
    phone_number: data.contactInfo.phoneNumber,
    alternative_phone: data.contactInfo.alternativePhone ?? null,
    preferences: data.preferences ?? null,
    notes: data.notes ?? null,
    tags: data.tags.length > 0 ? data.tags : null,
    loyalty_points: data.loyaltyPoints ?? 0, // デフォルト値を0に設定
    membership_level: data.membershipLevel,
    birth_date: birthDateString ?? null,
    updated_at: data.updatedAt.toISOString(),
    updated_by: updatedBy ?? null,
  }
}

/**
 * 部分更新用のDB更新モデルへの変換
 * @param updates 更新するフィールドのみを含むオブジェクト
 * @param updatedBy 更新者ID（オプション）
 * @returns DB更新用の部分データ
 */
export const mapPartialUpdateToDb = (
  updates: {
    name?: string
    email?: string
    phoneNumber?: string
    alternativePhone?: string | null
    preferences?: string | null
    notes?: string | null
    tags?: string[] | null
    loyaltyPoints?: number
    membershipLevel?: 'regular' | 'silver' | 'gold' | 'platinum'
    birthDate?: Date | null
  },
  updatedBy?: string
): DbUpdateCustomer => {
  const dbUpdate: DbUpdateCustomer = {
    updated_at: new Date().toISOString(),
    updated_by: updatedBy ?? null,
  }

  if (updates.name !== undefined) {
    dbUpdate.name = updates.name
  }
  if (updates.email !== undefined) {
    dbUpdate.email = updates.email
  }
  if (updates.phoneNumber !== undefined) {
    dbUpdate.phone_number = updates.phoneNumber
  }
  if (updates.alternativePhone !== undefined) {
    dbUpdate.alternative_phone = updates.alternativePhone
  }
  if (updates.preferences !== undefined) {
    dbUpdate.preferences = updates.preferences ?? null
  }
  if (updates.notes !== undefined) {
    dbUpdate.notes = updates.notes
  }
  if (updates.tags !== undefined) {
    dbUpdate.tags =
      updates.tags && updates.tags.length > 0 ? updates.tags : null
  }
  if (updates.loyaltyPoints !== undefined) {
    dbUpdate.loyalty_points = updates.loyaltyPoints
  }
  if (updates.membershipLevel !== undefined) {
    dbUpdate.membership_level = updates.membershipLevel
  }
  if (updates.birthDate !== undefined) {
    dbUpdate.birth_date = updates.birthDate
      ? updates.birthDate.toISOString().split('T')[0]
      : null
  }

  return dbUpdate
}
