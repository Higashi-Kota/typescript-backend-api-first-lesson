# DB型制約マッピング機構

このドキュメントでは、Drizzle ORMの推論型（`$inferSelect`、`$inferInsert`）を活用したDB型制約マッピング機構の実装方法とベストプラクティスについて説明します。

## 目次

1. [概要](#概要)
2. [API-First開発のデータフロー](#api-first開発のデータフロー)
3. [アーキテクチャ](#アーキテクチャ)
4. [実装方法](#実装方法)
5. [各レイヤーでの使用例](#各レイヤーでの使用例)
6. [型安全性の保証](#型安全性の保証)
7. [ベストプラクティス](#ベストプラクティス)
8. [アーキテクチャの進化：循環依存の解決](#アーキテクチャの進化循環依存の解決)

## 概要

DB型制約マッピング機構は、API-First開発アプローチにおいて、TypeSpec → OpenAPI → TypeScript型 → Drizzle ORMスキーマという一貫したデータフローを実現する仕組みです。独立した`@beauty-salon-backend/database`パッケージにより、循環依存を解消し、型安全性を最大化しています。

### 主な利点

- **API-First開発**: TypeSpecが契約の起点となり、OpenAPIを介して型定義を自動生成
- **型の一元管理**: DBスキーマが独立パッケージとして管理され、循環依存を防止
- **自動型推論**: Drizzle ORMの`$inferSelect`と`$inferInsert`による自動型生成
- **型安全性**: TypeSpec → OpenAPI → TypeScript → Database の全レイヤーで型整合性を保証
- **保守性向上**: スキーマ変更時の型定義の自動更新とマッパーによる変換

## API-First開発のデータフロー

このプロジェクトでは、API-First開発アプローチを採用しています。すべての開発はTypeSpecによるAPI定義から始まり、そこから自動生成される型定義を基にフロントエンドとバックエンドの実装を行います。

### 開発の流れ

1. **API設計** - TypeSpecでAPIの仕様を定義
2. **型生成** - OpenAPIを経由してTypeScript型を自動生成
3. **実装** - 生成された型を使用して実装
4. **マッピング** - 4層のマッパーで各層間の型変換を管理

### 型の一貫性

```
TypeSpec (API契約) → OpenAPI (仕様) → TypeScript (型定義)
                                           ↓
                                    Domain Models
                                           ↓
                                    Database Schema
```

各層では以下の型が使用されます：

- **API層**: TypeSpecから生成された`@beauty-salon-backend/types`の型
- **Domain層**: ビジネスロジックを表現する独自の型（Sum型）
- **Database層**: Drizzle ORMの`@beauty-salon-backend/database`から推論される型

### 関連ドキュメント

- [OpenAPI-TypeScript利用ガイド](./openapi-typescript-usage.md) - 型生成の詳細
- [TypeSpec API型定義ルール](./typespec-api-type-rules.md) - API定義の規約
- [バックエンドアーキテクチャガイドライン](./backend-architecture-guidelines.md) - 全体設計

## アーキテクチャ

### パッケージ構成

```
backend/packages/
├── database/         # 独立したDBスキーマパッケージ（循環依存の解決）
│   ├── src/
│   │   ├── schema.ts      # Drizzle ORMスキーマ定義
│   │   ├── relations.ts   # テーブル間のリレーション定義
│   │   └── index.ts       # エクスポート定義
│   └── dist/              # TypeScriptコンパイル後のファイル
├── types/            # TypeSpec/OpenAPIから生成された型定義
│   └── src/
│       └── generated/
│           ├── api-types.ts    # OpenAPI型定義
│           └── schemas.ts      # Zodスキーマ
├── mappers/          # 型変換レイヤー（4つのマッピング層）
│   └── src/
│       ├── db-to-domain/      # DB → ドメインモデル
│       ├── domain-to-db/      # ドメインモデル → DB
│       ├── api-to-domain/     # APIリクエスト → ドメインモデル
│       └── domain-to-api/     # ドメインモデル → APIレスポンス
├── infrastructure/   # リポジトリ実装
│   └── src/
│       └── repositories/
└── domain/          # ドメインモデル定義
```

### データフローと型変換

```
┌─────────────────────────────────────────────────────┐
│                TypeSpec Definition                  │
│            (API契約の起点・単一の真実の源)          │
└──────────────────────┬──────────────────────────────┘
                       │ tsc compile
                       ↓
┌─────────────────────────────────────────────────────┐
│                 OpenAPI Specification               │
│              (自動生成されたAPI仕様)                │
└──────────────────────┬──────────────────────────────┘
                       │ openapi-typescript
                       ↓
┌─────────────────────────────────────────────────────┐
│              TypeScript Types (Generated)           │
│            @beauty-salon-backend/types              │
│         - API Request/Response Types                │
│         - Brand Types (CustomerId, etc.)            │
└──────────────────────┬──────────────────────────────┘
                       │
    ┌──────────────────┼──────────────────┐
    │                  │                  │
    ↓                  ↓                  ↓
┌──────────┐    ┌──────────┐    ┌──────────────┐
│   API    │    │  Domain  │    │   Database   │
│  Layer   │←→  │  Models  │←→  │    Layer     │
│          │    │          │    │  (Drizzle)   │
└──────────┘    └──────────┘    └──────────────┘
     ↑              ↑                  ↑
     │              │                  │
┌─────────────────────────────────────────────────────┐
│              Mappers Layer (4層)                    │
│         @beauty-salon-backend/mappers               │
│  - api-to-domain: APIリクエスト → ドメイン          │
│  - domain-to-api: ドメイン → APIレスポンス          │
│  - db-to-domain: DBレコード → ドメイン              │
│  - domain-to-db: ドメイン → DBレコード              │
└─────────────────────────────────────────────────────┘
```

## 実装方法

### 1. DBスキーマ定義（独立パッケージ）

```typescript
// backend/packages/database/src/schema.ts
import { pgTable, varchar, text, timestamp, jsonb, integer } from 'drizzle-orm/pg-core'

export const customers = pgTable('customers', {
  id: varchar('id', { length: 36 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  phone_number: varchar('phone_number', { length: 20 }).notNull(),
  alternative_phone: varchar('alternative_phone', { length: 20 }),
  preferences: text('preferences'),
  notes: text('notes'),
  tags: jsonb('tags'),
  birth_date: varchar('birth_date', { length: 10 }),
  loyalty_points: integer('loyalty_points').default(0),
  membership_level: varchar('membership_level', { length: 20 }).default('regular'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
})
```

### 2. マッパーパッケージでの型定義

独立したdatabaseパッケージから型を推論し、4層のマッピングを実装します：

```typescript
// backend/packages/mappers/src/db-to-domain/customer.mapper.ts
import type { InferSelectModel } from 'drizzle-orm'
import { customers } from '@beauty-salon-backend/database'

// Drizzle ORMから自動推論された型
export type DbCustomer = InferSelectModel<typeof customers>

// 以下は後方互換性のための型定義（移行期間中のみ）
// TODO: 全てのコードがdatabaseパッケージを使用したら削除
export type DbCustomerLegacy = {
  id: string
  name: string
  email: string
  phone_number: string
  alternative_phone: string | null
  preferences: string | null
  notes: string | null
  tags: unknown | null
  birth_date: string | null
  loyalty_points: number | null
  membership_level: string | null
  created_at: string
  updated_at: string
}

// DBモデルからドメインモデルへの変換
export const mapDbCustomerToDomain = (
  dbCustomer: DbCustomer
): Customer | null => {
  const id = createCustomerId(dbCustomer.id)
  if (id == null) {
    return null
  }

  // タグの処理
  const tags = Array.isArray(dbCustomer.tags)
    ? (dbCustomer.tags as string[])
    : []

  return {
    type: 'active' as const,
    data: {
      id,
      name: dbCustomer.name,
      contactInfo: {
        email: dbCustomer.email,
        phoneNumber: dbCustomer.phone_number,
        alternativePhone: dbCustomer.alternative_phone ?? undefined,
      },
      preferences: dbCustomer.preferences,
      notes: dbCustomer.notes,
      tags,
      birthDate: dbCustomer.birth_date
        ? new Date(dbCustomer.birth_date)
        : null,
      loyaltyPoints: dbCustomer.loyalty_points ?? 0,
      membershipLevel: (dbCustomer.membership_level ??
        'regular') as Customer['data']['membershipLevel'],
      createdAt: new Date(dbCustomer.created_at),
      updatedAt: new Date(dbCustomer.updated_at),
    },
  }
}
```

## 各レイヤーでの使用例

### Repository Layer

```typescript
// backend/packages/infrastructure/src/repositories/customer.repository.impl.ts
import {
  type DbCustomer,
  mapDecryptedDbCustomerToDomain,
} from '@beauty-salon-backend/mappers/db-to-domain'
import {
  type DbNewCustomer,
  mapDomainCustomerToDbInsert,
} from '@beauty-salon-backend/mappers/domain-to-db'

export class DrizzleCustomerRepository implements CustomerRepository {
  // DBモデルからドメインモデルへの変換
  private async mapDbToDomain(
    dbCustomer: DbCustomer
  ): Promise<Customer | null> {
    // 暗号化されたフィールドを復号化
    let decryptedCustomer = dbCustomer
    if (this.encryptionService) {
      decryptedCustomer = await this.encryptionService.decryptFields(
        dbCustomer,
        this.encryptedFields
      )
    }

    // マッパーを使用して変換
    return mapDecryptedDbCustomerToDomain(decryptedCustomer)
  }

  // ドメインモデルからDBモデルへの変換
  private async mapDomainToDb(customer: Customer): Promise<DbNewCustomer> {
    const dbCustomer = mapDomainCustomerToDbInsert(customer)

    // 暗号化が必要なフィールドを暗号化
    if (this.encryptionService) {
      return await this.encryptionService.encryptFields(
        dbCustomer,
        this.encryptedFields
      )
    }

    return dbCustomer
  }
}
```

### API Layer

```typescript
// backend/packages/api/src/routes/customers.ts
import {
  mapCreateCustomerRequest,
  mapUpdateCustomerRequest,
  mapCustomerToResponse,
  mapCustomerListToResponse,
  mapCustomerProfileToResponse,
  mapCreateCustomerErrorToResponse,
} from '@beauty-salon-backend/mappers'

router.post('/', async (req, res, next) => {
  try {
    // リクエストをドメインモデルに変換
    const input = mapCreateCustomerRequest(req.body)
    const result = await createCustomerUseCase(input, { customerRepository })

    // レスポンス処理
    return match(result)
      .with({ type: 'ok' }, ({ value }) => {
        res
          .status(201)
          .header('Location', `/customers/${value.data.id}`)
          .json(mapCustomerToResponse(value)) // ドメインモデルをAPIレスポンスに変換
      })
      .with({ type: 'err' }, ({ error }) => {
        const statusCode = getErrorStatusCode(error.type)
        res.status(statusCode).json(mapCreateCustomerErrorToResponse(error))
      })
      .exhaustive()
  } catch (error) {
    next(error)
  }
})
```

## 型安全性の保証

### 1. コンパイル時の型チェック

- DBスキーマの変更が自動的に型定義に反映
- 不正な型変換をコンパイル時に検出
- 必須フィールドの欠落を防止

### 2. 実行時の検証

```typescript
// Zodスキーマによる実行時検証
const customerIdSchema = z.string().uuid()
const paginationSchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
})
```

### 3. Sum型による状態管理

```typescript
// ドメインモデルでSum型を使用
type Customer = 
  | { type: 'active'; data: ActiveCustomerData }
  | { type: 'suspended'; data: SuspendedCustomerData; suspendedAt: Date }
  | { type: 'deleted'; data: DeletedCustomerData; deletedAt: Date }
```

## ベストプラクティス

### 1. 単一責任の原則

各マッパー関数は単一の変換責任を持つ：
- `mapDbCustomerToDomain`: DB → ドメイン
- `mapDomainCustomerToDbInsert`: ドメイン → DB挿入
- `mapCustomerToResponse`: ドメイン → APIレスポンス
- `mapCreateCustomerRequest`: APIリクエスト → ドメイン

### 2. null安全性

```typescript
export const mapDbCustomerToDomain = (
  dbCustomer: DbCustomer
): Customer | null => {
  const id = createCustomerId(dbCustomer.id)
  if (id == null) {
    return null // 無効なIDの場合はnullを返す
  }
  // ...
}
```

### 3. デフォルト値の処理

```typescript
// DBのnullをドメインのデフォルト値に変換
loyaltyPoints: dbCustomer.loyalty_points ?? 0,
membershipLevel: (dbCustomer.membership_level ?? 'regular') as MembershipLevel,
```

### 4. 配列型の安全な処理

```typescript
// JSONBフィールドの安全な処理
const tags = Array.isArray(dbCustomer.tags)
  ? (dbCustomer.tags as string[])
  : []
```

## アーキテクチャの進化：循環依存の解決

### 問題の背景

以前は、mappersパッケージがinfrastructureのスキーマを参照し、infrastructureがmappersを使用することで循環依存が発生していました。

### 現在の解決策：独立したdatabaseパッケージ

`@beauty-salon-backend/database`パッケージを独立させることで、循環依存を完全に解決しました：

```
backend/packages/
├── database/              # DBスキーマ専用の独立パッケージ
│   ├── src/
│   │   ├── schema.ts      # Drizzle ORMテーブル定義
│   │   ├── relations.ts   # リレーション定義
│   │   └── index.ts       # エクスポート
│   └── package.json
├── mappers/               # database から型を推論
├── infrastructure/        # database をインポート
└── ...
```

**依存関係の明確化:**
```
        database (独立・最下層)
            ↑
    ┌───────┴───────┐
    │               │
mappers     infrastructure
    │               │
    └───────┬───────┘
            ↑
        usecase
            ↑
          api
```

### 利点

1. **循環依存の完全解消**: 各パッケージの依存方向が一方向に
2. **型の一元管理**: databaseパッケージがDB型の単一の真実の源
3. **ビルド順序の明確化**: database → mappers/infrastructure → usecase → api
4. **テストの独立性**: 各層を独立してテスト可能

### TypeSpec → OpenAPI → Database の統合

#### 1. TypeSpecでのAPI定義（起点）

```typespec
// specs/models/customer.tsp
@doc("Customer model for API")
model Customer {
  id: CustomerId;
  name: string;
  email: string;
  phoneNumber: string;
  alternativePhone: string | null;
  preferences: string | null;
  notes: string | null;
  tags: string[];
  birthDate: plainDate | null;
  loyaltyPoints: int32;
  membershipLevel: MembershipLevel;
  createdAt: utcDateTime;
  updatedAt: utcDateTime;
}
```

#### 2. OpenAPI生成と型定義

```bash
# TypeSpecからOpenAPI仕様を生成
pnpm run generate:backend
```

生成される型：
```typescript
// backend/packages/types/src/generated/api-types.ts
export interface components {
  schemas: {
    "Models.Customer": {
      id: string;
      name: string;
      email: string;
      phoneNumber: string;
      alternativePhone: string | null;
      // ...
    };
  };
}
```

#### 3. Databaseパッケージでの実装

```typescript
// backend/packages/database/src/schema.ts
import { pgTable, varchar, text, timestamp, jsonb, integer } from 'drizzle-orm/pg-core'

// OpenAPI定義に対応するDBスキーマ
export const customers = pgTable('customers', {
  id: varchar('id', { length: 36 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  phone_number: varchar('phone_number', { length: 20 }).notNull(),
  alternative_phone: varchar('alternative_phone', { length: 20 }),
  preferences: text('preferences'),
  notes: text('notes'),
  tags: jsonb('tags'),
  birth_date: varchar('birth_date', { length: 10 }),
  loyalty_points: integer('loyalty_points').default(0),
  membership_level: varchar('membership_level', { length: 20 }).default('regular'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
})
```

#### 4. マッパーでの型変換

```typescript
// backend/packages/mappers/src/db-to-domain/customer.mapper.ts
import type { InferSelectModel } from 'drizzle-orm'
import { customers } from '@beauty-salon-backend/database'
import type { components } from '@beauty-salon-backend/types/generated'

// DB型（Drizzleから推論）
export type DbCustomer = InferSelectModel<typeof customers>

// API型（OpenAPIから生成）
type ApiCustomer = components['schemas']['Models.Customer']

// DB → Domain → API の変換チェーン
export const mapDbToApi = (dbCustomer: DbCustomer): ApiCustomer => {
  const domain = mapDbToDomain(dbCustomer)
  return mapDomainToApi(domain)
}
```

#### infrastructureパッケージでの使用

```typescript
// backend/packages/infrastructure/src/database/index.ts
import * as schema from '@beauty-salon-backend/database'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

const queryClient = postgres(env.DATABASE_URL, {
  max: env.DATABASE_POOL_MAX,
})

export const db = drizzle(queryClient, { schema })

// Re-export all database schema
export * from '@beauty-salon-backend/database'
```

## データベーススキーマ変更時の開発手順

### 概要

データベーススキーマを変更して`pnpm db:pull`を実行した後、変更を全レイヤーに反映させる体系的な開発手順です。API-First開発のフローに従い、TypeSpec → OpenAPI → TypeScript型 → Drizzle ORMという一貫したデータフローで型安全な実装を実現します。

**関連ドキュメント:**
- [OpenAPI-TypeScript利用ガイド](./openapi-typescript-usage.md) - TypeSpecからの型生成
- [TypeSpec API型定義ルール](./typespec-api-type-rules.md) - API定義の規約
- [バックエンドアーキテクチャガイドライン](./backend-architecture-guidelines.md) - 全体設計

### 前提条件

- データベーススキーマの変更が完了している
- `pnpm db:pull`コマンドが正常に実行されている
- Drizzle ORMのスキーマファイルが更新されている

### 開発手順

#### Step 1: データベーススキーマの変更確認

```bash
# 1. データベーススキーマを変更
# 例: ALTER TABLE customers ADD COLUMN preferred_stylist_id VARCHAR(36);

# 2. Drizzle ORMスキーマをデータベースから自動生成
pnpm db:pull

# 3. 生成されたスキーマファイルの確認
cat backend/packages/database/src/schema.ts
```

#### Step 2: databaseパッケージのビルドと確認

```bash
# 1. databaseパッケージをビルド
cd backend/packages/database
pnpm build

# 2. TypeScript宣言ファイルが正しく生成されていることを確認
ls -la dist/
# schema.js, schema.d.ts, relations.js, relations.d.ts などが存在することを確認
```

#### Step 3: マッパーパッケージの型定義更新

```typescript
// backend/packages/mappers/src/db-to-domain/customer.mapper.ts
import type { InferSelectModel, InferInsertModel } from '@beauty-salon-backend/database'
import { customers } from '@beauty-salon-backend/database'

// Drizzle ORMから自動推論 - スキーマ変更が自動反映される
export type DbCustomer = InferSelectModel<typeof customers>
export type DbNewCustomer = InferInsertModel<typeof customers>
```

#### Step 4: ドメインモデルの更新

ドメインモデルは、TypeSpecで定義したAPIモデルとDrizzleで定義したDBスキーマの橋渡しをします。

```typescript
// backend/packages/domain/src/models/customer.ts

export type Customer = 
  | { type: 'active'; data: ActiveCustomerData }
  | { type: 'suspended'; data: SuspendedCustomerData; suspendedAt: Date }
  | { type: 'deleted'; data: DeletedCustomerData; deletedAt: Date }

type ActiveCustomerData = {
  id: CustomerId
  name: string
  contactInfo: ContactInfo
  preferences: string | null
  notes: string | null
  tags: string[]
  birthDate: Date | null
  loyaltyPoints: number
  membershipLevel: 'regular' | 'silver' | 'gold' | 'platinum'
  preferredStylistId: StaffId | null  // 👈 新規追加
  createdAt: Date
  updatedAt: Date
}
```

#### Step 5: 4つのマッパーレイヤーの更新

##### 5.1 DB → Domain マッパー

```typescript
// backend/packages/mappers/src/db-to-domain/customer.mapper.ts

export const mapDbCustomerToDomain = (
  dbCustomer: DbCustomer
): Customer | null => {
  const id = createCustomerId(dbCustomer.id)
  if (id == null) return null

  // preferredStylistIdの処理を追加
  const preferredStylistId = dbCustomer.preferred_stylist_id
    ? createStaffId(dbCustomer.preferred_stylist_id)
    : null

  return {
    type: 'active' as const,
    data: {
      id,
      name: dbCustomer.name,
      contactInfo: {
        email: dbCustomer.email,
        phoneNumber: dbCustomer.phone_number,
        alternativePhone: dbCustomer.alternative_phone ?? undefined,
      },
      preferences: dbCustomer.preferences,
      notes: dbCustomer.notes,
      tags: Array.isArray(dbCustomer.tags) ? dbCustomer.tags : [],
      birthDate: dbCustomer.birth_date ? new Date(dbCustomer.birth_date) : null,
      loyaltyPoints: dbCustomer.loyalty_points ?? 0,
      membershipLevel: (dbCustomer.membership_level ?? 'regular') as Customer['data']['membershipLevel'],
      preferredStylistId,  // 👈 新規追加
      createdAt: new Date(dbCustomer.created_at),
      updatedAt: new Date(dbCustomer.updated_at),
    },
  }
}
```

##### 5.2 Domain → DB マッパー

```typescript
// backend/packages/mappers/src/domain-to-db/customer.mapper.ts

export const mapDomainCustomerToDbInsert = (
  customer: Customer
): DbNewCustomer => {
  const data = customer.data
  
  return {
    id: data.id,
    name: data.name,
    email: data.contactInfo.email,
    phone_number: data.contactInfo.phoneNumber,
    alternative_phone: data.contactInfo.alternativePhone ?? null,
    preferences: data.preferences,
    notes: data.notes,
    tags: data.tags.length > 0 ? JSON.stringify(data.tags) : null,
    birth_date: data.birthDate ? data.birthDate.toISOString().split('T')[0] : null,
    loyalty_points: data.loyaltyPoints,
    membership_level: data.membershipLevel,
    preferred_stylist_id: data.preferredStylistId,  // 👈 新規追加
    created_at: data.createdAt.toISOString(),
    updated_at: data.updatedAt.toISOString(),
  }
}
```

##### 5.3 API → Domain マッパー

```typescript
// backend/packages/mappers/src/api-to-domain/customer.mapper.ts

export const mapCreateCustomerRequest = (
  request: CreateCustomerRequest
): CreateCustomerInput => {
  return {
    name: request.name,
    contactInfo: {
      email: request.email,
      phoneNumber: request.phoneNumber,
      alternativePhone: request.alternativePhone ?? undefined,
    },
    preferences: request.preferences,
    notes: request.notes,
    tags: request.tags ?? [],
    birthDate: request.birthDate ? new Date(request.birthDate) : null,
    preferredStylistId: request.preferredStylistId  // 👈 新規追加
      ? createStaffId(request.preferredStylistId)
      : null,
  }
}
```

##### 5.4 Domain → API マッパー

```typescript
// backend/packages/mappers/src/domain-to-api/customer.mapper.ts

export const mapCustomerToResponse = (
  customer: Customer
): CustomerResponse => {
  const data = customer.data
  
  return {
    id: data.id,
    name: data.name,
    email: data.contactInfo.email,
    phoneNumber: data.contactInfo.phoneNumber,
    alternativePhone: data.contactInfo.alternativePhone ?? null,
    preferences: data.preferences,
    notes: data.notes,
    tags: data.tags,
    birthDate: data.birthDate?.toISOString().split('T')[0] ?? null,
    loyaltyPoints: data.loyaltyPoints,
    membershipLevel: data.membershipLevel,
    preferredStylistId: data.preferredStylistId,  // 👈 新規追加
    createdAt: data.createdAt.toISOString(),
    updatedAt: data.updatedAt.toISOString(),
  }
}
```

#### Step 6: TypeSpec定義の更新

API-First開発の起点として、TypeSpec定義を更新します。これがOpenAPIを経由してTypeScript型として生成されます。

詳細は[TypeSpec API型定義ルール](./typespec-api-type-rules.md)を参照してください。

```typespec
// specs/models/customer.tsp

@doc("Customer creation request")
model CreateCustomerRequest {
  name: string | null;
  email: string | null;
  phoneNumber: string | null;
  alternativePhone: string | null;
  preferences: string | null;
  notes: string | null;
  tags: string[] | null;
  birthDate: plainDate | null;
  preferredStylistId: StaffId | null;  // 👈 新規追加
}

@doc("Customer response")
model CustomerResponse {
  id: CustomerId;
  name: string;
  email: string;
  phoneNumber: string;
  alternativePhone: string | null;
  preferences: string | null;
  notes: string | null;
  tags: string[];
  birthDate: plainDate | null;
  loyaltyPoints: int32;
  membershipLevel: MembershipLevel;
  preferredStylistId: StaffId | null;  // 👈 新規追加
  createdAt: utcDateTime;
  updatedAt: utcDateTime;
}

@doc("Customer update request")
model UpdateCustomerRequest {
  name?: string;
  email?: string;
  phoneNumber?: string;
  alternativePhone?: string | null;
  preferences?: string | null;
  notes?: string | null;
  tags?: string[] | null;
  birthDate?: plainDate | null;
  preferredStylistId?: StaffId | null;  // 👈 新規追加
}
```

#### Step 7: リポジトリ実装の確認

```typescript
// backend/packages/infrastructure/src/repositories/customer.repository.impl.ts

// マッパーが更新されているため、基本的に変更不要
// ただし、特殊な処理が必要な場合は追加

export class DrizzleCustomerRepository implements CustomerRepository {
  async create(input: CreateCustomerInput): Promise<Result<Customer, RepositoryError>> {
    try {
      // preferredStylistIdの妥当性チェック（必要に応じて）
      if (input.preferredStylistId) {
        const stylistExists = await this.checkStylistExists(input.preferredStylistId)
        if (!stylistExists) {
          return {
            type: 'err',
            error: {
              type: 'validationError',
              message: 'Preferred stylist not found'
            }
          }
        }
      }

      const dbCustomer = await this.mapDomainToDb(customer)
      const [saved] = await this.db
        .insert(customers)
        .values(dbCustomer)
        .returning()
      
      return {
        type: 'ok',
        value: await this.mapDbToDomain(saved)
      }
    } catch (error) {
      return this.handleDbError(error)
    }
  }
}
```

#### Step 8: ユースケースの更新

```typescript
// backend/packages/usecase/src/customer/create-customer.usecase.ts

export type CreateCustomerInput = {
  name: string
  contactInfo: ContactInfo
  preferences: string | null
  notes: string | null
  tags: string[]
  birthDate: Date | null
  preferredStylistId: StaffId | null  // 👈 新規追加
}

export const createCustomerUseCase = async (
  input: CreateCustomerInput,
  deps: { customerRepository: CustomerRepository }
): Promise<Result<Customer, CreateCustomerError>> => {
  // preferredStylistIdのビジネスロジック検証
  if (input.preferredStylistId) {
    // スタイリストの空き状況確認など、必要に応じて追加
  }

  return await deps.customerRepository.create(input)
}
```

#### Step 9: テストの更新

```typescript
// backend/packages/infrastructure/src/repositories/__tests__/customer.repository.test.ts

describe('CustomerRepository', () => {
  test('preferredStylistIdを含む顧客作成', async () => {
    const input: CreateCustomerInput = {
      name: 'テスト顧客',
      contactInfo: {
        email: 'test@example.com',
        phoneNumber: '090-1234-5678',
      },
      preferences: null,
      notes: null,
      tags: [],
      birthDate: null,
      preferredStylistId: createStaffId('staff-123'),  // 👈 新規フィールドのテスト
    }

    const result = await repository.create(input)
    
    expect(result.type).toBe('ok')
    if (result.type === 'ok') {
      expect(result.value.data.preferredStylistId).toBe('staff-123')
    }
  })
})
```

### チェックリスト

データベーススキーマ変更後の実装チェックリスト：

**API定義フェーズ**
- [ ] TypeSpec定義を更新（[TypeSpec API型定義ルール](./typespec-api-type-rules.md)参照）
- [ ] `pnpm run generate:backend`でOpenAPI/TypeScript型を生成
- [ ] 生成された型定義を確認

**データベースフェーズ**
- [ ] `pnpm db:pull`を実行してDrizzleスキーマを更新
- [ ] databaseパッケージをビルド（`cd backend/packages/database && pnpm build`）
- [ ] 生成された型定義ファイル（.d.ts）を確認

**実装フェーズ**
- [ ] ドメインモデルに新しいフィールドを追加
- [ ] 4つのマッパーレイヤーをすべて更新
  - [ ] DB → Domain マッパー（`@beauty-salon-backend/database`から型推論）
  - [ ] Domain → DB マッパー
  - [ ] API → Domain マッパー（`@beauty-salon-backend/types`の型を使用）
  - [ ] Domain → API マッパー
- [ ] リポジトリ実装で特殊な処理が必要か確認
- [ ] ユースケースにビジネスロジックを追加

**検証フェーズ**
- [ ] テストケースを追加・更新
- [ ] `pnpm typecheck`で型エラーがないことを確認
- [ ] `pnpm test`ですべてのテストが通ることを確認
- [ ] `pnpm lint`でコード品質を確認

### トラブルシューティング

#### 循環依存エラーが発生する場合

独立したdatabaseパッケージが循環依存を解決します：

```typescript
// ✅ 推奨: 独立したdatabaseパッケージを使用
import { customers } from '@beauty-salon-backend/database'
import type { InferSelectModel } from 'drizzle-orm'
type DbCustomer = InferSelectModel<typeof customers>

// ❌ 避けるべき: infrastructureから直接import（循環依存の原因）
import { customers } from '@beauty-salon-backend/infrastructure'
```

#### TypeSpecとDrizzleの型が不一致の場合

1. TypeSpec定義を確認（[TypeSpec API型定義ルール](./typespec-api-type-rules.md)）
2. OpenAPI生成を再実行: `pnpm run generate:backend`
3. データベーススキーマとの対応を確認
4. マッパー関数で適切に変換されているか確認

#### TypeScriptがdatabaseパッケージのエクスポートを認識しない場合

1. databaseパッケージのビルドを確認：
```bash
cd backend/packages/database
pnpm build
ls -la dist/  # schema.js, schema.d.ts が存在することを確認
```

2. TypeScriptのモジュール解決設定を確認：
```json
// tsconfig.json
{
  "compilerOptions": {
    "moduleResolution": "bundler",  // ESMモジュールの解決に必要
    "module": "ESNext"
  }
}
```

3. 依存関係を再インストール：
```bash
pnpm install
```

#### 型の不整合が発生する場合

1. Drizzleスキーマの型定義を確認
2. マッパーのDB型定義が最新か確認
3. TypeSpec定義と生成された型を確認
4. 各レイヤーのマッパー関数の引数・戻り値を確認

#### NULL/undefinedの扱い

- DB層: `null`を使用
- Domain層: `null`または`undefined`（ビジネスロジックに応じて）
- API層: TypeSpec定義に従う（`nullable`または`optional`）

```typescript
// DB → Domain
alternativePhone: dbCustomer.alternative_phone ?? undefined

// Domain → DB
alternative_phone: data.contactInfo.alternativePhone ?? null

// API → Domain
alternativePhone: request.alternativePhone ?? undefined

// Domain → API
alternativePhone: data.contactInfo.alternativePhone ?? null
```

## まとめ

DB型制約マッピング機構により、以下の利点が得られます：

1. **API-First開発**: TypeSpecが契約の起点となり、一貫した型定義が全レイヤーに伝播
2. **型安全性の向上**: TypeSpec → OpenAPI → TypeScript → Drizzle ORMの全段階で型チェック
3. **循環依存の解消**: 独立したdatabaseパッケージにより、クリーンな依存関係を維持
4. **保守性の向上**: スキーマ変更時の影響範囲の明確化と自動型生成
5. **開発効率の向上**: 4層のマッパーによる明確な責務分離

### 関連ドキュメント

- **API設計**
  - [OpenAPI-TypeScript利用ガイド](./openapi-typescript-usage.md)
  - [TypeSpec API型定義ルール](./typespec-api-type-rules.md)
  - [APIテストガイド](./api-testing-guide.md)

- **アーキテクチャ**
  - [バックエンドアーキテクチャガイドライン](./backend-architecture-guidelines.md)
  - [クリーンアップ方針](./cleanup-policy.md)
  - [型安全性の原則](./type-safety-principles.md)

- **実装パターン**
  - [Sum型とパターンマッチング](./sum-types-pattern-matching.md)
  - [Brand型を利用したID管理](./branded-types-id-management.md)
  - [ユニフォーム実装ガイド](./uniform-implementation-guide.md)

この機構を適切に実装することで、TypeScriptの型システムを最大限に活用した堅牢なバックエンドシステムを構築できます。