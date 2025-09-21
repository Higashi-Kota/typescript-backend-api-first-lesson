# TypeSpec API型定義ルール

このドキュメントは、TypeSpecでAPIの入出力型を定義する際の厳格なルールを定めます。

## 基本原則

### Optionalフィールドの制約

APIの定義において、**Optional（省略可能）フィールドは検索APIと更新APIにのみ存在し、それ以外のAPIではすべてのフィールドが必須**となります。

#### API種別ごとのOptional制約

| API種別 | Optionalフィールド | 理由 |
|---------|-------------------|------|
| **作成API（Create）** | ❌ なし（すべて必須） | 全フィールドの明示的な設定を要求。値がない場合はnullを明示 |
| **更新API（Update）** | ✅ あり（すべてoptional） | 部分更新を可能にするため |
| **検索API（Search/List）** | ✅ あり（フィルター項目） | 柔軟な検索条件を提供するため |
| **取得API（Get）** | ❌ なし | パスパラメータのIDは必須 |
| **削除API（Delete）** | ❌ なし | パスパラメータのIDは必須 |
| **レスポンス** | ❌ なし（すべて必須） | 一貫性のある形状を保証 |

#### 具体例

```typespec
// ✅ 作成API: Optionalなし、すべて必須（値はnullable）
model CreateCustomerRequest {
  name: string | null;        // 必須キー、null許可
  email: string | null;       // 必須キー、null許可
  phoneNumber: string | null; // 必須キー、null許可
}

// ✅ 更新API: すべてOptional（部分更新）
model UpdateCustomerRequest {
  name?: string;              // Optional: 省略可能
  email?: string;             // Optional: 省略可能
  phoneNumber?: string;       // Optional: 省略可能
}

// ✅ 検索API: 検索条件はOptional
model SearchCustomerRequest {
  @query keyword?: string;    // Optional: 検索条件
  @query city?: string;       // Optional: 検索条件
  @query tags?: string[];     // Optional: 検索条件
}

// ✅ レスポンス: Optionalなし、すべて必須
model CustomerResponse {
  id: CustomerId;             // 必須
  name: string;               // 必須
  email: string | null;       // 必須キー、値はnullable
  phoneNumber: string | null; // 必須キー、値はnullable
  createdAt: utcDateTime;     // 必須
  updatedAt: utcDateTime;     // 必須
}
```

### 1. 入力型（リクエスト）のルール

#### 作成API
- **すべてのフィールドのキーは必須**
- **値は`nullable`（nullを許可）**

#### 更新API
- **すべてのフィールドは`optional`（省略可能）**
- **初期値に戻したい場合は`nullable` + `optional`を使用**
- 省略されたフィールドは更新しない

#### 検索API
- **必須フィールドがある場合**: そのフィールドは必須（省略不可）
- **その他のフィールド**: `optional`（省略可能）

### 2. 出力型（レスポンス）のルール
- **すべてのフィールドのキーは必須**（省略不可）
- **値は型に応じて`nullable`も許可**

## 具体的な実装パターン

### 1. 作成API（Create）

```typespec
@doc("Customer creation request - all keys required, values nullable")
model CreateCustomerRequest {
  // すべてのキーは必須、値はnullable
  name: string | null;
  email: string | null;
  phoneNumber: string | null;
  contactInfo: ContactInfo | null;
  preferences: string | null;
  notes: string | null;
  tags: string[] | null;
  birthDate: plainDate | null;
}

// 使用例（TypeScript）
const request: CreateCustomerRequest = {
  name: "山田太郎",           // OK: 値あり
  email: null,                // OK: null
  phoneNumber: null,          // OK: null
  contactInfo: null,          // OK: null
  preferences: null,          // OK: null
  notes: null,               // OK: null
  tags: null,                // OK: null
  birthDate: null            // OK: null
};

// NG: キーの省略は不可
const invalidRequest = {
  name: "山田太郎"
  // email: null,  // エラー: キーが必須
};
```

### 2. 更新API（Update）

