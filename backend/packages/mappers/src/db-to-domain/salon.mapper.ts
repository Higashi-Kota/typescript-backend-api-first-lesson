/**
 * Salon DB to Domain Mappers
 * DBエンティティからドメインモデルへの変換
 */

import type { InferSelectModel } from '@beauty-salon-backend/database'
import type { salons } from '@beauty-salon-backend/database'
import type { Salon } from '@beauty-salon-backend/domain'
import { createSalonId } from '@beauty-salon-backend/domain'

// DB Schema Types - Drizzle ORMから自動推論
export type DbSalon = InferSelectModel<typeof salons>

/**
 * DBモデルからドメインモデルへの変換
 * @param dbSalon DBから取得したSalonデータ（Drizzle推論型）
 * @returns ドメインモデルのSalon、またはnull（無効なデータの場合）
 */
export const mapDbSalonToDomain = (dbSalon: DbSalon): Salon | null => {
  const id = createSalonId(dbSalon.id)
  if (id == null) {
    return null
  }

  // address JSONBから変換
  const dbAddress = dbSalon.address as {
    street: string
    city: string
    prefecture: string
    postalCode: string
  }

  const address: Salon['data']['address'] = {
    street: dbAddress.street,
    city: dbAddress.city,
    state: dbAddress.prefecture, // DBはprefecture、ドメインはstate
    postalCode: dbAddress.postalCode,
    country: 'Japan', // デフォルトでJapan
  }

  // image_urls JSONBから変換
  const imageUrls = Array.isArray(dbSalon.image_urls)
    ? (dbSalon.image_urls as string[])
    : []

  // features JSONBから変換
  const features = Array.isArray(dbSalon.features)
    ? (dbSalon.features as string[])
    : []

  return {
    type: 'active' as const,
    data: {
      id,
      name: dbSalon.name,
      description: dbSalon.description,
      address,
      contactInfo: {
        email: dbSalon.email,
        phoneNumber: dbSalon.phone_number,
        alternativePhone: dbSalon.alternative_phone ?? undefined,
      },
      imageUrls,
      features,
      openingHours: [], // TODO: opening_hoursテーブルから取得
      createdAt: new Date(dbSalon.created_at),
      updatedAt: new Date(dbSalon.updated_at),
    },
  }
}

/**
 * 複数のDBモデルからドメインモデルへの変換
 * @param dbSalons DBから取得した複数のSalonデータ
 * @returns ドメインモデルのSalon配列（無効なデータは除外）
 */
export const mapDbSalonsToDomain = (dbSalons: DbSalon[]): Salon[] => {
  return dbSalons
    .map(mapDbSalonToDomain)
    .filter((salon): salon is Salon => salon !== null)
}
