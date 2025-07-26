/**
 * Review Repository Implementation
 * Drizzle ORMを使用したリポジトリの実装
 */

import { and, between, desc, eq, gte, lte, sql } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import type {
  CreateReviewRequest,
  CustomerId,
  PaginatedResult,
  PaginationParams,
  RepositoryError,
  ReservationId,
  Result,
  Review,
  ReviewDetail,
  ReviewId,
  ReviewRepository,
  ReviewSearchCriteria,
  ReviewSummary,
  SalonId,
  StaffId,
  UpdateReviewRequest,
} from '@beauty-salon-backend/domain'
import { createReviewId, err, ok } from '@beauty-salon-backend/domain'

import {
  customers,
  reservations,
  reviews,
  salons,
  services,
  staff,
} from '../database/schema'

// DB型からドメイン型へのマッピング
type DbReview = typeof reviews.$inferSelect
type DbNewReview = typeof reviews.$inferInsert

export class DrizzleReviewRepository implements ReviewRepository {
  constructor(private db: PostgresJsDatabase) {}

  // DBモデルからドメインモデルへの変換
  private mapDbToDomain(dbReview: DbReview): Review | null {
    const id = createReviewId(dbReview.id)
    if (!id) return null

    const reviewData = {
      id,
      salonId: dbReview.salonId as SalonId,
      customerId: dbReview.customerId as CustomerId,
      reservationId: dbReview.reservationId as ReservationId,
      staffId: dbReview.staffId ? (dbReview.staffId as StaffId) : undefined,
      rating: dbReview.rating,
      comment: dbReview.comment ?? undefined,
      serviceRating: dbReview.serviceRating ?? undefined,
      staffRating: dbReview.staffRating ?? undefined,
      atmosphereRating: dbReview.atmosphereRating ?? undefined,
      images: dbReview.images ?? undefined,
      isVerified: dbReview.isVerified,
      helpfulCount: dbReview.helpfulCount,
      createdAt: dbReview.createdAt,
      createdBy: dbReview.createdBy ?? undefined,
      updatedAt: dbReview.updatedAt,
      updatedBy: dbReview.updatedBy ?? undefined,
    }

    // デフォルトはpublishedとして扱う（DBにステータスカラムがないため）
    return {
      type: 'published',
      data: reviewData,
      publishedAt: dbReview.createdAt,
      publishedBy: dbReview.createdBy || 'system',
    }
  }

  async findById(id: ReviewId): Promise<Result<Review, RepositoryError>> {
    try {
      const result = await this.db
        .select()
        .from(reviews)
        .where(eq(reviews.id, id))
        .limit(1)

      const firstRow = result[0]
      if (!firstRow) {
        return err({
          type: 'notFound',
          entity: 'Review',
          id,
        })
      }

      const review = this.mapDbToDomain(firstRow)
      if (!review) {
        return err({
          type: 'databaseError',
          message: 'Failed to map review data',
        })
      }

      return ok(review)
    } catch (error) {
      return err({
        type: 'databaseError',
        message:
          error instanceof Error ? error.message : 'Unknown database error',
      })
    }
  }

  async findDetailById(
    id: ReviewId
  ): Promise<Result<ReviewDetail, RepositoryError>> {
    try {
      const result = await this.db
        .select({
          review: reviews,
          customer: customers,
          salon: salons,
          staff: staff,
          reservation: reservations,
          service: services,
        })
        .from(reviews)
        .innerJoin(customers, eq(reviews.customerId, customers.id))
        .innerJoin(salons, eq(reviews.salonId, salons.id))
        .leftJoin(staff, eq(reviews.staffId, staff.id))
        .innerJoin(reservations, eq(reviews.reservationId, reservations.id))
        .innerJoin(services, eq(reservations.serviceId, services.id))
        .where(eq(reviews.id, id))
        .limit(1)

      const firstRow = result[0]
      if (!firstRow) {
        return err({
          type: 'notFound',
          entity: 'Review',
          id,
        })
      }

      const review = this.mapDbToDomain(firstRow.review)
      if (!review) {
        return err({
          type: 'databaseError',
          message: 'Failed to map review data',
        })
      }

      const detail: ReviewDetail = {
        review,
        customerName: firstRow.customer.name,
        salonName: firstRow.salon.name,
        staffName: firstRow.staff?.name,
        serviceName: firstRow.service.name,
        reservationDate: firstRow.reservation.startTime,
      }

      return ok(detail)
    } catch (error) {
      return err({
        type: 'databaseError',
        message:
          error instanceof Error ? error.message : 'Unknown database error',
      })
    }
  }

