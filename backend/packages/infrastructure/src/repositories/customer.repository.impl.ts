/**
 * Customer Repository Implementation
 * Drizzle ORMを使用したリポジトリの実装
 */

import { and, desc, eq, inArray, like, or, sql } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import type {
  Customer,
  CustomerRepository,
  CustomerSearchCriteria,
  PaginatedResult,
  PaginationParams,
} from '@backend/domain'
import {
  type CustomerId,
  type RepositoryError,
  type Result,
  createCustomerId,
  err,
  ok,
} from '@backend/domain'

import { customers } from '../database/schema'

// DB型からドメイン型へのマッピング
type DbCustomer = typeof customers.$inferSelect
type DbNewCustomer = typeof customers.$inferInsert

export class DrizzleCustomerRepository implements CustomerRepository {
  constructor(private db: PostgresJsDatabase) {}

  // DBモデルからドメインモデルへの変換
  private mapDbToDomain(dbCustomer: DbCustomer): Customer | null {
    const id = createCustomerId(dbCustomer.id)
    if (!id) return null

    // 削除済みフラグやステータスがDBに存在しない場合は、すべてactiveとして扱う
    // 実際のプロジェクトでは、DBスキーマに status, deletedAt, suspendedAt などのカラムを追加
    return {
      type: 'active',
      data: {
        id,
        name: dbCustomer.name,
        contactInfo: {
          email: dbCustomer.email,
          phoneNumber: dbCustomer.phoneNumber,
        },
        preferences: dbCustomer.preferences,
        notes: dbCustomer.notes,
        tags: dbCustomer.tags || [],
        birthDate: dbCustomer.birthDate ? new Date(dbCustomer.birthDate) : null,
        loyaltyPoints: dbCustomer.loyaltyPoints || 0,
        membershipLevel: (dbCustomer.membershipLevel ||
          'regular') as Customer['data']['membershipLevel'],
        createdAt: dbCustomer.createdAt,
        updatedAt: dbCustomer.updatedAt,
      },
    }
  }

  // ドメインモデルからDBモデルへの変換
  private mapDomainToDb(customer: Customer): DbNewCustomer {
    const data = customer.data
    return {
      id: data.id,
      name: data.name,
      email: data.contactInfo.email,
      phoneNumber: data.contactInfo.phoneNumber,
      alternativePhone: null,
      preferences: data.preferences,
      notes: data.notes,
      tags: data.tags.length > 0 ? data.tags : null,
      loyaltyPoints: data.loyaltyPoints,
      membershipLevel: data.membershipLevel,
      birthDate: data.birthDate?.toISOString().split('T')[0] || null,
      updatedAt: data.updatedAt,
    }
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
          type: 'notFound',
          entity: 'Customer',
          id,
        })
      }

      const firstRow = result[0]
      if (!firstRow) {
        return err({
          type: 'notFound',
          entity: 'Customer',
          id,
        })
      }
      const customer = this.mapDbToDomain(firstRow)
      if (!customer) {
        return err({
          type: 'databaseError',
          message: 'Failed to map customer from database',
        })
      }

      return ok(customer)
    } catch (error) {
      return err({
        type: 'databaseError',
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
      if (!firstRow) {
        return ok(null)
      }
      const customer = this.mapDbToDomain(firstRow)
      if (!customer) {
        return err({
          type: 'databaseError',
          message: 'Failed to map customer from database',
        })
      }

      return ok(customer)
    } catch (error) {
      return err({
        type: 'databaseError',
        message: 'Failed to find customer by email',
        originalError: error,
      })
    }
  }

  async save(customer: Customer): Promise<Result<Customer, RepositoryError>> {
    try {
      const dbCustomer = this.mapDomainToDb(customer)

      // Upsert operation
      const result = await this.db
        .insert(customers)
        .values(dbCustomer)
        .onConflictDoUpdate({
          target: customers.id,
          set: {
            name: dbCustomer.name,
            email: dbCustomer.email,
            phoneNumber: dbCustomer.phoneNumber,
            alternativePhone: dbCustomer.alternativePhone,
            preferences: dbCustomer.preferences,
            notes: dbCustomer.notes,
            tags: dbCustomer.tags,
            loyaltyPoints: dbCustomer.loyaltyPoints,
            membershipLevel: dbCustomer.membershipLevel,
            birthDate: dbCustomer.birthDate,
            updatedAt: new Date(),
          },
        })
        .returning()

      const firstRow = result[0]
      if (!firstRow) {
        return err({
          type: 'databaseError',
          message: 'Failed to return saved customer',
        })
      }
      const savedCustomer = this.mapDbToDomain(firstRow)
      if (!savedCustomer) {
        return err({
          type: 'databaseError',
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
          type: 'constraintViolation',
          constraint: 'unique_email',
          message: `Customer with email ${customer.data.contactInfo.email} already exists`,
        })
      }

      return err({
        type: 'databaseError',
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
          type: 'notFound',
          entity: 'Customer',
          id,
        })
      }

      return ok(undefined)
    } catch (error) {
      return err({
        type: 'databaseError',
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
            like(customers.name, `%${criteria.search}%`),
            like(customers.email, `%${criteria.search}%`),
            like(customers.phoneNumber, `%${criteria.search}%`)
          )
        )
      }

      if (criteria.tags && criteria.tags.length > 0) {
        // タグの検索（JSONBカラムのため特殊な処理）
        conditions.push(
          sql`${customers.tags} @> ${JSON.stringify(criteria.tags)}::jsonb`
        )
      }

      if (criteria.membershipLevel) {
        conditions.push(eq(customers.membershipLevel, criteria.membershipLevel))
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

      const total = countResult[0]?.count || 0

      // データ取得クエリ
      const results = await this.db
        .select()
        .from(customers)
        .where(whereClause)
        .orderBy(desc(customers.createdAt))
        .limit(pagination.limit)
        .offset(pagination.offset)

      const mappedCustomers = results
        .map((r) => this.mapDbToDomain(r))
        .filter((c): c is Customer => c !== null)

      return ok({
        data: mappedCustomers,
        total,
        limit: pagination.limit,
        offset: pagination.offset,
      })
    } catch (error) {
      return err({
        type: 'databaseError',
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

      const mappedCustomers = results
        .map((r) => this.mapDbToDomain(r))
        .filter((c): c is Customer => c !== null)

      return ok(mappedCustomers)
    } catch (error) {
      return err({
        type: 'databaseError',
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
      const result = await this.search(criteria || {}, { limit: 0, offset: 0 })
      if (result.type === 'err') return result
      return ok(result.value.total)
    } catch (error) {
      return err({
        type: 'databaseError',
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
          level: customers.membershipLevel,
          count: sql<number>`count(*)::int`,
        })
        .from(customers)
        .groupBy(customers.membershipLevel)

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
          counts.regular = (counts.regular || 0) + row.count
        }
      }

      return ok(counts)
    } catch (error) {
      return err({
        type: 'databaseError',
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
        type: 'databaseError',
        message: 'Transaction failed',
      })
    }
  }
}
