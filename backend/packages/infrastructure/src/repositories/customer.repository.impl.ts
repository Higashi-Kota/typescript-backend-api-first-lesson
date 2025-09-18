/**
 * Customer Repository Implementation
 * Drizzle ORMを使用したリポジトリの実装
 */

import { and, desc, eq, inArray, or, sql } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { getEncryptionService } from '../services/encryption.service'
import { safeJsonbContains, safeLike } from './security-patches'

import type {
  Customer,
  CustomerId,
  CustomerRepository,
  CustomerSearchCriteria,
  PaginatedResult,
  PaginationParams,
  RepositoryError,
  Result,
} from '@beauty-salon-backend/domain'
import {
  err,
  mapCustomerToDbInsert,
  mapDbCustomerToDomain,
  ok,
} from '@beauty-salon-backend/domain'

import { customers } from '@beauty-salon-backend/database'
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm'

type DbCustomer = InferSelectModel<typeof customers>
type DbNewCustomer = InferInsertModel<typeof customers>

export class DrizzleCustomerRepository implements CustomerRepository {
  private encryptionService?: ReturnType<typeof getEncryptionService>
  private encryptedFields: (keyof DbCustomer)[] = ['phoneNumber']

  constructor(private db: PostgresJsDatabase) {
    try {
      this.encryptionService = getEncryptionService()
    } catch {
      // 暗号化サービスが初期化されていない場合は、暗号化なしで動作
      console.warn(
        'Encryption service not initialized. Operating without encryption.'
      )
    }
  }

  // DBモデルからドメインモデルへの変換
  private async mapDbToDomain(dbCustomer: DbCustomer): Promise<Customer> {
    // 暗号化されたフィールドを復号化
    let decryptedCustomer = dbCustomer
    if (this.encryptionService) {
      try {
        decryptedCustomer = await this.encryptionService.decryptFields(
          dbCustomer,
          this.encryptedFields
        )
      } catch (error) {
        console.error('Failed to decrypt customer data:', error)
        // 復号化に失敗した場合は元のデータを使用
      }
    }

    // マッパーを使用して変換
    return mapDbCustomerToDomain(decryptedCustomer)
  }

  // ドメインモデルからDBモデルへの変換
  private async mapDomainToDb(
    customer:
      | Customer
      | Omit<
          Customer,
          'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'
        >
  ): Promise<DbNewCustomer> {
    const dbCustomer = mapCustomerToDbInsert(
      customer as Omit<
        Customer,
        'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'
      >
    ) as DbNewCustomer

    // 暗号化が必要なフィールドを暗号化
    if (this.encryptionService) {
      return await this.encryptionService.encryptFields(
        dbCustomer,
        this.encryptedFields
      )
    }

    return dbCustomer
  }

  async findById(id: CustomerId): Promise<Result<Customer, RepositoryError>> {
    try {
      const result = await this.db
        .select()
        .from(customers)
        .where(eq(customers.id, id))
        .limit(1)

      if (result.length === 0) {
        return err({
          type: 'notFound' as const,
          entity: 'Customer',
          id,
        })
      }

      const firstRow = result[0]
      if (firstRow == null) {
        return err({
          type: 'notFound' as const,
          entity: 'Customer',
          id,
        })
      }
      const customer = await this.mapDbToDomain(firstRow)

      return ok(customer)
    } catch (error) {
      return err({
        type: 'databaseError' as const,
        message: 'Failed to find customer by ID',
        originalError: error,
      })
    }
  }

  async findByEmail(
    email: string
  ): Promise<Result<Customer | null, RepositoryError>> {
    try {
      const result = await this.db
        .select()
        .from(customers)
        .where(eq(customers.email, email))
        .limit(1)

      if (result.length === 0) {
        return ok(null)
      }

      const firstRow = result[0]
      if (firstRow == null) {
        return ok(null)
      }
      const customer = await this.mapDbToDomain(firstRow)

      return ok(customer)
    } catch (error) {
      return err({
        type: 'databaseError' as const,
        message: 'Failed to find customer by email',
        originalError: error,
      })
    }
  }

