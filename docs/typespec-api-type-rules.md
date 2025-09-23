# TypeSpec API型定義ルール

TypeSpecでAPIの入出力型を定義する際の厳格なルールとBeauty Salon Reservation SystemにおけるAPI命名規則の完全リファレンス。

## 🔴 必須要件: Nullableプロパティの@doc

**重要**: すべてのnullableプロパティ（`Type | null`）は、`@doc`アノテーション内でnullになる条件を必ず説明しなければなりません。これはコードレビューの必須チェック項目です。

例: `@doc("メールアドレス。メール通知不要の場合はnull")`

詳細は[Nullableプロパティの@doc必須要件](#nullableプロパティのdoc必須要件)セクションを参照。

## 📝 モデル命名規則

### 入力モデル（Request）

| 操作 | パターン | 例 |
|-----|---------|-----|
| 作成 | `{Domain}CreateRequest` | `CustomerCreateRequest` |
| 更新 | `{Domain}UpdateRequest` | `CustomerUpdateRequest` |
| 削除 | `{Domain}DeleteRequest` | `CustomerDeleteRequest` |
| 一括作成 | `{Domain}BulkCreateRequest` | `CustomerBulkCreateRequest` |
| 一括更新 | `{Domain}BulkUpdateRequest` | `CustomerBulkUpdateRequest` |
| 一括削除 | `{Domain}BulkDeleteRequest` | `CustomerBulkDeleteRequest` |
| 取得 | `{Domain}{Context}GetRequest` | `CustomerBookingsGetRequest` |
| 検索 | `{Domain}SearchRequest` | `CustomerSearchRequest` |

### 出力モデル（Response）

- **統一パターン**: `{Domain}Response` (例: `CustomerResponse`)
- **特殊操作**: `{Prefix}{Action}Response` (必要な場合のみ)

### 特殊操作パターン

- **認証/アクション系**: `{Prefix}{Action}Request`
  - 例: `AuthLoginRequest`, `AuthRegisterRequest`, `AuthPasswordResetRequest`

## 🔒 Nullable と Optional ルール

### ベースモデル（エンティティ）の定義

| フィールド性質 | TypeSpec定義 | 説明 |
|--------------|-------------|------|
| 必須（NOT NULL） | `field: Type` | 常に値が存在 |
| 任意（NULLABLE） | `field: Type \| null` | 未設定可能（DBでNULLABLE） |
| 配列 | `field: Type[] \| null` | 空配列でなくnullで未設定表現 |
| オブジェクト | `field: Type \| null` | 空オブジェクトでなくnullで未設定表現 |

**⚠️ 重要**: ベースモデルでOptional (`?`) は使用禁止
- ❌ `description?: string`
- ✅ `description: string | null`

**適用対象**: ドメインエンティティ、共有モデル、ラッパーモデル、サブモデル
**例外**: 検索パラメータモデルはOptional可

### 例

```typespec
// ベースモデル
model InventoryItem {
  id: InventoryId;
  productName: string;
  description: string | null;    // ✅ nullableで未設定表現
}

// 検索リクエスト
model InventorySearchRequest {
  @query salonId: SalonId;       // 必須
  @query category?: string;      // ✅ @queryはOptional可
}

// 更新リクエスト
model InventoryItemUpdateRequest {
  productName?: string;           // ✅ 更新はOptional
  description?: string | null;    // ✅ nullリセット可
}
```

### Optional フィールドの使用制約

| モデル種別 | パターン | Optional使用 | 理由 |
|----------|---------|------------|------|
| **更新リクエスト** | `*UpdateRequest` | ✅ すべてOptional | 部分更新 |
| **検索リクエスト** | `*SearchRequest` | ✅ @queryのみOptional | 柔軟な検索 |
| **@queryパラメータ** | 任意のモデル内 | ✅ @queryのみOptional | URLパラメータ |
| **ベースモデル** | エンティティ名のみ | ❌ 禁止（nullableを使用） | 形状の一貫性 |
| **作成リクエスト** | `*CreateRequest` | ❌ 禁止（すべて必須） | 明示的設定 |
| **レスポンス** | `*Response` | ❌ 禁止（すべて必須） | 一貫性保証 |

## 📋 API種別ごとのルールサマリー

| API種別 | キー | 値 | 例 |
|--------|-----|-----|-----|
| **作成** | すべて必須 | nullable | `name: string \| null` |
| **更新** | すべてOptional | 基本モデルに従う | `name?: string` (NOT NULL)<br>`email?: string \| null` (nullable) |
| **検索** | 必須フィールド以外Optional | 通常の型 | `tenantId: string`<br>`keyword?: string` |
| **レスポンス** | すべて必須 | nullable可 | `email: string \| null` |

### 更新APIにおける3つの状態

| 状態 | TypeScript表現 | 意味 | 処理 |
|-----|---------------|------|------|
| 省略 | `undefined`（キーなし） | 更新しない | スキップ |
| null設定 | `{ field: null }` | 初期値に戻す | DBにnull設定 |
| 値設定 | `{ field: "value" }` | 新しい値で更新 | DBに値設定 |

## 💡 実装のポイント

### 更新処理での3状態の扱い

```typescript
// UpdateRequestでの処理例
Object.entries(request).forEach(([key, value]) => {
  if (value === undefined) return;     // 省略 = 更新しない
  if (value === null) updates[key] = null;  // null = 初期値リセット
  else updates[key] = value;           // 値 = 更新
});
```

### レスポンスの一貫性確保

```typescript
// undefinedをnullに統一
return {
  id: customer.id,
  email: customer.email ?? null,  // undefined → null変換
  tags: customer.tags ?? [],      // undefined → 空配列
};
```

## 🔧 DB-API整合性ルール

### プロパティ名の一貫性

**原則**: プロパティ名はDB定義と完全一致させる

| DB定義 | API定義 | 判定 |
|--------|---------|------|
| `websiteUrl` | `websiteUrl` | ✅ |
| `websiteUrl` | ~~`website`~~ | ❌ |
| `alternativePhone` | `alternativePhone` | ✅ |
| `alternativePhone` | ~~`altPhone`~~ | ❌ |

**Mapperでの実装**:
```typescript
// ✅ 正しい: 名前変換なし
toApiContact(db): ApiContact {
  return {
    websiteUrl: db.websiteUrl,
    alternativePhone: db.alternativePhone
  }
}
```

### Nullable性の統一

**原則**: DB定義のNullable性とAPI定義を完全一致させる

| DB定義 | API定義 | 判定 |
|--------|---------|------|
| `text('name')` | `name: string \| null` | ✅ |
| `text('name').notNull()` | `name: string` | ✅ |
| `numeric('rating')` | `rating: number \| null` | ✅ |
| `text('desc')` | ~~`desc: string`~~ | ❌ |

**型変換時の注意**:
```typescript
// ✅ 正しい: Nullable性維持
rating: dbSalon.rating
  ? Number.parseFloat(dbSalon.rating)
  : null,

// ❌ 誤り: nullを空文字列に変換
description: dbSalon.description ?? '',
```

### API-DB整合性の検証

**チェックリスト**:
- [ ] APIプロパティに対応するDBカラムが存在
- [ ] Nullable性が一致
- [ ] 新規プロパティ追加時にマイグレーション作成

## 📝 日本語@docアノテーション要件

### 基本ルール

**すべてのモデルプロパティに日本語`@doc`アノテーションを必須とする**

これは以下のすべてに適用されます:
- ベースモデルのプロパティ
- リクエストモデルのプロパティ
- レスポンスモデルのプロパティ
- サブモデルのプロパティ
- Enum型の定義と値

### 🔴 Nullableプロパティの@doc必須要件

**すべてのnullableプロパティ（`Type | null`）は、`@doc`内でnullになる条件を必ず説明すること**

これはコードレビューにおける必須チェック項目です。nullableプロパティで条件説明がない場合、レビューを通過できません。

#### Nullableプロパティの説明パターン

| パターン | 使用場面 | 例 |
|---------|----------|-----|
| 未設定の場合null | 任意項目 | `@doc("サロンの説明文。未設定の場合はnull")` |
| 初回登録時はnull | 段階的入力 | `@doc("メールアドレス。初回登録時はnull")` |
| オプション項目のためnull可 | 追加情報 | `@doc("代替連絡先。オプション項目のためnull可")` |
| 未確定の場合null | 状態遷移 | `@doc("承認日時。未承認の場合はnull")` |
| 該当なしの場合null | 条件付き | `@doc("キャンセル理由。キャンセル以外はnull")` |
| システム未設定時null | 自動設定 | `@doc("システム生成ID。生成前はnull")` |

#### ✅ 正しい例

```typespec
model Customer {
  @doc("顧客を一意に識別するID")
  id: CustomerId;

  @doc("顧客の正式な氏名（姓と名の間に半角スペース）")
  name: string;

  @doc("メールアドレス。メール通知不要の顧客はnull")
  email: string | null;

  @doc("電話番号。緊急連絡先として必須")
  phoneNumber: string;

  @doc("代替電話番号。未登録の場合はnull")
  alternativePhoneNumber: string | null;

  @doc("誕生日。プロフィール未入力の場合はnull")
  birthDate: plainDate | null;

  @doc("最終来店日。初回予約前はnull")
  lastVisitDate: utcDateTime | null;

  @doc("お気に入りスタイリストID。未指定の場合はnull")
  favoriteStaffId: StaffId | null;

  @doc("アレルギー情報。申告なしの場合はnull")
  allergyInfo: AllergyDetail[] | null;
}
```

#### ❌ 誤った例（null条件の説明なし）

```typespec
model Customer {
  @doc("顧客ID")  // ✅ NOT NULLなので説明不要
  id: CustomerId;

  @doc("メールアドレス")  // ❌ nullableなのに条件説明なし
  email: string | null;

  @doc("代替連絡先")  // ❌ nullableなのに条件説明なし
  alternativePhoneNumber: string | null;

  @doc("誕生日")  // ❌ nullableなのに条件説明なし
  birthDate: plainDate | null;

  @doc("アレルギー情報")  // ❌ nullableなのに条件説明なし
  allergyInfo: AllergyDetail[] | null;
}
```

#### 複雑なビジネスロジックの説明

ビジネスルールが複雑な場合は、より詳細な説明を記載:

```typespec
model Reservation {
  @doc("予約確定日時。仮予約中はnull、確定後にシステムが自動設定")
  confirmedAt: utcDateTime | null;

  @doc("キャンセル日時。有効な予約の場合はnull、キャンセル処理時に記録")
  cancelledAt: utcDateTime | null;

  @doc("ノーショウフラグ設定日時。来店した場合はnull、無断キャンセル時に設定")
  noShowAt: utcDateTime | null;

  @doc("実際のサービス開始時刻。予約時点では未確定のためnull、来店後に記録")
  actualStartTime: plainTime | null;

  @doc("割引適用情報。通常料金の場合はnull、キャンペーン適用時のみ設定")
  discountInfo: DiscountDetail | null;
}
```

#### コードレビューチェックリスト

Nullableプロパティのレビュー時に確認すること:

- [ ] すべての`Type | null`プロパティに`@doc`が存在
- [ ] `@doc`内でnull条件が明確に説明されている
- [ ] null条件がビジネスロジックと一致している
- [ ] 説明が具体的で曖昧さがない
- [ ] DB定義のNULLABLE制約と整合性がある

### モデルプロパティへの@doc適用

**形式**: 日本語での簡潔な説明を記載

```typespec
// ベースモデルの例
model Salon {
  @doc("サロンを一意に識別するID")
  id: SalonId;

  @doc("公式名称またはブランド名称")
  name: string;

  @doc("サロンの特徴やコンセプトを伝える説明文。未設定の場合はnull")
  description: string | null;

  @doc("所在地・アクセス・郵便番号等を含む住所情報")
  address: Address;

  @doc("電話・メール・SNS等の問い合わせ窓口情報")
  contactInfo: ContactInfo;
}

// リクエストモデルの例
model CreateSalonRequest {
  @doc("新規登録時に必須となるサロン名")
  name: string;

  @doc("サロン紹介文。未設定の場合はnullで送信")
  description: string | null;

  @doc("店舗の正規住所・連絡先配送先")
  address: Address;
}

// 更新リクエストの例
model UpdateSalonRequest {
  @doc("名称変更を行う場合に指定")
  name?: string;

  @doc("紹介文を更新する場合に指定（null指定で初期化可能）")
  description?: string | null;
}

// サブモデルの例
model Address {
  @doc("郵便番号（ハイフンなし7桁）")
  postalCode: string;

  @doc("都道府県名")
  prefecture: string;

  @doc("市区町村名")
  city: string;

  @doc("町名・番地・建物名など")
  streetAddress: string;

  @doc("建物名・部屋番号など。未入力の場合はnull")
  buildingName: string | null;
}
```

### モデル全体への@doc適用

モデル定義自体にも説明を付与:

```typespec
@doc("""
  サロン基本情報モデル - 美容室の店舗情報、顧客向け公開情報、運営に必要な基礎データを一元管理する
  """)
model Salon { ... }

@doc("""
  サロン新規登録リクエスト - 全項目のキーが必須で、値は業務要件に応じてnull許可
  """)
model CreateSalonRequest { ... }

@doc("""
  住所情報モデル - 配送先や店舗所在地を表現する共通構造
  """)
model Address { ... }
```

### @docアノテーションのベストプラクティス

1. **簡潔性**: プロパティの目的を端的に説明
2. **一貫性**: 同じ概念には同じ表現を使用
3. **完全性**: null許可やデフォルト値について明記（**nullableは必須**）
4. **業務文脈**: ビジネスロジックとの関連を説明

```typespec
// ❌ 不適切: 説明が不足
@doc("名前")
name: string;

// ✅ 適切: 具体的で明確
@doc("顧客の姓名（姓と名の間に半角スペース）")
name: string;

// ❌ 不適切: null可能性の説明なし（コードレビューで却下）
@doc("電話番号")
phone: string | null;

// ✅ 適切: null条件を明記
@doc("緊急連絡先電話番号。未登録の場合はnull")
phone: string | null;

// ❌ 不適切: 業務的な意味が不明
@doc("フラグ")
isActive: boolean;

// ✅ 適切: 業務上の意味が明確
@doc("アカウントの有効状態。falseの場合ログイン不可")
isActive: boolean;
```

## 🏷️ Enum型の規則

### 命名規則

**すべてのEnum型に`Type`サフィックスを付ける**

```typespec
enum ServiceCategoryType { ... }
enum PaymentMethodType { ... }
enum ReservationStatusType { ... }
```

### Enum型への日本語@docアノテーション

```typespec
@doc("""
  アレルギー重篤度区分 - アレルギー反応の重篤度を表し、対応レベルを決定

  mild: 軽度 - 軽いかゆみや赤み程度、通常の施術で注意すれば対応可能
  moderate: 中等度 - 明確な皮膚反応、特別な配慮や代替品の使用が必要
  severe: 重度 - 激しい反応、特定の施術を避けるべきレベル
  """)
enum AllergySeverityType { mild, moderate, severe }

@doc("""
  認証状態区分 - ユーザーの認証状態を表す区分

  notAuthenticated: 未認証 - 認証が完了していない状態
  authenticated: 認証済み - 正常に認証された状態
  sessionExpired: セッション失効 - セッションがタイムアウトした状態
  accountLocked: アカウントロック - セキュリティ理由でロックされた状態
  """)
enum AuthenticationStateType { notAuthenticated, authenticated, sessionExpired, accountLocked }
```

**Enumフォーマット**:
1. 1行目: Enum全体の説明
2. 空行
3. 各値: `値名: 日本語名 - 詳細説明`

### 既知の問題

TypeSpecでEnum名に`Type`を付けると重複エラー警告が出るが、実際の型生成には影響なし。CIは正常動作。


## ⚠️ TypeSpec制約事項

### Spread演算子の@doc制限

```typespec
// ❌ エラー: spread演算子に@doc不可
model MyModel {
  @doc("共通プロパティ")  // エラー
  ...CommonProperties;
}

// ✅ 正しい: 参照元で@doc定義
@doc("監査情報")
model AuditInfo {
  @doc("作成日時") createdAt: utcDateTime;
  @doc("更新日時") updatedAt: utcDateTime;
}

model Salon {
  @doc("サロンID") id: SalonId;
  ...AuditInfo;  // @docなし
}
```

## 📂 モデル定義の配置ルール

### 検索リクエストモデル

**命名**: `{Domain}SearchRequest` (例: `SalonSearchRequest`)
**継承**: `AdvancedSearchParams`を継承
**配置**: `specs/models/{domain}.tsp`

### ファイル構成

```
specs/
├── models/              # すべてのモデル定義
│   ├── _shared/        # 共通定義
│   └── {domain}.tsp    # 各ドメインのモデル
└── operations/         # オペレーション定義のみ
```

**原則**:
- Operationsネームスペース内でモデル定義禁止
- ドメインごとに専用ファイル
- 関連モデルは同一ファイルに集約

## 📚 関連ドキュメント

- [Backend Architecture Guidelines](./backend-architecture-guidelines.md)
- [Multi-Agent Collaboration Framework](./multi-agent-collaboration-framework.md)
- [API Testing Guide](./api-testing-guide.md)
