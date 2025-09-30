# DB駆動ドメインモデルアーキテクチャ

## 概要

本アーキテクチャでは、データベーステーブルの型定義からドメインモデルを推論し、それを正とする方針を採用します。これにより、DBスキーマが単一の真実の源（Single Source of Truth）となり、型の一貫性が保証されます。

## アーキテクチャの原則

### 設計方針：後方互換性を考慮しない

**重要：本アーキテクチャは後方互換性を一切考慮しません。** 常に現在の最適な設計を追求し、破壊的変更を恐れません。この方針により：

- **技術的負債の蓄積を防止**: 古いAPIやスキーマを維持するコストを排除
- **設計の簡潔性を維持**: 互換性レイヤーやアダプターパターンが不要
- **型の一貫性を保証**: 新旧の型定義の混在を防ぐ
- **迅速な進化**: 最新のベストプラクティスを即座に適用可能

### 1. DBファーストアプローチ

```
┌──────────────────────────────────────────┐
│ Database Schema (Drizzle ORM)            │ ← 型定義の源
│ - テーブル定義                           │
│ - カラム型                               │
│ - リレーション                           │
└──────────────────────────────────────────┘
              ↓ 型推論
┌──────────────────────────────────────────┐
│ Domain Model                             │ ← DBから推論
│ - DBテーブル型をそのまま使用             │
│ - ビジネスロジックを追加                 │
│ - 計算プロパティを追加                   │
└──────────────────────────────────────────┘
              ↓ マッピング
┌──────────────────────────────────────────┐
│ API Types (OpenAPI Generated)            │ ← TypeSpecから生成
│ - リクエスト/レスポンス型                │
│ - DTOとしての役割                        │
└──────────────────────────────────────────┘
```

### 2. データフローパターン

#### Write操作（Create/Update）
```
API Request (自動生成型)
    ↓ Validation
Write Mapper
    ↓ Transform
Domain Model (DB推論型)
    ↓ Business Logic
Database (Drizzle型)
```

#### Read操作（Get/List）
```
Database (Drizzle型)
    ↓ Query
Domain Model (DB推論型)
    ↓ Business Logic
Read Mapper
    ↓ Transform
API Response (自動生成型)
```

## 実装パターン

### 1. ドメインモデル定義

```typescript
// backend/packages/database/src/schema/customer.ts
import { pgTable, uuid, text, timestamp, integer, pgEnum } from 'drizzle-orm/pg-core'

export const customerStateEnum = pgEnum('customer_state', ['active', 'inactive', 'suspended'])

export const customers = pgTable('customers', {
  id: uuid('id').primaryKey().defaultRandom(),
  salonId: uuid('salon_id').references(() => salons.id),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  email: text('email').notNull().unique(),
  phoneNumber: text('phone_number'),
  address: text('address'),
  state: customerStateEnum('state').notNull().default('active'),
  loyaltyPoints: integer('loyalty_points').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// 型推論（基本形 - 参考のみ）
// 実際の実装では以下のDeepRequiredパターンを使用
export type CustomerSelect = typeof customers.$inferSelect
export type CustomerInsert = typeof customers.$inferInsert
```

### 2. ドメインモデルの拡張

```typescript
// backend/packages/domain/src/models/customer.ts
import type { customers } from '@beauty-salon-backend/database'
import type { DeepRequired, Omit } from '@beauty-salon-backend/utility'

// DeepRequiredパターン：全フィールドを非nullableに
export type DbCustomer = DeepRequired<typeof customers.$inferSelect>
export type DbNewCustomer = DeepRequired<Omit<typeof customers.$inferInsert, 'id'>>

// 注意: 実装では、DBから取得したデータの全フィールドが
// 必ず値を持つことを保証するために DeepRequired を使用

// DBモデルをそのまま使用し、ビジネスロジックを追加
export type Customer = DbCustomer & {
  // 計算プロパティ
  readonly fullName: string
  readonly isActive: boolean
  readonly canReserve: boolean
}

// ドメインロジックを含むファクトリ
export const createCustomerModel = (dbCustomer: DbCustomer): Customer => {
  return {
    ...dbCustomer,
    get fullName() {
      return `${dbCustomer.firstName} ${dbCustomer.lastName}`.trim()
    },
    get isActive() {
      return dbCustomer.state === 'active'
    },
    get canReserve() {
      return dbCustomer.state === 'active' && dbCustomer.loyaltyPoints >= 0
    }
  }
}
```

### 3. Writeマッパー（API → DB）

