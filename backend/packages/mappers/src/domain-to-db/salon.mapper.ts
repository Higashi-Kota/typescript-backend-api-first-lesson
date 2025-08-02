/**
 * Salon Domain to DB Mappers
 * ドメインモデルからDBエンティティへの変換
 */

import type { InferInsertModel } from '@beauty-salon-backend/database'
import type { salons } from '@beauty-salon-backend/database'
import type { Salon } from '@beauty-salon-backend/domain'

// DB Insert/Update Types - Drizzle ORMから自動推論
export type DbNewSalon = InferInsertModel<typeof salons>
export type DbUpdateSalon = Partial<Omit<DbNewSalon, 'id'>>

/**
 * ドメインモデルからDB挿入用モデルへの変換
 * @param salon ドメインモデルのSalon
 * @param createdBy 作成者ID（オプション）
 * @returns DB挿入用のSalonデータ（Drizzle推論型に準拠）
 */
export const mapDomainSalonToDbInsert = (
  salon: Salon,
  createdBy?: string
): DbNewSalon => {
  const data = salon.data

  // ドメインのstateをDBのprefectureにマッピング
  const dbAddress = {
    street: data.address.street,
    city: data.address.city,
    prefecture: data.address.state, // ドメインはstate、DBはprefecture
    postalCode: data.address.postalCode,
  }

  return {
    id: data.id,
    name: data.name,
    description: data.description,
    address: dbAddress,
    email: data.contactInfo.email,
    phone_number: data.contactInfo.phoneNumber,
    alternative_phone: data.contactInfo.alternativePhone ?? null,
    image_urls:
      data.imageUrls && data.imageUrls.length > 0 ? data.imageUrls : null,
    features: data.features && data.features.length > 0 ? data.features : null,
    created_at: data.createdAt.toISOString(),
    created_by: createdBy ?? null,
    updated_at: data.updatedAt.toISOString(),
    updated_by: createdBy ?? null,
  }
}

/**
 * ドメインモデルからDB更新用モデルへの変換
 * @param salon ドメインモデルのSalon
 * @param updatedBy 更新者ID（オプション）
 * @returns DB更新用のSalonデータ（Drizzle推論型に準拠）
 */
export const mapDomainSalonToDbUpdate = (
  salon: Salon,
  updatedBy?: string
): DbUpdateSalon => {
  const data = salon.data

  // ドメインのstateをDBのprefectureにマッピング
  const dbAddress = {
    street: data.address.street,
    city: data.address.city,
    prefecture: data.address.state, // ドメインはstate、DBはprefecture
    postalCode: data.address.postalCode,
  }

  return {
    name: data.name,
    description: data.description,
    address: dbAddress,
    email: data.contactInfo.email,
    phone_number: data.contactInfo.phoneNumber,
    alternative_phone: data.contactInfo.alternativePhone ?? null,
    image_urls:
      data.imageUrls && data.imageUrls.length > 0 ? data.imageUrls : null,
    features: data.features && data.features.length > 0 ? data.features : null,
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
export const mapPartialSalonUpdateToDb = (
  updates: {
    name?: string
    description?: string
    address?: {
      street: string
      city: string
      state: string
      postalCode: string
      country: string
    }
    email?: string
    phoneNumber?: string
    alternativePhone?: string | null
    imageUrls?: string[]
    features?: string[]
  },
  updatedBy?: string
): DbUpdateSalon => {
  const dbUpdate: DbUpdateSalon = {
    updated_at: new Date().toISOString(),
    updated_by: updatedBy ?? null,
  }

  if (updates.name !== undefined) {
    dbUpdate.name = updates.name
  }
  if (updates.description !== undefined) {
    dbUpdate.description = updates.description
  }
  if (updates.address !== undefined) {
    // ドメインのstateをDBのprefectureにマッピング
    dbUpdate.address = {
      street: updates.address.street,
      city: updates.address.city,
      prefecture: updates.address.state, // ドメインはstate、DBはprefecture
      postalCode: updates.address.postalCode,
    }
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
  if (updates.imageUrls !== undefined) {
    dbUpdate.image_urls =
      updates.imageUrls.length > 0 ? updates.imageUrls : null
  }
  if (updates.features !== undefined) {
    dbUpdate.features = updates.features.length > 0 ? updates.features : null
  }

  return dbUpdate
}
