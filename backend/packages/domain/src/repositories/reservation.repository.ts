/**
 * Reservation Repository Interface
 * CLAUDEガイドラインに準拠した例外フリーなリポジトリインターフェース
 */

import type { CustomerId } from '../models/customer.js'
import type {
  AvailableSlot,
  CreateReservationRequest,
  Reservation,
  ReservationDetail,
  ReservationId,
  ReservationSearchCriteria,
  UpdateReservationRequest,
} from '../models/reservation.js'
import type { SalonId } from '../models/salon.js'
import type { StaffId } from '../models/staff.js'
import type { RepositoryError } from '../shared/errors.js'
import type { PaginatedResult, PaginationParams } from '../shared/pagination.js'
import type { Result } from '../shared/result.js'

export interface ReservationRepository {
  /**
   * IDでReservationを取得
   */
  findById(id: ReservationId): Promise<Result<Reservation, RepositoryError>>

  /**
   * IDでReservation詳細を取得
   */
  findDetailById(
    id: ReservationId
  ): Promise<Result<ReservationDetail, RepositoryError>>

  /**
   * 新しいReservationを作成
   */
  create(
    data: CreateReservationRequest
  ): Promise<Result<Reservation, RepositoryError>>

  /**
   * Reservationを更新
   */
  update(
    data: UpdateReservationRequest
  ): Promise<Result<Reservation, RepositoryError>>

  /**
   * Reservationを確定
   */
  confirm(
    id: ReservationId,
    confirmedBy: string
  ): Promise<Result<Reservation, RepositoryError>>

  /**
   * Reservationをキャンセル
   */
  cancel(
    id: ReservationId,
    reason: string,
    cancelledBy: string
  ): Promise<Result<Reservation, RepositoryError>>

  /**
   * Reservationを完了
   */
  complete(
    id: ReservationId,
    completedBy: string
  ): Promise<Result<Reservation, RepositoryError>>

  /**
   * ReservationをNo-showとしてマーク
   */
  markAsNoShow(
    id: ReservationId,
    markedBy: string
  ): Promise<Result<Reservation, RepositoryError>>

  /**
   * 支払い状態を更新
   */
  updatePaymentStatus(
    id: ReservationId,
    isPaid: boolean,
    updatedBy: string
  ): Promise<Result<Reservation, RepositoryError>>

  /**
   * 複数のReservationを検索
   */
  search(
    criteria: ReservationSearchCriteria,
    pagination: PaginationParams
  ): Promise<Result<PaginatedResult<Reservation>, RepositoryError>>

  /**
   * スタッフの予約を日付範囲で取得
   */
  findByStaffAndDateRange(
    staffId: StaffId,
    startDate: Date,
    endDate: Date
  ): Promise<Result<Reservation[], RepositoryError>>

  /**
   * 顧客の予約履歴を取得
   */
  findByCustomer(
    customerId: CustomerId,
    pagination: PaginationParams
  ): Promise<Result<PaginatedResult<Reservation>, RepositoryError>>

  /**
   * 利用可能なスロットを検索
   */
  findAvailableSlots(
    salonId: SalonId,
    serviceId: string,
    date: Date,
    duration: number
  ): Promise<Result<AvailableSlot[], RepositoryError>>

  /**
   * 時間帯の重複をチェック
   */
  checkTimeSlotConflict(
    staffId: StaffId,
    startTime: Date,
    endTime: Date,
    excludeReservationId?: ReservationId
  ): Promise<Result<boolean, RepositoryError>>

  /**
   * 日別の予約数を集計
   */
  countByDate(
    salonId: SalonId,
    startDate: Date,
    endDate: Date
  ): Promise<Result<Map<string, number>, RepositoryError>>
}
