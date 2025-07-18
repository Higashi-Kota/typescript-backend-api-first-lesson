/**
 * Customer ドメインモデル
 * Sum型を使用して顧客の状態を表現
 */

import { match } from 'ts-pattern'
import type { Brand } from '../shared/brand.js'
import { createBrand, createBrandSafe } from '../shared/brand.js'
import type { Result } from '../shared/result.js'
import { err, ok } from '../shared/result.js'

// Customer固有のID型
export type CustomerId = Brand<string, 'CustomerId'>

// CustomerID作成関数
export const createCustomerId = (value: string) =>
  createBrand(value, 'CustomerId')
export const createCustomerIdSafe = (value: string) =>
  createBrandSafe(value, 'CustomerId')

// 連絡先情報
export type ContactInfo = {
  email: string
  phoneNumber: string
}

// 顧客の基本情報
export type CustomerData = {
  id: CustomerId
  name: string
  contactInfo: ContactInfo
  preferences: string | null
  notes: string | null
  tags: string[]
  birthDate: Date | null
  loyaltyPoints: number
  membershipLevel: MembershipLevel
  createdAt: Date
  updatedAt: Date
}

// メンバーシップレベル（Sum型）
export type MembershipLevel = 'regular' | 'silver' | 'gold' | 'platinum'

// 顧客の状態（Sum型）
export type Customer =
  | { type: 'active'; data: CustomerData }
  | { type: 'suspended'; data: CustomerData; reason: string; suspendedAt: Date }
  | { type: 'deleted'; data: CustomerData; deletedAt: Date }

// 顧客作成時の入力
export type CreateCustomerInput = {
  name: string
  contactInfo: ContactInfo
  preferences?: string
  notes?: string
  tags?: string[]
  birthDate?: Date
}

// 顧客更新時の入力
export type UpdateCustomerInput = {
  name?: string
  contactInfo?: ContactInfo
  preferences?: string | null
  notes?: string | null
  tags?: string[]
  birthDate?: Date | null
}

// エラー型
export type CustomerError =
  | { type: 'invalidEmail'; email: string }
  | { type: 'invalidPhoneNumber'; phoneNumber: string }
  | { type: 'duplicateEmail'; email: string }
  | { type: 'customerNotFound'; id: CustomerId }
  | { type: 'customerSuspended'; id: CustomerId }
  | { type: 'invalidName'; name: string }

// バリデーション関数
export const validateEmail = (email: string): Result<string, CustomerError> => {
  // より厳密なメールアドレスの正規表現
  const emailRegex =
    /^[a-zA-Z0-9][a-zA-Z0-9._%+-]*@[a-zA-Z0-9][a-zA-Z0-9.-]*\.[a-zA-Z]{2,}$/

  // 空文字列チェック
  if (!email) {
    return err({ type: 'invalidEmail', email })
  }

  // 基本的な形式チェック
  if (!emailRegex.test(email)) {
    return err({ type: 'invalidEmail', email })
  }

  // 連続するドットのチェック
  if (email.includes('..')) {
    return err({ type: 'invalidEmail', email })
  }

  // @マークの前後が適切かチェック
  const parts = email.split('@')
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return err({ type: 'invalidEmail', email })
  }

  return ok(email)
}

export const validatePhoneNumber = (
  phoneNumber: string
): Result<string, CustomerError> => {
  const phoneRegex = /^[\d+\-\s()]+$/
  if (!phoneRegex.test(phoneNumber) || phoneNumber.length < 10) {
    return err({ type: 'invalidPhoneNumber', phoneNumber })
  }
  return ok(phoneNumber)
}

export const validateName = (name: string): Result<string, CustomerError> => {
  if (name.trim().length === 0) {
    return err({ type: 'invalidName', name })
  }
  return ok(name.trim())
}

// ドメインロジック

// 顧客の作成
export const createCustomer = (
  id: CustomerId,
  input: CreateCustomerInput
): Result<Customer, CustomerError> => {
  // バリデーション
  const nameResult = validateName(input.name)
  if (nameResult.type === 'err') return nameResult

  const emailResult = validateEmail(input.contactInfo.email)
  if (emailResult.type === 'err') return emailResult

  const phoneResult = validatePhoneNumber(input.contactInfo.phoneNumber)
  if (phoneResult.type === 'err') return phoneResult

  const now = new Date()

  return ok({
    type: 'active',
    data: {
      id,
      name: nameResult.value,
      contactInfo: {
        email: emailResult.value,
        phoneNumber: phoneResult.value,
      },
      preferences: input.preferences || null,
      notes: input.notes || null,
      tags: input.tags || [],
      birthDate: input.birthDate || null,
      loyaltyPoints: 0,
      membershipLevel: 'regular',
      createdAt: now,
      updatedAt: now,
    },
  })
}

