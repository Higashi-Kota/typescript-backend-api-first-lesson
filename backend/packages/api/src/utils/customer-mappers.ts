/**
 * Customer Mapping Utilities
 * ドメインとAPIレスポンス間の型変換ヘルパー
 */

import type { Customer } from '@beauty-salon-backend/domain'
import type { CustomerProfile } from '@beauty-salon-backend/usecase'
import type { components } from '@beauty-salon-backend/types/api'
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
      ({ data }) => ({
        id: data.id,
        name: data.name,
        contactInfo: {
          email: data.contactInfo.email,
          phoneNumber: data.contactInfo.phoneNumber,
          alternativePhone: undefined,
        },
        preferences: data.preferences || undefined,
        notes: data.notes || undefined,
        tags: data.tags,
        loyaltyPoints: data.loyaltyPoints,
        membershipLevel: data.membershipLevel,
        birthDate: data.birthDate
          ? data.birthDate.toISOString().split('T')[0]
          : undefined,
        createdAt: data.createdAt.toISOString(),
        createdBy: undefined,
        updatedAt: data.updatedAt.toISOString(),
        updatedBy: undefined,
      })
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
    lastVisitDate: profile.lastVisitDate?.toISOString(),
    favoriteStaffIds: profile.favoriteStaffIds,
    favoriteServiceIds: profile.favoriteServiceIds,
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
