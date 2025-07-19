/**
 * Service Repository Implementation
 * Drizzle ORMを使用したリポジトリの実装
 */

import { and, between, desc, eq, gte, lte, or, sql } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { safeLike } from './security-patches.js'

import type {
  CategoryId,
  CreateServiceRequest,
  PaginatedResult,
  PaginationParams,
  RepositoryError,
  Result,
  SalonId,
  Service,
  ServiceCategory,
  ServiceCategoryData,
  ServiceId,
  ServiceRepository,
  ServiceSearchCriteria,
  UpdateServiceRequest,
} from '@beauty-salon-backend/domain'
import {
  createCategoryId,
  createServiceId,
  err,
  ok,
} from '@beauty-salon-backend/domain'

import { serviceCategories, services } from '../database/schema'

// DB型からドメイン型へのマッピング
type DbService = typeof services.$inferSelect
type DbNewService = typeof services.$inferInsert
type DbServiceCategory = typeof serviceCategories.$inferSelect

export class DrizzleServiceRepository implements ServiceRepository {
  constructor(private db: PostgresJsDatabase) {}

  // DBモデルからドメインモデルへの変換
  private mapDbToDomain(dbService: DbService): Service | null {
    const id = createServiceId(dbService.id)
    if (!id) return null

    const categoryId =
      dbService.categoryId && dbService.categoryId !== null
        ? createCategoryId(dbService.categoryId)
        : undefined

    const serviceData = {
      id,
      salonId: dbService.salonId as SalonId,
      name: dbService.name,
      description: dbService.description,
      duration: dbService.duration,
      price: dbService.price,
      category: dbService.category,
      categoryId: categoryId ?? undefined,
      imageUrl: dbService.imageUrl ?? undefined,
      requiredStaffLevel: dbService.requiredStaffLevel ?? undefined,
      createdAt: dbService.createdAt,
      createdBy: dbService.createdBy ?? undefined,
      updatedAt: dbService.updatedAt,
      updatedBy: dbService.updatedBy ?? undefined,
    }

    // isActiveフラグでステータスを判定
    if (!dbService.isActive) {
      return {
        type: 'inactive',
        data: serviceData,
        inactivatedAt: dbService.updatedAt,
        inactivatedReason: 'Deactivated',
      }
    }

    return {
      type: 'active',
      data: serviceData,
    }
  }

  // DBカテゴリモデルからドメインモデルへの変換
  private mapDbCategoryToDomain(
    dbCategory: DbServiceCategory
  ): ServiceCategoryData | null {
    const id = createCategoryId(dbCategory.id)
    if (!id) return null

    const parentId =
      dbCategory.parentId && dbCategory.parentId !== null
        ? createCategoryId(dbCategory.parentId)
        : undefined

    return {
      id,
      name: dbCategory.name,
      description: dbCategory.description,
      parentId: parentId ?? undefined,
      displayOrder: dbCategory.displayOrder,
      isActive: dbCategory.isActive,
      createdAt: dbCategory.createdAt,
      createdBy: dbCategory.createdBy ?? undefined,
      updatedAt: dbCategory.updatedAt,
      updatedBy: dbCategory.updatedBy ?? undefined,
    }
  }

  async findById(id: ServiceId): Promise<Result<Service, RepositoryError>> {
    try {
      const result = await this.db
        .select()
        .from(services)
        .where(eq(services.id, id))
        .limit(1)

      const firstRow = result[0]
      if (!firstRow) {
        return err({
          type: 'notFound',
          entity: 'Service',
          id,
        })
      }

      const service = this.mapDbToDomain(firstRow)
      if (!service) {
        return err({
          type: 'databaseError',
          message: 'Failed to map service data',
        })
      }

      return ok(service)
    } catch (error) {
      return err({
        type: 'databaseError',
        message:
          error instanceof Error ? error.message : 'Unknown database error',
      })
    }
  }

  async create(
    data: CreateServiceRequest
  ): Promise<Result<Service, RepositoryError>> {
    try {
      const newService: DbNewService = {
        salonId: data.salonId,
        name: data.name,
        description: data.description,
        duration: data.duration,
        price: data.price,
        category: data.category,
        categoryId: data.categoryId,
        imageUrl: data.imageUrl,
        requiredStaffLevel: data.requiredStaffLevel,
        isActive: true,
        createdBy: data.createdBy,
        updatedBy: data.createdBy,
      }

      const insertedServices = await this.db
        .insert(services)
        .values(newService)
        .returning()

      const insertedService = insertedServices[0]
      if (!insertedService) {
        return err({
          type: 'databaseError',
          message: 'Failed to insert service',
        })
      }

      const service = this.mapDbToDomain(insertedService)
      if (!service) {
        return err({
          type: 'databaseError',
          message: 'Failed to map created service',
        })
      }

      return ok(service)
    } catch (error) {
      return err({
        type: 'databaseError',
        message:
          error instanceof Error ? error.message : 'Unknown database error',
      })
    }
  }

