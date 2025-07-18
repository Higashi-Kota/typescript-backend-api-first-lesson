/**
 * Service Domain Model
 * CLAUDEガイドラインに準拠したSum型によるモデリング
 */

import type { Result } from '../shared/result.js'
import { err, ok } from '../shared/result.js'
import type { Brand } from '../shared/brand.js'
import { createBrand, createBrandSafe } from '../shared/brand.js'
import type { SalonId } from './salon.js'

// Service固有のID型
export type ServiceId = Brand<string, 'ServiceId'>
export type CategoryId = Brand<string, 'CategoryId'>

// ServiceID作成関数
export const createServiceId = (value: string) =>
  createBrand(value, 'ServiceId')
export const createServiceIdSafe = (value: string) =>
  createBrandSafe(value, 'ServiceId')

// CategoryID作成関数
export const createCategoryId = (value: string) =>
  createBrand(value, 'CategoryId')
export const createCategoryIdSafe = (value: string) =>
  createBrandSafe(value, 'CategoryId')

// 監査情報（Salonと共通）
import type { AuditInfo } from './salon.js'

// サービスカテゴリ
export type ServiceCategory =
  | 'cut'
  | 'color'
  | 'perm'
  | 'treatment'
  | 'spa'
  | 'other'

// Serviceベースデータ
export type ServiceData = {
  id: ServiceId
  salonId: SalonId
  name: string
  description: string
  duration: number // 分単位
  price: number // 円単位
  category: ServiceCategory
  categoryId?: CategoryId
  imageUrl?: string
  requiredStaffLevel?: number
} & AuditInfo

// Service Sum型（ステータスベース）
export type Service =
  | {
      type: 'active'
      data: ServiceData
    }
  | {
      type: 'inactive'
      data: ServiceData
      inactivatedAt: Date
      inactivatedReason?: string
    }
  | {
      type: 'discontinued'
      data: ServiceData
      discontinuedAt: Date
      discontinuedBy: string
      discontinuedReason?: string
    }

// Service作成リクエスト
export type CreateServiceRequest = {
  salonId: SalonId
  name: string
  description: string
  duration: number
  price: number
  category: ServiceCategory
  categoryId?: CategoryId
  imageUrl?: string
  requiredStaffLevel?: number
  createdBy?: string
}

// Service更新リクエスト
export type UpdateServiceRequest = {
  id: ServiceId
  name?: string
  description?: string
  duration?: number
  price?: number
  category?: ServiceCategory
  categoryId?: CategoryId
  imageUrl?: string
  requiredStaffLevel?: number
  updatedBy?: string
}

// Service検索条件
export type ServiceSearchCriteria = {
  salonId?: SalonId
  keyword?: string
  category?: ServiceCategory
  categoryId?: CategoryId
  minPrice?: number
  maxPrice?: number
  minDuration?: number
  maxDuration?: number
  isActive?: boolean
}

// サービスカテゴリモデル
export type ServiceCategoryData = {
  id: CategoryId
  name: string
  description: string
  parentId?: CategoryId
  displayOrder: number
  isActive: boolean
} & AuditInfo

// エラー型の定義
export type ServiceError =
  | { type: 'invalidName'; message: string }
  | { type: 'invalidDescription'; message: string }
  | { type: 'invalidDuration'; message: string }
  | { type: 'invalidPrice'; message: string }
  | { type: 'invalidStaffLevel'; message: string }

// バリデーション関数
export const validateServiceName = (
  name: string
): Result<string, ServiceError> => {
  if (!name || name.trim().length === 0) {
    return err({ type: 'invalidName', message: 'Service name cannot be empty' })
  }
  if (name.length > 100) {
    return err({ type: 'invalidName', message: 'Service name is too long' })
  }
  return ok(name.trim())
}

export const validateServiceDescription = (
  description: string
): Result<string, ServiceError> => {
  if (!description || description.trim().length === 0) {
    return err({
      type: 'invalidDescription',
      message: 'Service description cannot be empty',
    })
  }
  if (description.length > 1000) {
    return err({
      type: 'invalidDescription',
      message: 'Service description is too long',
    })
  }
  return ok(description.trim())
}

export const validateDuration = (
  duration: number
): Result<number, ServiceError> => {
  if (duration <= 0) {
    return err({
      type: 'invalidDuration',
      message: 'Duration must be positive',
    })
  }
  if (duration > 480) {
    // 8時間以上は非現実的
    return err({
      type: 'invalidDuration',
      message: 'Duration is too long (max 8 hours)',
    })
  }
  return ok(duration)
}

export const validatePrice = (price: number): Result<number, ServiceError> => {
  if (price < 0) {
    return err({
      type: 'invalidPrice',
      message: 'Price cannot be negative',
    })
  }
  if (price > 1000000) {
    // 100万円以上は非現実的
    return err({
      type: 'invalidPrice',
      message: 'Price is too high',
    })
  }
  return ok(price)
}

export const validateRequiredStaffLevel = (
  level?: number
): Result<number | undefined, ServiceError> => {
  if (level === undefined) {
    return ok(undefined)
  }
  if (level < 1) {
    return err({
      type: 'invalidStaffLevel',
      message: 'Staff level must be at least 1',
    })
  }
  if (level > 10) {
    return err({
      type: 'invalidStaffLevel',
      message: 'Staff level is too high (max 10)',
    })
  }
  return ok(level)
}

// 便利なヘルパー関数
export const isActiveService = (
  service: Service
): service is Extract<Service, { type: 'active' }> => service.type === 'active'

export const isInactiveService = (
  service: Service
): service is Extract<Service, { type: 'inactive' }> =>
  service.type === 'inactive'

export const isDiscontinuedService = (
  service: Service
): service is Extract<Service, { type: 'discontinued' }> =>
  service.type === 'discontinued'

export const canBeBooked = (service: Service): boolean => {
  return service.type === 'active'
}

export const calculateTotalPrice = (
  services: Service[],
  discountRate = 0
): number => {
  const baseTotal = services.reduce((sum, service) => {
    return sum + (canBeBooked(service) ? service.data.price : 0)
  }, 0)
  return Math.floor(baseTotal * (1 - discountRate))
}

export const calculateTotalDuration = (services: Service[]): number => {
  return services.reduce((sum, service) => {
    return sum + (canBeBooked(service) ? service.data.duration : 0)
  }, 0)
}
