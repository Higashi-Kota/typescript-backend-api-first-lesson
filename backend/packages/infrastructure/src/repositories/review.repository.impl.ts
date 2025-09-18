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
import { err, ok } from '@beauty-salon-backend/domain'

import {
  customers,
  reservations,
  reviews,
  salons,
  services,
  staff,
} from '@beauty-salon-backend/database'

// DB型からドメイン型へのマッピング
type DbReview = typeof reviews.$inferSelect
type DbNewReview = typeof reviews.$inferInsert

export class DrizzleReviewRepository implements ReviewRepository {
  constructor(private db: PostgresJsDatabase) {}

  // DBモデルからドメインモデルへの変換
  private mapDbToDomain(dbReview: DbReview): Review | null {
    const id = dbReview.id as ReviewId
    if (!id) {
      return null
    }

    return {
      id,
      salonId: dbReview.salonId as SalonId,
      customerId: dbReview.customerId as CustomerId,
      reservationId: dbReview.bookingId as ReservationId,
      staffId: dbReview.staffId ? (dbReview.staffId as StaffId) : undefined,
      rating: dbReview.overallRating,
      comment: dbReview.comment ?? undefined,
      serviceRating: dbReview.serviceRating ?? undefined,
      staffRating: dbReview.staffRating ?? undefined,
      atmosphereRating: dbReview.atmosphereRating ?? undefined,
      images: dbReview.imageUrls as string[] | undefined,
      isVerified: dbReview.isVerified,
      helpfulCount: dbReview.helpfulCount,
      createdAt: dbReview.createdAt,
      createdBy: undefined,
      updatedAt: dbReview.updatedAt,
      updatedBy: undefined,
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
      if (firstRow === undefined) {
        return err({
          type: 'notFound' as const,
          entity: 'Review',
          id,
        })
      }

      const review = this.mapDbToDomain(firstRow)
      if (review === null) {
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
        .innerJoin(customers, eq(reviews.customerId, customers.id))
        .innerJoin(salons, eq(reviews.salonId, salons.id))
        .leftJoin(staff, eq(reviews.staffId, staff.id))
        .innerJoin(reservations, eq(reviews.bookingId, reservations.bookingId))
        .innerJoin(services, eq(reservations.serviceId, services.id))
        .where(eq(reviews.id, id))
        .limit(1)

      const firstRow = result[0]
      if (firstRow === undefined) {
        return err({
          type: 'notFound' as const,
          entity: 'Review',
          id,
        })
      }

      const review = this.mapDbToDomain(firstRow.review)
      if (review === null) {
        return err({
          type: 'databaseError' as const,
          message: 'Failed to map review data',
        })
      }

      const detail: ReviewDetail = {
        ...review,
        customerName:
          `${firstRow.customer.firstName} ${firstRow.customer.lastName}`.trim(),
        salonName: firstRow.salon.name,
        staffName: firstRow.staff
          ? `${firstRow.staff.firstName} ${firstRow.staff.lastName}`.trim()
          : undefined,
        serviceName: firstRow.service.name,
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
        .where(eq(reviews.bookingId, reservationId))
        .limit(1)

      const firstRow = result[0]
      if (firstRow === undefined) {
        return ok(null)
      }

      const review = this.mapDbToDomain(firstRow)
      if (review === null) {
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
        salonId: data.salonId,
        customerId: data.customerId,
        bookingId: data.reservationId,
        staffId: data.staffId,
        overallRating: data.rating,
        comment: data.comment,
        serviceRating: data.serviceRating,
        staffRating: data.staffRating,
        atmosphereRating: data.atmosphereRating,
        imageUrls: data.images,
        isVerified: false,
        helpfulCount: 0,
      }

      const insertedReviews = await this.db
        .insert(reviews)
        .values(newReview)
        .returning()

      const insertedReview = insertedReviews[0]
      if (insertedReview === undefined) {
        return err({
          type: 'databaseError' as const,
          message: 'Failed to insert review',
        })
      }

      const review = this.mapDbToDomain(insertedReview)
      if (review === null) {
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
    data: UpdateReviewRequest & { id: ReviewId }
  ): Promise<Result<Review, RepositoryError>> {
    try {
      // 既存のreviewを確認
      const existing = await this.db
        .select()
        .from(reviews)
        .where(eq(reviews.id, data.id))
        .limit(1)

      const existingRow = existing[0]
      if (existingRow === undefined) {
        return err({
          type: 'notFound' as const,
          entity: 'Review',
          id: data.id,
        })
      }

      // 更新データを準備
      const updateData: Partial<DbReview> = {
        updatedAt: new Date().toISOString(),
      }

      if (data.rating !== undefined) {
        updateData.overallRating = data.rating
      }
      if (data.comment !== undefined) {
        updateData.comment = data.comment
      }
      if (data.serviceRating !== undefined) {
        updateData.serviceRating = data.serviceRating
      }
      if (data.staffRating !== undefined) {
        updateData.staffRating = data.staffRating
      }
      if (data.atmosphereRating !== undefined) {
        updateData.atmosphereRating = data.atmosphereRating
      }
      if (data.images !== undefined) {
        updateData.imageUrls = data.images
      }

      const updatedReviews = await this.db
        .update(reviews)
        .set(updateData)
        .where(eq(reviews.id, data.id))
        .returning()

      const updatedReview = updatedReviews[0]
      if (updatedReview === undefined) {
        return err({
          type: 'databaseError' as const,
          message: 'Failed to update review',
        })
      }

      const review = this.mapDbToDomain(updatedReview)
      if (review === null) {
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
    _publishedBy: string
  ): Promise<Result<Review, RepositoryError>> {
    // DBにステータスカラムがないため、更新日時の更新のみ
    return this.update({ id })
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
      if (deletedReview === undefined) {
        return err({
          type: 'notFound' as const,
          entity: 'Review',
          id,
        })
      }

      const review = this.mapDbToDomain(deletedReview)
      if (review === null) {
        return err({
          type: 'databaseError' as const,
          message: 'Failed to map deleted review',
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

  async verify(
    id: ReviewId,
    _verifiedBy: string
  ): Promise<Result<Review, RepositoryError>> {
    try {
      const result = await this.db
        .update(reviews)
        .set({
          isVerified: true,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(reviews.id, id))
        .returning()

      const updatedRow = result[0]
      if (updatedRow === undefined) {
        return err({
          type: 'notFound' as const,
          entity: 'Review',
          id,
        })
      }

      const review = this.mapDbToDomain(updatedRow)
      if (review === null) {
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
          helpfulCount: sql`${reviews.helpfulCount} + 1`,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(reviews.id, id))
        .returning()

      const updatedRow = result[0]
      if (updatedRow === undefined) {
        return err({
          type: 'notFound' as const,
          entity: 'Review',
          id,
        })
      }

      const review = this.mapDbToDomain(updatedRow)
      if (review === null) {
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
        conditions.push(eq(reviews.salonId, criteria.salonId))
      }
      if (criteria.customerId) {
        conditions.push(eq(reviews.customerId, criteria.customerId))
      }
      if (criteria.staffId) {
        conditions.push(eq(reviews.staffId, criteria.staffId))
      }
      // Note: reservationId is mapped to bookingId in the database
      // if (criteria.reservationId) {
      //   conditions.push(eq(reviews.bookingId, criteria.reservationId))
      // }
      if (criteria.isVerified !== undefined) {
        conditions.push(eq(reviews.isVerified, criteria.isVerified))
      }
      if (criteria.minRating !== undefined) {
        conditions.push(gte(reviews.overallRating, criteria.minRating))
      }
      if (criteria.maxRating !== undefined) {
        conditions.push(lte(reviews.overallRating, criteria.maxRating))
      }
      if (criteria.startDate && criteria.endDate) {
        conditions.push(
          between(
            reviews.createdAt,
            criteria.startDate.toISOString(),
            criteria.endDate.toISOString()
          )
        )
      } else if (criteria.startDate) {
        conditions.push(
          gte(reviews.createdAt, criteria.startDate.toISOString())
        )
      } else if (criteria.endDate) {
        conditions.push(lte(reviews.createdAt, criteria.endDate.toISOString()))
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
          averageRating: sql<number>`avg(${reviews.overallRating})`,
          averageServiceRating: sql<number>`avg(${reviews.serviceRating})`,
          averageStaffRating: sql<number>`avg(${reviews.staffRating})`,
          averageAtmosphereRating: sql<number>`avg(${reviews.atmosphereRating})`,
        })
        .from(reviews)
        .where(eq(reviews.salonId, salonId))

      const summary = summaryResult[0]
      if (summary === undefined) {
        return ok({
          averageRating: 0,
          totalReviews: 0,
          ratingDistribution: {},
        })
      }

      // 評価の分布を取得
      const distributionResult = await this.db
        .select({
          rating: reviews.overallRating,
          count: sql<number>`count(*)`,
        })
        .from(reviews)
        .where(eq(reviews.salonId, salonId))
        .groupBy(reviews.overallRating)

      const ratingDistribution: { [key: string]: number } = {}
      for (const row of distributionResult) {
        ratingDistribution[row.rating.toString()] = Number(row.count)
      }

      return ok({
        averageRating: Number(summary.averageRating) ?? 0,
        totalReviews: Number(summary.totalReviews),
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
          averageRating: sql<number>`avg(${reviews.overallRating})`,
          averageStaffRating: sql<number>`avg(${reviews.staffRating})`,
        })
        .from(reviews)
        .where(eq(reviews.staffId, staffId))

      const summary = summaryResult[0]
      if (summary === undefined) {
        return ok({
          averageRating: 0,
          totalReviews: 0,
          ratingDistribution: {},
        })
      }

      // 評価の分布を取得
      const distributionResult = await this.db
        .select({
          rating: reviews.overallRating,
          count: sql<number>`count(*)`,
        })
        .from(reviews)
        .where(eq(reviews.staffId, staffId))
        .groupBy(reviews.overallRating)

      const ratingDistribution: { [key: string]: number } = {}
      for (const row of distributionResult) {
        ratingDistribution[row.rating.toString()] = Number(row.count)
      }

      return ok({
        averageRating: Number(summary.averageRating) ?? 0,
        totalReviews: Number(summary.totalReviews),
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
          and(
            eq(reviews.salonId, salonId),
            gte(reviews.overallRating, minRating)
          )
        )
        .orderBy(desc(reviews.overallRating), desc(reviews.helpfulCount))
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