  async update(
    data: UpdateServiceRequest
  ): Promise<Result<Service, RepositoryError>> {
    try {
      // 既存のserviceを確認
      const existing = await this.db
        .select()
        .from(services)
        .where(eq(services.id, data.id))
        .limit(1)

      const existingRow = existing[0]
      if (!existingRow) {
        return err({
          type: 'notFound',
          entity: 'Service',
          id: data.id,
        })
      }

      // 更新データを準備
      const updateData: Partial<DbService> = {
        updatedAt: new Date(),
        updatedBy: data.updatedBy,
      }

      if (data.name !== undefined) updateData.name = data.name
      if (data.description !== undefined)
        updateData.description = data.description
      if (data.duration !== undefined) updateData.duration = data.duration
      if (data.price !== undefined) updateData.price = data.price
      if (data.category !== undefined) updateData.category = data.category
      if (data.categoryId !== undefined) updateData.categoryId = data.categoryId
      if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl
      if (data.requiredStaffLevel !== undefined)
        updateData.requiredStaffLevel = data.requiredStaffLevel

      const updatedServices = await this.db
        .update(services)
        .set(updateData)
        .where(eq(services.id, data.id))
        .returning()

      const updatedService = updatedServices[0]
      if (!updatedService) {
        return err({
          type: 'databaseError',
          message: 'Failed to update service',
        })
      }

      const service = this.mapDbToDomain(updatedService)
      if (!service) {
        return err({
          type: 'databaseError',
          message: 'Failed to map updated service',
        })
      }

      return ok(service)
    } catch (error) {
      return err({
        type: 'databaseError',
        message:
          error instanceof Error ? error.message : 'Unknown database error',
      })
    }
  }

  async deactivate(
    id: ServiceId,
    _reason: string,
    deactivatedBy: string
  ): Promise<Result<Service, RepositoryError>> {
    try {
      const result = await this.db
        .update(services)
        .set({
          isActive: false,
          updatedAt: new Date(),
          updatedBy: deactivatedBy,
        })
        .where(and(eq(services.id, id), eq(services.isActive, true)))
        .returning()

      const updatedRow = result[0]
      if (!updatedRow) {
        return err({
          type: 'notFound',
          entity: 'Service',
          id,
        })
      }

      const service = this.mapDbToDomain(updatedRow)
      if (!service) {
        return err({
          type: 'databaseError',
          message: 'Failed to map deactivated service',
        })
      }

      return ok(service)
    } catch (error) {
      return err({
        type: 'databaseError',
        message:
          error instanceof Error ? error.message : 'Unknown database error',
      })
    }
  }

  async reactivate(
    id: ServiceId,
    reactivatedBy: string
  ): Promise<Result<Service, RepositoryError>> {
    try {
      const result = await this.db
        .update(services)
        .set({
          isActive: true,
          updatedAt: new Date(),
          updatedBy: reactivatedBy,
        })
        .where(and(eq(services.id, id), eq(services.isActive, false)))
        .returning()

      const updatedRow = result[0]
      if (!updatedRow) {
        return err({
          type: 'notFound',
          entity: 'Service',
          id,
        })
      }

      const service = this.mapDbToDomain(updatedRow)
      if (!service) {
        return err({
          type: 'databaseError',
          message: 'Failed to map reactivated service',
        })
      }

      return ok(service)
    } catch (error) {
      return err({
        type: 'databaseError',
        message:
          error instanceof Error ? error.message : 'Unknown database error',
      })
    }
  }

