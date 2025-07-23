/**
 * Salon Mapping Utilities
 * ドメインとAPIレスポンス間の型変換ヘルパー
 */

import type { Salon } from '@beauty-salon-backend/domain'
import type { components } from '@beauty-salon-backend/types/api'
import { match } from 'ts-pattern'

/**
 * ドメインのSalonをAPIのSalonResponseに変換
 */
export function toSalonResponse(
  salon: Salon
): components['schemas']['Models.Salon'] {
  return match(salon)
    .with(
      { type: 'active' },
      { type: 'suspended' },
      { type: 'deleted' },
      ({ data }) => ({
        id: data.id,
        name: data.name,
        description: data.description,
        address: data.address,
        contactInfo: {
          email: data.contactInfo.email,
          phoneNumber: data.contactInfo.phoneNumber,
          alternativePhone: data.contactInfo.alternativePhone ?? null,
        },
        openingHours: data.openingHours.map((hours) => ({
          dayOfWeek: hours.dayOfWeek,
          openTime: hours.openTime,
          closeTime: hours.closeTime,
          isHoliday: hours.isHoliday,
        })),
        imageUrls: data.imageUrls ?? null,
        features: data.features ?? null,
        createdAt: data.createdAt.toISOString(),
        createdBy: data.createdBy ?? null,
        updatedAt: data.updatedAt.toISOString(),
        updatedBy: data.updatedBy ?? null,
      })
    )
    .exhaustive()
}

/**
 * SalonSummaryを生成
 */
export function toSalonSummaryResponse(
  salon: Salon,
  rating?: number,
  reviewCount?: number
): components['schemas']['Models.SalonSummary'] {
  return {
    id: salon.data.id,
    name: salon.data.name,
    address: salon.data.address,
    rating: rating ?? null,
    reviewCount: reviewCount ?? null,
  }
}

/**
 * CreateSalonRequestをドメイン用に正規化
 */
export function normalizeCreateSalonRequest(
  request: components['schemas']['Models.CreateSalonRequest']
): Parameters<
  typeof import('@beauty-salon-backend/usecase').mapCreateSalonRequest
>[0] {
  return {
    name: request.name,
    description: request.description,
    address: request.address,
    contactInfo: request.contactInfo,
    openingHours: request.openingHours,
    imageUrls: request.imageUrls,
    features: request.features,
  }
}

/**
 * UpdateSalonRequestをドメイン用に正規化
 */
export function normalizeUpdateSalonRequest(
  request: components['schemas']['Models.UpdateSalonRequest']
) {
  return {
    name: request.name,
    description: request.description,
    address: request.address,
    contactInfo: request.contactInfo,
    openingHours: request.openingHours,
    imageUrls: request.imageUrls,
    features: request.features,
  }
}
