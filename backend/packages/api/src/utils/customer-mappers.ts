/**
 * Customer Mapping Utilities
 * ドメインとAPIレスポンス間の型変換ヘルパー
 */

import type { Customer } from '@beauty-salon-backend/domain'
import type { components } from '@beauty-salon-backend/types/api'
import type { CustomerProfile } from '@beauty-salon-backend/usecase'
import { match } from 'ts-pattern'

/**
 * ドメインのCustomerをAPIのCustomerResponseに変換
 */
export function toCustomerResponse(
  customer: Customer
): components['schemas']['Models.Customer'] {
  return match(customer)
    .with(
      { type: 'active' },
      { type: 'suspended' },
      { type: 'deleted' },
      ({ data }): components['schemas']['Models.Customer'] => {
        let birthDateStr: string | null = null
        if (data.birthDate != null) {
          const parts = data.birthDate.toISOString().split('T')
          birthDateStr = parts[0] ?? null
        }
        return {
          id: data.id,
          name: data.name,
          contactInfo: {
            email: data.contactInfo.email,
            phoneNumber: data.contactInfo.phoneNumber,
            alternativePhone: null,
          },
          preferences: data.preferences ?? null,
          notes: data.notes ?? null,
          tags: data.tags ?? null,
          loyaltyPoints: data.loyaltyPoints,
          membershipLevel: data.membershipLevel,
          birthDate: birthDateStr,
          createdAt: data.createdAt.toISOString(),
          createdBy: null,
          updatedAt: data.updatedAt.toISOString(),
          updatedBy: null,
        }
      }
    )
    .exhaustive()
}

/**
 * ドメインのCustomerProfileをAPIのCustomerProfileResponseに変換
 */
export function toCustomerProfileResponse(
  profile: CustomerProfile
): components['schemas']['Models.CustomerProfile'] {
  // CustomerProfileはCustomerを拡張した型なので、直接渡す
  const customerData = toCustomerResponse(profile)

  return {
    ...customerData,
    visitCount: profile.visitCount,
    lastVisitDate: profile.lastVisitDate?.toISOString() ?? null,
    favoriteStaffIds: profile.favoriteStaffIds ?? null,
    favoriteServiceIds: profile.favoriteServiceIds ?? null,
    totalSpent: profile.totalSpent,
  }
}

/**
 * CreateCustomerRequestをドメイン用に正規化
 */
export function normalizeCreateCustomerRequest(
  request: components['schemas']['Models.CreateCustomerRequest']
): Parameters<
  typeof import('@beauty-salon-backend/usecase').mapCreateCustomerRequest
>[0] {
  return {
    name: request.name,
    contactInfo: {
      email: request.contactInfo.email,
      phoneNumber: request.contactInfo.phoneNumber,
      alternativePhone: request.contactInfo.alternativePhone,
    },
    preferences: request.preferences,
    notes: request.notes,
    tags: request.tags,
    birthDate: request.birthDate,
  }
}

/**
 * UpdateCustomerRequestをドメイン用に正規化
 */
export function normalizeUpdateCustomerRequest(
  request: components['schemas']['Models.UpdateCustomerRequest']
) {
  return {
    name: request.name,
    contactInfo: request.contactInfo,
    preferences: request.preferences,
    notes: request.notes,
    tags: request.tags,
    birthDate: request.birthDate,
  }
}