```typespec
@doc("Customer update request - all fields optional for partial updates")
model UpdateCustomerRequest {
  // すべてのフィールドはoptional（部分更新）
  name?: string;
  email?: string;
  phoneNumber?: string;
  contactInfo?: ContactInfo;
  preferences?: string;
  notes?: string;
  tags?: string[];
  birthDate?: plainDate;
}

// 初期値に戻したい場合はnullable + optional
@doc("Customer update request with nullable support - allows resetting to default")
model UpdateCustomerRequestWithReset {
  // optional + nullable: 明示的なnull設定が可能
  name?: string | null;
  email?: string | null;
  phoneNumber?: string | null;
  contactInfo?: ContactInfo | null;
  preferences?: string | null;
  notes?: string | null;
  tags?: string[] | null;
  birthDate?: plainDate | null;
}

// 使用例（TypeScript）
// パターン1: 通常の部分更新（optionalのみ）
const partialUpdate: UpdateCustomerRequest = {
  name: "新しい名前",         // 名前だけ更新
  email: "new@example.com"   // メールも更新
  // 他のフィールドは省略 = 更新しない
};

// パターン2: 初期値リセットを含む更新（optional + nullable）
const updateWithReset: UpdateCustomerRequestWithReset = {
  name: "新しい名前",         // 値を更新
  email: null,               // 明示的にnullに設定（初期値に戻す）
  phoneNumber: undefined     // 省略 = 更新しない
  // 他のフィールドは省略 = 更新しない
};
```

### 3. 検索API（Search/List）

```typespec
@doc("Customer search request - required fields + optional filters")
model SearchCustomerRequest {
  // 必須フィールド（ビジネスロジックで必要な場合）
  salonId: SalonId;          // 必須: サロンIDは省略不可
  
  // 検索フィルター（すべてoptional）
  @query keyword?: string;
  @query tags?: string[];
  @query city?: string;
  @query createdFrom?: utcDateTime;
  @query createdTo?: utcDateTime;
}

// 使用例（TypeScript）
const searchRequest: SearchCustomerRequest = {
  salonId: "salon-123",     // 必須
  // 以下はすべて省略可能
  keyword: "山田",
  tags: ["VIP"]
};

// 必須フィールドのみでもOK
const minimalSearch: SearchCustomerRequest = {
  salonId: "salon-123"      // 必須フィールドのみ
};
```

### 4. 出力型（Response）

```typespec
@doc("Customer response - all keys required")
model CustomerResponse {
  // すべてのキーは必須
  id: CustomerId;
  name: string;
  email: string | null;        // 値はnullableでもOK
  phoneNumber: string | null;   // 値はnullableでもOK
  contactInfo: ContactInfo;
  preferences: string | null;
  notes: string | null;
  tags: string[];
  birthDate: plainDate | null;
  createdAt: utcDateTime;
  updatedAt: utcDateTime;
}

// 使用例（TypeScript）
const response: CustomerResponse = {
  id: "customer-123",
  name: "山田太郎",
  email: "yamada@example.com",
  phoneNumber: null,          // nullable
  contactInfo: { /* ... */ },
  preferences: null,          // nullable
  notes: "VIP顧客",
  tags: ["VIP", "常連"],
  birthDate: null,           // nullable
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-15T00:00:00Z"
};
```

## 実装時の注意点

### 1. undefined、null、値の違い

```typescript
// 更新APIでの3つの状態
interface UpdateRequestWithReset {
  name?: string | null;
  email?: string | null;
  phoneNumber?: string | null;
}

// 実装例
async function updateCustomer(id: string, request: UpdateRequestWithReset) {
  const updates: Partial<Customer> = {};
  
  // 3つの状態を適切に処理
  Object.entries(request).forEach(([key, value]) => {
    if (value === undefined) {
      // undefined = フィールドが省略された = 更新しない
      return;
    } else if (value === null) {
      // null = 明示的に初期値に戻す
      updates[key] = null;
    } else {
      // 値あり = 新しい値で更新
      updates[key] = value;
    }
  });
  
  // 実際の更新処理
  await db.update(id, updates);
}

// 使用例
await updateCustomer('customer-123', {
  name: "新しい名前",      // 更新
  email: null,            // 初期値に戻す
  // phoneNumber は省略    // 更新しない
});
```

