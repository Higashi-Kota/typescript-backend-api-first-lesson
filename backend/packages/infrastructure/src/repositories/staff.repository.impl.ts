/**
 * Staff Repository Implementation
 * Drizzle ORMを使用したリポジトリの実装
 */

import { and, desc, eq, or, sql } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { safeArrayOverlap, safeLike } from './security-patches'

import type {
  CreateStaffRequest,
  PaginatedResult,
  PaginationParams,
  RepositoryError,
  Result,
  SalonId,
  Staff,
  StaffAvailability,
  StaffId,
  StaffRepository,
  StaffSearchCriteria,
  UpdateStaffRequest,
} from '@beauty-salon-backend/domain'
import { createStaffId, err, ok } from '@beauty-salon-backend/domain'

import {
  staff,
  staff_working_hours as staffWorkingHours,
} from '../database/schema'

// DB型からドメイン型へのマッピング
type DbStaff = typeof staff.$inferSelect
type DbNewStaff = typeof staff.$inferInsert
type DbNewStaffWorkingHours = typeof staffWorkingHours.$inferInsert

export class DrizzleStaffRepository implements StaffRepository {
  constructor(private db: PostgresJsDatabase) {}

  // DBモデルからドメインモデルへの変換
  private mapDbToDomain(dbStaff: DbStaff): Staff | null {
    const id = createStaffId(dbStaff.id)
    if (!id) return null

    const staffData = {
      id,
      salonId: dbStaff.salon_id as SalonId,
      name: dbStaff.name,
      contactInfo: {
        email: dbStaff.email,
        phoneNumber: dbStaff.phone_number,
        alternativePhone: dbStaff.alternative_phone ?? undefined,
      },
      specialties: Array.isArray(dbStaff.specialties)
        ? dbStaff.specialties
        : [],
      imageUrl: dbStaff.image_url ?? undefined,
      bio: dbStaff.bio ?? undefined,
      yearsOfExperience: dbStaff.years_of_experience ?? undefined,
      certifications: Array.isArray(dbStaff.certifications)
        ? dbStaff.certifications
        : undefined,
      createdAt: new Date(dbStaff.created_at),
      createdBy: dbStaff.created_by ?? undefined,
      updatedAt: new Date(dbStaff.updated_at),
      updatedBy: dbStaff.updated_by ?? undefined,
    }

    // isActiveフラグでステータスを判定
    if (!dbStaff.is_active) {
      return {
        type: 'inactive' as const,
        data: staffData,
        inactivatedAt: new Date(dbStaff.updated_at),
        inactivatedReason: 'Deactivated',
      }
    }

    return {
      type: 'active' as const,
      data: staffData,
    }
  }

  async findById(id: StaffId): Promise<Result<Staff, RepositoryError>> {
    try {
      const result = await this.db
        .select()
        .from(staff)
        .where(eq(staff.id, id))
        .limit(1)

      const firstRow = result[0]
      if (!firstRow) {
        return err({
          type: 'notFound' as const,
          entity: 'Staff',
          id,
        })
      }

      const staffModel = this.mapDbToDomain(firstRow)
      if (!staffModel) {
        return err({
          type: 'databaseError' as const,
          message: 'Failed to map staff data',
        })
      }

      return ok(staffModel)
    } catch (error) {
      return err({
        type: 'databaseError' as const,
        message:
          error instanceof Error ? error.message : 'Unknown database error',
      })
    }
  }

  async create(
    data: CreateStaffRequest
  ): Promise<Result<Staff, RepositoryError>> {
    try {
      const newStaff: DbNewStaff = {
        salon_id: data.salonId,
        name: data.name,
        email: data.contactInfo.email,
        phone_number: data.contactInfo.phoneNumber,
        alternative_phone: data.contactInfo.alternativePhone,
        specialties: data.specialties,
        image_url: data.imageUrl,
        bio: data.bio,
        years_of_experience: data.yearsOfExperience,
        certifications: data.certifications || [],
        is_active: true,
        created_by: data.createdBy,
        updated_by: data.createdBy,
      }

      const insertedStaff = await this.db
        .insert(staff)
        .values(newStaff)
        .returning()

      const insertedRow = insertedStaff[0]
      if (!insertedRow) {
        return err({
          type: 'databaseError' as const,
          message: 'Failed to insert staff',
        })
      }

      const staffModel = this.mapDbToDomain(insertedRow)
      if (!staffModel) {
        return err({
          type: 'databaseError' as const,
          message: 'Failed to map created staff',
        })
      }

      return ok(staffModel)
    } catch (error) {
      return err({
        type: 'databaseError' as const,
        message:
          error instanceof Error ? error.message : 'Unknown database error',
      })
    }
  }

