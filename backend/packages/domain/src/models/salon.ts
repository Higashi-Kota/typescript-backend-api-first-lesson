/**
 * Salon Domain Model
 * CLAUDEガイドラインに準拠したSum型によるモデリング
 */

import type { Brand } from '../shared/brand.js'
import { createBrand, createBrandSafe } from '../shared/brand.js'
import type { Result } from '../shared/result.js'
import { err, ok } from '../shared/result.js'

// Salon固有のID型
export type SalonId = Brand<string, 'SalonId'>

// SalonID作成関数
export const createSalonId = (value: string) => createBrand(value, 'SalonId')
export const createSalonIdSafe = (value: string) =>
  createBrandSafe(value, 'SalonId')

// 住所
export type Address = {
  street: string
  city: string
  state: string
  postalCode: string
  country: string
}

// 連絡先情報
export type ContactInfo = {
  email: string
  phoneNumber: string
  alternativePhone?: string
}

// 曜日
export type DayOfWeek =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday'

// 営業時間
export type OpeningHours = {
  dayOfWeek: DayOfWeek
  openTime: string // HH:MM format
  closeTime: string // HH:MM format
  isHoliday: boolean
}

// 監査情報
export type AuditInfo = {
  createdAt: Date
  createdBy?: string
  updatedAt: Date
  updatedBy?: string
}

// Salonベースデータ
export type SalonData = {
  id: SalonId
  name: string
  description: string
  address: Address
  contactInfo: ContactInfo
  openingHours: OpeningHours[]
  imageUrls?: string[]
  features?: string[]
  rating?: number
  reviewCount?: number
} & AuditInfo

// Salon Sum型（ステータスベース）
export type Salon =
  | {
      type: 'active'
      data: SalonData
    }
  | {
      type: 'suspended'
      data: SalonData
      suspendedAt: Date
      suspendedReason: string
    }
  | {
      type: 'deleted'
      data: SalonData
      deletedAt: Date
      deletedBy: string
    }

// Salon作成リクエスト
export type CreateSalonRequest = {
  name: string
  description: string
  address: Address
  contactInfo: ContactInfo
  openingHours: OpeningHours[]
  imageUrls?: string[]
  features?: string[]
  createdBy?: string
}

// Salon更新リクエスト
export type UpdateSalonRequest = {
  id: SalonId
  name?: string
  description?: string
  address?: Address
  contactInfo?: ContactInfo
  openingHours?: OpeningHours[]
  imageUrls?: string[]
  features?: string[]
  updatedBy?: string
}

// Salon検索条件
export type SalonSearchCriteria = {
  keyword?: string
  city?: string
  isActive?: boolean
}

// エラー型の定義
export type SalonError =
  | { type: 'invalidName'; message: string }
  | { type: 'invalidEmail'; message: string }
  | { type: 'invalidPhoneNumber'; message: string }
  | { type: 'invalidOpeningHours'; message: string }

// バリデーション関数
export const validateSalonName = (name: string): Result<string, SalonError> => {
  if (!name || name.trim().length === 0) {
    return err({ type: 'invalidName', message: 'Salon name cannot be empty' })
  }
  if (name.length > 200) {
    return err({ type: 'invalidName', message: 'Salon name is too long' })
  }
  return ok(name.trim())
}

export const validateEmail = (email: string): Result<string, SalonError> => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return err({ type: 'invalidEmail', message: 'Invalid email format' })
  }
  return ok(email)
}

export const validatePhoneNumber = (
  phoneNumber: string
): Result<string, SalonError> => {
  // 日本の電話番号形式をチェック（簡易版）
  const phoneRegex = /^[+]?[\d-]+$/
  if (!phoneRegex.test(phoneNumber)) {
    return err({
      type: 'invalidPhoneNumber',
      message: 'Invalid phone number format',
    })
  }
  return ok(phoneNumber)
}

export const validateOpeningHours = (
  hours: OpeningHours[]
): Result<OpeningHours[], SalonError> => {
  if (!hours || hours.length === 0) {
    return err({
      type: 'invalidOpeningHours',
      message: 'Opening hours cannot be empty',
    })
  }

  // 時刻形式のチェック
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
  for (const hour of hours) {
    if (!timeRegex.test(hour.openTime) || !timeRegex.test(hour.closeTime)) {
      return err({
        type: 'invalidOpeningHours',
        message: 'Invalid time format (use HH:MM)',
      })
    }
  }

  return ok(hours)
}

// 便利なヘルパー関数
export const isActiveSalon = (
  salon: Salon
): salon is Extract<Salon, { type: 'active' }> => salon.type === 'active'

export const isSuspendedSalon = (
  salon: Salon
): salon is Extract<Salon, { type: 'suspended' }> => salon.type === 'suspended'

export const isDeletedSalon = (
  salon: Salon
): salon is Extract<Salon, { type: 'deleted' }> => salon.type === 'deleted'
