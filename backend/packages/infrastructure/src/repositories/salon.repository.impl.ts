/**
 * Salon Repository Implementation
 * Drizzle ORMを使用したリポジトリの実装
 */

import { and, desc, eq, or, sql } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { safeJsonbAccess, safeLike } from './security-patches'

import type {
  CreateSalonRequest,
  PaginatedResult,
  PaginationParams,
  RepositoryError,
  Result,
  Salon,
  SalonId,
  SalonRepository,
  SalonSearchCriteria,
  UpdateSalonRequest,
} from '@beauty-salon-backend/domain'
import { err, ok } from '@beauty-salon-backend/domain'

import { mapDbSalonToDomain } from '@beauty-salon-backend/domain'

import {
  openingHours as openingHoursTable,
  salons,
} from '@beauty-salon-backend/database'

// DB型の定義
type DbSalon = typeof salons.$inferSelect
type DbNewSalon = typeof salons.$inferInsert
type DbNewOpeningHours = typeof openingHoursTable.$inferInsert

export class DrizzleSalonRepository implements SalonRepository {
  constructor(private db: PostgresJsDatabase) {}

  // DBモデルからドメインモデルへの変換
  private async mapDbToDomain(dbSalon: DbSalon): Promise<Salon | null> {
    // マッパーパッケージを使用
    const salon = mapDbSalonToDomain(dbSalon)
    if (salon == null) {
      return null
    }

    // 営業時間を取得して追加
    const dbOpeningHours = await this.db
      .select()
      .from(openingHoursTable)
      .where(eq(openingHoursTable.salonId, dbSalon.id))

    const openingHours = dbOpeningHours.map(
      (hours: (typeof dbOpeningHours)[0]) => ({
        // Note: dayOfWeek column doesn't exist in schema
        dayOfWeek: 'monday' as
          | 'monday'
          | 'tuesday'
          | 'wednesday'
          | 'thursday'
          | 'friday'
          | 'saturday'
          | 'sunday', // Mock value
        openTime: hours.openTime || '',
        closeTime: hours.closeTime || '',
        isHoliday: hours.isHoliday,
      })
    )

    // openingHoursを追加
    salon.openingHours = openingHours

    return salon
  }

  async findById(id: SalonId): Promise<Result<Salon, RepositoryError>> {
    try {
      const result = await this.db
        .select()
        .from(salons)
        .where(eq(salons.id, id))
        .limit(1)

      const firstRow = result[0]
      if (firstRow == null) {
        return err({
          type: 'notFound' as const,
          entity: 'Salon',
          id,
        })
      }

      const salon = await this.mapDbToDomain(firstRow)
      if (salon == null) {
        return err({
          type: 'databaseError' as const,
          message: 'Failed to map salon data',
        })
      }

      return ok(salon)
    } catch (error) {
      return err({
        type: 'databaseError' as const,
        message:
          error instanceof Error ? error.message : 'Unknown database error',
      })
    }
  }

  async create(
    data: CreateSalonRequest
  ): Promise<Result<Salon, RepositoryError>> {
    try {
      // トランザクション内でsalonと営業時間を作成
      const result = await this.db.transaction(async (tx) => {
        // Salonを作成
        const newSalon: DbNewSalon = {
          name: data.name,
          description: data.description,
          address: data.address.street,
          city: data.address.city,
          prefecture: data.address.state,
          postalCode: data.address.postalCode,
          building: undefined,
          email: data.contactInfo.email,
          phoneNumber: data.contactInfo.phoneNumber,
          alternativePhone: data.contactInfo.alternativePhone,
          websiteUrl: undefined,
          imageUrls: data.imageUrls ?? [],
          features: data.features ?? [],
        }

        const insertedSalons = await tx
          .insert(salons)
          .values(newSalon)
          .returning()

        const insertedSalon = insertedSalons[0]
        if (insertedSalon == null) {
          throw new Error('Failed to insert salon')
        }

        // 営業時間を作成
        const openingHoursData: DbNewOpeningHours[] = data.openingHours.map(
          (hours: (typeof data.openingHours)[0]) => ({
            salonId: insertedSalon.id,
            dayOfWeek: hours.dayOfWeek,
            openTime: hours.openTime,
            closeTime: hours.closeTime,
            isHoliday: hours.isHoliday,
          })
        )

        await tx.insert(openingHoursTable).values(openingHoursData)

        return insertedSalon
      })

      const salon = await this.mapDbToDomain(result)
      if (salon == null) {
        return err({
          type: 'databaseError' as const,
          message: 'Failed to map created salon',
        })
      }

      return ok(salon)
    } catch (error) {
      return err({
        type: 'databaseError' as const,
        message:
          error instanceof Error ? error.message : 'Unknown database error',
      })
    }
  }

