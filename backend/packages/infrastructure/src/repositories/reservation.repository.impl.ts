/**
 * Reservation Repository Implementation
 * Drizzle ORMを使用したリポジトリの実装
 */

import { and, between, desc, eq, gte, lte, or, sql } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { safeNotEqual } from './security-patches'

import type {
  AvailableSlot,
  CreateReservationRequest,
  CustomerId,
  PaginatedResult,
  PaginationParams,
  RepositoryError,
  Reservation,
  ReservationDetail,
  ReservationId,
  ReservationRepository,
  ReservationSearchCriteria,
  Result,
  SalonId,
  ServiceId,
  StaffId,
  UpdateReservationRequest,
} from '@beauty-salon-backend/domain'
import { createReservationId, err, ok } from '@beauty-salon-backend/domain'

import { customers, reservations, services, staff } from '../database/schema'

// DB型からドメイン型へのマッピング
type DbReservation = typeof reservations.$inferSelect
type DbNewReservation = typeof reservations.$inferInsert

export class DrizzleReservationRepository implements ReservationRepository {
  constructor(private db: PostgresJsDatabase) {}

  // DBモデルからドメインモデルへの変換
  private mapDbToDomain(dbReservation: DbReservation): Reservation | null {
    const id = createReservationId(dbReservation.id)
    if (id === null) {
      return null
    }

    const reservationData = {
      id,
      salonId: dbReservation.salon_id as SalonId,
      customerId: dbReservation.customer_id as CustomerId,
      staffId: dbReservation.staff_id as StaffId,
      serviceId: dbReservation.service_id as ServiceId,
      startTime: new Date(dbReservation.start_time),
      endTime: new Date(dbReservation.end_time),
      notes: dbReservation.notes ?? undefined,
      totalAmount: dbReservation.total_amount,
      depositAmount: dbReservation.deposit_amount ?? undefined,
      isPaid: dbReservation.is_paid,
      createdAt: new Date(dbReservation.created_at),
      createdBy: dbReservation.created_by ?? undefined,
      updatedAt: new Date(dbReservation.updated_at),
      updatedBy: dbReservation.updated_by ?? undefined,
    }

    // Since the database doesn't have a status column, we default to 'pending'
    // This is a temporary workaround until the database schema is updated
    if (dbReservation.cancellation_reason) {
      return {
        type: 'cancelled' as const,
        data: reservationData,
        cancelledAt: new Date(dbReservation.updated_at),
        cancelledBy: dbReservation.updated_by ?? 'system',
        cancellationReason: dbReservation.cancellation_reason,
      }
    }

    // Default to pending status
    return {
      type: 'pending' as const,
      data: reservationData,
    }
  }

  async findById(
    id: ReservationId
  ): Promise<Result<Reservation, RepositoryError>> {
    try {
      const result = await this.db
        .select()
        .from(reservations)
        .where(eq(reservations.id, id))
        .limit(1)

      const firstRow = result[0]
      if (firstRow === undefined) {
        return err({
          type: 'notFound' as const,
          entity: 'Reservation',
          id,
        })
      }

      const reservation = this.mapDbToDomain(firstRow)
      if (reservation === null) {
        return err({
          type: 'databaseError' as const,
          message: 'Failed to map reservation data',
        })
      }

      return ok(reservation)
    } catch (error) {
      return err({
        type: 'databaseError' as const,
        message:
          error instanceof Error ? error.message : 'Unknown database error',
      })
    }
  }

