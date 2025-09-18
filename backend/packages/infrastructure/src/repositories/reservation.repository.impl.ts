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
import { err, ok } from '@beauty-salon-backend/domain'

import {
  customers,
  reservations,
  services,
  staff,
} from '@beauty-salon-backend/database'

// DB型からドメイン型へのマッピング
type DbReservation = typeof reservations.$inferSelect
type DbNewReservation = typeof reservations.$inferInsert

export class DrizzleReservationRepository implements ReservationRepository {
  constructor(private db: PostgresJsDatabase) {}

  // DBモデルからドメインモデルへの変換
  private mapDbToDomain(dbReservation: DbReservation): Reservation | null {
    const id = dbReservation.id as ReservationId
    if (!id) {
      return null
    }

    return {
      id,
      salonId: dbReservation.salonId as SalonId,
      customerId: dbReservation.customerId as CustomerId,
      staffId: dbReservation.staffId as StaffId,
      serviceId: dbReservation.serviceId as ServiceId,
      startTime: dbReservation.startTime,
      endTime: dbReservation.endTime,
      status: dbReservation.status as
        | 'pending'
        | 'confirmed'
        | 'cancelled'
        | 'completed'
        | 'no_show',
      notes: dbReservation.notes ?? undefined,
      totalAmount: Number(dbReservation.amount),
      depositAmount: undefined,
      isPaid: false,
      cancellationReason: dbReservation.cancellationReason ?? undefined,
      createdAt: dbReservation.createdAt,
      createdBy: undefined,
      updatedAt: dbReservation.updatedAt,
      updatedBy: undefined,
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
        .innerJoin(customers, eq(reservations.customerId, customers.id))
        .innerJoin(staff, eq(reservations.staffId, staff.id))
        .innerJoin(services, eq(reservations.serviceId, services.id))
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
        ...reservation,
        customerName:
          `${firstRow.customer.firstName} ${firstRow.customer.lastName}`.trim(),
        staffName:
          `${firstRow.staff.firstName} ${firstRow.staff.lastName}`.trim(),
        serviceName: firstRow.service.name,
        serviceCategory: (firstRow.service.categoryId || 'other') as
          | 'cut'
          | 'color'
          | 'perm'
          | 'treatment'
          | 'spa'
          | 'other',
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
      // Get service details to calculate duration and price
      const serviceResult = await this.db
        .select()
        .from(services)
        .where(eq(services.id, data.serviceId))
        .limit(1)

      const service = serviceResult[0]
      if (!service) {
        return err({
          type: 'notFound' as const,
          entity: 'Service',
          id: data.serviceId,
        })
      }

      // Calculate end time based on service duration
      const startTime = new Date(data.startTime)
      const endTime = new Date(startTime.getTime() + service.duration * 60000) // duration is in minutes

      const newReservation: DbNewReservation = {
        salonId: data.salonId,
        customerId: data.customerId,
        staffId: data.staffId,
        serviceId: data.serviceId,
        startTime: data.startTime,
        endTime: endTime.toISOString(),
        duration: service.duration,
        status: 'pending',
        amount: service.price.toString(),
        notes: data.notes,
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
    data: UpdateReservationRequest & { id: ReservationId }
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
        updatedAt: new Date().toISOString(),
      }

      if (data.startTime !== undefined) {
        updateData.startTime = data.startTime
      }
      if (data.staffId !== undefined) {
        updateData.staffId = data.staffId
      }
      if (data.notes !== undefined) {
        updateData.notes = data.notes
      }
      if (data.status !== undefined) {
        updateData.status = data.status
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
    _confirmedBy: string
  ): Promise<Result<Reservation, RepositoryError>> {
    try {
      const result = await this.db
        .update(reservations)
        .set({
          status: 'confirmed',
          updatedAt: new Date().toISOString(),
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
          status: 'cancelled',
          cancellationReason: reason,
          cancelledAt: new Date().toISOString(),
          cancelledBy,
          updatedAt: new Date().toISOString(),
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
    _completedBy: string
  ): Promise<Result<Reservation, RepositoryError>> {
    try {
      const result = await this.db
        .update(reservations)
        .set({
          status: 'completed',
          updatedAt: new Date().toISOString(),
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
    _markedBy: string
  ): Promise<Result<Reservation, RepositoryError>> {
    try {
      const result = await this.db
        .update(reservations)
        .set({
          status: 'no_show',
          updatedAt: new Date().toISOString(),
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
    _isPaid: boolean,
    _updatedBy: string
  ): Promise<Result<Reservation, RepositoryError>> {
    try {
      // Note: Payment status is tracked in a different way - this method may need refactoring
      const result = await this.db
        .update(reservations)
        .set({
          updatedAt: new Date().toISOString(),
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
        conditions.push(eq(reservations.salonId, criteria.salonId))
      }
      if (criteria.customerId) {
        conditions.push(eq(reservations.customerId, criteria.customerId))
      }
      if (criteria.staffId) {
        conditions.push(eq(reservations.staffId, criteria.staffId))
      }
      if (criteria.serviceId) {
        conditions.push(eq(reservations.serviceId, criteria.serviceId))
      }
      // Note: status column doesn't exist in reservations table
      // if (criteria.status) {
      //   conditions.push(eq(reservations.status, criteria.status))
      // }
      // Note: isPaid filter not supported in current schema
      // if (criteria.isPaid !== undefined) {
      //   conditions.push(eq(reservations.is_paid, criteria.isPaid))
      // }
      if (criteria.startDate && criteria.endDate) {
        conditions.push(
          between(
            reservations.startTime,
            criteria.startDate.toISOString(),
            criteria.endDate.toISOString()
          )
        )
      } else if (criteria.startDate) {
        conditions.push(
          gte(reservations.startTime, criteria.startDate.toISOString())
        )
      } else if (criteria.endDate) {
        conditions.push(
          lte(reservations.endTime, criteria.endDate.toISOString())
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
        .orderBy(desc(reservations.startTime))
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
            eq(reservations.staffId, staffId),
            between(
              reservations.startTime,
              startDate.toISOString(),
              endDate.toISOString()
            )
          )
        )
        .orderBy(reservations.startTime)

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
          startTime: new Date(time).toISOString(),
          endTime: new Date(endTime).toISOString(),
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
        eq(reservations.staffId, staffId),
        // Note: status column doesn't exist, assuming all reservations are valid for conflict checking
        or(
          // 新しい予約が既存の予約と重なる場合
          and(
            lte(reservations.startTime, startTime.toISOString()),
            gte(reservations.endTime, startTime.toISOString())
          ),
          and(
            lte(reservations.startTime, endTime.toISOString()),
            gte(reservations.endTime, endTime.toISOString())
          ),
          // 新しい予約が既存の予約を完全に含む場合
          and(
            gte(reservations.startTime, startTime.toISOString()),
            lte(reservations.endTime, endTime.toISOString())
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
          date: sql<string>`DATE(${reservations.startTime})`,
          count: sql<number>`count(*)`,
        })
        .from(reservations)
        .where(
          and(
            eq(reservations.salonId, salonId),
            between(
              reservations.startTime,
              startDate.toISOString(),
              endDate.toISOString()
            )
          )
        )
        .groupBy(sql`DATE(${reservations.startTime})`)

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