### 2. 検索APIの必須フィールド

```typescript
// 必須フィールドがある検索API
interface SearchWithRequiredFields {
  // 必須: マルチテナントでの検索
  tenantId: string;
  
  // オプション: 検索条件
  keyword?: string;
  status?: Status;
}

// バリデーション
function validateSearch(params: SearchWithRequiredFields) {
  if (!params.tenantId) {
    throw new Error('tenantId is required');
  }
  // 他のフィールドはoptionalなのでチェック不要
}
```

### 3. レスポンスの一貫性

```typescript
// 常にすべてのキーを含むレスポンスを返す
async function getCustomer(id: string): Promise<CustomerResponse> {
  const customer = await db.findCustomer(id);
  
  // nullableフィールドも必ず含める
  return {
    id: customer.id,
    name: customer.name,
    email: customer.email ?? null,        // undefinedをnullに変換
    phoneNumber: customer.phoneNumber ?? null,
    contactInfo: customer.contactInfo,
    preferences: customer.preferences ?? null,
    notes: customer.notes ?? null,
    tags: customer.tags || [],
    birthDate: customer.birthDate ?? null,
    createdAt: customer.createdAt,
    updatedAt: customer.updatedAt
  };
}
```

## メリット

### 1. 明確な意図の表現
- `null`: 明示的に「値なし」を設定
- キーの存在: フィールドの処理が必須であることを保証

### 2. 型安全性の向上
- すべてのフィールドの処理を強制
- 意図しないフィールドの省略を防止

### 3. APIの一貫性
- クライアント側で条件分岐が不要
- レスポンスの形状が常に一定

### 4. デバッグの容易さ
- リクエスト/レスポンスの形状が予測可能
- ログ出力時にすべてのフィールドが確認可能

## TypeSpec特有の制約事項

### プロパティ名の一貫性ルール

UIの入出力間口によるAPIのIOデザインは集約粒度をUIに揃えますが、**プロパティ名それぞれはDB定義と揃える**ことを原則とします。

#### 基本原則
1. **DB定義を正とする**: データベースで定義されたフィールド名を基準とする
2. **UIの都合で名前を変更しない**: UIレイヤーでの表示名変更はフロントエンド側で対処
3. **一貫性の維持**: 同じデータを指すプロパティは全レイヤーで同じ名前を使用

#### 具体例

##### ✅ 正しい例
```typespec
// DB定義: websiteUrl
model ContactInfo {
  phoneNumber: string | null;
  email: string | null;
  websiteUrl: string | null;    // DBと同じ名前
}

// DB定義: alternativePhone
model ContactDetails {
  primaryPhone: string | null;
  alternativePhone: string | null;  // DBと同じ名前
}
```

##### ❌ 誤った例
```typespec
// DB定義: websiteUrl だが、UIの都合で変更
model ContactInfo {
  phoneNumber: string | null;
  email: string | null;
  website: string | null;    // NG: DBは websiteUrl
}

// DB定義: alternativePhone だが、短縮
model ContactDetails {
  primaryPhone: string | null;
  altPhone: string | null;    // NG: DBは alternativePhone
}
```

#### 命名マッピングの例

| データベース定義 | TypeSpec/API定義 | 説明 |
|----------------|-----------------|------|
| `websiteUrl` | `websiteUrl` | ✅ 同じ名前を維持 |
| `phoneNumber` | `phoneNumber` | ✅ 同じ名前を維持 |
| `alternativePhone` | `alternativePhone` | ✅ 同じ名前を維持 |
| `postalCode` | `postalCode` | ✅ 同じ名前を維持 |
| `createdAt` | `createdAt` | ✅ 同じ名前を維持 |
| `updatedAt` | `updatedAt` | ✅ 同じ名前を維持 |
| ~~`website`~~ | ❌ | DBが `websiteUrl` の場合は使用不可 |
| ~~`altPhone`~~ | ❌ | DBが `alternativePhone` の場合は使用不可 |
| ~~`zip`~~ | ❌ | DBが `postalCode` の場合は使用不可 |