```typescript
// backend/packages/domain/src/mappers/write/customer.mapper.ts
import type { components } from '@beauty-salon-backend/generated'
import type { NewCustomer } from '@beauty-salon-backend/database'
import { ok, err, type Result } from '../../shared/result'

type CreateCustomerRequest = components['schemas']['Models.CreateCustomerRequest']

/**
 * APIリクエストをDB挿入用の型に変換
 * バリデーションとデータ変換を担当
 */
export const mapCreateRequestToDb = (
  request: CreateCustomerRequest
): Result<NewCustomer, ValidationError[]> => {
  const errors: ValidationError[] = []

  // 名前の分割
  const nameParts = request.name.trim().split(' ')
  const firstName = nameParts[0]
  const lastName = nameParts.slice(1).join(' ') || ''

  if (!firstName) {
    errors.push({
      field: 'name',
      message: 'Name must contain at least a first name'
    })
  }

  if (!request.email || !request.email.includes('@')) {
    errors.push({
      field: 'email',
      message: 'Valid email is required'
    })
  }

  if (errors.length > 0) {
    return err(errors)
  }

  // DB型に準拠した形式で返す
  const newCustomer: NewCustomer = {
    salonId: request.salonId ?? null,
    firstName,
    lastName,
    email: request.email,
    phoneNumber: request.phoneNumber ?? null,
    address: request.address ?? null,
    state: 'active',
    loyaltyPoints: 0,
    // createdAt, updatedAt はDBのデフォルト値を使用
  }

  return ok(newCustomer)
}

/**
 * 更新リクエストをDB更新用に変換
 */
export const mapUpdateRequestToDb = (
  request: components['schemas']['Models.UpdateCustomerRequest']
): Result<Partial<NewCustomer>, ValidationError[]> => {
  const updates: Partial<NewCustomer> = {}

  if (request.name !== undefined) {
    const nameParts = request.name.trim().split(' ')
    updates.firstName = nameParts[0]
    updates.lastName = nameParts.slice(1).join(' ') || ''
  }

  if (request.email !== undefined) {
    updates.email = request.email
  }

  if (request.phoneNumber !== undefined) {
    updates.phoneNumber = request.phoneNumber
  }

  if (request.address !== undefined) {
    updates.address = request.address
  }

  if (request.state !== undefined) {
    updates.state = request.state
  }

  return ok(updates)
}
```

### 4. Readマッパー（DB → API）

```typescript
// backend/packages/domain/src/mappers/read/customer.mapper.ts
import type { components } from '@beauty-salon-backend/generated'
import type { Customer as DbCustomer } from '@beauty-salon-backend/database'
import { createCustomerModel } from '../../models/customer'

type ApiCustomer = components['schemas']['Models.Customer']

/**
 * DBレコードをAPIレスポンス型に変換
 * ドメインロジックを適用してからAPIフォーマットに変換
 */
export const mapDbToApiResponse = (dbCustomer: DbCustomer): ApiCustomer => {
  // ドメインモデルを作成（ビジネスロジック適用）
  const customer = createCustomerModel(dbCustomer)

  // API型に変換
  return {
    id: customer.id,
    salonId: customer.salonId ?? null,
    name: customer.fullName, // 計算プロパティを使用
    email: customer.email,
    phoneNumber: customer.phoneNumber ?? null,
    address: customer.address ?? null,
    state: customer.state,
    loyaltyPoints: customer.loyaltyPoints,
    isActive: customer.isActive, // ビジネスロジック
    canReserve: customer.canReserve, // ビジネスロジック
  }
}

/**
 * 複数のDBレコードをAPIレスポンスに変換
 */
export const mapDbListToApiResponse = (
  dbCustomers: DbCustomer[]
): ApiCustomer[] => {
  return dbCustomers.map(mapDbToApiResponse)
}

/**
 * ページネーション付きレスポンスの変換
 */
export const mapDbPageToApiResponse = (
  dbCustomers: DbCustomer[],
  total: number,
  page: number,
  limit: number
): components['schemas']['Models.CustomerListResponse'] => {
  return {
    items: mapDbListToApiResponse(dbCustomers),
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  }
}
```

### 5. リポジトリ実装

