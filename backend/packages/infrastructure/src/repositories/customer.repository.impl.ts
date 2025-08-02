/**
 * Customer Repository Implementation
 * Drizzle ORMを使用したリポジトリの実装
 */

import { and, desc, eq, inArray, or, sql } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { getEncryptionService } from '../services/encryption.service.js'
import { safeJsonbContains, safeLike } from './security-patches'

import type {
  Customer,
  CustomerRepository,
  CustomerSearchCriteria,
  PaginatedResult,
  PaginationParams,
} from '@beauty-salon-backend/domain'
import {
  type CustomerId,
  type RepositoryError,
  type Result,
  createCustomerId,
  err,
  ok,
} from '@beauty-salon-backend/domain'

import { customers } from '../database/schema'

// DB型からドメイン型へのマッピング
type DbCustomer = typeof customers.$inferSelect
type DbNewCustomer = typeof customers.$inferInsert

export class DrizzleCustomerRepository implements CustomerRepository {
  private encryptionService?: ReturnType<typeof getEncryptionService>
  private encryptedFields: (keyof DbCustomer)[] = ['phone_number']

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
  private async mapDbToDomain(
    dbCustomer: DbCustomer
  ): Promise<Customer | null> {
    const id = createCustomerId(dbCustomer.id)
    if (id == null) return null

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

    // 削除済みフラグやステータスがDBに存在しない場合は、すべてactiveとして扱う
    // 実際のプロジェクトでは、DBスキーマに status, deletedAt, suspendedAt などのカラムを追加
    return {
      type: 'active' as const,
      data: {
        id,
        name: decryptedCustomer.name,
        contactInfo: {
          email: decryptedCustomer.email,
          phoneNumber: decryptedCustomer.phone_number,
          alternativePhone: decryptedCustomer.alternative_phone ?? undefined,
        },
        preferences: decryptedCustomer.preferences,
        notes: decryptedCustomer.notes,
        tags: Array.isArray(decryptedCustomer.tags)
          ? decryptedCustomer.tags
          : [],
        birthDate: decryptedCustomer.birth_date
          ? new Date(decryptedCustomer.birth_date)
          : null,
        loyaltyPoints: decryptedCustomer.loyalty_points ?? 0,
        membershipLevel: (decryptedCustomer.membership_level ??
          'regular') as Customer['data']['membershipLevel'],
        createdAt: new Date(decryptedCustomer.created_at),
        updatedAt: new Date(decryptedCustomer.updated_at),
      },
    }
  }

  // ドメインモデルからDBモデルへの変換
  private async mapDomainToDb(customer: Customer): Promise<DbNewCustomer> {
    const data = customer.data
    const dbCustomer: DbNewCustomer = {
      id: data.id,
      name: data.name,
      email: data.contactInfo.email,
      phone_number: data.contactInfo.phoneNumber,
      alternative_phone: data.contactInfo.alternativePhone ?? null,
      preferences: data.preferences,
      notes: data.notes,
      tags: data.tags.length > 0 ? data.tags : null,
      loyalty_points: data.loyaltyPoints,
      membership_level: data.membershipLevel,
      birth_date: data.birthDate
        ? data.birthDate.toISOString().split('T')[0]
        : null,
      updated_at: data.updatedAt.toISOString(),
    }

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
      if (customer == null) {
        return err({
          type: 'databaseError' as const,
          message: 'Failed to map customer from database',
        })
      }

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
      if (customer == null) {
        return err({
          type: 'databaseError' as const,
          message: 'Failed to map customer from database',
        })
      }

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
            name: dbCustomer.name,
            email: dbCustomer.email,
            phone_number: dbCustomer.phone_number,
            alternative_phone: dbCustomer.alternative_phone,
            preferences: dbCustomer.preferences,
            notes: dbCustomer.notes,
            tags: dbCustomer.tags,
            loyalty_points: dbCustomer.loyalty_points,
            membership_level: dbCustomer.membership_level,
            birth_date: dbCustomer.birth_date,
            updated_at: new Date().toISOString(),
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
      if (savedCustomer == null) {
        return err({
          type: 'databaseError' as const,
          message: 'Failed to map saved customer',
        })
      }

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
          message: `Customer with email ${customer.data.contactInfo.email} already exists`,
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
            safeLike(customers.name, criteria.search),
            safeLike(customers.email, criteria.search),
            safeLike(customers.phone_number, criteria.search)
          )
        )
      }

      if (criteria.tags && criteria.tags.length > 0) {
        // タグの検索（JSONBカラムのため特殊な処理）
        conditions.push(safeJsonbContains(customers.tags, criteria.tags))
      }

      if (criteria.membershipLevel) {
        conditions.push(
          eq(customers.membership_level, criteria.membershipLevel)
        )
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
        .orderBy(desc(customers.created_at))
        .limit(pagination.limit)
        .offset(pagination.offset)

      const mappedCustomers = await Promise.all(
        results.map((r) => this.mapDbToDomain(r))
      )
      const filteredCustomers = mappedCustomers.filter(
        (c): c is Customer => c !== null
      )

      return ok({
        data: filteredCustomers,
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
      const filteredCustomers = mappedCustomers.filter(
        (c): c is Customer => c !== null
      )

      return ok(filteredCustomers)
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
      if (result.type === 'err') return result
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
          level: customers.membership_level,
          count: sql<number>`count(*)::int`,
        })
        .from(customers)
        .groupBy(customers.membership_level)

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
