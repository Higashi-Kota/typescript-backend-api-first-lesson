/**
 * Customer API to Domain Mappers
 * APIリクエストからドメインモデルへの変換
 */

import type { CustomerId } from '@beauty-salon-backend/domain'
import type { components } from '@beauty-salon-backend/types/api'

// API Request Types
type CreateCustomerRequest =
  components['schemas']['Models.CreateCustomerRequest']
type UpdateCustomerRequest =
  components['schemas']['Models.UpdateCustomerRequest']

// Domain Input Types
export type CreateCustomerInput = {
  name: string
  email: string
  phoneNumber: string
  alternativePhone?: string
  preferences?: string
  notes?: string
  tags?: string[]
  birthDate?: string
}

export type UpdateCustomerInput = {
  name?: string
  email?: string
  phoneNumber?: string
  alternativePhone?: string | null
  preferences?: string | null
  notes?: string | null
  tags?: string[] | null
  birthDate?: string | null
  loyaltyPoints?: number
  membershipLevel?: 'regular' | 'silver' | 'gold' | 'platinum'
}

export type UpdateCustomerUseCaseInput = {
  id: CustomerId
  updates: UpdateCustomerInput
}

/**
 * CreateCustomerRequestからドメイン入力への変換
 */
export const mapCreateCustomerRequest = (
  request: CreateCustomerRequest
): CreateCustomerInput => {
  return {
    name: request.name,
    email: request.contactInfo.email,
    phoneNumber: request.contactInfo.phoneNumber,
    alternativePhone: request.contactInfo.alternativePhone,
    preferences: request.preferences,
    notes: request.notes,
    tags: request.tags,
    birthDate: request.birthDate,
  }
}

/**
 * UpdateCustomerRequestからドメイン入力への変換
 */
export const mapUpdateCustomerRequest = (
  customerId: CustomerId,
  request: UpdateCustomerRequest
): UpdateCustomerUseCaseInput => {
  const updates: UpdateCustomerInput = {}

  if (request.name !== undefined) {
    updates.name = request.name
  }

  if (request.contactInfo) {
    if (request.contactInfo.email !== undefined) {
      updates.email = request.contactInfo.email
    }
    if (request.contactInfo.phoneNumber !== undefined) {
      updates.phoneNumber = request.contactInfo.phoneNumber
    }
    if (request.contactInfo.alternativePhone !== undefined) {
      updates.alternativePhone = request.contactInfo.alternativePhone
    }
  }

  if (request.preferences !== undefined) {
    updates.preferences = request.preferences
  }
  if (request.notes !== undefined) {
    updates.notes = request.notes
  }
  if (request.tags !== undefined) {
    updates.tags = request.tags
  }
  if (request.birthDate !== undefined) {
    updates.birthDate = request.birthDate
  }
  if (request.loyaltyPoints !== undefined) {
    updates.loyaltyPoints = request.loyaltyPoints
  }
  if (request.membershipLevel !== undefined) {
    updates.membershipLevel = request.membershipLevel
  }

  return {
    id: customerId,
    updates,
  }
}
