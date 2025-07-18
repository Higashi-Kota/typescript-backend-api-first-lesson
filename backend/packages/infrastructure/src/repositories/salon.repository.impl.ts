/**
 * Salon Repository Implementation
 * Drizzle ORMを使用したリポジトリの実装
 */

import { and, desc, eq, like, or, sql } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

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
import { createSalonId, err, ok } from '@beauty-salon-backend/domain'

import { openingHours as openingHoursTable, salons } from '../database/schema'

// DB型からドメイン型へのマッピング
type DbSalon = typeof salons.$inferSelect
type DbNewSalon = typeof salons.$inferInsert
type DbNewOpeningHours = typeof openingHoursTable.$inferInsert

export class DrizzleSalonRepository implements SalonRepository {
  constructor(private db: PostgresJsDatabase) {}

  // DBモデルからドメインモデルへの変換
  private async mapDbToDomain(dbSalon: DbSalon): Promise<Salon | null> {
    const id = createSalonId(dbSalon.id)
    if (!id) return null

    // 営業時間を取得
    const dbOpeningHours = await this.db
      .select()
      .from(openingHoursTable)
      .where(eq(openingHoursTable.salonId, dbSalon.id))

    const openingHours = dbOpeningHours.map((hours) => ({
      dayOfWeek: hours.dayOfWeek,
      openTime: hours.openTime,
      closeTime: hours.closeTime,
      isHoliday: hours.isHoliday,
    }))

    // 現在のスキーマにはdeletedAt/suspendedAtがないため、すべてactiveとして扱う
    // TODO: deletedAt, suspendedAtカラムを追加する際に実装

    return {
      type: 'active',
      data: {
        id,
        name: dbSalon.name,
        description: dbSalon.description || '',
        address: dbSalon.address,
        contactInfo: {
          email: dbSalon.email,
          phoneNumber: dbSalon.phoneNumber,
        },
        openingHours,
        imageUrls: dbSalon.imageUrls || undefined,
        features: dbSalon.features || undefined,
        createdAt: dbSalon.createdAt,
        createdBy: dbSalon.createdBy || undefined,
        updatedAt: dbSalon.updatedAt,
        updatedBy: dbSalon.updatedBy || undefined,
      },
    }
  }

  async findById(id: SalonId): Promise<Result<Salon, RepositoryError>> {
    try {
      const result = await this.db
        .select()
        .from(salons)
        .where(eq(salons.id, id))
        .limit(1)

      const firstRow = result[0]
      if (!firstRow) {
        return err({
          type: 'notFound',
          entity: 'Salon',
          id,
        })
      }

      const salon = await this.mapDbToDomain(firstRow)
      if (!salon) {
        return err({
          type: 'databaseError',
          message: 'Failed to map salon data',
        })
      }

      return ok(salon)
    } catch (error) {
      return err({
        type: 'databaseError',
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
          address: data.address,
          email: data.contactInfo.email,
          phoneNumber: data.contactInfo.phoneNumber,
          imageUrls: data.imageUrls || [],
          features: data.features || [],
          createdBy: data.createdBy,
          updatedBy: data.createdBy,
        }

        const insertedSalons = await tx
          .insert(salons)
          .values(newSalon)
          .returning()

        const insertedSalon = insertedSalons[0]
        if (!insertedSalon) {
          throw new Error('Failed to insert salon')
        }

        // 営業時間を作成
        const openingHoursData: DbNewOpeningHours[] = data.openingHours.map(
          (hours) => ({
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
      if (!salon) {
        return err({
          type: 'databaseError',
          message: 'Failed to map created salon',
        })
      }

      return ok(salon)
    } catch (error) {
      return err({
        type: 'databaseError',
        message:
          error instanceof Error ? error.message : 'Unknown database error',
      })
    }
  }

  async update(
    data: UpdateSalonRequest
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
        if (!existingRow) {
          throw new Error('Salon not found')
        }

        // 更新データを準備
        const updateData: Partial<DbSalon> = {
          updatedAt: new Date(),
          updatedBy: data.updatedBy,
        }

        if (data.name !== undefined) updateData.name = data.name
        if (data.description !== undefined)
          updateData.description = data.description
        if (data.address !== undefined) updateData.address = data.address
        if (data.contactInfo !== undefined) {
          updateData.email = data.contactInfo.email
          updateData.phoneNumber = data.contactInfo.phoneNumber
        }
        if (data.imageUrls !== undefined) updateData.imageUrls = data.imageUrls
        if (data.features !== undefined) updateData.features = data.features

        // Salonを更新
        const updatedSalons = await tx
          .update(salons)
          .set(updateData)
          .where(eq(salons.id, data.id))
          .returning()

        const updatedSalon = updatedSalons[0]
        if (!updatedSalon) {
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
            (hours) => ({
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
      if (!salon) {
        return err({
          type: 'databaseError',
          message: 'Failed to map updated salon',
        })
      }

      return ok(salon)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      if (message.includes('not found')) {
        return err({
          type: 'notFound',
          entity: 'Salon',
          id: data.id,
        })
      }
      return err({
        type: 'databaseError',
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
          type: 'notFound',
          entity: 'Salon',
          id,
        })
      }

      return ok(undefined)
    } catch (error) {
      return err({
        type: 'databaseError',
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
            like(salons.name, `%${criteria.keyword}%`),
            like(salons.description, `%${criteria.keyword}%`)
          ) ?? sql`1=1`
        )
      }

      // 都市で絞り込み
      if (criteria.city) {
        conditions.push(sql`${salons.address}->>'city' = ${criteria.city}`)
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
        type: 'databaseError',
        message:
          error instanceof Error ? error.message : 'Unknown database error',
      })
    }
  }

  async findAllActive(
    pagination: PaginationParams
  ): Promise<Result<PaginatedResult<Salon>, RepositoryError>> {
    return this.search({ isActive: true }, pagination)
  }

  async suspend(
    _id: SalonId,
    _reason: string,
    _suspendedBy: string
  ): Promise<Result<Salon, RepositoryError>> {
    // 現在のスキーマではsuspendedAtカラムがないため、未実装
    // TODO: suspendedAtカラムを追加時に実装
    return err({
      type: 'databaseError',
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
      type: 'databaseError',
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
        type: 'databaseError',
        message:
          error instanceof Error ? error.message : 'Unknown database error',
      })
    }
  }
}
