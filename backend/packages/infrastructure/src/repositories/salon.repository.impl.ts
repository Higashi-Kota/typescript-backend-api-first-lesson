import { openingHours, salons } from '@beauty-salon-backend/database'
import type {
  DbNewOpeningHours,
  DbOpeningHours,
  DbSalon,
  ISalonRepository,
  SalonId,
  SalonSearchParams,
} from '@beauty-salon-backend/domain'
import {
  type DomainError,
  DomainErrors,
  type PaginatedResult,
  Pagination,
  type PaginationParams,
} from '@beauty-salon-backend/domain'
import { Result } from '@beauty-salon-backend/utility'
import { and, asc, desc, eq, isNull, like, or, sql } from 'drizzle-orm'
import type { Database } from '../database/index'

export class SalonRepository implements ISalonRepository {
  constructor(private readonly db: Database) {}

  async create(
    salon: DbSalon,
    openingHoursData?: DbNewOpeningHours[],
  ): Promise<Result<DbSalon, DomainError>> {
    try {
      const result = await this.db.transaction(async (tx) => {
        const inserted = await tx.insert(salons).values(salon).returning()

        const insertedSalon = inserted[0]
        if (!insertedSalon) {
          throw new Error('Failed to insert salon')
        }

        if (openingHoursData && openingHoursData.length > 0) {
          const openingHoursWithSalonId = openingHoursData.map((oh) => ({
            ...oh,
            salonId: insertedSalon.id,
          }))
          await tx.insert(openingHours).values(openingHoursWithSalonId)
        }

        return insertedSalon
      })

      return Result.success(result)
    } catch (error) {
      return Result.error(
        DomainErrors.database(
          'Failed to create salon',
          JSON.stringify(error, null, 2),
        ),
      )
    }
  }

  async findById(id: SalonId): Promise<Result<DbSalon | null, DomainError>> {
    try {
      const [salon] = await this.db
        .select()
        .from(salons)
        .where(and(eq(salons.id, id), isNull(salons.deletedAt)))
        .limit(1)

      return Result.success(salon ?? null)
    } catch (error) {
      return Result.error(
        DomainErrors.database(
          'Failed to find salon by ID',
          JSON.stringify(error, null, 2),
        ),
      )
    }
  }

  async findByEmail(
    email: string,
  ): Promise<Result<DbSalon | null, DomainError>> {
    try {
      const [salon] = await this.db
        .select()
        .from(salons)
        .where(and(eq(salons.email, email), isNull(salons.deletedAt)))
        .limit(1)

      return Result.success(salon ?? null)
    } catch (error) {
      return Result.error(
        DomainErrors.database(
          'Failed to find salon by email',
          JSON.stringify(error, null, 2),
        ),
      )
    }
  }

  async findAll(
    params: PaginationParams,
  ): Promise<Result<PaginatedResult<DbSalon>, DomainError>> {
    try {
      const offset = Pagination.getOffset(params)

      const [salonsList, countResult] = await Promise.all([
        this.db
          .select()
          .from(salons)
          .where(isNull(salons.deletedAt))
          .orderBy(desc(salons.createdAt))
          .limit(params.limit)
          .offset(offset),
        this.db
          .select({ count: sql<number>`count(*)::int` })
          .from(salons)
          .where(isNull(salons.deletedAt)),
      ])

      const totalItems = countResult[0]?.count ?? 0
      const result = Pagination.createResult(
        salonsList as DbSalon[],
        totalItems,
        params,
      )

      return Result.success(result)
    } catch (error) {
      return Result.error(
        DomainErrors.database(
          'Failed to list salons',
          JSON.stringify(error, null, 2),
        ),
      )
    }
  }

  async update(
    id: SalonId,
    salon: Partial<DbSalon>,
  ): Promise<Result<DbSalon, DomainError>> {
    try {
      const [updatedSalon] = await this.db
        .update(salons)
        .set(salon)
        .where(and(eq(salons.id, id), isNull(salons.deletedAt)))
        .returning()

      if (!updatedSalon) {
        return Result.error(DomainErrors.notFound('Salon', id))
      }

      return Result.success(updatedSalon)
    } catch (error) {
      return Result.error(
        DomainErrors.database(
          'Failed to update salon',
          JSON.stringify(error, null, 2),
        ),
      )
    }
  }

  async delete(id: SalonId): Promise<Result<boolean, DomainError>> {
    try {
      const [deletedSalon] = await this.db
        .update(salons)
        .set({ deletedAt: new Date().toISOString() })
        .where(and(eq(salons.id, id), isNull(salons.deletedAt)))
        .returning()

      return Result.success(!!deletedSalon)
    } catch (error) {
      return Result.error(
        DomainErrors.database(
          'Failed to delete salon',
          JSON.stringify(error, null, 2),
        ),
      )
    }
  }

