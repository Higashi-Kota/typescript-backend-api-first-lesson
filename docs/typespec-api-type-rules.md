# TypeSpec API型定義ルール

このドキュメントは、TypeSpecでAPIの入出力型を定義する際の厳格なルールを定めます。

## 基本原則

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
    email: customer.email || null,        // undefinedをnullに変換
    phoneNumber: customer.phoneNumber || null,
    contactInfo: customer.contactInfo,
    preferences: customer.preferences || null,
    notes: customer.notes || null,
    tags: customer.tags || [],
    birthDate: customer.birthDate || null,
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