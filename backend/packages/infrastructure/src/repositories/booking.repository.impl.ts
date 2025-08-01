/**
 * Booking Repository Implementation
 * Drizzle ORMを使用したリポジトリの実装
 */

import { and, between, desc, eq, gte, lte, or, sql } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import type {
  Booking,
  BookingDetail,
  BookingId,
  BookingRepository,
  BookingSearchCriteria,
  CreateBookingRequest,
  CustomerId,
  PaginatedResult,
  PaginationParams,
  PaymentMethod,
  PaymentStatus,
  RepositoryError,
  ReservationId,
  Result,
  SalonId,
  UpdateBookingRequest,
} from '@beauty-salon-backend/domain'
import { createBookingId, err, isOk, ok } from '@beauty-salon-backend/domain'

import {
  booking_reservations as bookingReservations,
  bookings,
  customers,
  reservations,
  salons,
  services,
  staff,
} from '../database/schema'

// DB型からドメイン型へのマッピング
type DbBooking = typeof bookings.$inferSelect
type DbNewBooking = typeof bookings.$inferInsert

export class DrizzleBookingRepository implements BookingRepository {
  constructor(private db: PostgresJsDatabase) {}

  // DBモデルからドメインモデルへの変換
  private async mapDbToDomain(dbBooking: DbBooking): Promise<Booking | null> {
    const id = createBookingId(dbBooking.id)
    if (!id) return null

    // booking_reservationsから関連するreservationIdを取得
    const bookingReservationRows = await this.db
      .select()
      .from(bookingReservations)
      .where(eq(bookingReservations.booking_id, dbBooking.id))

    const reservationIds = bookingReservationRows
      .map((br) => br.reservation_id as ReservationId)
      .filter(Boolean)

    const bookingData = {
      id,
      salonId: dbBooking.salon_id as SalonId,
      customerId: dbBooking.customer_id as CustomerId,
      totalAmount: dbBooking.total_amount,
      discountAmount: dbBooking.discount_amount ?? undefined,
      finalAmount: dbBooking.final_amount,
      paymentMethod: dbBooking.payment_method as PaymentMethod,
      paymentStatus: dbBooking.payment_status as PaymentStatus,
      notes: dbBooking.notes ?? undefined,
      reservationIds,
      createdAt: new Date(dbBooking.created_at),
      createdBy: dbBooking.created_by ?? undefined,
      updatedAt: new Date(dbBooking.updated_at),
      updatedBy: dbBooking.updated_by ?? undefined,
    }

    // Since the database doesn't have a status column, we default to 'pending'
    // This is a temporary workaround until the database schema is updated
    // We can infer status from payment_status
    if (dbBooking.payment_status === 'completed') {
      return {
        type: 'completed' as const,
        data: bookingData,
        completedAt: new Date(dbBooking.updated_at),
        completedBy: dbBooking.updated_by || 'system',
      }
    }

    // Default to pending status
    return {
      type: 'pending' as const,
      data: bookingData,
    }
  }

  async findById(id: BookingId): Promise<Result<Booking, RepositoryError>> {
    try {
      const result = await this.db
        .select()
        .from(bookings)
        .where(eq(bookings.id, id))
        .limit(1)

      const firstRow = result[0]
      if (!firstRow) {
        return err({
          type: 'notFound' as const,
          entity: 'Booking',
          id,
        })
      }

      const booking = await this.mapDbToDomain(firstRow)
      if (!booking) {
        return err({
          type: 'databaseError' as const,
          message: 'Failed to map booking data',
        })
      }

      return ok(booking)
    } catch (error) {
      return err({
        type: 'databaseError' as const,
        message:
          error instanceof Error ? error.message : 'Unknown database error',
      })
    }
  }