  async update(
    data: UpdateStaffRequest
  ): Promise<Result<Staff, RepositoryError>> {
    try {
      // 既存のstaffを確認
      const existing = await this.db
        .select()
        .from(staff)
        .where(eq(staff.id, data.id))
        .limit(1)

      const existingRow = existing[0]
      if (!existingRow) {
        return err({
          type: 'notFound' as const,
          entity: 'Staff',
          id: data.id,
        })
      }

      // 更新データを準備
      const updateData: Partial<DbStaff> = {
        updated_at: new Date().toISOString(),
        updated_by: data.updatedBy,
      }

      if (data.name !== undefined) updateData.name = data.name
      if (data.contactInfo !== undefined) {
        updateData.email = data.contactInfo.email
        updateData.phone_number = data.contactInfo.phoneNumber
        updateData.alternative_phone = data.contactInfo.alternativePhone
      }
      if (data.specialties !== undefined)
        updateData.specialties = data.specialties
      if (data.imageUrl !== undefined) updateData.image_url = data.imageUrl
      if (data.bio !== undefined) updateData.bio = data.bio
      if (data.yearsOfExperience !== undefined)
        updateData.years_of_experience = data.yearsOfExperience
      if (data.certifications !== undefined)
        updateData.certifications = data.certifications

      const updatedStaff = await this.db
        .update(staff)
        .set(updateData)
        .where(eq(staff.id, data.id))
        .returning()

      const updatedRow = updatedStaff[0]
      if (!updatedRow) {
        return err({
          type: 'databaseError' as const,
          message: 'Failed to update staff',
        })
      }

      const staffModel = this.mapDbToDomain(updatedRow)
      if (!staffModel) {
        return err({
          type: 'databaseError' as const,
          message: 'Failed to map updated staff',
        })
      }

      return ok(staffModel)
    } catch (error) {
      return err({
        type: 'databaseError' as const,
        message:
          error instanceof Error ? error.message : 'Unknown database error',
      })
    }
  }

  async deactivate(
    id: StaffId,
    _reason: string,
    deactivatedBy: string
  ): Promise<Result<Staff, RepositoryError>> {
    try {
      const result = await this.db
        .update(staff)
        .set({
          is_active: false,
          updated_at: new Date().toISOString(),
          updated_by: deactivatedBy,
        })
        .where(and(eq(staff.id, id), eq(staff.is_active, true)))
        .returning()

      const updatedRow = result[0]
      if (!updatedRow) {
        return err({
          type: 'notFound' as const,
          entity: 'Staff',
          id,
        })
      }

      const staffModel = this.mapDbToDomain(updatedRow)
      if (!staffModel) {
        return err({
          type: 'databaseError' as const,
          message: 'Failed to map deactivated staff',
        })
      }

      return ok(staffModel)
    } catch (error) {
      return err({
        type: 'databaseError' as const,
        message:
          error instanceof Error ? error.message : 'Unknown database error',
      })
    }
  }

  async reactivate(
    id: StaffId,
    reactivatedBy: string
  ): Promise<Result<Staff, RepositoryError>> {
    try {
      const result = await this.db
        .update(staff)
        .set({
          is_active: true,
          updated_at: new Date().toISOString(),
          updated_by: reactivatedBy,
        })
        .where(and(eq(staff.id, id), eq(staff.is_active, false)))
        .returning()

      const updatedRow = result[0]
      if (!updatedRow) {
        return err({
          type: 'notFound' as const,
          entity: 'Staff',
          id,
        })
      }

      const staffModel = this.mapDbToDomain(updatedRow)
      if (!staffModel) {
        return err({
          type: 'databaseError' as const,
          message: 'Failed to map reactivated staff',
        })
      }

      return ok(staffModel)
    } catch (error) {
      return err({
        type: 'databaseError' as const,
        message:
          error instanceof Error ? error.message : 'Unknown database error',
      })
    }
  }

  async terminate(
    id: StaffId,
    _reason: string,
    _terminatedBy: string
  ): Promise<Result<void, RepositoryError>> {
    try {
      // 現在のスキーマでは物理削除になる
      // TODO: terminatedAt, terminatedByカラムを追加して論理削除にする
      const result = await this.db.delete(staff).where(eq(staff.id, id))

      if (result.count === 0) {
        return err({
          type: 'notFound' as const,
          entity: 'Staff',
          id,
        })
      }

      return ok(undefined)
    } catch (error) {
      return err({
        type: 'databaseError' as const,
        message:
          error instanceof Error ? error.message : 'Unknown database error',
      })
    }
  }