#### 実装時の注意点

1. **Mapperでの変換を避ける**
   ```typescript
   // ❌ 避けるべきパターン
   toApiContactInfo(db: DbContact): ApiContactInfo {
     return {
       website: db.websiteUrl,  // 名前を変更している
       altPhone: db.alternativePhone  // 名前を変更している
     }
   }

   // ✅ 正しいパターン
   toApiContactInfo(db: DbContact): ApiContactInfo {
     return {
       websiteUrl: db.websiteUrl,  // 同じ名前
       alternativePhone: db.alternativePhone  // 同じ名前
     }
   }
   ```

2. **型定義の整合性確認**
   - TypeSpec定義を変更する際は、必ずDB定義を確認
   - 新規フィールド追加時は、DB側の命名規則に従う
   - 既存フィールドのリネームは原則禁止（マイグレーションが必要な場合のみ検討）

3. **レビューのチェックポイント**
   - [ ] プロパティ名がDB定義と一致しているか
   - [ ] 不要な名前変換を行っていないか
   - [ ] Mapperで名前の変更をしていないか

### プロパティ型の一貫性ルール（Nullable統一）

**API定義のプロパティ型は、DB定義の型と完全に揃える**ことを原則とします。特に**Nullable性（nullを許可するかどうか）はDB定義と必ず一致**させます。

#### 基本原則

1. **DBがNullableならAPIもNullable**: DBでNULL許可のフィールドは、API側でも`Type | null`とする
2. **DBがNOT NULLならAPIも必須**: DBでNOT NULLのフィールドは、API側でもnullを許可しない
3. **型変換の一貫性**: DBとAPIで異なる型（例：numeric → number）でも、Nullable性は維持

#### Nullable一致の例

| DB定義 | API定義 | 説明 |
|--------|---------|------|
| `text('description')` | `description: string \| null` | ✅ 両方Nullable |
| `text('name').notNull()` | `name: string` | ✅ 両方NOT NULL |
| `numeric('rating')` | `rating: number \| null` | ✅ 型は変換するがNullable性は維持 |
| `jsonb('businessHours')` | `businessHours: BusinessHours \| null` | ✅ 構造化してもNullable性は維持 |

#### ❌ 誤った例

```typescript
// DB定義: description text (NULLable)
// ❌ API側でnullを空文字列に変換してはいけない
toApiSalon(dbSalon: DbSalon): ApiSalon {
  return {
    description: dbSalon.description ?? '',  // NG: nullを空文字列に変換
  }
}

// ✅ 正しい例: DBと同じNullable性を維持
toApiSalon(dbSalon: DbSalon): ApiSalon {
  return {
    description: dbSalon.description,  // OK: nullはnullのまま
  }
}
```

#### TypeSpec定義での実装

```typespec
// DBスキーマに基づいた正しいTypeSpec定義
model Salon {
  // DB: id uuid NOT NULL
  id: SalonId;                        // NOT NULL → 必須

  // DB: name text NOT NULL
  name: string;                        // NOT NULL → 必須

  // DB: description text
  description: string | null;          // NULLable → null許可

  // DB: postal_code text
  postalCode: string | null;           // NULLable → null許可

  // DB: rating numeric(3,2)
  rating: float32 | null;              // NULLable → null許可

  // DB: business_hours jsonb
  businessHours: BusinessHours | null; // NULLable → null許可
}
```

#### マッパーでの型変換

```typescript
// DB型とAPI型の変換でNullable性を維持
export const mapDbToApi = (dbSalon: DbSalon): ApiSalon => {
  return {
    id: dbSalon.id,
    name: dbSalon.name,                              // NOT NULL → NOT NULL
    description: dbSalon.description,                // nullable → nullable
    rating: dbSalon.rating
      ? Number.parseFloat(dbSalon.rating)           // numeric → number変換
      : null,                                        // Nullable性は維持
    businessHours: dbSalon.businessHours as BusinessHours | null,
  }
}
```