```typescript
// backend/packages/infrastructure/src/repositories/customer.repository.ts
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import type { PgTransaction } from 'drizzle-orm/pg-core'
import { customers, type Customer, type NewCustomer } from '@beauty-salon-backend/database'
import { eq } from 'drizzle-orm'
import { ok, err, type Result } from '@beauty-salon-backend/domain'

// 統一型定義（命名規則）
type DatabaseConnection = NodePgDatabase
type Transaction = PgTransaction
type DbOrTx = DatabaseConnection | Transaction

export class CustomerRepository {
  constructor(private readonly db: DatabaseConnection) {}

  /**
   * 新規顧客作成（通常版）
   * 内部でトランザクション対応版を呼び出す
   */
  async create(data: NewCustomer): Promise<Result<Customer, RepositoryError>> {
    return this.createWithTx(this.db, data)
  }

  /**
   * 新規顧客作成（トランザクション対応版）
   * 仮引数名 dbOrTx: DB接続またはトランザクションを受け入れる
   */
  async createWithTx(
    dbOrTx: DbOrTx,  // 命名規則: dbOrTx
    data: NewCustomer
  ): Promise<Result<Customer, RepositoryError>> {
    try {
      const [customer] = await dbOrTx
        .insert(customers)
        .values(data)
        .returning()

      return ok(customer)
    } catch (error) {
      return err({
        type: 'database',
        message: 'Failed to create customer',
        cause: error
      })
    }
  }

  /**
   * ID検索（通常版）
   */
  async findById(id: string): Promise<Result<Customer | null, RepositoryError>> {
    return this.findByIdWithTx(this.db, id)
  }

  /**
   * ID検索（トランザクション対応版）
   */
  async findByIdWithTx(
    dbOrTx: DbOrTx,
    id: string
  ): Promise<Result<Customer | null, RepositoryError>> {
    try {
      const customer = await dbOrTx
        .select()
        .from(customers)
        .where(eq(customers.id, id))
        .limit(1)

      return ok(customer[0] ?? null)
    } catch (error) {
      return err({
        type: 'database',
        message: 'Failed to find customer',
        cause: error
      })
    }
  }

  /**
   * 更新
   */
  async update(
    id: string,
    data: Partial<NewCustomer>
  ): Promise<Result<Customer, RepositoryError>> {
    try {
      const [updated] = await db
        .update(customers)
        .set({
          ...data,
          updatedAt: new Date()
        })
        .where(eq(customers.id, id))
        .returning()

      if (!updated) {
        return err({
          type: 'not_found',
          message: 'Customer not found'
        })
      }

      return ok(updated)
    } catch (error) {
      return err({
        type: 'database',
        message: 'Failed to update customer',
        cause: error
      })
    }
  }

  /**
   * リスト取得
   */
  async list(
    filters: {
      state?: 'active' | 'inactive' | 'suspended'
      salonId?: string
    } = {},
    pagination: {
      page: number
      limit: number
    } = { page: 1, limit: 20 }
  ): Promise<Result<{ items: Customer[]; total: number }, RepositoryError>> {
    try {
      const conditions = []

      if (filters.state) {
        conditions.push(eq(customers.state, filters.state))
      }

      if (filters.salonId) {
        conditions.push(eq(customers.salonId, filters.salonId))
      }

      const offset = (pagination.page - 1) * pagination.limit

      const [items, [{ count }]] = await Promise.all([
        db
          .select()
          .from(customers)
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .limit(pagination.limit)
          .offset(offset),
        db
          .select({ count: count() })
          .from(customers)
          .where(conditions.length > 0 ? and(...conditions) : undefined)
      ])

      return ok({
        items,
        total: Number(count)
      })
    } catch (error) {
      return err({
        type: 'database',
        message: 'Failed to list customers',
        cause: error
      })
    }
  }
}
```

### 6. ユースケース実装

```typescript
// backend/packages/domain/src/business-logic/customer/create-customer.use-case.ts
import type { components } from '@beauty-salon-backend/generated'
import { CustomerRepository } from '@beauty-salon-backend/infrastructure'
import { mapCreateRequestToDb } from '../../mappers/write/customer.mapper'
import { mapDbToApiResponse } from '../../mappers/read/customer.mapper'
import { ok, err, type Result } from '../../shared/result'

type CreateCustomerRequest = components['schemas']['Models.CreateCustomerRequest']
type CustomerResponse = components['schemas']['Models.Customer']

export class CreateCustomerUseCase {
  private readonly repository: CustomerRepository

  constructor(dependencies: { repository: CustomerRepository }) {
    this.repository = dependencies.repository
  }

  async execute(
    request: CreateCustomerRequest
  ): Promise<Result<CustomerResponse, UseCaseError>> {
    // 1. API型 → DB型への変換（Write Mapper）
    const dbDataResult = mapCreateRequestToDb(request)
    if (dbDataResult.type === 'err') {
      return err({
        type: 'validation',
        errors: dbDataResult.error
      })
    }

    // 2. DBへの保存
    const saveResult = await this.repository.create(dbDataResult.value)
    if (saveResult.type === 'err') {
      return err({
        type: 'repository',
        message: saveResult.error.message
      })
    }

    // 3. DB型 → API型への変換（Read Mapper）
    const response = mapDbToApiResponse(saveResult.value)

    return ok(response)
  }
}
```