  async findByReservationId(
    reservationId: ReservationId
  ): Promise<Result<Review | null, RepositoryError>> {
    try {
      const result = await this.db
        .select()
        .from(reviews)
        .where(eq(reviews.reservationId, reservationId))
        .limit(1)

      const firstRow = result[0]
      if (!firstRow) {
        return ok(null)
      }

      const review = this.mapDbToDomain(firstRow)
      if (!review) {
        return err({
          type: 'databaseError',
          message: 'Failed to map review data',
        })
      }

      return ok(review)
    } catch (error) {
      return err({
        type: 'databaseError',
        message:
          error instanceof Error ? error.message : 'Unknown database error',
      })
    }
  }

  async create(
    data: CreateReviewRequest
  ): Promise<Result<Review, RepositoryError>> {
    try {
      // 評価値の検証
      if (data.rating < 1 || data.rating > 5) {
        return err({
          type: 'invalidRating',
          message: 'Rating must be between 1 and 5',
        })
      }

      // サブ評価値の検証
      if (
        data.serviceRating &&
        (data.serviceRating < 1 || data.serviceRating > 5)
      ) {
        return err({
          type: 'invalidRating',
          message: 'Service rating must be between 1 and 5',
        })
      }
      if (data.staffRating && (data.staffRating < 1 || data.staffRating > 5)) {
        return err({
          type: 'invalidRating',
          message: 'Staff rating must be between 1 and 5',
        })
      }
      if (
        data.atmosphereRating &&
        (data.atmosphereRating < 1 || data.atmosphereRating > 5)
      ) {
        return err({
          type: 'invalidRating',
          message: 'Atmosphere rating must be between 1 and 5',
        })
      }

      // 予約の存在確認
      const reservationCheck = await this.db
        .select()
        .from(reservations)
        .where(eq(reservations.id, data.reservationId))
        .limit(1)

      if (!reservationCheck[0]) {
        return err({
          type: 'reservationNotFound',
          message: 'Reservation not found',
        })
      }

      // 重複チェック
      const existingReview = await this.db
        .select()
        .from(reviews)
        .where(eq(reviews.reservationId, data.reservationId))
        .limit(1)

      if (existingReview[0]) {
        return err({
          type: 'duplicateReview',
          message: 'A review already exists for this reservation',
        })
      }

      const newReview: DbNewReview = {
        salonId: data.salonId,
        customerId: data.customerId,
        reservationId: data.reservationId,
        staffId: data.staffId,
        rating: data.rating,
        comment: data.comment,
        serviceRating: data.serviceRating,
        staffRating: data.staffRating,
        atmosphereRating: data.atmosphereRating,
        images: data.images,
        isVerified: false,
        helpfulCount: 0,
        createdBy: data.createdBy,
        updatedBy: data.createdBy,
      }

      const insertedReviews = await this.db
        .insert(reviews)
        .values(newReview)
        .returning()

      const insertedReview = insertedReviews[0]
      if (!insertedReview) {
        return err({
          type: 'databaseError',
          message: 'Failed to insert review',
        })
      }

      const review = this.mapDbToDomain(insertedReview)
      if (!review) {
        return err({
          type: 'databaseError',
          message: 'Failed to map created review',
        })
      }

      return ok(review)
    } catch (error) {
      // PostgreSQLの重複エラーをキャッチ
      if (error instanceof Error && error.message.includes('duplicate key')) {
        return err({
          type: 'duplicateReview',
          message: 'A review already exists for this reservation',
        })
      }
      return err({
        type: 'databaseError',
        message:
          error instanceof Error ? error.message : 'Unknown database error',
      })
    }
  }

