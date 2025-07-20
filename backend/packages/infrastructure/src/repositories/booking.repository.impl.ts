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
  bookingReservations,
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
      .where(eq(bookingReservations.bookingId, dbBooking.id))

    const reservationIds = bookingReservationRows
      .map((br) => br.reservationId as ReservationId)
      .filter(Boolean)

    const bookingData = {
      id,
      salonId: dbBooking.salonId as SalonId,
      customerId: dbBooking.customerId as CustomerId,
      totalAmount: dbBooking.totalAmount,
      discountAmount: dbBooking.discountAmount ?? undefined,
      finalAmount: dbBooking.finalAmount,
      paymentMethod: dbBooking.paymentMethod as PaymentMethod,
      paymentStatus: dbBooking.paymentStatus as PaymentStatus,
      notes: dbBooking.notes ?? undefined,
      reservationIds,
      createdAt: dbBooking.createdAt,
      createdBy: dbBooking.createdBy ?? undefined,
      updatedAt: dbBooking.updatedAt,
      updatedBy: dbBooking.updatedBy ?? undefined,
    }

    // ステータスに基づいて適切な型を返す
    switch (dbBooking.status) {
      case 'draft':
        return {
          type: 'draft',
          data: bookingData,
        }

      case 'confirmed':
        return {
          type: 'confirmed',
          data: bookingData,
          confirmedAt: dbBooking.updatedAt,
          confirmedBy: dbBooking.updatedBy || 'system',
        }

      case 'cancelled':
        return {
          type: 'cancelled',
          data: bookingData,
          cancelledAt: dbBooking.updatedAt,
          cancelledBy: dbBooking.updatedBy || 'system',
          cancellationReason: dbBooking.notes ?? undefined,
        }

      case 'completed':
        return {
          type: 'completed',
          data: bookingData,
          completedAt: dbBooking.updatedAt,
          completedBy: dbBooking.updatedBy || 'system',
        }

      case 'no_show':
        return {
          type: 'no_show',
          data: bookingData,
          markedNoShowAt: dbBooking.updatedAt,
          markedNoShowBy: dbBooking.updatedBy || 'system',
        }

      default:
        return null
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
          type: 'notFound',
          entity: 'Booking',
          id,
        })
      }

      const booking = await this.mapDbToDomain(firstRow)
      if (!booking) {
        return err({
          type: 'databaseError',
          message: 'Failed to map booking data',
        })
      }

      return ok(booking)
    } catch (error) {
      return err({
        type: 'databaseError',
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
          .innerJoin(services, eq(reservations.serviceId, services.id))
          .innerJoin(staff, eq(reservations.staffId, staff.id))
          .where(eq(reservations.id, reservationId))
          .limit(1)

        const firstDetail = resDetails[0]
        if (firstDetail) {
          reservationDetails.push({
            id: reservationId,
            serviceName: firstDetail.service.name,
            staffName: firstDetail.staff.name,
            startTime: firstDetail.reservation.startTime,
            endTime: firstDetail.reservation.endTime,
            amount: firstDetail.reservation.totalAmount,
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
        type: 'databaseError',
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
        salonId: data.salonId,
        customerId: data.customerId,
        status: 'draft',
        totalAmount: data.totalAmount,
        discountAmount: data.discountAmount,
        finalAmount: data.finalAmount,
        paymentMethod: data.paymentMethod,
        paymentStatus: 'pending',
        notes: data.notes,
        createdBy: data.createdBy,
        updatedBy: data.createdBy,
      }

      const insertedBookings = await this.db
        .insert(bookings)
        .values(newBooking)
        .returning()

      const insertedBooking = insertedBookings[0]
      if (!insertedBooking) {
        return err({
          type: 'databaseError',
          message: 'Failed to insert booking',
        })
      }

      // Reservationを関連付け
      if (data.reservationIds && data.reservationIds.length > 0) {
        await this.db.insert(bookingReservations).values(
          data.reservationIds.map((reservationId: string) => ({
            bookingId: insertedBooking.id,
            reservationId,
          }))
        )
      }

      const booking = await this.mapDbToDomain(insertedBooking)
      if (!booking) {
        return err({
          type: 'databaseError',
          message: 'Failed to map created booking',
        })
      }

      return ok(booking)
    } catch (error) {
      return err({
        type: 'databaseError',
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
          type: 'notFound',
          entity: 'Booking',
          id: data.id,
        })
      }

      // 更新データを準備
      const updateData: Partial<DbBooking> = {
        updatedAt: new Date(),
        updatedBy: data.updatedBy,
      }

      if (data.paymentMethod !== undefined)
        updateData.paymentMethod = data.paymentMethod
      if (data.paymentStatus !== undefined)
        updateData.paymentStatus = data.paymentStatus
      if (data.notes !== undefined) updateData.notes = data.notes

      const updatedBookings = await this.db
        .update(bookings)
        .set(updateData)
        .where(eq(bookings.id, data.id))
        .returning()

      const updatedBooking = updatedBookings[0]
      if (!updatedBooking) {
        return err({
          type: 'databaseError',
          message: 'Failed to update booking',
        })
      }

      const booking = await this.mapDbToDomain(updatedBooking)
      if (!booking) {
        return err({
          type: 'databaseError',
          message: 'Failed to map updated booking',
        })
      }

      return ok(booking)
    } catch (error) {
      return err({
        type: 'databaseError',
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
          status: 'confirmed',
          updatedAt: new Date(),
          updatedBy: confirmedBy,
        })
        .where(and(eq(bookings.id, id), eq(bookings.status, 'draft')))
        .returning()

      const updatedRow = result[0]
      if (!updatedRow) {
        return err({
          type: 'notFound',
          entity: 'Booking',
          id,
        })
      }

      const booking = await this.mapDbToDomain(updatedRow)
      if (!booking) {
        return err({
          type: 'databaseError',
          message: 'Failed to map confirmed booking',
        })
      }

      return ok(booking)
    } catch (error) {
      return err({
        type: 'databaseError',
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
          status: 'cancelled',
          notes: reason,
          updatedAt: new Date(),
          updatedBy: cancelledBy,
        })
        .where(
          and(
            eq(bookings.id, id),
            or(
              eq(bookings.status, 'draft'),
              eq(bookings.status, 'confirmed')
            ) ?? sql`1=1`
          )
        )
        .returning()

      const updatedRow = result[0]
      if (!updatedRow) {
        return err({
          type: 'notFound',
          entity: 'Booking',
          id,
        })
      }

      const booking = await this.mapDbToDomain(updatedRow)
      if (!booking) {
        return err({
          type: 'databaseError',
          message: 'Failed to map cancelled booking',
        })
      }

      return ok(booking)
    } catch (error) {
      return err({
        type: 'databaseError',
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
          status: 'completed',
          updatedAt: new Date(),
          updatedBy: completedBy,
        })
        .where(and(eq(bookings.id, id), eq(bookings.status, 'confirmed')))
        .returning()

      const updatedRow = result[0]
      if (!updatedRow) {
        return err({
          type: 'notFound',
          entity: 'Booking',
          id,
        })
      }

      const booking = await this.mapDbToDomain(updatedRow)
      if (!booking) {
        return err({
          type: 'databaseError',
          message: 'Failed to map completed booking',
        })
      }

      return ok(booking)
    } catch (error) {
      return err({
        type: 'databaseError',
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
          status: 'no_show',
          updatedAt: new Date(),
          updatedBy: markedBy,
        })
        .where(and(eq(bookings.id, id), eq(bookings.status, 'confirmed')))
        .returning()

      const updatedRow = result[0]
      if (!updatedRow) {
        return err({
          type: 'notFound',
          entity: 'Booking',
          id,
        })
      }

      const booking = await this.mapDbToDomain(updatedRow)
      if (!booking) {
        return err({
          type: 'databaseError',
          message: 'Failed to map no-show booking',
        })
      }

      return ok(booking)
    } catch (error) {
      return err({
        type: 'databaseError',
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
        bookingId,
        reservationId,
      })

      // 更新後のBookingを返す
      return this.findById(bookingId)
    } catch (error) {
      return err({
        type: 'databaseError',
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
            eq(bookingReservations.bookingId, bookingId),
            eq(bookingReservations.reservationId, reservationId)
          )
        )

      // 更新後のBookingを返す
      return this.findById(bookingId)
    } catch (error) {
      return err({
        type: 'databaseError',
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
        conditions.push(eq(bookings.salonId, criteria.salonId))
      }
      if (criteria.customerId) {
        conditions.push(eq(bookings.customerId, criteria.customerId))
      }
      if (criteria.status) {
        conditions.push(eq(bookings.status, criteria.status))
      }
      if (criteria.paymentStatus) {
        conditions.push(eq(bookings.paymentStatus, criteria.paymentStatus))
      }
      if (criteria.startDate && criteria.endDate) {
        conditions.push(
          between(bookings.createdAt, criteria.startDate, criteria.endDate)
        )
      } else if (criteria.startDate) {
        conditions.push(gte(bookings.createdAt, criteria.startDate))
      } else if (criteria.endDate) {
        conditions.push(lte(bookings.createdAt, criteria.endDate))
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
        .orderBy(desc(bookings.createdAt))
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
        type: 'databaseError',
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
        eq(bookings.salonId, salonId),
        or(eq(bookings.status, 'draft'), eq(bookings.status, 'confirmed')) ??
          sql`1=1`,
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
        .orderBy(desc(bookings.createdAt))
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
        type: 'databaseError',
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
          status: bookings.status,
          count: sql<number>`count(*)`,
        })
        .from(bookings)
        .where(eq(bookings.salonId, salonId))
        .groupBy(bookings.status)

      const countMap = new Map<string, number>()
      for (const result of results) {
        if (result.status) {
          countMap.set(result.status, Number(result.count))
        }
      }

      return ok(countMap)
    } catch (error) {
      return err({
        type: 'databaseError',
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
          paymentStatus: bookings.paymentStatus,
          sum: sql<number>`sum(${bookings.finalAmount})`,
        })
        .from(bookings)
        .where(
          and(
            eq(bookings.salonId, salonId),
            between(bookings.createdAt, startDate, endDate)
          )
        )
        .groupBy(bookings.paymentStatus)

      const sumMap = new Map<string, number>()
      for (const result of results) {
        if (result.paymentStatus) {
          sumMap.set(result.paymentStatus, Number(result.sum))
        }
      }

      return ok(sumMap)
    } catch (error) {
      return err({
        type: 'databaseError',
        message:
          error instanceof Error ? error.message : 'Unknown database error',
      })
    }
  }
}