### API-DB不整合の検証

**API定義にあって、DB定義にないプロパティがないか**を常に検証する必要があります。

#### 検証チェックリスト

- [ ] すべてのAPIプロパティに対応するDBカラムが存在するか
- [ ] DBカラムのNullable性とAPIプロパティのNullable性が一致するか
- [ ] 型変換が必要な場合でも、Nullable性が維持されているか
- [ ] 新規プロパティ追加時に、DB側のマイグレーションが作成されているか

#### 不整合の例と対処

```typescript
// ⚠️ API定義にあるがDB定義にない場合
model Salon {
  // ...
  averagePrice: number | null;  // DB定義にこのカラムがない！
}

// 対処方法:
// 1. DBにカラムを追加するマイグレーションを作成
// 2. ALTER TABLE salons ADD COLUMN average_price numeric(10, 2);
// 3. スキーマを更新してdb:introspectを実行
```

#### エージェント間の協業による検証

プロパティの整合性確認は、複数のエージェントが協力して行います：

1. **typespec-api-architect**: API定義の作成・更新
2. **database-schema-architect**: DB定義との整合性確認、マイグレーション作成
3. **design-review-architect**: 全レイヤーでの型一貫性レビュー

### Enum命名規則

プロジェクトでは、すべてのEnum型名の末尾に`Type`サフィックスを付けることを標準規則としています。

#### 標準命名パターン
```typespec
// すべてのEnumに Type サフィックスを付ける
enum ServiceCategoryType { ... }
enum CustomerStatusType { ... }
enum PaymentMethodType { ... }
enum ReservationStatusType { ... }
enum LoyaltyTierType { ... }
```

#### 既知の問題と対処
TypeSpec v1.2.1およびv1.4.0では、OpenAPI生成時にEnum名の末尾に`Type`を付けると重複エラーの警告が発生します：

```
error @typespec/openapi/duplicate-type-name: Duplicate type name: 'Models.ServiceCategoryType'.
```

これはTypeSpecのOpenAPIジェネレータの既知の問題ですが、実際の型生成とCIビルドには影響しません。

そのため、クエリパラメータなど一部のEnumはTypeSpec上では文字列リテラルの合併型を記述し、OpenAPI生成後に以下のポストプロセスで共通Enumへの`$ref`に差し替えます。

```bash
pnpm generate:spec  # specs側でtsp compile . → postprocess-openapiが順に実行される
```

`specs/scripts/postprocess-openapi.ts`は、生成された`openapi.yaml`内の既知Enumセット（サービスカテゴリ、顧客ステータス、ロイヤリティティア）を検出し、`#/components/schemas/Models.*`へ`$ref`を付与します。列挙値を直書きする TypeSpec 側のメンテナンスコストを抑えつつ、OpenAPIでは共通スキーマを再利用できるようにするためのワークアラウンドです。

#### プロジェクトの方針
1. **一貫性を優先**: すべてのEnumに`Type`サフィックスを付けることで、コードベース全体の一貫性を保つ
2. **警告は許容**: TypeSpecのコンパイル警告は無視し、CIが正常に通ることを確認
3. **型安全性を維持**: 生成される型は正しく動作し、型安全性は保証される

#### 理由
- 区分値を表す型であることを明確にする
- 他の型（Model、Interface等）と区別しやすい
- TypeScript/JavaScriptのコードレビュー時に型の種類が一目で分かる

## アンチパターン

### ❌ 避けるべきパターン

```typespec
// NG: 作成APIでoptionalを使用
model BadCreateRequest {
  name?: string;      // NG: 作成時はキー必須
  email?: string;     // NG: 作成時はキー必須
}

// NG: レスポンスでoptionalを使用
model BadResponse {
  id: string;
  name?: string;      // NG: レスポンスのキーは必須
  email?: string;     // NG: レスポンスのキーは必須
}

// NG: 更新APIでキー必須のみ
model BadUpdateRequest {
  name: string | null;     // NG: 部分更新できない
  email: string | null;    // NG: すべてのフィールドが必要
}
```