// 顧客の更新
export const updateCustomer = (
  customer: Customer,
  input: UpdateCustomerInput
): Result<Customer, CustomerError> => {
  // アクティブな顧客のみ更新可能
  if (customer.type !== 'active') {
    return err({ type: 'customerSuspended', id: customer.data.id })
  }

  // 名前の更新がある場合はバリデーション
  if (input.name !== undefined) {
    const nameResult = validateName(input.name)
    if (nameResult.type === 'err') return nameResult
  }

  // 連絡先の更新がある場合はバリデーション
  if (input.contactInfo) {
    if (input.contactInfo.email) {
      const emailResult = validateEmail(input.contactInfo.email)
      if (emailResult.type === 'err') return emailResult
    }
    if (input.contactInfo.phoneNumber) {
      const phoneResult = validatePhoneNumber(input.contactInfo.phoneNumber)
      if (phoneResult.type === 'err') return phoneResult
    }
  }

  return ok({
    type: 'active',
    data: {
      ...customer.data,
      name: input.name ?? customer.data.name,
      contactInfo: input.contactInfo
        ? {
            email: input.contactInfo.email ?? customer.data.contactInfo.email,
            phoneNumber:
              input.contactInfo.phoneNumber ??
              customer.data.contactInfo.phoneNumber,
          }
        : customer.data.contactInfo,
      preferences:
        input.preferences !== undefined
          ? input.preferences
          : customer.data.preferences,
      notes: input.notes !== undefined ? input.notes : customer.data.notes,
      tags: input.tags ?? customer.data.tags,
      birthDate:
        input.birthDate !== undefined
          ? input.birthDate
          : customer.data.birthDate,
      updatedAt: new Date(),
    },
  })
}

// 顧客の一時停止
export const suspendCustomer = (
  customer: Customer,
  reason: string
): Result<Customer, CustomerError> => {
  if (customer.type !== 'active') {
    return ok(customer) // 既に停止または削除済みの場合はそのまま返す
  }

  return ok({
    type: 'suspended',
    data: customer.data,
    reason,
    suspendedAt: new Date(),
  })
}

// 顧客の再開
export const reactivateCustomer = (
  customer: Customer
): Result<Customer, CustomerError> => {
  if (customer.type !== 'suspended') {
    return ok(customer) // 既にアクティブまたは削除済みの場合はそのまま返す
  }

  return ok({
    type: 'active',
    data: {
      ...customer.data,
      updatedAt: new Date(),
    },
  })
}

// 顧客の削除（論理削除）
export const deleteCustomer = (
  customer: Customer
): Result<Customer, CustomerError> => {
  if (customer.type === 'deleted') {
    return ok(customer) // 既に削除済みの場合はそのまま返す
  }

  return ok({
    type: 'deleted',
    data: customer.data,
    deletedAt: new Date(),
  })
}

// ロイヤリティポイントの追加
export const addLoyaltyPoints = (
  customer: Customer,
  points: number
): Result<Customer, CustomerError> => {
  if (customer.type !== 'active') {
    return err({ type: 'customerSuspended', id: customer.data.id })
  }

  const newPoints = customer.data.loyaltyPoints + points
  const newLevel = calculateMembershipLevel(newPoints)

  return ok({
    type: 'active',
    data: {
      ...customer.data,
      loyaltyPoints: newPoints,
      membershipLevel: newLevel,
      updatedAt: new Date(),
    },
  })
}

// メンバーシップレベルの計算
export const calculateMembershipLevel = (points: number): MembershipLevel => {
  return match(points)
    .when(
      (p) => p >= 10000,
      () => 'platinum' as const
    )
    .when(
      (p) => p >= 5000,
      () => 'gold' as const
    )
    .when(
      (p) => p >= 1000,
      () => 'silver' as const
    )
    .otherwise(() => 'regular' as const)
}

// 顧客が予約可能かどうかの確認
export const canMakeReservation = (customer: Customer): boolean => {
  return customer.type === 'active'
}

// 顧客の表示名を取得
export const getCustomerDisplayName = (customer: Customer): string => {
  return match(customer)
    .with({ type: 'active' }, ({ data }) => data.name)
    .with({ type: 'suspended' }, ({ data }) => `${data.name} (停止中)`)
    .with({ type: 'deleted' }, ({ data }) => `${data.name} (削除済み)`)
    .exhaustive()
}
