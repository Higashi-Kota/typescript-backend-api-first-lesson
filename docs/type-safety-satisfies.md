# 型安全性のための`satisfies`演算子の使用

このドキュメントでは、TypeScriptの`satisfies`演算子を使用して型安全性を向上させる方法について説明します。

## 📋 目次

1. [概要](#概要)
2. [なぜsatisfiesを使うのか](#なぜsatisfiesを使うのか)
3. [asとsatisfiesの違い](#asとsatisfiesの違い)
4. [実装ガイドライン](#実装ガイドライン)
5. [使用例](#使用例)
6. [アンチパターン](#アンチパターン)

## 🎯 概要

`satisfies`演算子は、TypeScript 4.9で導入された機能で、値が特定の型を満たすことを確認しながら、より具体的な型情報を保持します。

## 🔍 なぜsatisfiesを使うのか

### 主な利点

1. **型の narrowing を保持**: 元の型情報を失わない
2. **コンパイル時の型チェック**: 実行時エラーを防ぐ
3. **IDE支援の向上**: より正確な自動補完とエラー検出
4. **リファクタリングの安全性**: 型の不整合を早期に発見

## ⚖️ asとsatisfiesの違い

### `as`の問題点

```typescript
// ❌ 悪い例: asは型を強制的に変換し、型安全性を失う
const userId = "not-a-uuid" as UserId  // コンパイルエラーにならない！

// ❌ 悪い例: 型情報が失われる
const config = {
  port: 3000,
  host: "localhost"
} as Config
// config.portは Config['port'] 型になり、リテラル型 3000 が失われる
```

### `satisfies`の利点

```typescript
// ✅ 良い例: satisfiesは型を検証しつつ、具体的な型を保持
const userId = createUserId("550e8400-e29b-41d4-a716-446655440000")

// ✅ 良い例: 型情報が保持される
const config = {
  port: 3000,
  host: "localhost"
} satisfies Config
// config.portは リテラル型 3000 のまま
```

## 📐 実装ガイドライン

### 1. オブジェクトリテラルの型注釈

```typescript
// ❌ 避けるべき
const mockUser = {
  id: uuidv4() as UserId,
  email: "test@example.com",
  // ...
} as User

// ✅ 推奨
const mockUser = {
  id: createUserId(uuidv4()),
  email: "test@example.com",
  // ...
} satisfies User
```

### 2. 設定オブジェクト

```typescript
// ❌ 避けるべき
export const testConfig = {
  database: {
    host: 'localhost',
    port: 5432,
  }
} as DatabaseConfig

// ✅ 推奨
export const testConfig = {
  database: {
    host: 'localhost',
    port: 5432,
  }
} satisfies DatabaseConfig
```

### 3. モックデータの作成

```typescript
// ❌ 避けるべき
const mockRepository = {
  findById: vi.fn(),
  save: vi.fn(),
} as CustomerRepository

// ✅ 推奨
const mockRepository = {
  findById: vi.fn(),
  save: vi.fn(),
  // 全てのメソッドを明示的に定義
  findByEmail: vi.fn(),
  delete: vi.fn(),
} satisfies CustomerRepository
```

## 🔄 使用例

### `as const satisfies` パターン

`as const`と`satisfies`を組み合わせることで、リテラル型を保持しながら型チェックを行えます。

```typescript
// ✅ 推奨: リテラル型を保持しつつ型チェック
const STATUS_CODES = {
  OK: 200,
  CREATED: 201,
  NOT_FOUND: 404,
  INTERNAL_ERROR: 500
} as const satisfies Record<string, number>

// STATUS_CODES.OK の型は 200（リテラル型）として保持される

// ✅ 設定値の定義
const DEFAULT_CONFIG = {
  port: 3000,
  host: 'localhost',
  ssl: false,
  features: {
    auth: true,
    logging: true,
    metrics: false
  }
} as const satisfies AppConfig

// DEFAULT_CONFIG.port の型は 3000（リテラル型）

// ✅ ルートマップの定義
const ROUTES = {
  home: '/',
  login: '/auth/login',
  dashboard: '/dashboard',
  api: {
    users: '/api/users',
    products: '/api/products'
  }
} as const satisfies RouteMap

// ROUTES.api.users の型は '/api/users'（リテラル型）

// ✅ エラーコードの定義
const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTH_FAILED: 'AUTH_FAILED',
  NOT_FOUND: 'NOT_FOUND',
  INTERNAL_ERROR: 'INTERNAL_ERROR'
} as const satisfies Record<string, string>

// 型として使用可能
type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES]
```

### なぜ`as const satisfies`を使うのか

1. **リテラル型の保持**: `as const`により、値が具体的なリテラル型として扱われる
2. **型チェック**: `satisfies`により、オブジェクト全体が期待する型に適合することを保証
3. **型推論の向上**: より正確な型推論により、IDE支援が向上
4. **実行時の安全性**: 不変のオブジェクトとして扱われるため、誤った変更を防げる

```typescript
// ❌ 避けるべき: リテラル型が失われる
const config1 = {
  port: 3000
} satisfies Config
// config1.port の型は number

// ❌ 避けるべき: 型チェックがされない
const config2 = {
  port: 3000,
  invalid: 'field' // エラーにならない
} as const

// ✅ 推奨: リテラル型を保持しつつ型チェック
const config3 = {
  port: 3000
} as const satisfies Config
// config3.port の型は 3000（リテラル型）
// かつ Config 型に適合することが保証される
```

### ブランド型での使用

```typescript
// Brand型の作成関数を使用
const userId = createUserId(uuidv4())
const customerId = createCustomerId(uuidv4())

// satisfiesで型チェック
const testData = {
  userId,
  customerId,
  createdAt: new Date()
} satisfies {
  userId: UserId
  customerId: CustomerId
  createdAt: Date
}
```

### テストデータの作成

```typescript
// ビルダーパターンとの組み合わせ
const testCustomer = CustomerBuilder
  .create()
  .withEmail("test@example.com")
  .withName("Test User")
  .build() satisfies Customer

// 部分的なモックの作成
const partialMock = {
  id: createCustomerId(uuidv4()),
  email: "test@example.com"
} satisfies Pick<Customer, 'id' | 'email'>
```

### レスポンスデータの型付け

```typescript
// APIレスポンスの型付け
const successResponse = {
  type: 'ok',
  value: {
    data: customer,
    message: 'Customer created successfully'
  }
} satisfies Result<{ data: Customer; message: string }, CustomerError>
```

## ❌ アンチパターン

### 1. 無効な値の型アサーション

```typescript
// ❌ 絶対に避ける
const userId = "invalid-string" as UserId
const customerId = 123 as unknown as CustomerId
```

### 2. 不完全なオブジェクトの型アサーション

```typescript
// ❌ 避ける
const incompleteUser = {
  email: "test@example.com"
  // idやその他の必須フィールドが欠落
} as User
```

### 3. any型を経由した型変換

```typescript
// ❌ 避ける
const data = JSON.parse(jsonString) as any as Customer
```

## 🛠️ 移行ガイド

既存の`as`を`satisfies`に移行する手順：

1. **型アサーションの特定**
   ```bash
   # asを使用している箇所を検索
   grep -r "as\s\+[A-Z]" --include="*.ts" --include="*.tsx"
   ```

2. **適切な作成関数の使用**
   ```typescript
   // Before
   const id = uuidv4() as UserId
   
   // After
   const id = createUserId(uuidv4())
   ```

3. **オブジェクトリテラルの変換**
   ```typescript
   // Before
   const config = { ... } as Config
   
   // After
   const config = { ... } satisfies Config
   ```

4. **型ガードの活用**
   ```typescript
   // 型ガードを使用して安全に型を絞り込む
   if (isValidUserId(value)) {
     // valueはUserId型として扱える
   }
   ```

## 📚 関連リンク

- [TypeScript公式ドキュメント - satisfies演算子](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-9.html#the-satisfies-operator)
- [Brand型の実装ガイド](./branded-types-id-management.md)
- [型安全性の原則](./type-safety-principles.md)