  async update(
    data: UpdateReviewRequest
  ): Promise<Result<Review, RepositoryError>> {
    try {
      // 既存のreviewを確認
      const existing = await this.db
        .select()
        .from(reviews)
        .where(eq(reviews.id, data.id))
        .limit(1)

      const existingRow = existing[0]
      if (!existingRow) {
        return err({
          type: 'notFound',
          entity: 'Review',
          id: data.id,
        })
      }

      // hiddenレビューは更新不可
      // DBにステータスカラムがないため、削除されているかを別途チェック
      const review = this.mapDbToDomain(existingRow)
      if (!review || review.type === 'hidden') {
        return err({
          type: 'reviewAlreadyHidden',
          message: 'Hidden reviews cannot be updated',
        })
      }

      // 24時間以内のみ更新可能
      const createdAt = new Date(existingRow.createdAt)
      const now = new Date()
      const hoursSinceCreation =
        (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60)
      if (hoursSinceCreation > 24) {
        return err({
          type: 'reviewUpdateExpired',
          message: 'Reviews can only be updated within 24 hours of creation',
        })
      }

      // 評価値の検証
      if (data.rating !== undefined && (data.rating < 1 || data.rating > 5)) {
        return err({
          type: 'invalidRating',
          message: 'Rating must be between 1 and 5',
        })
      }
      if (
        data.serviceRating !== undefined &&
        (data.serviceRating < 1 || data.serviceRating > 5)
      ) {
        return err({
          type: 'invalidRating',
          message: 'Service rating must be between 1 and 5',
        })
      }
      if (
        data.staffRating !== undefined &&
        (data.staffRating < 1 || data.staffRating > 5)
      ) {
        return err({
          type: 'invalidRating',
          message: 'Staff rating must be between 1 and 5',
        })
      }
      if (
        data.atmosphereRating !== undefined &&
        (data.atmosphereRating < 1 || data.atmosphereRating > 5)
      ) {
        return err({
          type: 'invalidRating',
          message: 'Atmosphere rating must be between 1 and 5',
        })
      }

      // 更新データを準備
      const updateData: Partial<DbReview> = {
        updatedAt: new Date(),
        updatedBy: data.updatedBy,
      }

      if (data.rating !== undefined) updateData.rating = data.rating
      if (data.comment !== undefined) updateData.comment = data.comment
      if (data.serviceRating !== undefined)
        updateData.serviceRating = data.serviceRating
      if (data.staffRating !== undefined)
        updateData.staffRating = data.staffRating
      if (data.atmosphereRating !== undefined)
        updateData.atmosphereRating = data.atmosphereRating
      if (data.images !== undefined) updateData.images = data.images

      const updatedReviews = await this.db
        .update(reviews)
        .set(updateData)
        .where(eq(reviews.id, data.id))
        .returning()

      const updatedReview = updatedReviews[0]
      if (!updatedReview) {
        return err({
          type: 'databaseError',
          message: 'Failed to update review',
        })
      }

      const updatedReviewDomain = this.mapDbToDomain(updatedReview)
      if (!updatedReviewDomain) {
        return err({
          type: 'databaseError',
          message: 'Failed to map updated review',
        })
      }

      return ok(updatedReviewDomain)
    } catch (error) {
      return err({
        type: 'databaseError',
        message:
          error instanceof Error ? error.message : 'Unknown database error',
      })
    }
  }

  async publish(
    id: ReviewId,
    publishedBy: string
  ): Promise<Result<Review, RepositoryError>> {
    // DBにステータスカラムがないため、更新日時の更新のみ
    return this.update({ id, updatedBy: publishedBy })
  }