  async save(customer: Customer): Promise<Result<Customer, RepositoryError>> {
    try {
      const dbCustomer = await this.mapDomainToDb(customer)

      // Upsert operation
      const result = await this.db
        .insert(customers)
        .values(dbCustomer)
        .onConflictDoUpdate({
          target: customers.id,
          set: {
            firstName: dbCustomer.firstName,
            lastName: dbCustomer.lastName,
            email: dbCustomer.email,
            phoneNumber: dbCustomer.phoneNumber,
            alternativePhone: dbCustomer.alternativePhone,
            preferences: dbCustomer.preferences,
            notes: dbCustomer.notes,
            tags: dbCustomer.tags,
            loyaltyPoints: dbCustomer.loyaltyPoints,
            membershipTier: dbCustomer.membershipTier,
            birthDate: dbCustomer.birthDate,
            updatedAt: new Date().toISOString(),
          },
        })
        .returning()

      const firstRow = result[0]
      if (firstRow == null) {
        return err({
          type: 'databaseError' as const,
          message: 'Failed to return saved customer',
        })
      }
      const savedCustomer = await this.mapDbToDomain(firstRow)

      return ok(savedCustomer)
    } catch (error) {
      // Unique constraint violation
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        'constraint' in error &&
        error.code === '23505' &&
        error.constraint === 'customers_email_unique'
      ) {
        return err({
          type: 'constraintViolation' as const,
          constraint: 'unique_email',
          message: `Customer with email ${customer.contact.email} already exists`,
        })
      }

      return err({
        type: 'databaseError' as const,
        message: 'Failed to save customer',
        originalError: error,
      })
    }
  }

  async delete(id: CustomerId): Promise<Result<void, RepositoryError>> {
    try {
      const result = await this.db
        .delete(customers)
        .where(eq(customers.id, id))
        .returning()

      if (result.length === 0) {
        return err({
          type: 'notFound' as const,
          entity: 'Customer',
          id,
        })
      }

      return ok(undefined)
    } catch (error) {
      return err({
        type: 'databaseError' as const,
        message: 'Failed to delete customer',
        originalError: error,
      })
    }
  }

  async search(
    criteria: CustomerSearchCriteria,
    pagination: PaginationParams
  ): Promise<Result<PaginatedResult<Customer>, RepositoryError>> {
    try {
      const conditions = []

      // 検索条件の構築
      if (criteria.search) {
        conditions.push(
          or(
            safeLike(customers.firstName, criteria.search),
            safeLike(customers.lastName, criteria.search),
            safeLike(customers.email, criteria.search),
            safeLike(customers.phoneNumber, criteria.search)
          )
        )
      }

      if (criteria.tags && criteria.tags.length > 0) {
        // タグの検索（JSONBカラムのため特殊な処理）
        conditions.push(safeJsonbContains(customers.tags, criteria.tags))
      }

      if (criteria.membershipLevel) {
        // Validate that membershipLevel is one of the valid enum values
        const validTiers = [
          'regular',
          'silver',
          'gold',
          'platinum',
          'vip',
        ] as const
        if (
          validTiers.includes(
            criteria.membershipLevel as (typeof validTiers)[number]
          )
        ) {
          conditions.push(
            eq(
              customers.membershipTier,
              criteria.membershipLevel as (typeof validTiers)[number]
            )
          )
        }
      }

      // activeな顧客のみを取得（現在のDBスキーマでは全てactive扱い）
      if (criteria.isActive !== false) {
        // 将来的にstatusカラムを追加した場合の処理
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined

      // カウントクエリ
      const countResult = await this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(customers)
        .where(whereClause)

      const total = countResult[0]?.count ?? 0

      // データ取得クエリ
      const results = await this.db
        .select()
        .from(customers)
        .where(whereClause)
        .orderBy(desc(customers.createdAt))
        .limit(pagination.limit)
        .offset(pagination.offset)

      const mappedCustomers = await Promise.all(
        results.map((r) => this.mapDbToDomain(r))
      )

      return ok({
        data: mappedCustomers,
        total,
        limit: pagination.limit,
        offset: pagination.offset,
      })
    } catch (error) {
      return err({
        type: 'databaseError' as const,
        message: 'Failed to search customers',
        originalError: error,
      })
    }
  }

  async findAll(
    pagination: PaginationParams
  ): Promise<Result<PaginatedResult<Customer>, RepositoryError>> {
    return this.search({}, pagination)
  }

  async findByIds(
    ids: CustomerId[]
  ): Promise<Result<Customer[], RepositoryError>> {
    try {
      if (ids.length === 0) {
        return ok([])
      }

      const results = await this.db
        .select()
        .from(customers)
        .where(inArray(customers.id, ids))

      const mappedCustomers = await Promise.all(
        results.map((r) => this.mapDbToDomain(r))
      )

      return ok(mappedCustomers)
    } catch (error) {
      return err({
        type: 'databaseError' as const,
        message: 'Failed to find customers by IDs',
        originalError: error,
      })
    }
  }

  async findByTags(
    tags: string[],
    pagination: PaginationParams
  ): Promise<Result<PaginatedResult<Customer>, RepositoryError>> {
    return this.search({ tags }, pagination)
  }

  async count(
    criteria?: CustomerSearchCriteria
  ): Promise<Result<number, RepositoryError>> {
    try {
      const result = await this.search(criteria ?? {}, { limit: 0, offset: 0 })
      if (result.type === 'err') {
        return result
      }
      return ok(result.value.total)
    } catch (error) {
      return err({
        type: 'databaseError' as const,
        message: 'Failed to count customers',
        originalError: error,
      })
    }
  }

  async countByMembershipLevel(): Promise<
    Result<Record<string, number>, RepositoryError>
  > {
    try {
      const results = await this.db
        .select({
          level: customers.membershipTier,
          count: sql<number>`count(*)::int`,
        })
        .from(customers)
        .groupBy(customers.membershipTier)

      const counts: Record<string, number> = {
        regular: 0,
        silver: 0,
        gold: 0,
        platinum: 0,
      }

      for (const row of results) {
        if (row.level) {
          counts[row.level] = row.count
        } else {
          counts.regular = (counts.regular ?? 0) + row.count
        }
      }

      return ok(counts)
    } catch (error) {
      return err({
        type: 'databaseError' as const,
        message: 'Failed to count customers by membership level',
        originalError: error,
      })
    }
  }

  async withTransaction<T>(
    fn: (repo: CustomerRepository) => Promise<Result<T, RepositoryError>>
  ): Promise<Result<T, RepositoryError>> {
    try {
      return await this.db.transaction(async (tx) => {
        const txRepo = new DrizzleCustomerRepository(tx)
        return await fn(txRepo)
      })
    } catch (_error) {
      return err({
        type: 'databaseError' as const,
        message: 'Transaction failed',
      })
    }
  }
}
