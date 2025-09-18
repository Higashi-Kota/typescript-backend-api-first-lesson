/**
 * Review Repository Interface
 * CLAUDEガイドラインに準拠した例外フリーなリポジトリインターフェース
 */

import type { BookingId } from '../models/booking'
import type { CustomerId } from '../models/customer'
import type { ReservationId } from '../models/reservation'
import type {
  Review,
  ReviewId,
  ReviewSummary,
  UpdateReviewRequest,
} from '../models/review'
import type { SalonId } from '../models/salon'
import type { StaffId } from '../models/staff'
import type { RepositoryError } from '../shared/errors'
import type { PaginatedResult, PaginationParams } from '../shared/pagination'
import type { Result } from '../shared/result'

// Search criteria for reviews
export interface ReviewSearchCriteria {
  salonId?: SalonId
  staffId?: StaffId
  customerId?: CustomerId
  minRating?: number
  maxRating?: number
  isVerified?: boolean
  isPublished?: boolean
  startDate?: Date
  endDate?: Date
}

// ReviewDetail type (extended Review with additional info)
export interface ReviewDetail extends Review {
  customerName?: string
  salonName?: string
  staffName?: string
  serviceName?: string
}

export interface ReviewRepository {
  /**
   * IDでReviewを取得
   */
  findById(id: ReviewId): Promise<Result<Review, RepositoryError>>

  /**
   * IDでReview詳細を取得
   */
  findDetailById(id: ReviewId): Promise<Result<ReviewDetail, RepositoryError>>

  /**
   * ReservationIdでReviewを取得
   */
  findByReservationId(
    reservationId: ReservationId
  ): Promise<Result<Review | null, RepositoryError>>

  /**
   * BookingIdでReviewを取得
   */
  findByBookingId(
    bookingId: BookingId
  ): Promise<Result<Review | null, RepositoryError>>

  /**
   * 新しいReviewを作成
   */
  create(data: any): Promise<Result<any, RepositoryError>>

  /**
   * Reviewを更新
   */
  update(
    data: UpdateReviewRequest & { id: ReviewId }
  ): Promise<Result<Review, RepositoryError>>

  /**
   * Reviewを公開
   */
  publish(
    id: ReviewId,
    publishedBy: string
  ): Promise<Result<Review, RepositoryError>>

  /**
   * Reviewを非公開にする
   */
  hide(
    id: ReviewId,
    reason: string,
    hiddenBy: string
  ): Promise<Result<Review, RepositoryError>>

  /**
   * Reviewを削除
   */
  delete(
    id: ReviewId,
    reason: string,
    deletedBy: string
  ): Promise<Result<Review, RepositoryError>>

  /**
   * Reviewを検証済みにする
   */
  verify(
    id: ReviewId,
    verifiedBy: string
  ): Promise<Result<Review, RepositoryError>>

  /**
   * Reviewの役立ち数を増やす
   */
  incrementHelpfulCount(id: ReviewId): Promise<Result<Review, RepositoryError>>

  /**
   * 複数のReviewを検索
   */
  search(
    criteria: ReviewSearchCriteria,
    pagination: PaginationParams
  ): Promise<Result<PaginatedResult<Review>, RepositoryError>>

  /**
   * SalonのReviewを取得
   */
  findBySalon(
    salonId: SalonId,
    pagination: PaginationParams
  ): Promise<Result<PaginatedResult<Review>, RepositoryError>>

  /**
   * StaffのReviewを取得
   */
  findByStaff(
    staffId: StaffId,
    pagination: PaginationParams
  ): Promise<Result<PaginatedResult<Review>, RepositoryError>>

  /**
   * CustomerのReviewを取得
   */
  findByCustomer(
    customerId: CustomerId,
    pagination: PaginationParams
  ): Promise<Result<PaginatedResult<Review>, RepositoryError>>

  /**
   * SalonのReviewサマリーを取得
   */
  getSalonSummary(
    salonId: SalonId
  ): Promise<Result<ReviewSummary, RepositoryError>>

  /**
   * StaffのReviewサマリーを取得
   */
  getStaffSummary(
    staffId: StaffId
  ): Promise<Result<ReviewSummary, RepositoryError>>

  /**
   * 最新のReviewを取得
   */
  findRecent(
    salonId: SalonId,
    limit: number
  ): Promise<Result<Review[], RepositoryError>>

  /**
   * 高評価のReviewを取得
   */
  findTopRated(
    salonId: SalonId,
    minRating: number,
    limit: number
  ): Promise<Result<Review[], RepositoryError>>
}