  async search(
    params: SalonSearchParams,
    pagination: PaginationParams,
  ): Promise<Result<PaginatedResult<DbSalon>, DomainError>> {
    try {
      const conditions = [isNull(salons.deletedAt)]

      if (params.keyword) {
        const keywordCondition = or(
          like(salons.name, `%${params.keyword}%`),
          like(salons.description, `%${params.keyword}%`),
        )
        if (keywordCondition) {
          conditions.push(keywordCondition)
        }
      }

      if (params.city) {
        conditions.push(eq(salons.city, params.city))
      }

      if (params.prefecture) {
        conditions.push(eq(salons.prefecture, params.prefecture))
      }

      if (params.isActive !== undefined) {
        conditions.push(eq(salons.isActive, params.isActive))
      }

      const whereClause = and(...conditions)
      const offset = Pagination.getOffset(pagination)

      const [salonsList, countResult] = await Promise.all([
        this.db
          .select()
          .from(salons)
          .where(whereClause)
          .orderBy(desc(salons.createdAt))
          .limit(pagination.limit)
          .offset(offset),
        this.db
          .select({ count: sql<number>`count(*)::int` })
          .from(salons)
          .where(whereClause),
      ])

      const totalItems = countResult[0]?.count ?? 0
      const result = Pagination.createResult(
        salonsList as DbSalon[],
        totalItems,
        pagination,
      )

      return Result.success(result)
    } catch (error) {
      return Result.error(
        DomainErrors.database(
          'Failed to search salons',
          JSON.stringify(error, null, 2),
        ),
      )
    }
  }

  async findOpeningHours(
    salonId: SalonId,
  ): Promise<Result<DbOpeningHours[], DomainError>> {
    try {
      const hours = await this.db
        .select()
        .from(openingHours)
        .where(eq(openingHours.salonId, salonId))
        .orderBy(asc(openingHours.dayOfWeek))

      return Result.success(hours)
    } catch (error) {
      return Result.error(
        DomainErrors.database(
          'Failed to find opening hours',
          JSON.stringify(error, null, 2),
        ),
      )
    }
  }

  async createOpeningHours(
    openingHoursData: DbNewOpeningHours[],
  ): Promise<Result<DbOpeningHours[], DomainError>> {
    try {
      if (openingHoursData.length === 0) {
        return Result.success([])
      }

      const inserted = await this.db
        .insert(openingHours)
        .values(openingHoursData)
        .returning()

      return Result.success(inserted)
    } catch (error) {
      return Result.error(
        DomainErrors.database(
          'Failed to create opening hours',
          JSON.stringify(error, null, 2),
        ),
      )
    }
  }

  async updateOpeningHours(
    salonId: SalonId,
    openingHoursData: DbNewOpeningHours[],
  ): Promise<Result<DbOpeningHours[], DomainError>> {
    try {
      const result = await this.db.transaction(async (tx) => {
        await tx.delete(openingHours).where(eq(openingHours.salonId, salonId))

        if (openingHoursData.length === 0) {
          return []
        }

        const openingHoursWithSalonId = openingHoursData.map((oh) => ({
          ...oh,
          salonId,
        }))

        return await tx
          .insert(openingHours)
          .values(openingHoursWithSalonId)
          .returning()
      })

      return Result.success(result)
    } catch (error) {
      return Result.error(
        DomainErrors.database(
          'Failed to update opening hours',
          JSON.stringify(error, null, 2),
        ),
      )
    }
  }

  async deleteOpeningHours(
    salonId: SalonId,
  ): Promise<Result<boolean, DomainError>> {
    try {
      await this.db
        .delete(openingHours)
        .where(eq(openingHours.salonId, salonId))
      return Result.success(true)
    } catch (error) {
      return Result.error(
        DomainErrors.database(
          'Failed to delete opening hours',
          JSON.stringify(error, null, 2),
        ),
      )
    }
  }

  async exists(id: SalonId): Promise<Result<boolean, DomainError>> {
    try {
      const [result] = await this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(salons)
        .where(and(eq(salons.id, id), isNull(salons.deletedAt)))

      return Result.success((result?.count ?? 0) > 0)
    } catch (error) {
      return Result.error(
        DomainErrors.database(
          'Failed to check salon existence',
          JSON.stringify(error, null, 2),
        ),
      )
    }
  }

  async existsByEmail(email: string): Promise<Result<boolean, DomainError>> {
    try {
      const [result] = await this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(salons)
        .where(and(eq(salons.email, email), isNull(salons.deletedAt)))

      return Result.success((result?.count ?? 0) > 0)
    } catch (error) {
      return Result.error(
        DomainErrors.database(
          'Failed to check salon email existence',
          JSON.stringify(error, null, 2),
        ),
      )
    }
  }

  async countActive(): Promise<Result<number, DomainError>> {
    try {
      const [result] = await this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(salons)
        .where(and(isNull(salons.deletedAt), eq(salons.isActive, true)))

      return Result.success(result?.count ?? 0)
    } catch (error) {
      return Result.error(
        DomainErrors.database(
          'Failed to count active salons',
          JSON.stringify(error, null, 2),
        ),
      )
    }
  }
}