## 型の流れ

### 1. 型定義の源

- **Database Schema**: Drizzle ORMのテーブル定義が真実の源
- **API Types**: TypeSpec/OpenAPIから自動生成
- **Domain Model**: DBスキーマから推論 + ビジネスロジック

### 2. 型変換の責務

| マッパー | 責務 | 入力型 | 出力型 |
|---------|------|--------|--------|
| Write Mapper | APIリクエストをDB形式に変換 | API自動生成型 | DB推論型 |
| Read Mapper | DBデータをAPIレスポンスに変換 | DB推論型 | API自動生成型 |

### 3. バリデーションのタイミング

1. **APIレベル**: OpenAPIスキーマによる基本バリデーション
2. **Write Mapperレベル**: ビジネスルールのバリデーション
3. **DBレベル**: 制約による最終バリデーション

## メリット

1. **型の一貫性**: DBスキーマが唯一の真実の源
2. **簡潔性**: Brand型やID変換、互換性レイヤーの複雑さを排除
3. **自動化**: DB型推論により手動定義を削減
4. **保守性**: スキーマ変更が自動的に型に反映
5. **技術的負債ゼロ**: 後方互換性のコードが存在しない
6. **高速な開発**: 破壊的変更を前提とした迅速な改善

## ベストプラクティス

### 1. DBファースト設計

```typescript
// まずDBスキーマを定義
export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  // ...
})

// 型は自動推論（実際の実装ではDeepRequiredパターンを使用）
export type Product = typeof products.$inferSelect
```

### 2. マッパーの単一責任

```typescript
// ❌ 悪い例: マッパーでビジネスロジックを実行
export const mapToDb = (request) => {
  // 価格計算などのビジネスロジックを含めない
  const finalPrice = request.price * 1.1 // 税込計算
  // ...
}

// ✅ 良い例: 変換のみに集中
export const mapToDb = (request) => {
  return {
    name: request.name,
    price: request.price, // そのままマッピング
    // ...
  }
}
```

### 3. エラーハンドリング

```typescript
// Result型で一貫したエラーハンドリング
export const mapRequestToDb = (
  request: ApiRequest
): Result<DbModel, ValidationError[]> => {
  if (!isValid(request)) {
    return err([{ field: 'name', message: 'Invalid name' }])
  }

  return ok(transformedData)
}
```

### 4. テスト戦略

```typescript
describe('Customer Mappers', () => {
  describe('Write Mapper', () => {
    it('APIリクエストをDB形式に変換できる', () => {
      const apiRequest = { name: 'John Doe', email: 'john@example.com' }
      const result = mapCreateRequestToDb(apiRequest)

      expect(result.type).toBe('ok')
      if (result.type === 'ok') {
        expect(result.value.firstName).toBe('John')
        expect(result.value.lastName).toBe('Doe')
      }
    })
  })

  describe('Read Mapper', () => {
    it('DBレコードをAPIレスポンスに変換できる', () => {
      const dbRecord = {
        id: 'uuid',
        firstName: 'John',
        lastName: 'Doe',
        // ...
      }
      const apiResponse = mapDbToApiResponse(dbRecord)

      expect(apiResponse.name).toBe('John Doe')
    })
  })
})
```

## マイグレーション戦略

### 1. スキーマ変更時の対応

1. Drizzleマイグレーションを作成
2. 型が自動的に更新される
3. マッパーを必要に応じて調整
4. テストで検証

### 2. 破壊的変更の方針

**本アーキテクチャでは後方互換性を考慮しません。** スキーマ変更時は以下の方針に従います：

```typescript
// ❌ 後方互換性のために古いフィールドを維持しない
export const mapDbToApiResponse = (db: Customer): ApiCustomer => {
  return {
    firstName: db.firstName,
    lastName: db.lastName,
    // 古いnameフィールドは削除
    // name: `${db.firstName} ${db.lastName}`.trim(), // 削除
  }
}
```

**破壊的変更の実施手順：**
1. API仕様を更新（TypeSpec）
2. DBスキーマを変更（マイグレーション）
3. マッパーを更新（古いフィールドは削除）
4. クライアントを同時に更新
5. 全体をアトミックにデプロイ

## まとめ

DB駆動ドメインモデルアプローチは、データベーススキーマを中心に据えることで、型の一貫性と簡潔性を実現します。Write/Readマッパーパターンにより、各層の責務が明確になり、保守性の高いアーキテクチャを構築できます。