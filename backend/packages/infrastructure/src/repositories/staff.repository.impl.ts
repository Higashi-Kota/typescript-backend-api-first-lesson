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

import { staff, staffWorkingHours } from '../database/schema'

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
      salonId: dbStaff.salonId as SalonId,
      name: dbStaff.name,
      contactInfo: {
        email: dbStaff.email,
        phoneNumber: dbStaff.phoneNumber,
        alternativePhone: dbStaff.alternativePhone ?? undefined,
      },
      specialties: dbStaff.specialties || [],
      imageUrl: dbStaff.imageUrl ?? undefined,
      bio: dbStaff.bio ?? undefined,
      yearsOfExperience: dbStaff.yearsOfExperience ?? undefined,
      certifications: dbStaff.certifications ?? undefined,
      createdAt: dbStaff.createdAt,
      createdBy: dbStaff.createdBy ?? undefined,
      updatedAt: dbStaff.updatedAt,
      updatedBy: dbStaff.updatedBy ?? undefined,
    }

    // isActiveフラグでステータスを判定
    if (!dbStaff.isActive) {
      return {
        type: 'inactive' as const,
        data: staffData,
        inactivatedAt: dbStaff.updatedAt,
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
        salonId: data.salonId,
        name: data.name,
        email: data.contactInfo.email,
        phoneNumber: data.contactInfo.phoneNumber,
        alternativePhone: data.contactInfo.alternativePhone,
        specialties: data.specialties,
        imageUrl: data.imageUrl,
        bio: data.bio,
        yearsOfExperience: data.yearsOfExperience,
        certifications: data.certifications || [],
        isActive: true,
        createdBy: data.createdBy,
        updatedBy: data.createdBy,
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
        updatedAt: new Date(),
        updatedBy: data.updatedBy,
      }

      if (data.name !== undefined) updateData.name = data.name
      if (data.contactInfo !== undefined) {
        updateData.email = data.contactInfo.email
        updateData.phoneNumber = data.contactInfo.phoneNumber
        updateData.alternativePhone = data.contactInfo.alternativePhone
      }
      if (data.specialties !== undefined)
        updateData.specialties = data.specialties
      if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl
      if (data.bio !== undefined) updateData.bio = data.bio
      if (data.yearsOfExperience !== undefined)
        updateData.yearsOfExperience = data.yearsOfExperience
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
          isActive: false,
          updatedAt: new Date(),
          updatedBy: deactivatedBy,
        })
        .where(and(eq(staff.id, id), eq(staff.isActive, true)))
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
          isActive: true,
          updatedAt: new Date(),
          updatedBy: reactivatedBy,
        })
        .where(and(eq(staff.id, id), eq(staff.isActive, false)))
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
        conditions.push(eq(staff.salonId, criteria.salonId))
      }

      // アクティブなstaffのみ
      if (criteria.isActive !== false) {
        conditions.push(eq(staff.isActive, true))
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
        .orderBy(desc(staff.createdAt))
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
        .where(eq(staffWorkingHours.staffId, staffId))
        .orderBy(staffWorkingHours.dayOfWeek)

      const availability: StaffAvailability[] = results.map((row) => ({
        staffId: row.staffId as StaffId,
        dayOfWeek: row.dayOfWeek,
        startTime: row.startTime,
        endTime: row.endTime,
        breakStart: row.breakStart ?? undefined,
        breakEnd: row.breakEnd ?? undefined,
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
          .where(eq(staffWorkingHours.staffId, staffId))

        // 新しい勤務時間を挿入
        if (availability.length > 0) {
          const workingHoursData: DbNewStaffWorkingHours[] = availability.map(
            (hours) => ({
              staffId,
              dayOfWeek: hours.dayOfWeek,
              startTime: hours.startTime,
              endTime: hours.endTime,
              breakStart: hours.breakStart,
              breakEnd: hours.breakEnd,
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
