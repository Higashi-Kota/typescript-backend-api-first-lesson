# Mappers Package - DB型制約の実装

## 概要

このパッケージは、ドメインモデルとDBエンティティ間の変換を行うマッパー関数を提供します。
Drizzle ORMの推論型（`$inferSelect`, `$inferInsert`）を活用して、DBスキーマの型制約をマッパーレイヤーで強制しています。

## 型制約の仕組み

### DBからドメインへのマッピング

```typescript
import type { customers } from '@beauty-salon-backend/infrastructure'

// Drizzle ORMの推論型を使用
export type DbCustomer = typeof customers.$inferSelect

export const mapDbCustomerToDomain = (
  dbCustomer: DbCustomer // DBスキーマの型で制約
): Customer | null => {
  // マッピングロジック
}
```

### ドメインからDBへのマッピング

```typescript
// Insert用の型
export type DbNewCustomer = typeof customers.$inferInsert

// Update用の型（IDを除く部分型）
export type DbUpdateCustomer = Partial<Omit<DbNewCustomer, 'id'>>

export const mapDomainCustomerToDbInsert = (
  customer: Customer
): DbNewCustomer => {
  // マッピングロジック
}
```

## 型制約の利点

1. **コンパイル時のエラー検出**
   - DBスキーマが変更された場合、マッパー関数でコンパイルエラーが発生
   - 実行時エラーを防ぐ

2. **自動的な型整合性**
   - DBスキーマの型定義が自動的にマッパーに反映される
   - 手動での型定義の同期が不要

3. **NULL安全性**
   - DBのNULL許可/非許可がTypeScriptの型に反映される
   - undefinedとnullの適切な処理が強制される

4. **リファクタリングの安全性**
   - DBスキーマの変更が影響する箇所をIDEが自動検出
   - 確実な修正が可能

## 実装済みのマッパー

### Customer
- `mapDbCustomerToDomain`: DB → ドメイン
- `mapDomainCustomerToDbInsert`: ドメイン → DB（新規作成）
- `mapDomainCustomerToDbUpdate`: ドメイン → DB（更新）

### User
- `mapDbUserToDomain`: DB → ドメイン
- `mapDomainUserToDbInsert`: ドメイン → DB（新規作成）
- `mapDomainUserToDbUpdate`: ドメイン → DB（更新）

### Salon
- `mapDbSalonToDomain`: DB → ドメイン
- `mapDomainSalonToDbInsert`: ドメイン → DB（新規作成）
- `mapDomainSalonToDbUpdate`: ドメイン → DB（更新）

## 使用例

```typescript
import { mapDbCustomerToDomain } from '@beauty-salon-backend/mappers/db-to-domain'
import { mapDomainCustomerToDbInsert } from '@beauty-salon-backend/mappers/domain-to-db'

// DBから取得したデータをドメインモデルに変換
const dbCustomer = await db.select().from(customers).where(...)
const domainCustomer = mapDbCustomerToDomain(dbCustomer)

// ドメインモデルをDB挿入用データに変換
const newCustomer: Customer = { ... }
const dbData = mapDomainCustomerToDbInsert(newCustomer)
await db.insert(customers).values(dbData)
```

## 今後の拡張

- Reservation, Review, Staff, Service などのエンティティのマッパー追加
- Result型を使用したエラーハンドリングの強化
- バッチ処理用の最適化されたマッパー関数の追加