  async hide(
    id: ReviewId,
    reason: string,
    hiddenBy: string
  ): Promise<Result<Review, RepositoryError>> {
    try {
      // 既存のreviewを確認
      const existing = await this.db
        .select()
        .from(reviews)
        .where(eq(reviews.id, id))
        .limit(1)

      const existingRow = existing[0]
      if (!existingRow) {
        return err({
          type: 'notFound',
          entity: 'Review',
          id,
        })
      }

      // 既にhiddenの場合（削除済みの場合）
      const checkDeleted = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(reviews)
        .where(eq(reviews.id, id))

      if (Number(checkDeleted[0]?.count ?? 0) === 0) {
        return err({
          type: 'reviewAlreadyHidden',
          message: 'Review is already hidden',
        })
      }

      // 実際には削除するが、削除前のデータをhidden状態として返す
      const review = this.mapDbToDomain(existingRow)
      if (!review) {
        return err({
          type: 'databaseError',
          message: 'Failed to map review data',
        })
      }

      // 削除を実行
      await this.db.delete(reviews).where(eq(reviews.id, id))

      // hidden状態として返す
      return ok({
        type: 'hidden',
        data: review.data,
        hiddenAt: new Date(),
        hiddenBy,
        hiddenReason: reason,
      })
    } catch (error) {
      return err({
        type: 'databaseError',
        message:
          error instanceof Error ? error.message : 'Unknown database error',
      })
    }
  }

  async delete(
    id: ReviewId,
    _reason: string,
    _deletedBy: string
  ): Promise<Result<Review, RepositoryError>> {
    try {
      const deleteResult = await this.db
        .delete(reviews)
        .where(eq(reviews.id, id))
        .returning()

      const deletedReview = deleteResult[0]
      if (!deletedReview) {
        return err({
          type: 'notFound',
          entity: 'Review',
          id,
        })
      }

      const review = this.mapDbToDomain(deletedReview)
      if (!review) {
        return err({
          type: 'databaseError',
          message: 'Failed to map deleted review',
        })
      }

      // 削除済みとして返す
      return ok({
        type: 'deleted',
        data: review.data,
        deletedAt: new Date(),
        deletedBy: _deletedBy,
        deletionReason: _reason,
      })
    } catch (error) {
      return err({
        type: 'databaseError',
        message:
          error instanceof Error ? error.message : 'Unknown database error',
      })
    }
  }

  async verify(
    id: ReviewId,
    verifiedBy: string
  ): Promise<Result<Review, RepositoryError>> {
    try {
      const result = await this.db
        .update(reviews)
        .set({
          isVerified: true,
          updatedAt: new Date(),
          updatedBy: verifiedBy,
        })
        .where(eq(reviews.id, id))
        .returning()

      const updatedRow = result[0]
      if (!updatedRow) {
        return err({
          type: 'notFound',
          entity: 'Review',
          id,
        })
      }

      const review = this.mapDbToDomain(updatedRow)
      if (!review) {
        return err({
          type: 'databaseError',
          message: 'Failed to map verified review',
        })
      }

      return ok(review)
    } catch (error) {
      return err({
        type: 'databaseError',
        message:
          error instanceof Error ? error.message : 'Unknown database error',
      })
    }
  }

