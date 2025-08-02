/**
 * Staff Domain Model
 * CLAUDEガイドラインに準拠したSum型によるモデリング
 */

import type { Brand } from '../shared/brand.js'
import { createBrand, createBrandSafe } from '../shared/brand.js'
import type { Result } from '../shared/result.js'
import { err, ok } from '../shared/result.js'
import type { SalonId } from './salon.js'

// Staff固有のID型
export type StaffId = Brand<string, 'StaffId'>

// StaffID作成関数
export const createStaffId = (value: string) => createBrand(value, 'StaffId')
export const createStaffIdSafe = (value: string) =>
  createBrandSafe(value, 'StaffId')

// 監査情報（Salonと共通）
import type { AuditInfo, ContactInfo, DayOfWeek } from './salon.js'

// Staffベースデータ
export type StaffData = {
  id: StaffId
  salonId: SalonId
  name: string
  contactInfo: ContactInfo
  specialties: string[]
  imageUrl?: string
  bio?: string
  yearsOfExperience?: number
  certifications?: string[]
} & AuditInfo

// Staff Sum型（ステータスベース）
export type Staff =
  | {
      type: 'active'
      data: StaffData
    }
  | {
      type: 'inactive'
      data: StaffData
      inactivatedAt: Date
      inactivatedReason?: string
    }
  | {
      type: 'terminated'
      data: StaffData
      terminatedAt: Date
      terminatedBy: string
      terminatedReason?: string
    }

// Staff作成リクエスト
export type CreateStaffRequest = {
  salonId: SalonId
  name: string
  contactInfo: ContactInfo
  specialties: string[]
  imageUrl?: string
  bio?: string
  yearsOfExperience?: number
  certifications?: string[]
  createdBy?: string
}

// Staff更新リクエスト
export type UpdateStaffRequest = {
  id: StaffId
  name?: string
  contactInfo?: ContactInfo
  specialties?: string[]
  imageUrl?: string
  bio?: string
  yearsOfExperience?: number
  certifications?: string[]
  updatedBy?: string
}

// Staff可用性
export type StaffAvailability = {
  staffId: StaffId
  dayOfWeek: DayOfWeek
  startTime: string // HH:MM format
  endTime: string // HH:MM format
  breakStart?: string // HH:MM format
  breakEnd?: string // HH:MM format
}

// Staff検索条件
export type StaffSearchCriteria = {
  salonId?: SalonId
  keyword?: string
  specialties?: string[]
  isActive?: boolean
}

// エラー型の定義
export type StaffError =
  | { type: 'invalidName'; message: string }
  | { type: 'invalidSpecialties'; message: string }
  | { type: 'invalidExperience'; message: string }
  | { type: 'invalidAvailability'; message: string }

// バリデーション関数
export const validateStaffName = (name: string): Result<string, StaffError> => {
  if (!name || name.trim().length === 0) {
    return err({ type: 'invalidName', message: 'Staff name cannot be empty' })
  }
  if (name.length > 100) {
    return err({ type: 'invalidName', message: 'Staff name is too long' })
  }
  return ok(name.trim())
}

export const validateSpecialties = (
  specialties: string[]
): Result<string[], StaffError> => {
  if (!specialties || specialties.length === 0) {
    return err({
      type: 'invalidSpecialties',
      message: 'At least one specialty is required',
    })
  }
  if (specialties.length > 20) {
    return err({
      type: 'invalidSpecialties',
      message: 'Too many specialties',
    })
  }
  return ok(specialties)
}

export const validateYearsOfExperience = (
  years?: number
): Result<number | undefined, StaffError> => {
  if (years === undefined) {
    return ok(undefined)
  }
  if (years < 0) {
    return err({
      type: 'invalidExperience',
      message: 'Years of experience cannot be negative',
    })
  }
  if (years > 100) {
    return err({
      type: 'invalidExperience',
      message: 'Years of experience is unrealistic',
    })
  }
  return ok(years)
}

export const validateAvailability = (
  availability: StaffAvailability
): Result<StaffAvailability, StaffError> => {
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/

  if (
    !(
      timeRegex.test(availability.startTime) &&
      timeRegex.test(availability.endTime)
    )
  ) {
    return err({
      type: 'invalidAvailability',
      message: 'Invalid time format (use HH:MM)',
    })
  }

  if (availability.breakStart && !timeRegex.test(availability.breakStart)) {
    return err({
      type: 'invalidAvailability',
      message: 'Invalid break start time format',
    })
  }

  if (availability.breakEnd && !timeRegex.test(availability.breakEnd)) {
    return err({
      type: 'invalidAvailability',
      message: 'Invalid break end time format',
    })
  }

  // 開始時間が終了時間より後にならないようにチェック
  const startParts = availability.startTime.split(':').map(Number)
  const endParts = availability.endTime.split(':').map(Number)
  const startHour = startParts[0]
  const startMin = startParts[1]
  const endHour = endParts[0]
  const endMin = endParts[1]

  if (
    startHour === undefined ||
    startMin === undefined ||
    endHour === undefined ||
    endMin === undefined
  ) {
    return err({
      type: 'invalidAvailability',
      message: 'Invalid time format',
    })
  }

  if (startHour > endHour || (startHour === endHour && startMin >= endMin)) {
    return err({
      type: 'invalidAvailability',
      message: 'Start time must be before end time',
    })
  }

  return ok(availability)
}

// 便利なヘルパー関数
export const isActiveStaff = (
  staff: Staff
): staff is Extract<Staff, { type: 'active' }> => staff.type === 'active'

export const isInactiveStaff = (
  staff: Staff
): staff is Extract<Staff, { type: 'inactive' }> => staff.type === 'inactive'

export const isTerminatedStaff = (
  staff: Staff
): staff is Extract<Staff, { type: 'terminated' }> =>
  staff.type === 'terminated'

export const canProvideService = (staff: Staff): boolean => {
  return staff.type === 'active'
}
