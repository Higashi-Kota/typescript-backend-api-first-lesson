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
      salonId: dbReview.salon_id as SalonId,
      customerId: dbReview.customer_id as CustomerId,
      reservationId: dbReview.reservation_id as ReservationId,
      staffId: dbReview.staff_id ? (dbReview.staff_id as StaffId) : undefined,
      rating: dbReview.rating,
      comment: dbReview.comment ?? undefined,
      serviceRating: dbReview.service_rating ?? undefined,
      staffRating: dbReview.staff_rating ?? undefined,
      atmosphereRating: dbReview.atmosphere_rating ?? undefined,
      images: dbReview.images as string[] | undefined,
      isVerified: dbReview.is_verified,
      helpfulCount: dbReview.helpful_count,
      createdAt: new Date(dbReview.created_at),
      createdBy: dbReview.created_by ?? undefined,
      updatedAt: new Date(dbReview.updated_at),
      updatedBy: dbReview.updated_by ?? undefined,
    }

    // デフォルトはpublishedとして扱う（DBにステータスカラムがないため）
    return {
      type: 'published' as const,
      data: reviewData,
      publishedAt: new Date(dbReview.created_at),
      publishedBy: dbReview.created_by || 'system',
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
          type: 'notFound' as const,
          entity: 'Review',
          id,
        })
      }

      const review = this.mapDbToDomain(firstRow)
      if (!review) {
        return err({
          type: 'databaseError' as const,
          message: 'Failed to map review data',
        })
      }

      return ok(review)
    } catch (error) {
      return err({
        type: 'databaseError' as const,
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
        .innerJoin(customers, eq(reviews.customer_id, customers.id))
        .innerJoin(salons, eq(reviews.salon_id, salons.id))
        .leftJoin(staff, eq(reviews.staff_id, staff.id))
        .innerJoin(reservations, eq(reviews.reservation_id, reservations.id))
        .innerJoin(services, eq(reservations.service_id, services.id))
        .where(eq(reviews.id, id))
        .limit(1)

      const firstRow = result[0]
      if (!firstRow) {
        return err({
          type: 'notFound' as const,
          entity: 'Review',
          id,
        })
      }

      const review = this.mapDbToDomain(firstRow.review)
      if (!review) {
        return err({
          type: 'databaseError' as const,
          message: 'Failed to map review data',
        })
      }

      const detail: ReviewDetail = {
        review,
        customerName: firstRow.customer.name,
        salonName: firstRow.salon.name,
        staffName: firstRow.staff?.name,
        serviceName: firstRow.service.name,
        reservationDate: new Date(firstRow.reservation.start_time),
      }

      return ok(detail)
    } catch (error) {
      return err({
        type: 'databaseError' as const,
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
        .where(eq(reviews.reservation_id, reservationId))
        .limit(1)

      const firstRow = result[0]
      if (!firstRow) {
        return ok(null)
      }

      const review = this.mapDbToDomain(firstRow)
      if (!review) {
        return err({
          type: 'databaseError' as const,
          message: 'Failed to map review data',
        })
      }

      return ok(review)
    } catch (error) {
      return err({
        type: 'databaseError' as const,
        message:
          error instanceof Error ? error.message : 'Unknown database error',
      })
    }
  }

  async create(
    data: CreateReviewRequest
  ): Promise<Result<Review, RepositoryError>> {
    try {
      const newReview: DbNewReview = {
        salon_id: data.salonId,
        customer_id: data.customerId,
        reservation_id: data.reservationId,
        staff_id: data.staffId,
        rating: data.rating,
        comment: data.comment,
        service_rating: data.serviceRating,
        staff_rating: data.staffRating,
        atmosphere_rating: data.atmosphereRating,
        images: data.images,
        is_verified: false,
        helpful_count: 0,
        created_by: data.createdBy,
        updated_by: data.createdBy,
      }

      const insertedReviews = await this.db
        .insert(reviews)
        .values(newReview)
        .returning()

      const insertedReview = insertedReviews[0]
      if (!insertedReview) {
        return err({
          type: 'databaseError' as const,
          message: 'Failed to insert review',
        })
      }

      const review = this.mapDbToDomain(insertedReview)
      if (!review) {
        return err({
          type: 'databaseError' as const,
          message: 'Failed to map created review',
        })
      }

      return ok(review)
    } catch (error) {
      return err({
        type: 'databaseError' as const,
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
          type: 'notFound' as const,
          entity: 'Review',
          id: data.id,
        })
      }

      // 更新データを準備
      const updateData: Partial<DbReview> = {
        updated_at: new Date().toISOString(),
        updated_by: data.updatedBy,
      }

      if (data.rating !== undefined) updateData.rating = data.rating
      if (data.comment !== undefined) updateData.comment = data.comment
      if (data.serviceRating !== undefined)
        updateData.service_rating = data.serviceRating
      if (data.staffRating !== undefined)
        updateData.staff_rating = data.staffRating
      if (data.atmosphereRating !== undefined)
        updateData.atmosphere_rating = data.atmosphereRating
      if (data.images !== undefined) updateData.images = data.images

      const updatedReviews = await this.db
        .update(reviews)
        .set(updateData)
        .where(eq(reviews.id, data.id))
        .returning()

      const updatedReview = updatedReviews[0]
      if (!updatedReview) {
        return err({
          type: 'databaseError' as const,
          message: 'Failed to update review',
        })
      }

      const review = this.mapDbToDomain(updatedReview)
      if (!review) {
        return err({
          type: 'databaseError' as const,
          message: 'Failed to map updated review',
        })
      }

      return ok(review)
    } catch (error) {
      return err({
        type: 'databaseError' as const,
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
    _reason: string,
    hiddenBy: string
  ): Promise<Result<Review, RepositoryError>> {
    // DBにステータスカラムがないため、削除で対応
    return this.delete(id, _reason, hiddenBy)
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
          type: 'notFound' as const,
          entity: 'Review',
          id,
        })
      }

      const review = this.mapDbToDomain(deletedReview)
      if (!review) {
        return err({
          type: 'databaseError' as const,
          message: 'Failed to map deleted review',
        })
      }

      // 削除済みとして返す
      return ok({
        type: 'deleted' as const,
        data: review.data,
        deletedAt: new Date(),
        deletedBy: _deletedBy,
        deletionReason: _reason,
      })
    } catch (error) {
      return err({
        type: 'databaseError' as const,
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
          is_verified: true,
          updated_at: new Date().toISOString(),
          updated_by: verifiedBy,
        })
        .where(eq(reviews.id, id))
        .returning()

      const updatedRow = result[0]
      if (!updatedRow) {
        return err({
          type: 'notFound' as const,
          entity: 'Review',
          id,
        })
      }

      const review = this.mapDbToDomain(updatedRow)
      if (!review) {
        return err({
          type: 'databaseError' as const,
          message: 'Failed to map verified review',
        })
      }

      return ok(review)
    } catch (error) {
      return err({
        type: 'databaseError' as const,
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
          helpful_count: sql`${reviews.helpful_count} + 1`,
          updated_at: new Date().toISOString(),
        })
        .where(eq(reviews.id, id))
        .returning()

      const updatedRow = result[0]
      if (!updatedRow) {
        return err({
          type: 'notFound' as const,
          entity: 'Review',
          id,
        })
      }

      const review = this.mapDbToDomain(updatedRow)
      if (!review) {
        return err({
          type: 'databaseError' as const,
          message: 'Failed to map review',
        })
      }

      return ok(review)
    } catch (error) {
      return err({
        type: 'databaseError' as const,
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
        conditions.push(eq(reviews.salon_id, criteria.salonId))
      }
      if (criteria.customerId) {
        conditions.push(eq(reviews.customer_id, criteria.customerId))
      }
      if (criteria.staffId) {
        conditions.push(eq(reviews.staff_id, criteria.staffId))
      }
      if (criteria.reservationId) {
        conditions.push(eq(reviews.reservation_id, criteria.reservationId))
      }
      if (criteria.isVerified !== undefined) {
        conditions.push(eq(reviews.is_verified, criteria.isVerified))
      }
      if (criteria.minRating !== undefined) {
        conditions.push(gte(reviews.rating, criteria.minRating))
      }
      if (criteria.maxRating !== undefined) {
        conditions.push(lte(reviews.rating, criteria.maxRating))
      }
      if (criteria.startDate && criteria.endDate) {
        conditions.push(
          between(
            reviews.created_at,
            criteria.startDate.toISOString(),
            criteria.endDate.toISOString()
          )
        )
      } else if (criteria.startDate) {
        conditions.push(
          gte(reviews.created_at, criteria.startDate.toISOString())
        )
      } else if (criteria.endDate) {
        conditions.push(lte(reviews.created_at, criteria.endDate.toISOString()))
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
        .orderBy(desc(reviews.created_at))
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
        type: 'databaseError' as const,
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
          averageServiceRating: sql<number>`avg(${reviews.service_rating})`,
          averageStaffRating: sql<number>`avg(${reviews.staff_rating})`,
          averageAtmosphereRating: sql<number>`avg(${reviews.atmosphere_rating})`,
        })
        .from(reviews)
        .where(eq(reviews.salon_id, salonId))

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
        .where(eq(reviews.salon_id, salonId))
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
        type: 'databaseError' as const,
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
          averageStaffRating: sql<number>`avg(${reviews.staff_rating})`,
        })
        .from(reviews)
        .where(eq(reviews.staff_id, staffId))

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
        .where(eq(reviews.staff_id, staffId))
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
        type: 'databaseError' as const,
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
        .where(eq(reviews.salon_id, salonId))
        .orderBy(desc(reviews.created_at))
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
        type: 'databaseError' as const,
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
          and(eq(reviews.salon_id, salonId), gte(reviews.rating, minRating))
        )
        .orderBy(desc(reviews.rating), desc(reviews.helpful_count))
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
        type: 'databaseError' as const,
        message:
          error instanceof Error ? error.message : 'Unknown database error',
      })
    }
  }
}