  async findDetailById(
    id: BookingId
  ): Promise<Result<BookingDetail, RepositoryError>> {
    try {
      const bookingResult = await this.findById(id)
      if (!isOk(bookingResult)) {
        return bookingResult
      }

      const booking = bookingResult.value

      // Customer情報を取得
      const customerResult = await this.db
        .select()
        .from(customers)
        .where(eq(customers.id, booking.data.customerId))
        .limit(1)

      // Salon情報を取得
      const salonResult = await this.db
        .select()
        .from(salons)
        .where(eq(salons.id, booking.data.salonId))
        .limit(1)

      // Reservation詳細を取得
      const reservationDetails = []
      for (const reservationId of booking.data.reservationIds) {
        const resDetails = await this.db
          .select({
            reservation: reservations,
            service: services,
            staff: staff,
          })
          .from(reservations)
          .innerJoin(services, eq(reservations.service_id, services.id))
          .innerJoin(staff, eq(reservations.staff_id, staff.id))
          .where(eq(reservations.id, reservationId))
          .limit(1)

        const firstDetail = resDetails[0]
        if (firstDetail) {
          reservationDetails.push({
            id: reservationId,
            serviceName: firstDetail.service.name,
            staffName: firstDetail.staff.name,
            startTime: new Date(firstDetail.reservation.start_time),
            endTime: new Date(firstDetail.reservation.end_time),
            amount: firstDetail.reservation.total_amount,
          })
        }
      }

      const detail: BookingDetail = {
        booking,
        customerName: customerResult[0]?.name ?? 'Unknown Customer',
        salonName: salonResult[0]?.name ?? 'Unknown Salon',
        reservations: reservationDetails,
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

  async create(
    data: CreateBookingRequest
  ): Promise<Result<Booking, RepositoryError>> {
    try {
      const newBooking: DbNewBooking = {
        salon_id: data.salonId,
        customer_id: data.customerId,
        total_amount: data.totalAmount,
        discount_amount: data.discountAmount,
        final_amount: data.finalAmount,
        payment_method: data.paymentMethod,
        payment_status: 'pending',
        notes: data.notes,
        created_by: data.createdBy,
        updated_by: data.createdBy,
      }

      const insertedBookings = await this.db
        .insert(bookings)
        .values(newBooking)
        .returning()

      const insertedBooking = insertedBookings[0]
      if (!insertedBooking) {
        return err({
          type: 'databaseError' as const,
          message: 'Failed to insert booking',
        })
      }

      // Reservationを関連付け
      if (data.reservationIds && data.reservationIds.length > 0) {
        await this.db.insert(bookingReservations).values(
          data.reservationIds.map((reservationId: string) => ({
            booking_id: insertedBooking.id,
            reservation_id: reservationId,
          }))
        )
      }

      const booking = await this.mapDbToDomain(insertedBooking)
      if (!booking) {
        return err({
          type: 'databaseError' as const,
          message: 'Failed to map created booking',
        })
      }

      return ok(booking)
    } catch (error) {
      return err({
        type: 'databaseError' as const,
        message:
          error instanceof Error ? error.message : 'Unknown database error',
      })
    }
  }

  async update(
    data: UpdateBookingRequest
  ): Promise<Result<Booking, RepositoryError>> {
    try {
      // 既存のbookingを確認
      const existing = await this.db
        .select()
        .from(bookings)
        .where(eq(bookings.id, data.id))
        .limit(1)

      const existingRow = existing[0]
      if (!existingRow) {
        return err({
          type: 'notFound' as const,
          entity: 'Booking',
          id: data.id,
        })
      }

      // 更新データを準備
      const updateData: Partial<DbBooking> = {
        updated_at: new Date().toISOString(),
        updated_by: data.updatedBy,
      }

      if (data.paymentMethod !== undefined)
        updateData.payment_method = data.paymentMethod
      if (data.paymentStatus !== undefined)
        updateData.payment_status = data.paymentStatus
      if (data.notes !== undefined) updateData.notes = data.notes

      const updatedBookings = await this.db
        .update(bookings)
        .set(updateData)
        .where(eq(bookings.id, data.id))
        .returning()

      const updatedBooking = updatedBookings[0]
      if (!updatedBooking) {
        return err({
          type: 'databaseError' as const,
          message: 'Failed to update booking',
        })
      }

      const booking = await this.mapDbToDomain(updatedBooking)
      if (!booking) {
        return err({
          type: 'databaseError' as const,
          message: 'Failed to map updated booking',
        })
      }

      return ok(booking)
    } catch (error) {
      return err({
        type: 'databaseError' as const,
        message:
          error instanceof Error ? error.message : 'Unknown database error',
      })
    }
  }

  async confirm(
    id: BookingId,
    confirmedBy: string
  ): Promise<Result<Booking, RepositoryError>> {
    try {
      const result = await this.db
        .update(bookings)
        .set({
          updated_at: new Date().toISOString(),
          updated_by: confirmedBy,
        })
        .where(eq(bookings.id, id))
        .returning()

      const updatedRow = result[0]
      if (!updatedRow) {
        return err({
          type: 'notFound' as const,
          entity: 'Booking',
          id,
        })
      }

      const booking = await this.mapDbToDomain(updatedRow)
      if (!booking) {
        return err({
          type: 'databaseError' as const,
          message: 'Failed to map confirmed booking',
        })
      }

      return ok(booking)
    } catch (error) {
      return err({
        type: 'databaseError' as const,
        message:
          error instanceof Error ? error.message : 'Unknown database error',
      })
    }
  }

  async cancel(
    id: BookingId,
    reason: string,
    cancelledBy: string
  ): Promise<Result<Booking, RepositoryError>> {
    try {
      const result = await this.db
        .update(bookings)
        .set({
          notes: reason,
          updated_at: new Date().toISOString(),
          updated_by: cancelledBy,
        })
        .where(and(eq(bookings.id, id), or(sql`1=1`, sql`1=1`) ?? sql`1=1`))
        .returning()

      const updatedRow = result[0]
      if (!updatedRow) {
        return err({
          type: 'notFound' as const,
          entity: 'Booking',
          id,
        })
      }

      const booking = await this.mapDbToDomain(updatedRow)
      if (!booking) {
        return err({
          type: 'databaseError' as const,
          message: 'Failed to map cancelled booking',
        })
      }

      return ok(booking)
    } catch (error) {
      return err({
        type: 'databaseError' as const,
        message:
          error instanceof Error ? error.message : 'Unknown database error',
      })
    }
  }

  async complete(
    id: BookingId,
    completedBy: string
  ): Promise<Result<Booking, RepositoryError>> {
    try {
      const result = await this.db
        .update(bookings)
        .set({
          updated_at: new Date().toISOString(),
          updated_by: completedBy,
        })
        .where(eq(bookings.id, id))
        .returning()

      const updatedRow = result[0]
      if (!updatedRow) {
        return err({
          type: 'notFound' as const,
          entity: 'Booking',
          id,
        })
      }

      const booking = await this.mapDbToDomain(updatedRow)
      if (!booking) {
        return err({
          type: 'databaseError' as const,
          message: 'Failed to map completed booking',
        })
      }

      return ok(booking)
    } catch (error) {
      return err({
        type: 'databaseError' as const,
        message:
          error instanceof Error ? error.message : 'Unknown database error',
      })
    }
  }

  async markAsNoShow(
    id: BookingId,
    markedBy: string
  ): Promise<Result<Booking, RepositoryError>> {
    try {
      const result = await this.db
        .update(bookings)
        .set({
          updated_at: new Date().toISOString(),
          updated_by: markedBy,
        })
        .where(eq(bookings.id, id))
        .returning()

      const updatedRow = result[0]
      if (!updatedRow) {
        return err({
          type: 'notFound' as const,
          entity: 'Booking',
          id,
        })
      }

      const booking = await this.mapDbToDomain(updatedRow)
      if (!booking) {
        return err({
          type: 'databaseError' as const,
          message: 'Failed to map no-show booking',
        })
      }

      return ok(booking)
    } catch (error) {
      return err({
        type: 'databaseError' as const,
        message:
          error instanceof Error ? error.message : 'Unknown database error',
      })
    }
  }

  async addReservation(
    bookingId: BookingId,
    reservationId: ReservationId
  ): Promise<Result<Booking, RepositoryError>> {
    try {
      // Bookingが存在するか確認
      const bookingResult = await this.findById(bookingId)
      if (!isOk(bookingResult)) {
        return bookingResult
      }

      // Reservationを追加
      await this.db.insert(bookingReservations).values({
        booking_id: bookingId,
        reservation_id: reservationId,
      })

      // 更新後のBookingを返す
      return this.findById(bookingId)
    } catch (error) {
      return err({
        type: 'databaseError' as const,
        message:
          error instanceof Error ? error.message : 'Unknown database error',
      })
    }
  }

  async removeReservation(
    bookingId: BookingId,
    reservationId: ReservationId
  ): Promise<Result<Booking, RepositoryError>> {
    try {
      // Bookingが存在するか確認
      const bookingResult = await this.findById(bookingId)
      if (!isOk(bookingResult)) {
        return bookingResult
      }

      // Reservationを削除
      await this.db
        .delete(bookingReservations)
        .where(
          and(
            eq(bookingReservations.booking_id, bookingId),
            eq(bookingReservations.reservation_id, reservationId)
          )
        )

      // 更新後のBookingを返す
      return this.findById(bookingId)
    } catch (error) {
      return err({
        type: 'databaseError' as const,
        message:
          error instanceof Error ? error.message : 'Unknown database error',
      })
    }
  }

  async search(
    criteria: BookingSearchCriteria,
    pagination: PaginationParams
  ): Promise<Result<PaginatedResult<Booking>, RepositoryError>> {
    try {
      const conditions = []

      if (criteria.salonId) {
        conditions.push(eq(bookings.salon_id, criteria.salonId))
      }
      if (criteria.customerId) {
        conditions.push(eq(bookings.customer_id, criteria.customerId))
      }
      // Note: status column doesn't exist in the bookings table
      // if (criteria.status) {
      //   conditions.push(eq(bookings.status, criteria.status))
      // }
      if (criteria.paymentStatus) {
        conditions.push(eq(bookings.payment_status, criteria.paymentStatus))
      }
      if (criteria.startDate && criteria.endDate) {
        conditions.push(
          between(
            bookings.created_at,
            criteria.startDate.toISOString(),
            criteria.endDate.toISOString()
          )
        )
      } else if (criteria.startDate) {
        conditions.push(
          gte(bookings.created_at, criteria.startDate.toISOString())
        )
      } else if (criteria.endDate) {
        conditions.push(
          lte(bookings.created_at, criteria.endDate.toISOString())
        )
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined

      // 総件数を取得
      const countResult = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(bookings)
        .where(whereClause)

      const totalCount = Number(countResult[0]?.count ?? 0)

      // ページネーションで取得
      const results = await this.db
        .select()
        .from(bookings)
        .where(whereClause)
        .orderBy(desc(bookings.created_at))
        .limit(pagination.limit)
        .offset(pagination.offset)

      const items: Booking[] = []
      for (const result of results) {
        const booking = await this.mapDbToDomain(result)
        if (booking) {
          items.push(booking)
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

  async findByCustomer(
    customerId: CustomerId,
    pagination: PaginationParams
  ): Promise<Result<PaginatedResult<Booking>, RepositoryError>> {
    return this.search({ customerId }, pagination)
  }

  async findPendingBySalon(
    salonId: SalonId,
    pagination: PaginationParams
  ): Promise<Result<PaginatedResult<Booking>, RepositoryError>> {
    try {
      const conditions = [
        eq(bookings.salon_id, salonId),
        or(sql`1=1`, sql`1=1`) ?? sql`1=1`,
      ]

      const whereClause = and(...conditions)

      // 総件数を取得
      const countResult = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(bookings)
        .where(whereClause)

      const totalCount = Number(countResult[0]?.count ?? 0)

      // ページネーションで取得
      const results = await this.db
        .select()
        .from(bookings)
        .where(whereClause)
        .orderBy(desc(bookings.created_at))
        .limit(pagination.limit)
        .offset(pagination.offset)

      const items: Booking[] = []
      for (const result of results) {
        const booking = await this.mapDbToDomain(result)
        if (booking) {
          items.push(booking)
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

  async findByDateRange(
    salonId: SalonId,
    startDate: Date,
    endDate: Date,
    pagination: PaginationParams
  ): Promise<Result<PaginatedResult<Booking>, RepositoryError>> {
    return this.search({ salonId, startDate, endDate }, pagination)
  }

  async countByStatus(
    salonId: SalonId
  ): Promise<Result<Map<string, number>, RepositoryError>> {
    try {
      const results = await this.db
        .select({
          status: bookings.payment_status,
          count: sql<number>`count(*)`,
        })
        .from(bookings)
        .where(eq(bookings.salon_id, salonId))
        .groupBy(bookings.payment_status)

      const countMap = new Map<string, number>()
      for (const result of results) {
        if (result.status) {
          countMap.set(result.status, Number(result.count))
        }
      }

      return ok(countMap)
    } catch (error) {
      return err({
        type: 'databaseError' as const,
        message:
          error instanceof Error ? error.message : 'Unknown database error',
      })
    }
  }

  async sumByPaymentStatus(
    salonId: SalonId,
    startDate: Date,
    endDate: Date
  ): Promise<Result<Map<string, number>, RepositoryError>> {
    try {
      const results = await this.db
        .select({
          paymentStatus: bookings.payment_status,
          sum: sql<number>`sum(${bookings.final_amount})`,
        })
        .from(bookings)
        .where(
          and(
            eq(bookings.salon_id, salonId),
            between(
              bookings.created_at,
              startDate.toISOString(),
              endDate.toISOString()
            )
          )
        )
        .groupBy(bookings.payment_status)

      const sumMap = new Map<string, number>()
      for (const result of results) {
        if (result.paymentStatus) {
          sumMap.set(result.paymentStatus, Number(result.sum))
        }
      }

      return ok(sumMap)
    } catch (error) {
      return err({
        type: 'databaseError' as const,
        message:
          error instanceof Error ? error.message : 'Unknown database error',
      })
    }
  }
}