  async update(
    data: UpdateSalonRequest & { id: SalonId }
  ): Promise<Result<Salon, RepositoryError>> {
    try {
      // トランザクション内で更新
      const result = await this.db.transaction(async (tx) => {
        // 既存のsalonを確認
        const existing = await tx
          .select()
          .from(salons)
          .where(eq(salons.id, data.id))
          .limit(1)

        const existingRow = existing[0]
        if (existingRow == null) {
          throw new Error('Salon not found')
        }

        // 更新データを準備
        const updateData: Partial<DbSalon> = {
          updatedAt: new Date().toISOString(),
        }

        if (data.name !== undefined) {
          updateData.name = data.name
        }
        if (data.description !== undefined) {
          updateData.description = data.description
        }
        if (data.address !== undefined) {
          updateData.address = data.address.street
          updateData.city = data.address.city
          updateData.prefecture = data.address.state
          updateData.postalCode = data.address.postalCode
          updateData.building = undefined
        }
        if (data.contactInfo !== undefined) {
          updateData.email = data.contactInfo.email
          updateData.phoneNumber = data.contactInfo.phoneNumber
          updateData.alternativePhone = data.contactInfo.alternativePhone
          updateData.websiteUrl = undefined
        }
        if (data.imageUrls !== undefined) {
          updateData.imageUrls = data.imageUrls
        }
        if (data.features !== undefined) {
          updateData.features = data.features
        }

        // Salonを更新
        const updatedSalons = await tx
          .update(salons)
          .set(updateData)
          .where(eq(salons.id, data.id))
          .returning()

        const updatedSalon = updatedSalons[0]
        if (updatedSalon == null) {
          throw new Error('Failed to update salon')
        }

        // 営業時間が更新される場合
        if (data.openingHours !== undefined) {
          // 既存の営業時間を削除
          await tx
            .delete(openingHoursTable)
            .where(eq(openingHoursTable.salonId, data.id))

          // 新しい営業時間を挿入
          const openingHoursData: DbNewOpeningHours[] = data.openingHours.map(
            (hours: (typeof data.openingHours)[0]) => ({
              salonId: data.id,
              dayOfWeek: hours.dayOfWeek,
              openTime: hours.openTime,
              closeTime: hours.closeTime,
              isHoliday: hours.isHoliday,
            })
          )

          await tx.insert(openingHoursTable).values(openingHoursData)
        }

        return updatedSalon
      })

      const salon = await this.mapDbToDomain(result)
      if (salon == null) {
        return err({
          type: 'databaseError' as const,
          message: 'Failed to map updated salon',
        })
      }

      return ok(salon)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      if (message.includes('not found')) {
        return err({
          type: 'notFound' as const,
          entity: 'Salon',
          id: data.id,
        })
      }
      return err({
        type: 'databaseError' as const,
        message,
      })
    }
  }

  async delete(
    id: SalonId,
    _deletedBy: string
  ): Promise<Result<void, RepositoryError>> {
    try {
      // 現在のスキーマでは物理削除になる
      // TODO: deletedAtカラムを追加して論理削除にする
      const result = await this.db.delete(salons).where(eq(salons.id, id))

      if (result.count === 0) {
        return err({
          type: 'notFound' as const,
          entity: 'Salon',
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
    criteria: SalonSearchCriteria,
    pagination: PaginationParams
  ): Promise<Result<PaginatedResult<Salon>, RepositoryError>> {
    try {
      const conditions = []

      // 現在のスキーマではすべてアクティブ
      // TODO: deletedAt/suspendedAtカラムを追加時に実装

      // キーワード検索
      if (criteria.keyword) {
        conditions.push(
          or(
            safeLike(salons.name, criteria.keyword),
            safeLike(salons.description, criteria.keyword)
          ) ?? sql`1=1`
        )
      }

      // 都市で絞り込み
      if (criteria.city) {
        conditions.push(safeJsonbAccess(salons.address, 'city', criteria.city))
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined

      // 総件数を取得
      const countResult = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(salons)
        .where(whereClause)

      const totalCount = Number(countResult[0]?.count ?? 0)

      // ページネーションで取得
      const results = await this.db
        .select()
        .from(salons)
        .where(whereClause)
        .orderBy(desc(salons.createdAt))
        .limit(pagination.limit)
        .offset(pagination.offset)

      const items: Salon[] = []
      for (const result of results) {
        const salon = await this.mapDbToDomain(result)
        if (salon) {
          items.push(salon)
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

  async findAllActive(
    pagination: PaginationParams
  ): Promise<Result<PaginatedResult<Salon>, RepositoryError>> {
    return this.search({}, pagination)
  }

  async suspend(
    _id: SalonId,
    _reason: string,
    _suspendedBy: string
  ): Promise<Result<Salon, RepositoryError>> {
    // 現在のスキーマではsuspendedAtカラムがないため、未実装
    // TODO: suspendedAtカラムを追加時に実装
    return err({
      type: 'databaseError' as const,
      message: 'Suspend functionality not implemented yet',
    })
  }

  async reactivate(
    _id: SalonId,
    _reactivatedBy: string
  ): Promise<Result<Salon, RepositoryError>> {
    // 現在のスキーマではsuspendedAtカラムがないため、未実装
    // TODO: suspendedAtカラムを追加時に実装
    return err({
      type: 'databaseError' as const,
      message: 'Reactivate functionality not implemented yet',
    })
  }

  async countByCity(): Promise<Result<Map<string, number>, RepositoryError>> {
    try {
      const results = await this.db
        .select({
          city: sql<string>`${salons.address}->>'city'`,
          count: sql<number>`count(*)`,
        })
        .from(salons)
        .groupBy(sql`${salons.address}->>'city'`)

      const cityCountMap = new Map<string, number>()
      for (const result of results) {
        if (result.city) {
          cityCountMap.set(result.city, Number(result.count))
        }
      }

      return ok(cityCountMap)
    } catch (error) {
      return err({
        type: 'databaseError' as const,
        message:
          error instanceof Error ? error.message : 'Unknown database error',
      })
    }
  }
}
