/**
 * Booking Domain Model
 * CLAUDEガイドラインに準拠したSum型によるモデリング
 */

import type { Brand } from '../shared/brand.js'
import { createBrand, createBrandSafe } from '../shared/brand.js'
import type { Result } from '../shared/result.js'
import { err, ok } from '../shared/result.js'
import type { CustomerId } from './customer.js'
import type { ReservationId } from './reservation.js'
import type { SalonId } from './salon.js'

// Booking固有のID型
export type BookingId = Brand<string, 'BookingId'>

// BookingID作成関数
export const createBookingId = (value: string) =>
  createBrand(value, 'BookingId')
export const createBookingIdSafe = (value: string) =>
  createBrandSafe(value, 'BookingId')

// 監査情報（Salonと共通）
import type { AuditInfo } from './salon.js'

// 予約ステータス
export type BookingStatus =
  | 'draft'
  | 'confirmed'
  | 'cancelled'
  | 'completed'
  | 'no_show'

// 支払いステータス
export type PaymentStatus = 'pending' | 'paid' | 'refunded' | 'failed'

// 支払い方法
export type PaymentMethod = 'credit_card' | 'cash' | 'bank_transfer' | 'other'

// Bookingベースデータ
export type BookingData = {
  id: BookingId
  salonId: SalonId
  customerId: CustomerId
  totalAmount: number
  discountAmount?: number
  finalAmount: number
  paymentMethod?: PaymentMethod
  paymentStatus: PaymentStatus
  notes?: string
  reservationIds: ReservationId[]
} & AuditInfo

// Booking Sum型（ステータスベース）
export type Booking =
  | {
      type: 'draft'
      data: BookingData
    }
  | {
      type: 'confirmed'
      data: BookingData
      confirmedAt: Date
      confirmedBy: string
    }
  | {
      type: 'cancelled'
      data: BookingData
      cancelledAt: Date
      cancelledBy: string
      cancellationReason?: string
    }
  | {
      type: 'completed'
      data: BookingData
      completedAt: Date
      completedBy: string
    }
  | {
      type: 'no_show'
      data: BookingData
      markedNoShowAt: Date
      markedNoShowBy: string
    }

// Booking作成リクエスト
export type CreateBookingRequest = {
  salonId: SalonId
  customerId: CustomerId
  totalAmount: number
  discountAmount?: number
  finalAmount: number
  paymentMethod?: PaymentMethod
  notes?: string
  reservationIds?: ReservationId[]
  createdBy?: string
}

// Booking更新リクエスト
export type UpdateBookingRequest = {
  id: BookingId
  paymentMethod?: PaymentMethod
  paymentStatus?: PaymentStatus
  notes?: string
  updatedBy?: string
}

// Booking詳細情報
export type BookingDetail = {
  booking: Booking
  customerName: string
  salonName: string
  reservations: Array<{
    id: ReservationId
    serviceName: string
    staffName: string
    startTime: Date
    endTime: Date
    amount: number
  }>
}

// Booking検索条件
export type BookingSearchCriteria = {
  salonId?: SalonId
  customerId?: CustomerId
  status?: BookingStatus
  paymentStatus?: PaymentStatus
  startDate?: Date
  endDate?: Date
}

// エラー型の定義
export type BookingError =
  | { type: 'invalidAmount'; message: string }
  | { type: 'noReservations'; message: string }
  | { type: 'amountMismatch'; message: string }
  | { type: 'cannotModify'; message: string }
  | { type: 'cannotCancel'; message: string }

// バリデーション関数
export const validateAmount = (
  amount: number
): Result<number, BookingError> => {
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

export const validateFinalAmount = (
  totalAmount: number,
  discountAmount: number | undefined,
  finalAmount: number
): Result<number, BookingError> => {
  const expectedFinalAmount = totalAmount - (discountAmount ?? 0)

  if (finalAmount !== expectedFinalAmount) {
    return err({
      type: 'amountMismatch',
      message: 'Final amount does not match total minus discount',
    })
  }

  if (finalAmount < 0) {
    return err({
      type: 'invalidAmount',
      message: 'Final amount cannot be negative',
    })
  }

  return ok(finalAmount)
}

export const validateReservationIds = (
  reservationIds?: ReservationId[]
): Result<ReservationId[] | undefined, BookingError> => {
  if (!reservationIds || reservationIds.length === 0) {
    return ok(undefined)
  }

  // 重複チェック
  const uniqueIds = new Set(reservationIds)
  if (uniqueIds.size !== reservationIds.length) {
    return err({
      type: 'noReservations',
      message: 'Duplicate reservation IDs found',
    })
  }

  return ok(reservationIds)
}

// 便利なヘルパー関数
export const isDraftBooking = (
  booking: Booking
): booking is Extract<Booking, { type: 'draft' }> => booking.type === 'draft'

export const isConfirmedBooking = (
  booking: Booking
): booking is Extract<Booking, { type: 'confirmed' }> =>
  booking.type === 'confirmed'

export const isCancelledBooking = (
  booking: Booking
): booking is Extract<Booking, { type: 'cancelled' }> =>
  booking.type === 'cancelled'

export const isCompletedBooking = (
  booking: Booking
): booking is Extract<Booking, { type: 'completed' }> =>
  booking.type === 'completed'

export const isNoShowBooking = (
  booking: Booking
): booking is Extract<Booking, { type: 'no_show' }> =>
  booking.type === 'no_show'

export const canBeCancelled = (booking: Booking): boolean => {
  return booking.type === 'draft' || booking.type === 'confirmed'
}

export const canBeCompleted = (booking: Booking): boolean => {
  return booking.type === 'confirmed'
}

export const canBeUpdated = (booking: Booking): boolean => {
  return booking.type === 'draft'
}

export const getBookingStatus = (booking: Booking): BookingStatus => {
  return booking.type
}

export const calculateRefundAmount = (
  booking: Booking,
  refundPercentage: number
): number => {
  if (!isCancelledBooking(booking)) {
    return 0
  }

  return Math.floor(booking.data.finalAmount * (refundPercentage / 100))
}

export const isFullyPaid = (booking: Booking): boolean => {
  return booking.data.paymentStatus === 'paid'
}

export const hasReservations = (booking: Booking): boolean => {
  return booking.data.reservationIds.length > 0
}

export const sortByCreatedAt = (bookings: Booking[]): Booking[] => {
  return [...bookings].sort(
    (a, b) => b.data.createdAt.getTime() - a.data.createdAt.getTime()
  )
}