  async findDetailById(
    id: ReservationId
  ): Promise<Result<ReservationDetail, RepositoryError>> {
    try {
      const result = await this.db
        .select({
          reservation: reservations,
          customer: customers,
          staff: staff,
          service: services,
        })
        .from(reservations)
        .innerJoin(customers, eq(reservations.customer_id, customers.id))
        .innerJoin(staff, eq(reservations.staff_id, staff.id))
        .innerJoin(services, eq(reservations.service_id, services.id))
        .where(eq(reservations.id, id))
        .limit(1)

      const firstRow = result[0]
      if (firstRow === undefined) {
        return err({
          type: 'notFound' as const,
          entity: 'Reservation',
          id,
        })
      }

      const reservation = this.mapDbToDomain(firstRow.reservation)
      if (reservation === null) {
        return err({
          type: 'databaseError' as const,
          message: 'Failed to map reservation data',
        })
      }

      const detail: ReservationDetail = {
        reservation,
        customerName: firstRow.customer.name,
        staffName: firstRow.staff.name,
        serviceName: firstRow.service.name,
        serviceCategory: 'hair' as import(
          '@beauty-salon-backend/domain'
        ).ServiceCategory, // Default category as it doesn't exist in DB
        serviceDuration: firstRow.service.duration,
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
    data: CreateReservationRequest
  ): Promise<Result<Reservation, RepositoryError>> {
    try {
      const newReservation: DbNewReservation = {
        salon_id: data.salonId,
        customer_id: data.customerId,
        staff_id: data.staffId,
        service_id: data.serviceId,
        start_time: data.startTime.toISOString(),
        end_time: data.endTime.toISOString(),
        // Note: status column doesn't exist in the database
        notes: data.notes,
        total_amount: data.totalAmount,
        deposit_amount: data.depositAmount,
        is_paid: false,
        created_by: data.createdBy,
        updated_by: data.createdBy,
      }

      const insertedReservations = await this.db
        .insert(reservations)
        .values(newReservation)
        .returning()

      const insertedReservation = insertedReservations[0]
      if (insertedReservation === undefined) {
        return err({
          type: 'databaseError' as const,
          message: 'Failed to insert reservation',
        })
      }

      const reservation = this.mapDbToDomain(insertedReservation)
      if (reservation === null) {
        return err({
          type: 'databaseError' as const,
          message: 'Failed to map created reservation',
        })
      }

      return ok(reservation)
    } catch (error) {
      return err({
        type: 'databaseError' as const,
        message:
          error instanceof Error ? error.message : 'Unknown database error',
      })
    }
  }

  async update(
    data: UpdateReservationRequest
  ): Promise<Result<Reservation, RepositoryError>> {
    try {
      // 既存のreservationを確認
      const existing = await this.db
        .select()
        .from(reservations)
        .where(eq(reservations.id, data.id))
        .limit(1)

      const existingRow = existing[0]
      if (existingRow === undefined) {
        return err({
          type: 'notFound' as const,
          entity: 'Reservation',
          id: data.id,
        })
      }

      // 更新データを準備
      const updateData: Partial<DbReservation> = {
        updated_at: new Date().toISOString(),
        updated_by: data.updatedBy,
      }

      if (data.startTime !== undefined) {
        updateData.start_time = data.startTime.toISOString()
      }
      if (data.endTime !== undefined) {
        updateData.end_time = data.endTime.toISOString()
      }
      if (data.staffId !== undefined) {
        updateData.staff_id = data.staffId
      }
      if (data.notes !== undefined) {
        updateData.notes = data.notes
      }

      const updatedReservations = await this.db
        .update(reservations)
        .set(updateData)
        .where(eq(reservations.id, data.id))
        .returning()

      const updatedReservation = updatedReservations[0]
      if (updatedReservation === undefined) {
        return err({
          type: 'databaseError' as const,
          message: 'Failed to update reservation',
        })
      }

      const reservation = this.mapDbToDomain(updatedReservation)
      if (reservation === null) {
        return err({
          type: 'databaseError' as const,
          message: 'Failed to map updated reservation',
        })
      }

      return ok(reservation)
    } catch (error) {
      return err({
        type: 'databaseError' as const,
        message:
          error instanceof Error ? error.message : 'Unknown database error',
      })
    }
  }

  async confirm(
    id: ReservationId,
    confirmedBy: string
  ): Promise<Result<Reservation, RepositoryError>> {
    try {
      const result = await this.db
        .update(reservations)
        .set({
          updated_at: new Date().toISOString(),
          updated_by: confirmedBy,
        })
        .where(eq(reservations.id, id))
        .returning()

      const updatedRow = result[0]
      if (updatedRow === undefined) {
        return err({
          type: 'notFound' as const,
          entity: 'Reservation',
          id,
        })
      }

      const reservation = this.mapDbToDomain(updatedRow)
      if (reservation === null) {
        return err({
          type: 'databaseError' as const,
          message: 'Failed to map confirmed reservation',
        })
      }

      return ok(reservation)
    } catch (error) {
      return err({
        type: 'databaseError' as const,
        message:
          error instanceof Error ? error.message : 'Unknown database error',
      })
    }
  }

  async cancel(
    id: ReservationId,
    reason: string,
    cancelledBy: string
  ): Promise<Result<Reservation, RepositoryError>> {
    try {
      const result = await this.db
        .update(reservations)
        .set({
          cancellation_reason: reason,
          updated_at: new Date().toISOString(),
          updated_by: cancelledBy,
        })
        .where(eq(reservations.id, id))
        .returning()

      const updatedRow = result[0]
      if (updatedRow === undefined) {
        return err({
          type: 'notFound' as const,
          entity: 'Reservation',
          id,
        })
      }

      const reservation = this.mapDbToDomain(updatedRow)
      if (reservation === null) {
        return err({
          type: 'databaseError' as const,
          message: 'Failed to map cancelled reservation',
        })
      }

      return ok(reservation)
    } catch (error) {
      return err({
        type: 'databaseError' as const,
        message:
          error instanceof Error ? error.message : 'Unknown database error',
      })
    }
  }

  async complete(
    id: ReservationId,
    completedBy: string
  ): Promise<Result<Reservation, RepositoryError>> {
    try {
      const result = await this.db
        .update(reservations)
        .set({
          updated_at: new Date().toISOString(),
          updated_by: completedBy,
        })
        .where(eq(reservations.id, id))
        .returning()

      const updatedRow = result[0]
      if (updatedRow === undefined) {
        return err({
          type: 'notFound' as const,
          entity: 'Reservation',
          id,
        })
      }

      const reservation = this.mapDbToDomain(updatedRow)
      if (reservation === null) {
        return err({
          type: 'databaseError' as const,
          message: 'Failed to map completed reservation',
        })
      }

      return ok(reservation)
    } catch (error) {
      return err({
        type: 'databaseError' as const,
        message:
          error instanceof Error ? error.message : 'Unknown database error',
      })
    }
  }

  async markAsNoShow(
    id: ReservationId,
    markedBy: string
  ): Promise<Result<Reservation, RepositoryError>> {
    try {
      const result = await this.db
        .update(reservations)
        .set({
          updated_at: new Date().toISOString(),
          updated_by: markedBy,
        })
        .where(eq(reservations.id, id))
        .returning()

      const updatedRow = result[0]
      if (updatedRow === undefined) {
        return err({
          type: 'notFound' as const,
          entity: 'Reservation',
          id,
        })
      }

      const reservation = this.mapDbToDomain(updatedRow)
      if (reservation === null) {
        return err({
          type: 'databaseError' as const,
          message: 'Failed to map no-show reservation',
        })
      }

      return ok(reservation)
    } catch (error) {
      return err({
        type: 'databaseError' as const,
        message:
          error instanceof Error ? error.message : 'Unknown database error',
      })
    }
  }

  async updatePaymentStatus(
    id: ReservationId,
    isPaid: boolean,
    updatedBy: string
  ): Promise<Result<Reservation, RepositoryError>> {
    try {
      const result = await this.db
        .update(reservations)
        .set({
          is_paid: isPaid,
          updated_at: new Date().toISOString(),
          updated_by: updatedBy,
        })
        .where(eq(reservations.id, id))
        .returning()

      const updatedRow = result[0]
      if (updatedRow === undefined) {
        return err({
          type: 'notFound' as const,
          entity: 'Reservation',
          id,
        })
      }

      const reservation = this.mapDbToDomain(updatedRow)
      if (reservation === null) {
        return err({
          type: 'databaseError' as const,
          message: 'Failed to map reservation',
        })
      }

      return ok(reservation)
    } catch (error) {
      return err({
        type: 'databaseError' as const,
        message:
          error instanceof Error ? error.message : 'Unknown database error',
      })
    }
  }

  async search(
    criteria: ReservationSearchCriteria,
    pagination: PaginationParams
  ): Promise<Result<PaginatedResult<Reservation>, RepositoryError>> {
    try {
      const conditions = []

      if (criteria.salonId) {
        conditions.push(eq(reservations.salon_id, criteria.salonId))
      }
      if (criteria.customerId) {
        conditions.push(eq(reservations.customer_id, criteria.customerId))
      }
      if (criteria.staffId) {
        conditions.push(eq(reservations.staff_id, criteria.staffId))
      }
      if (criteria.serviceId) {
        conditions.push(eq(reservations.service_id, criteria.serviceId))
      }
      // Note: status column doesn't exist in reservations table
      // if (criteria.status) {
      //   conditions.push(eq(reservations.status, criteria.status))
      // }
      if (criteria.isPaid !== undefined) {
        conditions.push(eq(reservations.is_paid, criteria.isPaid))
      }
      if (criteria.startDate && criteria.endDate) {
        conditions.push(
          between(
            reservations.start_time,
            criteria.startDate.toISOString(),
            criteria.endDate.toISOString()
          )
        )
      } else if (criteria.startDate) {
        conditions.push(
          gte(reservations.start_time, criteria.startDate.toISOString())
        )
      } else if (criteria.endDate) {
        conditions.push(
          lte(reservations.end_time, criteria.endDate.toISOString())
        )
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined

      // 総件数を取得
      const countResult = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(reservations)
        .where(whereClause)

      const totalCount = Number(countResult[0]?.count ?? 0)

      // ページネーションで取得
      const results = await this.db
        .select()
        .from(reservations)
        .where(whereClause)
        .orderBy(desc(reservations.start_time))
        .limit(pagination.limit)
        .offset(pagination.offset)

      const items: Reservation[] = []
      for (const result of results) {
        const reservation = this.mapDbToDomain(result)
        if (reservation) {
          items.push(reservation)
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

  async findByStaffAndDateRange(
    staffId: StaffId,
    startDate: Date,
    endDate: Date
  ): Promise<Result<Reservation[], RepositoryError>> {
    try {
      const results = await this.db
        .select()
        .from(reservations)
        .where(
          and(
            eq(reservations.staff_id, staffId),
            between(
              reservations.start_time,
              startDate.toISOString(),
              endDate.toISOString()
            )
          )
        )
        .orderBy(reservations.start_time)

      const items: Reservation[] = []
      for (const result of results) {
        const reservation = this.mapDbToDomain(result)
        if (reservation) {
          items.push(reservation)
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

  async findByCustomer(
    customerId: CustomerId,
    pagination: PaginationParams
  ): Promise<Result<PaginatedResult<Reservation>, RepositoryError>> {
    return this.search({ customerId }, pagination)
  }

  async findAvailableSlots(
    _salonId: SalonId,
    _serviceId: string,
    date: Date,
    duration: number
  ): Promise<Result<AvailableSlot[], RepositoryError>> {
    try {
      // TODO: 実際の空きスロット検索ロジックを実装
      // 現在は簡易的な実装
      const startOfDay = new Date(date)
      startOfDay.setHours(9, 0, 0, 0)

      const endOfDay = new Date(date)
      endOfDay.setHours(18, 0, 0, 0)

      const slots: AvailableSlot[] = []
      const slotDuration = duration

      for (
        let time = new Date(startOfDay);
        time < endOfDay;
        time.setMinutes(time.getMinutes() + slotDuration)
      ) {
        const endTime = new Date(time)
        endTime.setMinutes(endTime.getMinutes() + slotDuration)

        // TODO: スタッフごとの空き状況を確認
        slots.push({
          staffId: 'dummy-staff-id' as StaffId,
          startTime: new Date(time),
          endTime: new Date(endTime),
        })
      }

      return ok(slots)
    } catch (error) {
      return err({
        type: 'databaseError' as const,
        message:
          error instanceof Error ? error.message : 'Unknown database error',
      })
    }
  }

  async checkTimeSlotConflict(
    staffId: StaffId,
    startTime: Date,
    endTime: Date,
    excludeReservationId?: ReservationId
  ): Promise<Result<boolean, RepositoryError>> {
    try {
      const conditions = [
        eq(reservations.staff_id, staffId),
        // Note: status column doesn't exist, assuming all reservations are valid for conflict checking
        or(
          // 新しい予約が既存の予約と重なる場合
          and(
            lte(reservations.start_time, startTime.toISOString()),
            gte(reservations.end_time, startTime.toISOString())
          ),
          and(
            lte(reservations.start_time, endTime.toISOString()),
            gte(reservations.end_time, endTime.toISOString())
          ),
          // 新しい予約が既存の予約を完全に含む場合
          and(
            gte(reservations.start_time, startTime.toISOString()),
            lte(reservations.end_time, endTime.toISOString())
          )
        ) ?? sql`1=1`,
      ]

      if (excludeReservationId) {
        conditions.push(safeNotEqual(reservations.id, excludeReservationId))
      }

      const result = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(reservations)
        .where(and(...conditions))

      const hasConflict = Number(result[0]?.count ?? 0) > 0

      return ok(hasConflict)
    } catch (error) {
      return err({
        type: 'databaseError' as const,
        message:
          error instanceof Error ? error.message : 'Unknown database error',
      })
    }
  }

  async countByDate(
    salonId: SalonId,
    startDate: Date,
    endDate: Date
  ): Promise<Result<Map<string, number>, RepositoryError>> {
    try {
      const results = await this.db
        .select({
          date: sql<string>`DATE(${reservations.start_time})`,
          count: sql<number>`count(*)`,
        })
        .from(reservations)
        .where(
          and(
            eq(reservations.salon_id, salonId),
            between(
              reservations.start_time,
              startDate.toISOString(),
              endDate.toISOString()
            )
          )
        )
        .groupBy(sql`DATE(${reservations.start_time})`)

      const countMap = new Map<string, number>()
      for (const result of results) {
        if (result.date) {
          countMap.set(result.date, Number(result.count))
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
}