  async discontinue(
    id: ServiceId,
    _reason: string,
    _discontinuedBy: string
  ): Promise<Result<void, RepositoryError>> {
    try {
      // 現在のスキーマでは物理削除になる
      // TODO: discontinuedAt, discontinuedByカラムを追加して論理削除にする
      const result = await this.db.delete(services).where(eq(services.id, id))

      if (result.count === 0) {
        return err({
          type: 'notFound',
          entity: 'Service',
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
    criteria: ServiceSearchCriteria,
    pagination: PaginationParams
  ): Promise<Result<PaginatedResult<Service>, RepositoryError>> {
    try {
      const conditions = []

      // サロンIDで絞り込み
      if (criteria.salonId) {
        conditions.push(eq(services.salonId, criteria.salonId))
      }

      // アクティブなserviceのみ
      if (criteria.isActive !== false) {
        conditions.push(eq(services.isActive, true))
      }

      // キーワード検索
      if (criteria.keyword) {
        conditions.push(
          or(
            safeLike(services.name, criteria.keyword),
            safeLike(services.description, criteria.keyword)
          ) ?? sql`1=1`
        )
      }

      // カテゴリで絞り込み
      if (criteria.category) {
        conditions.push(eq(services.category, criteria.category))
      }

      // カテゴリIDで絞り込み
      if (criteria.categoryId) {
        conditions.push(eq(services.categoryId, criteria.categoryId))
      }

      // 価格範囲で絞り込み
      if (criteria.minPrice !== undefined && criteria.maxPrice !== undefined) {
        conditions.push(
          between(services.price, criteria.minPrice, criteria.maxPrice)
        )
      } else if (criteria.minPrice !== undefined) {
        conditions.push(gte(services.price, criteria.minPrice))
      } else if (criteria.maxPrice !== undefined) {
        conditions.push(lte(services.price, criteria.maxPrice))
      }

      // 所要時間範囲で絞り込み
      if (
        criteria.minDuration !== undefined &&
        criteria.maxDuration !== undefined
      ) {
        conditions.push(
          between(services.duration, criteria.minDuration, criteria.maxDuration)
        )
      } else if (criteria.minDuration !== undefined) {
        conditions.push(gte(services.duration, criteria.minDuration))
      } else if (criteria.maxDuration !== undefined) {
        conditions.push(lte(services.duration, criteria.maxDuration))
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined

      // 総件数を取得
      const countResult = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(services)
        .where(whereClause)

      const totalCount = Number(countResult[0]?.count ?? 0)

      // ページネーションで取得
      const results = await this.db
        .select()
        .from(services)
        .where(whereClause)
        .orderBy(desc(services.createdAt))
        .limit(pagination.limit)
        .offset(pagination.offset)

      const items: Service[] = []
      for (const result of results) {
        const service = this.mapDbToDomain(result)
        if (service) {
          items.push(service)
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

  async findAllActiveBySalon(
    salonId: SalonId,
    pagination: PaginationParams
  ): Promise<Result<PaginatedResult<Service>, RepositoryError>> {
    return this.search({ salonId, isActive: true }, pagination)
  }

  async findByCategory(
    salonId: SalonId,
    category: ServiceCategory,
    pagination: PaginationParams
  ): Promise<Result<PaginatedResult<Service>, RepositoryError>> {
    return this.search({ salonId, category, isActive: true }, pagination)
  }

  async findByPriceRange(
    salonId: SalonId,
    minPrice: number,
    maxPrice: number,
    pagination: PaginationParams
  ): Promise<Result<PaginatedResult<Service>, RepositoryError>> {
    return this.search(
      { salonId, minPrice, maxPrice, isActive: true },
      pagination
    )
  }

  async findPopularServices(
    salonId: SalonId,
    limit: number
  ): Promise<Result<Service[], RepositoryError>> {
    try {
      // TODO: 予約数を元に人気サービスを取得する実装
      // 現在は最新のサービスを返す仮実装
      const results = await this.db
        .select()
        .from(services)
        .where(and(eq(services.salonId, salonId), eq(services.isActive, true)))
        .orderBy(desc(services.createdAt))
        .limit(limit)

      const items: Service[] = []
      for (const result of results) {
        const service = this.mapDbToDomain(result)
        if (service) {
          items.push(service)
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

  async findCategoryById(
    id: CategoryId
  ): Promise<Result<ServiceCategoryData, RepositoryError>> {
    try {
      const result = await this.db
        .select()
        .from(serviceCategories)
        .where(eq(serviceCategories.id, id))
        .limit(1)

      const firstRow = result[0]
      if (!firstRow) {
        return err({
          type: 'notFound',
          entity: 'ServiceCategory',
          id,
        })
      }

      const category = this.mapDbCategoryToDomain(firstRow)
      if (!category) {
        return err({
          type: 'databaseError',
          message: 'Failed to map category data',
        })
      }

      return ok(category)
    } catch (error) {
      return err({
        type: 'databaseError',
        message:
          error instanceof Error ? error.message : 'Unknown database error',
      })
    }
  }

  async findAllActiveCategories(): Promise<
    Result<ServiceCategoryData[], RepositoryError>
  > {
    try {
      const results = await this.db
        .select()
        .from(serviceCategories)
        .where(eq(serviceCategories.isActive, true))
        .orderBy(serviceCategories.displayOrder)

      const categories: ServiceCategoryData[] = []
      for (const result of results) {
        const category = this.mapDbCategoryToDomain(result)
        if (category) {
          categories.push(category)
        }
      }

      return ok(categories)
    } catch (error) {
      return err({
        type: 'databaseError',
        message:
          error instanceof Error ? error.message : 'Unknown database error',
      })
    }
  }
}