### ✅ 正しいパターン

```typespec
// OK: 作成APIはキー必須、値nullable
model GoodCreateRequest {
  name: string | null;     // OK: キー必須、値nullable
  email: string | null;    // OK: キー必須、値nullable
}

// OK: 更新APIはoptional（部分更新）
model GoodUpdateRequest {
  name?: string;           // OK: 部分更新可能
  email?: string;          // OK: 部分更新可能
}

// OK: 更新APIでリセット機能付き
model GoodUpdateRequestWithReset {
  name?: string | null;    // OK: 省略/更新/リセット可能
  email?: string | null;   // OK: 省略/更新/リセット可能
}

// OK: レスポンスはキー必須
model GoodResponse {
  id: string;
  name: string;            // OK: キー必須
  email: string | null;    // OK: キー必須、値nullable可
}
```

## まとめ

| API種別 | キーの扱い | 値の扱い | 例 | 用途 |
|---------|-----------|----------|-----|------|
| 作成API | すべて必須 | nullable | `name: string \| null` | 全フィールドの明示的な設定 |
| 更新API（通常） | すべてoptional | 通常の型 | `name?: string` | 部分更新 |
| 更新API（リセット付き） | すべてoptional | nullable | `name?: string \| null` | 部分更新＋初期値リセット |
| 検索API（必須フィールドあり） | 必須フィールドは必須、他はoptional | 通常の型 | `tenantId: string`<br>`keyword?: string` | 条件付き検索 |
| 検索API（必須フィールドなし） | すべてoptional | 通常の型 | `keyword?: string` | 自由検索 |
| レスポンス | すべて必須 | nullable可 | `email: string \| null` | 完全な情報提供 |

### 更新APIにおける3つの状態

| フィールドの状態 | TypeScript表現 | 意味 | 処理 |
|----------------|---------------|------|------|
| 省略 | `undefined`（キーなし） | 更新しない | スキップ |
| null設定 | `{ field: null }` | 初期値に戻す | DBにnullを設定 |
| 値設定 | `{ field: "value" }` | 新しい値で更新 | DBに値を設定 |

この規約に従うことで、型安全で一貫性のあるAPIを実装できます。

## モデル定義の標準化ルール

### 検索リクエストモデルの命名規則

すべての検索APIのパラメータモデルは`SearchXXXRequest`という命名規則に従います。

#### 基本原則
1. **命名パターン**: `Search{DomainName}Request` (例: `SearchSalonRequest`, `SearchCustomerRequest`)
2. **継承**: `AdvancedSearchParams`を継承して共通のページネーション機能を提供
3. **配置**: 各ドメインのモデルファイル（`specs/models/{domain}.tsp`）に定義

#### ✅ 正しい例
```typespec
// specs/models/salon.tsp
model SearchSalonRequest extends AdvancedSearchParams {
  #suppress "@typespec/http/metadata-ignored" "Treated as queryParams"
  @query
  @doc("Search keyword")
  keyword?: string;

  #suppress "@typespec/http/metadata-ignored" "Treated as queryParams"
  @query
  @doc("Filter by city")
  city?: string;
}

// specs/models/customer.tsp
model SearchCustomerRequest extends AdvancedSearchParams {
  #suppress "@typespec/http/metadata-ignored" "Treated as queryParams"
  @query
  @doc("Search in customer name, email, or phone")
  search?: string;
}
```

#### ❌ 避けるべきパターン
```typespec
// NG: 古い命名規則
model SalonSearchParams { ... }  // SearchSalonRequest を使用すべき
model CustomerSearchParams { ... }  // SearchCustomerRequest を使用すべき

// NG: Operationsネームスペースでの定義
namespace BeautySalon.Operations {
  model SalonSearchParams { ... }  // models/salon.tsp に移動すべき
}
```