  async search(
    criteria: StaffSearchCriteria,
    pagination: PaginationParams
  ): Promise<Result<PaginatedResult<Staff>, RepositoryError>> {
    try {
      const conditions = []

      // サロンIDで絞り込み
      if (criteria.salonId) {
        conditions.push(eq(staff.salon_id, criteria.salonId))
      }

      // アクティブなstaffのみ
      if (criteria.isActive !== false) {
        conditions.push(eq(staff.is_active, true))
      }

      // キーワード検索
      if (criteria.keyword) {
        conditions.push(
          or(
            safeLike(staff.name, criteria.keyword),
            safeLike(staff.bio, criteria.keyword)
          ) ?? sql`1=1`
        )
      }

      // 専門分野で絞り込み
      if (criteria.specialties && criteria.specialties.length > 0) {
        conditions.push(
          safeArrayOverlap(staff.specialties, criteria.specialties)
        )
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined

      // 総件数を取得
      const countResult = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(staff)
        .where(whereClause)

      const totalCount = Number(countResult[0]?.count ?? 0)

      // ページネーションで取得
      const results = await this.db
        .select()
        .from(staff)
        .where(whereClause)
        .orderBy(desc(staff.created_at))
        .limit(pagination.limit)
        .offset(pagination.offset)

      const items: Staff[] = []
      for (const result of results) {
        const staffModel = this.mapDbToDomain(result)
        if (staffModel) {
          items.push(staffModel)
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

  async findAllActiveBySalon(
    salonId: SalonId,
    pagination: PaginationParams
  ): Promise<Result<PaginatedResult<Staff>, RepositoryError>> {
    return this.search({ salonId, isActive: true }, pagination)
  }

  async getAvailability(
    staffId: StaffId
  ): Promise<Result<StaffAvailability[], RepositoryError>> {
    try {
      const results = await this.db
        .select()
        .from(staffWorkingHours)
        .where(eq(staffWorkingHours.staff_id, staffId))
      // Note: dayOfWeek column doesn't exist in schema
      // .orderBy(staffWorkingHours.dayOfWeek)

      const availability: StaffAvailability[] = results.map((row) => ({
        staffId: row.staff_id as StaffId,
        // Note: dayOfWeek column doesn't exist in schema
        dayOfWeek: 'monday' as
          | 'monday'
          | 'tuesday'
          | 'wednesday'
          | 'thursday'
          | 'friday'
          | 'saturday'
          | 'sunday', // Mock value
        startTime: row.start_time,
        endTime: row.end_time,
        breakStart: row.break_start ?? undefined,
        breakEnd: row.break_end ?? undefined,
      }))

      return ok(availability)
    } catch (error) {
      return err({
        type: 'databaseError' as const,
        message:
          error instanceof Error ? error.message : 'Unknown database error',
      })
    }
  }

  async setAvailability(
    staffId: StaffId,
    availability: StaffAvailability[]
  ): Promise<Result<void, RepositoryError>> {
    try {
      await this.db.transaction(async (tx) => {
        // 既存の勤務時間を削除
        await tx
          .delete(staffWorkingHours)
          .where(eq(staffWorkingHours.staff_id, staffId))

        // 新しい勤務時間を挿入
        if (availability.length > 0) {
          const workingHoursData: DbNewStaffWorkingHours[] = availability.map(
            (hours) => ({
              staff_id: staffId,
              // Note: dayOfWeek column doesn't exist in schema
              // dayOfWeek: hours.dayOfWeek,
              start_time: hours.startTime,
              end_time: hours.endTime,
              break_start: hours.breakStart,
              break_end: hours.breakEnd,
            })
          )

          await tx.insert(staffWorkingHours).values(workingHoursData)
        }
      })

      return ok(undefined)
    } catch (error) {
      return err({
        type: 'databaseError' as const,
        message:
          error instanceof Error ? error.message : 'Unknown database error',
      })
    }
  }

  async findBySpecialties(
    salonId: SalonId,
    specialties: string[],
    pagination: PaginationParams
  ): Promise<Result<PaginatedResult<Staff>, RepositoryError>> {
    return this.search({ salonId, specialties, isActive: true }, pagination)
  }
}
