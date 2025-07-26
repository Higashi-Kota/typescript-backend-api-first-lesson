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
    if (!id) return null

    const reservationData = {
      id,
      salonId: dbReservation.salonId as SalonId,
      customerId: dbReservation.customerId as CustomerId,
      staffId: dbReservation.staffId as StaffId,
      serviceId: dbReservation.serviceId as ServiceId,
      startTime: dbReservation.startTime,
      endTime: dbReservation.endTime,
      notes: dbReservation.notes ?? undefined,
      totalAmount: dbReservation.totalAmount,
      depositAmount: dbReservation.depositAmount ?? undefined,
      isPaid: dbReservation.isPaid,
      createdAt: dbReservation.createdAt,
      createdBy: dbReservation.createdBy ?? undefined,
      updatedAt: dbReservation.updatedAt,
      updatedBy: dbReservation.updatedBy ?? undefined,
    }

    // ステータスに基づいて適切な型を返す
    switch (dbReservation.status) {
      case 'pending':
        return {
          type: 'pending',
          data: reservationData,
        }

      case 'confirmed':
        return {
          type: 'confirmed',
          data: reservationData,
          confirmedAt: dbReservation.updatedAt,
          confirmedBy: dbReservation.updatedBy || 'system',
        }

      case 'cancelled':
        return {
          type: 'cancelled',
          data: reservationData,
          cancelledAt: dbReservation.updatedAt,
          cancelledBy: dbReservation.updatedBy || 'system',
          cancellationReason: dbReservation.cancellationReason || 'Cancelled',
        }

      case 'completed':
        return {
          type: 'completed',
          data: reservationData,
          completedAt: dbReservation.updatedAt,
          completedBy: dbReservation.updatedBy || 'system',
        }

      case 'no_show':
        return {
          type: 'no_show',
          data: reservationData,
          markedNoShowAt: dbReservation.updatedAt,
          markedNoShowBy: dbReservation.updatedBy || 'system',
        }

      default:
        return null
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
      if (!firstRow) {
        return err({
          type: 'notFound',
          entity: 'Reservation',
          id,
        })
      }

      const reservation = this.mapDbToDomain(firstRow)
      if (!reservation) {
        return err({
          type: 'databaseError',
          message: 'Failed to map reservation data',
        })
      }

      return ok(reservation)
    } catch (error) {
      return err({
        type: 'databaseError',
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
      if (!firstRow) {
        return err({
          type: 'notFound',
          entity: 'Reservation',
          id,
        })
      }

      const reservation = this.mapDbToDomain(firstRow.reservation)
      if (!reservation) {
        return err({
          type: 'databaseError',
          message: 'Failed to map reservation data',
        })
      }

      const detail: ReservationDetail = {
        reservation,
        customerName: firstRow.customer.name,
        staffName: firstRow.staff.name,
        serviceName: firstRow.service.name,
        serviceCategory: firstRow.service.category,
        serviceDuration: firstRow.service.duration,
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
    data: CreateReservationRequest
  ): Promise<Result<Reservation, RepositoryError>> {
    try {
      // 時間範囲の妥当性チェック
      if (data.startTime >= data.endTime) {
        return err({
          type: 'invalidTimeRange',
          message: 'End time must be after start time',
        })
      }

      // 時間の重複チェック
      const hasConflict = await this.checkTimeSlotConflict(
        data.staffId,
        data.startTime,
        data.endTime
      )
      if (hasConflict.type === 'err') {
        return hasConflict
      }
      if (hasConflict.value) {
        return err({
          type: 'slotNotAvailable',
          message: 'The time slot is already booked',
        })
      }

      const newReservation: DbNewReservation = {
        salonId: data.salonId,
        customerId: data.customerId,
        staffId: data.staffId,
        serviceId: data.serviceId,
        startTime: data.startTime,
        endTime: data.endTime,
        status: 'pending',
        notes: data.notes,
        totalAmount: data.totalAmount,
        depositAmount: data.depositAmount,
        isPaid: false,
        createdBy: data.createdBy,
        updatedBy: data.createdBy,
      }

      const insertedReservations = await this.db
        .insert(reservations)
        .values(newReservation)
        .returning()

      const insertedReservation = insertedReservations[0]
      if (!insertedReservation) {
        return err({
          type: 'databaseError',
          message: 'Failed to insert reservation',
        })
      }

      const reservation = this.mapDbToDomain(insertedReservation)
      if (!reservation) {
        return err({
          type: 'databaseError',
          message: 'Failed to map created reservation',
        })
      }

      return ok(reservation)
    } catch (error) {
      return err({
        type: 'databaseError',
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
      if (!existingRow) {
        return err({
          type: 'notFound',
          entity: 'Reservation',
          id: data.id,
        })
      }

      // キャンセル済み・完了済みの予約は更新不可
      if (existingRow.status === 'cancelled') {
        return err({
          type: 'reservationNotModifiable',
          message: 'Cancelled reservations cannot be modified',
        })
      }
      if (existingRow.status === 'completed') {
        return err({
          type: 'reservationNotModifiable',
          message: 'Completed reservations cannot be modified',
        })
      }

      // 時間を更新する場合
      const startTime = data.startTime ?? existingRow.startTime
      const endTime = data.endTime ?? existingRow.endTime
      const staffId = data.staffId ?? existingRow.staffId

      // 時間範囲の妥当性チェック
      if (startTime >= endTime) {
        return err({
          type: 'invalidTimeRange',
          message: 'End time must be after start time',
        })
      }

      // 時間の重複チェック（自分自身を除く）
      if (
        data.startTime !== undefined ||
        data.endTime !== undefined ||
        data.staffId !== undefined
      ) {
        const hasConflict = await this.checkTimeSlotConflict(
          staffId as StaffId,
          startTime,
          endTime,
          data.id
        )
        if (hasConflict.type === 'err') {
          return hasConflict
        }
        if (hasConflict.value) {
          return err({
            type: 'slotNotAvailable',
            message: 'The time slot is already booked',
          })
        }
      }

      // 更新データを準備
      const updateData: Partial<DbReservation> = {
        updatedAt: new Date(),
        updatedBy: data.updatedBy,
      }

      if (data.startTime !== undefined) updateData.startTime = data.startTime
      if (data.endTime !== undefined) updateData.endTime = data.endTime
      if (data.staffId !== undefined) updateData.staffId = data.staffId
      if (data.notes !== undefined) updateData.notes = data.notes

      const updatedReservations = await this.db
        .update(reservations)
        .set(updateData)
        .where(eq(reservations.id, data.id))
        .returning()

      const updatedReservation = updatedReservations[0]
      if (!updatedReservation) {
        return err({
          type: 'databaseError',
          message: 'Failed to update reservation',
        })
      }

      const reservation = this.mapDbToDomain(updatedReservation)
      if (!reservation) {
        return err({
          type: 'databaseError',
          message: 'Failed to map updated reservation',
        })
      }

      return ok(reservation)
    } catch (error) {
      return err({
        type: 'databaseError',
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
      // 既存の予約を確認
      const existing = await this.db
        .select()
        .from(reservations)
        .where(eq(reservations.id, id))
        .limit(1)

      const existingRow = existing[0]
      if (!existingRow) {
        return err({
          type: 'notFound',
          entity: 'Reservation',
          id,
        })
      }

      // 既に確認済みの場合
      if (existingRow.status === 'confirmed') {
        return err({
          type: 'reservationAlreadyConfirmed',
          message: 'Reservation is already confirmed',
        })
      }

      // pendingのみ確認可能
      if (existingRow.status !== 'pending') {
        return err({
          type: 'invalidReservationStatus',
          message: 'Only pending reservations can be confirmed',
        })
      }

      const result = await this.db
        .update(reservations)
        .set({
          status: 'confirmed',
          updatedAt: new Date(),
          updatedBy: confirmedBy,
        })
        .where(eq(reservations.id, id))
        .returning()

      const updatedRow = result[0]
      if (!updatedRow) {
        return err({
          type: 'databaseError',
          message: 'Failed to update reservation',
        })
      }

      const reservation = this.mapDbToDomain(updatedRow)
      if (!reservation) {
        return err({
          type: 'databaseError',
          message: 'Failed to map confirmed reservation',
        })
      }

      return ok(reservation)
    } catch (error) {
      return err({
        type: 'databaseError',
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
      // 既存の予約を確認
      const existing = await this.db
        .select()
        .from(reservations)
        .where(eq(reservations.id, id))
        .limit(1)

      const existingRow = existing[0]
      if (!existingRow) {
        return err({
          type: 'notFound',
          entity: 'Reservation',
          id,
        })
      }

      // 既にキャンセル済みの場合
      if (existingRow.status === 'cancelled') {
        return err({
          type: 'reservationAlreadyCancelled',
          message: 'Reservation is already cancelled',
        })
      }

      // pending or confirmedのみキャンセル可能
      if (
        existingRow.status !== 'pending' &&
        existingRow.status !== 'confirmed'
      ) {
        return err({
          type: 'invalidReservationStatus',
          message: 'Only pending or confirmed reservations can be cancelled',
        })
      }

      const result = await this.db
        .update(reservations)
        .set({
          status: 'cancelled',
          cancellationReason: reason,
          updatedAt: new Date(),
          updatedBy: cancelledBy,
        })
        .where(eq(reservations.id, id))
        .returning()

      const updatedRow = result[0]
      if (!updatedRow) {
        return err({
          type: 'databaseError',
          message: 'Failed to update reservation',
        })
      }

      const reservation = this.mapDbToDomain(updatedRow)
      if (!reservation) {
        return err({
          type: 'databaseError',
          message: 'Failed to map cancelled reservation',
        })
      }

      return ok(reservation)
    } catch (error) {
      return err({
        type: 'databaseError',
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
      // 既存の予約を確認
      const existing = await this.db
        .select()
        .from(reservations)
        .where(eq(reservations.id, id))
        .limit(1)

      const existingRow = existing[0]
      if (!existingRow) {
        return err({
          type: 'notFound',
          entity: 'Reservation',
          id,
        })
      }

      // confirmedのみ完了可能
      if (existingRow.status !== 'confirmed') {
        return err({
          type: 'reservationNotConfirmed',
          message: 'Only confirmed reservations can be completed',
        })
      }

      const result = await this.db
        .update(reservations)
        .set({
          status: 'completed',
          updatedAt: new Date(),
          updatedBy: completedBy,
        })
        .where(eq(reservations.id, id))
        .returning()

      const updatedRow = result[0]
      if (!updatedRow) {
        return err({
          type: 'databaseError',
          message: 'Failed to update reservation',
        })
      }

      const reservation = this.mapDbToDomain(updatedRow)
      if (!reservation) {
        return err({
          type: 'databaseError',
          message: 'Failed to map completed reservation',
        })
      }

      return ok(reservation)
    } catch (error) {
      return err({
        type: 'databaseError',
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
      // 既存の予約を確認
      const existing = await this.db
        .select()
        .from(reservations)
        .where(eq(reservations.id, id))
        .limit(1)

      const existingRow = existing[0]
      if (!existingRow) {
        return err({
          type: 'notFound',
          entity: 'Reservation',
          id,
        })
      }

      // confirmedのみno_showにできる
      if (existingRow.status !== 'confirmed') {
        return err({
          type: 'reservationNotConfirmed',
          message: 'Only confirmed reservations can be marked as no-show',
        })
      }

      // 開始時間が過ぎているかチェック
      if (existingRow.startTime > new Date()) {
        return err({
          type: 'reservationNotYetPassed',
          message: 'Cannot mark future reservations as no-show',
        })
      }

      const result = await this.db
        .update(reservations)
        .set({
          status: 'no_show',
          updatedAt: new Date(),
          updatedBy: markedBy,
        })
        .where(eq(reservations.id, id))
        .returning()

      const updatedRow = result[0]
      if (!updatedRow) {
        return err({
          type: 'databaseError',
          message: 'Failed to update reservation',
        })
      }

      const reservation = this.mapDbToDomain(updatedRow)
      if (!reservation) {
        return err({
          type: 'databaseError',
          message: 'Failed to map no-show reservation',
        })
      }

      return ok(reservation)
    } catch (error) {
      return err({
        type: 'databaseError',
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
          isPaid,
          updatedAt: new Date(),
          updatedBy,
        })
        .where(eq(reservations.id, id))
        .returning()

      const updatedRow = result[0]
      if (!updatedRow) {
        return err({
          type: 'notFound',
          entity: 'Reservation',
          id,
        })
      }

      const reservation = this.mapDbToDomain(updatedRow)
      if (!reservation) {
        return err({
          type: 'databaseError',
          message: 'Failed to map reservation',
        })
      }

      return ok(reservation)
    } catch (error) {
      return err({
        type: 'databaseError',
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
      if (criteria.status) {
        conditions.push(eq(reservations.status, criteria.status))
      }
      if (criteria.isPaid !== undefined) {
        conditions.push(eq(reservations.isPaid, criteria.isPaid))
      }
      if (criteria.startDate && criteria.endDate) {
        conditions.push(
          between(reservations.startTime, criteria.startDate, criteria.endDate)
        )
      } else if (criteria.startDate) {
        conditions.push(gte(reservations.startTime, criteria.startDate))
      } else if (criteria.endDate) {
        conditions.push(lte(reservations.endTime, criteria.endDate))
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
        type: 'databaseError',
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
            between(reservations.startTime, startDate, endDate)
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
        type: 'databaseError',
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
        type: 'databaseError',
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
        or(
          eq(reservations.status, 'pending'),
          eq(reservations.status, 'confirmed')
        ) ?? sql`1=1`,
        or(
          // 新しい予約が既存の予約と重なる場合
          and(
            lte(reservations.startTime, startTime),
            gte(reservations.endTime, startTime)
          ),
          and(
            lte(reservations.startTime, endTime),
            gte(reservations.endTime, endTime)
          ),
          // 新しい予約が既存の予約を完全に含む場合
          and(
            gte(reservations.startTime, startTime),
            lte(reservations.endTime, endTime)
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
        type: 'databaseError',
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
            between(reservations.startTime, startDate, endDate)
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
        type: 'databaseError',
        message:
          error instanceof Error ? error.message : 'Unknown database error',
      })
    }
  }
}