#### CrudOperationsインターフェースでの使用
```typespec
// specs/operations/salon-operations.tsp
interface SalonCrud
  extends CrudOperations<
      Salon,
      CreateSalonRequest,
      UpdateSalonRequest,
      SearchSalonRequest,  // SearchXXXRequest パターンを使用
      SalonId
    >
```

### モデル定義の配置ルール

すべてのドメインモデルは`specs/models/`配下の適切なファイルに配置します。

#### 基本原則
1. **Operationsネームスペース禁止**: `namespace BeautySalon.Operations`内でモデルを定義しない
2. **ドメイン別ファイル**: 各ドメインごとに専用のモデルファイルを持つ
3. **関連モデルの集約**: 同一ドメインに関連するすべてのモデルを同じファイルに配置

#### ファイル構成
```
specs/
├── models/                    # すべてのモデル定義
│   ├── salon.tsp             # Salonドメインのモデル
│   ├── customer.tsp          # Customerドメインのモデル
│   ├── staff.tsp             # Staffドメインのモデル
│   ├── service.tsp           # Serviceドメインのモデル
│   └── common.tsp            # 共通モデル
└── operations/               # オペレーション定義のみ
    ├── salon-operations.tsp  # モデルを含まない、オペレーションのみ
    └── customer-operations.tsp
```

#### 移行パターン
```typespec
// ❌ Before: operations/customer-operations.tsp
namespace BeautySalon.Operations {
  model CustomerStatistics { ... }  // NG: Operationsに定義
  model CustomerPreferences { ... }

  interface CustomerCrud { ... }
}

// ✅ After: models/customer.tsp
namespace BeautySalon.Models {
  model CustomerStatistics { ... }  // OK: Modelsに移動
  model CustomerPreferences { ... }
  model SearchCustomerRequest { ... }
}

// ✅ After: operations/customer-operations.tsp
namespace BeautySalon.Operations {
  // モデル定義なし、オペレーションのみ
  interface CustomerCrud { ... }
}
```

### モデル移行のチェックリスト

既存コードを標準化する際の確認事項：

- [ ] `XXXSearchParams`を`SearchXXXRequest`にリネーム
- [ ] Operationsネームスペース内のモデルをModelsネームスペースに移動
- [ ] CrudOperations等のインターフェースの型引数を新しいモデル名に更新
- [ ] 各モデルファイルに必要なimport文を追加
- [ ] @queryデコレータに#suppressディレクティブを追加（必要な場合）
- [ ] 型生成を実行して正しくコンパイルされることを確認

### 実装例：完全な移行

#### Step 1: モデルの移動と改名
```typespec
// specs/models/customer.tsp
import "./_shared/common-api-patterns.tsp";

namespace BeautySalon.Models {
  // 旧 CustomerSearchParams → SearchCustomerRequest
  model SearchCustomerRequest extends AdvancedSearchParams {
    #suppress "@typespec/http/metadata-ignored" "Treated as queryParams"
    @query
    search?: string;
    // ...
  }

  // Operationsから移動したモデル
  model CustomerStatistics {
    totalBookings: int32;
    // ...
  }
}
```

#### Step 2: オペレーションの更新
```typespec
// specs/operations/customer-operations.tsp
namespace BeautySalon.Operations {
  // モデル定義を削除（models/customer.tspに移動済み）

  interface CustomerCrud
    extends CrudOperations<
        Customer,
        CreateCustomerRequest,
        UpdateCustomerRequest,
        SearchCustomerRequest,  // 新しい名前を使用
        CustomerId
      >
}
```

#### Step 3: 型生成と検証
```bash
# TypeSpec → OpenAPI生成
pnpm generate:spec

# OpenAPI → TypeScript型生成
pnpm generate:backend

# ビルド検証
pnpm typecheck
```

### ドメインモデルでの使用

TypeScriptドメインモデル層では、生成された型を直接参照：

```typescript
// backend/packages/domain/src/models/salon.ts
import type { components } from '@beauty-salon-backend/generated';

// 生成された型を直接使用
export type SalonSearchParams = components['schemas']['Models.SearchSalonRequest'];
```

この標準化により、コードベース全体で一貫性のある命名と構造を維持できます。
