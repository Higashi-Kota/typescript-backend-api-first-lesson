/**
 * Reservation Domain Model
 * CLAUDEガイドラインに準拠したSum型によるモデリング
 */

import type { Result } from '../shared/result.js'
import { err, ok } from '../shared/result.js'
import type { Brand } from '../shared/brand.js'
import { createBrand, createBrandSafe } from '../shared/brand.js'
import type { CustomerId } from './customer.js'
import type { SalonId } from './salon.js'
import type { StaffId } from './staff.js'
import type { ServiceId } from './service.js'

// Reservation固有のID型
export type ReservationId = Brand<string, 'ReservationId'>

// ReservationID作成関数
export const createReservationId = (value: string) =>
  createBrand(value, 'ReservationId')
export const createReservationIdSafe = (value: string) =>
  createBrandSafe(value, 'ReservationId')

// 監査情報（Salonと共通）
import type { AuditInfo } from './salon.js'
import type { ServiceCategory } from './service.js'

// 予約ステータス
export type ReservationStatus =
  | 'pending'
  | 'confirmed'
  | 'cancelled'
  | 'completed'
  | 'no_show'

// Reservationベースデータ
export type ReservationData = {
  id: ReservationId
  salonId: SalonId
  customerId: CustomerId
  staffId: StaffId
  serviceId: ServiceId
  startTime: Date
  endTime: Date
  notes?: string
  totalAmount: number
  depositAmount?: number
  isPaid: boolean
} & AuditInfo

// Reservation Sum型（ステータスベース）
export type Reservation =
  | {
      type: 'pending'
      data: ReservationData
    }
  | {
      type: 'confirmed'
      data: ReservationData
      confirmedAt: Date
      confirmedBy: string
    }
  | {
      type: 'cancelled'
      data: ReservationData
      cancelledAt: Date
      cancelledBy: string
      cancellationReason: string
    }
  | {
      type: 'completed'
      data: ReservationData
      completedAt: Date
      completedBy: string
    }
  | {
      type: 'no_show'
      data: ReservationData
      markedNoShowAt: Date
      markedNoShowBy: string
    }

// Reservation作成リクエスト
export type CreateReservationRequest = {
  salonId: SalonId
  customerId: CustomerId
  staffId: StaffId
  serviceId: ServiceId
  startTime: Date
  endTime: Date
  notes?: string
  totalAmount: number
  depositAmount?: number
  createdBy?: string
}

// Reservation更新リクエスト
export type UpdateReservationRequest = {
  id: ReservationId
  startTime?: Date
  endTime?: Date
  staffId?: StaffId
  notes?: string
  updatedBy?: string
}

// Reservation詳細情報
export type ReservationDetail = {
  reservation: Reservation
  customerName: string
  staffName: string
  serviceName: string
  serviceCategory: ServiceCategory
  serviceDuration: number
}

// 空きスロット
export type AvailableSlot = {
  staffId: StaffId
  startTime: Date
  endTime: Date
}

// Reservation検索条件
export type ReservationSearchCriteria = {
  salonId?: SalonId
  customerId?: CustomerId
  staffId?: StaffId
  serviceId?: ServiceId
  status?: ReservationStatus
  startDate?: Date
  endDate?: Date
  isPaid?: boolean
}

// エラー型の定義
export type ReservationError =
  | { type: 'invalidTimeRange'; message: string }
  | { type: 'slotNotAvailable'; message: string }
  | { type: 'invalidAmount'; message: string }
  | { type: 'pastTimeNotAllowed'; message: string }
  | { type: 'cannotCancel'; message: string }

// バリデーション関数
export const validateTimeRange = (
  startTime: Date,
  endTime: Date
): Result<{ startTime: Date; endTime: Date }, ReservationError> => {
  if (startTime >= endTime) {
    return err({
      type: 'invalidTimeRange',
      message: 'Start time must be before end time',
    })
  }

  const now = new Date()
  if (startTime < now) {
    return err({
      type: 'pastTimeNotAllowed',
      message: 'Cannot create reservation for past time',
    })
  }

  // 最大予約期間（3ヶ月先まで）
  const maxFutureDate = new Date()
  maxFutureDate.setMonth(maxFutureDate.getMonth() + 3)
  if (startTime > maxFutureDate) {
    return err({
      type: 'invalidTimeRange',
      message: 'Cannot create reservation more than 3 months in advance',
    })
  }

  return ok({ startTime, endTime })
}

export const validateAmount = (
  amount: number
): Result<number, ReservationError> => {
  if (amount < 0) {
    return err({
      type: 'invalidAmount',
      message: 'Amount cannot be negative',
    })
  }
  if (amount > 10000000) {
    // 1000万円以上は非現実的
    return err({
      type: 'invalidAmount',
      message: 'Amount is too high',
    })
  }
  return ok(amount)
}

export const validateDepositAmount = (
  depositAmount: number | undefined,
  totalAmount: number
): Result<number | undefined, ReservationError> => {
  if (depositAmount === undefined) {
    return ok(undefined)
  }

  if (depositAmount < 0) {
    return err({
      type: 'invalidAmount',
      message: 'Deposit amount cannot be negative',
    })
  }

  if (depositAmount > totalAmount) {
    return err({
      type: 'invalidAmount',
      message: 'Deposit amount cannot exceed total amount',
    })
  }

  return ok(depositAmount)
}

// 便利なヘルパー関数
export const isPendingReservation = (
  reservation: Reservation
): reservation is Extract<Reservation, { type: 'pending' }> =>
  reservation.type === 'pending'

export const isConfirmedReservation = (
  reservation: Reservation
): reservation is Extract<Reservation, { type: 'confirmed' }> =>
  reservation.type === 'confirmed'

export const isCancelledReservation = (
  reservation: Reservation
): reservation is Extract<Reservation, { type: 'cancelled' }> =>
  reservation.type === 'cancelled'

export const isCompletedReservation = (
  reservation: Reservation
): reservation is Extract<Reservation, { type: 'completed' }> =>
  reservation.type === 'completed'

export const isNoShowReservation = (
  reservation: Reservation
): reservation is Extract<Reservation, { type: 'no_show' }> =>
  reservation.type === 'no_show'

export const canBeCancelled = (reservation: Reservation): boolean => {
  if (
    reservation.type === 'cancelled' ||
    reservation.type === 'completed' ||
    reservation.type === 'no_show'
  ) {
    return false
  }

  // 開始時間の1時間前まではキャンセル可能
  const oneHourBefore = new Date(reservation.data.startTime)
  oneHourBefore.setHours(oneHourBefore.getHours() - 1)

  return new Date() < oneHourBefore
}

export const canBeModified = (reservation: Reservation): boolean => {
  return reservation.type === 'pending' || reservation.type === 'confirmed'
}

export const getReservationStatus = (
  reservation: Reservation
): ReservationStatus => {
  return reservation.type
}

export const calculateRefundAmount = (
  reservation: Reservation,
  cancellationDate: Date
): number => {
  if (!isCancelledReservation(reservation)) {
    return 0
  }

  const hoursBeforeStart =
    (reservation.data.startTime.getTime() - cancellationDate.getTime()) /
    (1000 * 60 * 60)

  // 24時間以上前：全額返金
  if (hoursBeforeStart >= 24) {
    return reservation.data.depositAmount ?? 0
  }
  // 12時間以上前：50%返金
  if (hoursBeforeStart >= 12) {
    return Math.floor((reservation.data.depositAmount ?? 0) * 0.5)
  }
  // それ以外：返金なし
  return 0
}
