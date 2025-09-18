/**
 * Booking Repository Interface
 * CLAUDEガイドラインに準拠した例外フリーなリポジトリインターフェース
 */

import type {
  Booking,
  BookingDetail,
  BookingId,
  BookingStatus,
  CreateBookingRequest,
  UpdateBookingRequest,
} from '../models/booking'
import type { CustomerId } from '../models/customer'
import type { ReservationId } from '../models/reservation'
import type { SalonId } from '../models/salon'
import type { RepositoryError } from '../shared/errors'
import type { PaginatedResult, PaginationParams } from '../shared/pagination'
import type { Result } from '../shared/result'

// Search criteria for bookings
export interface BookingSearchCriteria {
  customerId?: CustomerId
  salonId?: SalonId
  status?: BookingStatus
  startDate?: Date
  endDate?: Date
  minAmount?: number
  maxAmount?: number
}

export interface BookingRepository {
  /**
   * IDでBookingを取得
   */
  findById(id: BookingId): Promise<Result<Booking, RepositoryError>>

  /**
   * IDでBooking詳細を取得
   */
  findDetailById(id: BookingId): Promise<Result<BookingDetail, RepositoryError>>

  /**
   * 新しいBookingを作成
   */
  create(data: CreateBookingRequest): Promise<Result<Booking, RepositoryError>>

  /**
   * Bookingを更新
   */
  update(
    id: BookingId,
    data: UpdateBookingRequest
  ): Promise<Result<Booking, RepositoryError>>

  /**
   * Bookingを確定
   */
  confirm(
    id: BookingId,
    confirmedBy: string
  ): Promise<Result<Booking, RepositoryError>>

  /**
   * Bookingをキャンセル
   */
  cancel(
    id: BookingId,
    reason: string,
    cancelledBy: string
  ): Promise<Result<Booking, RepositoryError>>

  /**
   * Bookingを完了
   */
  complete(
    id: BookingId,
    completedBy: string
  ): Promise<Result<Booking, RepositoryError>>

  /**
   * BookingをNo-showとしてマーク
   */
  markAsNoShow(
    id: BookingId,
    markedBy: string
  ): Promise<Result<Booking, RepositoryError>>

  /**
   * Reservationを追加
   */
  addReservation(
    bookingId: BookingId,
    reservationId: ReservationId
  ): Promise<Result<Booking, RepositoryError>>

  /**
   * Reservationを削除
   */
  removeReservation(
    bookingId: BookingId,
    reservationId: ReservationId
  ): Promise<Result<Booking, RepositoryError>>

  /**
   * 複数のBookingを検索
   */
  search(
    criteria: BookingSearchCriteria,
    pagination: PaginationParams
  ): Promise<Result<PaginatedResult<Booking>, RepositoryError>>

  /**
   * 顧客のBooking履歴を取得
   */
  findByCustomer(
    customerId: CustomerId,
    pagination: PaginationParams
  ): Promise<Result<PaginatedResult<Booking>, RepositoryError>>

  /**
   * サロンの未完了Bookingを取得
   */
  findPendingBySalon(
    salonId: SalonId,
    pagination: PaginationParams
  ): Promise<Result<PaginatedResult<Booking>, RepositoryError>>

  /**
   * 期間内のBookingを取得
   */
  findByDateRange(
    salonId: SalonId,
    startDate: Date,
    endDate: Date,
    pagination: PaginationParams
  ): Promise<Result<PaginatedResult<Booking>, RepositoryError>>

  /**
   * ステータス別の件数を集計
   */
  countByStatus(
    salonId: SalonId
  ): Promise<Result<Map<string, number>, RepositoryError>>

  /**
   * 支払いステータス別の金額を集計
   */
  sumByPaymentStatus(
    salonId: SalonId,
    startDate: Date,
    endDate: Date
  ): Promise<Result<Map<string, number>, RepositoryError>>
}