  async incrementHelpfulCount(
    id: ReviewId
  ): Promise<Result<Review, RepositoryError>> {
    try {
      const result = await this.db
        .update(reviews)
        .set({
          helpfulCount: sql`${reviews.helpfulCount} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(reviews.id, id))
        .returning()

      const updatedRow = result[0]
      if (!updatedRow) {
        return err({
          type: 'notFound',
          entity: 'Review',
          id,
        })
      }

      const review = this.mapDbToDomain(updatedRow)
      if (!review) {
        return err({
          type: 'databaseError',
          message: 'Failed to map review',
        })
      }

      return ok(review)
    } catch (error) {
      return err({
        type: 'databaseError',
        message:
          error instanceof Error ? error.message : 'Unknown database error',
      })
    }
  }

  async search(
    criteria: ReviewSearchCriteria,
    pagination: PaginationParams
  ): Promise<Result<PaginatedResult<Review>, RepositoryError>> {
    try {
      const conditions = []

      if (criteria.salonId) {
        conditions.push(eq(reviews.salonId, criteria.salonId))
      }
      if (criteria.customerId) {
        conditions.push(eq(reviews.customerId, criteria.customerId))
      }
      if (criteria.staffId) {
        conditions.push(eq(reviews.staffId, criteria.staffId))
      }
      if (criteria.reservationId) {
        conditions.push(eq(reviews.reservationId, criteria.reservationId))
      }
      if (criteria.isVerified !== undefined) {
        conditions.push(eq(reviews.isVerified, criteria.isVerified))
      }
      if (criteria.minRating !== undefined) {
        conditions.push(gte(reviews.rating, criteria.minRating))
      }
      if (criteria.maxRating !== undefined) {
        conditions.push(lte(reviews.rating, criteria.maxRating))
      }
      if (criteria.startDate && criteria.endDate) {
        conditions.push(
          between(reviews.createdAt, criteria.startDate, criteria.endDate)
        )
      } else if (criteria.startDate) {
        conditions.push(gte(reviews.createdAt, criteria.startDate))
      } else if (criteria.endDate) {
        conditions.push(lte(reviews.createdAt, criteria.endDate))
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined

      // 総件数を取得
      const countResult = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(reviews)
        .where(whereClause)

      const totalCount = Number(countResult[0]?.count ?? 0)

      // ページネーションで取得
      const results = await this.db
        .select()
        .from(reviews)
        .where(whereClause)
        .orderBy(desc(reviews.createdAt))
        .limit(pagination.limit)
        .offset(pagination.offset)

      const items: Review[] = []
      for (const result of results) {
        const review = this.mapDbToDomain(result)
        if (review) {
          items.push(review)
        }
      }

      return ok({
        data: items,
        total: totalCount,
        limit: pagination.limit,
        offset: pagination.offset,
      })
    } catch (error) {
      return err({
        type: 'databaseError',
        message:
          error instanceof Error ? error.message : 'Unknown database error',
      })
    }
  }

  async findBySalon(
    salonId: SalonId,
    pagination: PaginationParams
  ): Promise<Result<PaginatedResult<Review>, RepositoryError>> {
    return this.search({ salonId }, pagination)
  }

  async findByStaff(
    staffId: StaffId,
    pagination: PaginationParams
  ): Promise<Result<PaginatedResult<Review>, RepositoryError>> {
    return this.search({ staffId }, pagination)
  }

  async findByCustomer(
    customerId: CustomerId,
    pagination: PaginationParams
  ): Promise<Result<PaginatedResult<Review>, RepositoryError>> {
    return this.search({ customerId }, pagination)
  }

  async getSalonSummary(
    salonId: SalonId
  ): Promise<Result<ReviewSummary, RepositoryError>> {
    try {
      // 総件数と平均評価を取得
      const summaryResult = await this.db
        .select({
          totalReviews: sql<number>`count(*)`,
          averageRating: sql<number>`avg(${reviews.rating})`,
          averageServiceRating: sql<number>`avg(${reviews.serviceRating})`,
          averageStaffRating: sql<number>`avg(${reviews.staffRating})`,
          averageAtmosphereRating: sql<number>`avg(${reviews.atmosphereRating})`,
        })
        .from(reviews)
        .where(eq(reviews.salonId, salonId))

      const summary = summaryResult[0]
      if (!summary) {
        return ok({
          salonId,
          totalReviews: 0,
          averageRating: 0,
          ratingDistribution: new Map(),
        })
      }

      // 評価の分布を取得
      const distributionResult = await this.db
        .select({
          rating: reviews.rating,
          count: sql<number>`count(*)`,
        })
        .from(reviews)
        .where(eq(reviews.salonId, salonId))
        .groupBy(reviews.rating)

      const ratingDistribution = new Map<number, number>()
      for (const row of distributionResult) {
        ratingDistribution.set(row.rating, Number(row.count))
      }

      return ok({
        salonId,
        totalReviews: Number(summary.totalReviews),
        averageRating: Number(summary.averageRating) || 0,
        averageServiceRating: summary.averageServiceRating
          ? Number(summary.averageServiceRating)
          : undefined,
        averageStaffRating: summary.averageStaffRating
          ? Number(summary.averageStaffRating)
          : undefined,
        averageAtmosphereRating: summary.averageAtmosphereRating
          ? Number(summary.averageAtmosphereRating)
          : undefined,
        ratingDistribution,
      })
    } catch (error) {
      return err({
        type: 'databaseError',
        message:
          error instanceof Error ? error.message : 'Unknown database error',
      })
    }
  }

  async getStaffSummary(
    staffId: StaffId
  ): Promise<Result<ReviewSummary, RepositoryError>> {
    try {
      // staffIdでフィルタリングしてサマリーを取得
      const summaryResult = await this.db
        .select({
          totalReviews: sql<number>`count(*)`,
          averageRating: sql<number>`avg(${reviews.rating})`,
          averageStaffRating: sql<number>`avg(${reviews.staffRating})`,
        })
        .from(reviews)
        .where(eq(reviews.staffId, staffId))

      const summary = summaryResult[0]
      if (!summary) {
        return ok({
          salonId: '' as SalonId, // staffの場合でもsalonIdが必要なのでダミー値
          totalReviews: 0,
          averageRating: 0,
          ratingDistribution: new Map(),
        })
      }

      // 評価の分布を取得
      const distributionResult = await this.db
        .select({
          rating: reviews.rating,
          count: sql<number>`count(*)`,
        })
        .from(reviews)
        .where(eq(reviews.staffId, staffId))
        .groupBy(reviews.rating)

      const ratingDistribution = new Map<number, number>()
      for (const row of distributionResult) {
        ratingDistribution.set(row.rating, Number(row.count))
      }

      return ok({
        salonId: '' as SalonId,
        totalReviews: Number(summary.totalReviews),
        averageRating: Number(summary.averageRating) || 0,
        averageStaffRating: summary.averageStaffRating
          ? Number(summary.averageStaffRating)
          : undefined,
        ratingDistribution,
      })
    } catch (error) {
      return err({
        type: 'databaseError',
        message:
          error instanceof Error ? error.message : 'Unknown database error',
      })
    }
  }

  async findRecent(
    salonId: SalonId,
    limit: number
  ): Promise<Result<Review[], RepositoryError>> {
    try {
      const results = await this.db
        .select()
        .from(reviews)
        .where(eq(reviews.salonId, salonId))
        .orderBy(desc(reviews.createdAt))
        .limit(limit)

      const items: Review[] = []
      for (const result of results) {
        const review = this.mapDbToDomain(result)
        if (review) {
          items.push(review)
        }
      }

      return ok(items)
    } catch (error) {
      return err({
        type: 'databaseError',
        message:
          error instanceof Error ? error.message : 'Unknown database error',
      })
    }
  }

  async findTopRated(
    salonId: SalonId,
    minRating: number,
    limit: number
  ): Promise<Result<Review[], RepositoryError>> {
    try {
      const results = await this.db
        .select()
        .from(reviews)
        .where(
          and(eq(reviews.salonId, salonId), gte(reviews.rating, minRating))
        )
        .orderBy(desc(reviews.rating), desc(reviews.helpfulCount))
        .limit(limit)

      const items: Review[] = []
      for (const result of results) {
        const review = this.mapDbToDomain(result)
        if (review) {
          items.push(review)
        }
      }

      return ok(items)
    } catch (error) {
      return err({
        type: 'databaseError',
        message:
          error instanceof Error ? error.message : 'Unknown database error',
      })
    }
  }
}
