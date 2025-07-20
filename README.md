# TypeScript Backend API-First Development

このプロジェクトは、TypeSpecを使用したAPI-First開発アプローチで構築された、美容室予約システムのバックエンドアプリケーションです。CLAUDE.mdのガイドラインに徹底準拠し、型安全性とクリーンアーキテクチャを実現しています。

## 🏗️ アーキテクチャ

### 基本原則

1. **API-First開発**: TypeSpec/OpenAPIからの型定義自動生成
2. **クリーンアーキテクチャ**: ビジネスロジックとインフラストラクチャの分離
3. **型安全性の徹底**: Sum型とts-patternによる網羅的処理
4. **例外フリー**: Result型によるエラーハンドリング
5. **テスタビリティ**: testcontainersによる統合テスト

### レイヤー構造

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Database  │ <-> │ Repository   │ <-> │  Use Cases   │ <-> │ API Routes   │ <-> │   Frontend   │
└─────────────┘     └──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
       ↑                    ↑                     ↑                     ↑                     ↑
   DB Schema        Repository Interface    Domain Models         Request/Response      API Client
                    (Domain Layer)          (Domain Layer)        (Generated Types)    (Generated)
```

## 📁 プロジェクト構造

```
.
├── specs/                      # 🔥 TypeSpec API定義（すべての起点）
│   ├── main.tsp               # メインエントリーポイント
│   ├── models/                # データモデル定義
│   │   ├── customer.tsp       # 顧客モデル
│   │   ├── salon.tsp          # サロンモデル
│   │   ├── staff.tsp          # スタッフモデル
│   │   ├── service.tsp        # サービスモデル
│   │   ├── reservation.tsp    # 予約モデル
│   │   ├── booking.tsp        # ブッキングモデル
│   │   └── review.tsp         # レビューモデル
│   └── operations/            # API操作定義
│       ├── customer-operations.tsp
│       ├── salon-operations.tsp
│       └── ...
│
├── backend/
│   ├── packages/
│   │   ├── domain/            # ⭐ ドメイン層（純粋なビジネスロジック）
│   │   │   ├── models/        # ドメインモデル（Sum型）
│   │   │   │   ├── customer.ts    # 顧客モデル
│   │   │   │   ├── salon.ts       # サロンモデル
│   │   │   │   ├── staff.ts       # スタッフモデル
│   │   │   │   ├── service.ts     # サービスモデル
│   │   │   │   ├── reservation.ts # 予約モデル
│   │   │   │   ├── booking.ts     # ブッキングモデル
│   │   │   │   └── review.ts      # レビューモデル
│   │   │   ├── repositories/  # リポジトリインターフェース
│   │   │   └── shared/        # Result型、Brand型、エラー型
│   │   │
│   │   ├── usecase/          # ⭐ ユースケース層（アプリケーションロジック）
│   │   │   └── customer/     # 顧客関連のユースケース
│   │   │
│   │   ├── infrastructure/   # ⭐ インフラストラクチャ層
│   │   │   ├── database/     # DBスキーマ（Drizzle）
│   │   │   └── repositories/ # リポジトリ実装（全モデル実装済み）
│   │   │
│   │   ├── api/             # ⭐ API層（HTTPハンドラー）
│   │   │   ├── routes/      # Expressルート
│   │   │   └── middleware/  # ミドルウェア
│   │   │
│   │   └── types/           # 自動生成された型定義
│   │       └── src/generated/
│   │
│   └── apps/
│       ├── server/          # APIサーバー
│       └── migration/       # データベースマイグレーション
│
├── frontend/
│   └── packages/
│       └── api-client/      # 自動生成されたAPIクライアント
│           └── src/generated/
│
└── docs/                    # プロジェクトドキュメント
    ├── typespec-api-type-rules.md
    ├── backend-architecture-guidelines.md
    └── ...
```

## 🚀 開発フロー

### 1. API定義の作成/更新（TypeSpec）

```bash
# TypeSpecでAPI定義を編集
vim specs/models/customer.tsp

# 型定義ルール：
# - 作成API: 必須フィールドとオプショナルフィールドを分離
# - 更新API: すべてoptional（リセット機能付きはnullable追加）
# - 検索API: 必須パラメータ以外はoptional
# - レスポンス: すべてのキーは必須
```

### 2. 型の自動生成

```bash
# すべての型を生成（TypeSpec → OpenAPI → TypeScript）
pnpm run generate

# 生成される成果物:
# - backend/packages/types/src/generated/api-types.ts
# - frontend/packages/api-client/src/generated/
```

### 3. ドメインモデルの実装（Sum型）

```typescript
// packages/domain/src/models/customer.ts
export type Customer =
  | { type: 'active'; data: CustomerData }
  | { type: 'suspended'; data: CustomerData; reason: string }
  | { type: 'deleted'; data: CustomerData; deletedAt: Date }

// ドメインロジック（純粋関数）
export const createCustomer = (
  id: CustomerId,
  input: CreateCustomerInput
): Result<Customer, CustomerError> => {
  // バリデーションとビジネスルール
}
```

### 4. リポジトリインターフェースの定義

```typescript
// packages/domain/src/repositories/customer.repository.ts
export interface CustomerRepository {
  findById(id: CustomerId): Promise<Result<Customer, RepositoryError>>
  save(customer: Customer): Promise<Result<Customer, RepositoryError>>
  search(criteria: CustomerSearchCriteria, pagination: PaginationParams): 
    Promise<Result<PaginatedResult<Customer>, RepositoryError>>
}
```

### 5. ユースケースの実装（例外フリー）

```typescript
// packages/usecase/src/customer/create-customer.usecase.ts
export const createCustomerUseCase = async (
  input: CreateCustomerUseCaseInput,
  deps: { customerRepository: CustomerRepository }
): Promise<Result<Customer, CreateCustomerUseCaseError>> => {
  // 1. メールの重複チェック
  const existing = await deps.customerRepository.findByEmail(input.email)
  if (existing.type === 'err') return existing
  if (existing.value !== null) {
    return err({ type: 'duplicateEmail', email: input.email })
  }
  
  // 2. ドメインモデルの作成
  const customerResult = createCustomer(generateId(), input)
  if (customerResult.type === 'err') return customerResult
  
  // 3. リポジトリに保存
  return deps.customerRepository.save(customerResult.value)
}
```

### 6. APIハンドラーの実装（型安全）

```typescript
// packages/api/src/routes/customers.ts
router.post('/', async (req, res) => {
  // OpenAPI型を使用
  const body: components['schemas']['Models.CreateCustomerRequest'] = req.body
  
  // ユースケース実行
  const result = await createCustomerUseCase(
    mapCreateCustomerRequest(body),
    { customerRepository }
  )
  
  // パターンマッチングでレスポンス
  return match(result)
    .with({ type: 'ok' }, ({ value }) => 
      res.status(201).json(mapCustomerToResponse(value))
    )
    .with({ type: 'err', error: { type: 'duplicateEmail' } }, ({ error }) =>
      res.status(409).json({
        code: 'DUPLICATE_EMAIL',
        message: `Email already exists: ${error.email}`
      })
    )
    .with({ type: 'err' }, ({ error }) => 
      res.status(400).json(createErrorResponse(error))
    )
    .exhaustive()
})
```

## 🔧 セットアップ

### 必要な環境

- Node.js 24+
- PostgreSQL 15+
- pnpm 10+
- Docker & Docker Compose

### 初回セットアップ

```bash
# 1. 依存関係のインストール
make install

# 2. 環境変数の設定
cp .env.example .env

# 3. 必要なサービスの起動（PostgreSQL, MailHog, MinIO, Prometheus, Grafana）
make docker-up

# 4. データベースのセットアップ
make db-migrate
make db-seed  # サンプルデータの投入（任意）
```

### サービスへのアクセス

開発環境では以下のサービスが利用可能です：

- **バックエンドAPI**: http://localhost:4010
- **フロントエンド**: http://localhost:3001
- **MailHog** (メール確認): http://localhost:8025
- **MinIO** (オブジェクトストレージ): http://localhost:9001
- **Prometheus** (メトリクス監視): http://localhost:9090
- **Grafana** (ダッシュボード): http://localhost:3100 (初期認証: admin/admin)
- **PostgreSQL Exporter** (DBメトリクス): http://localhost:9187/metrics

### バックエンド開発

バックエンドは複数のパッケージが相互依存しているため、ホットリロードではなく「ビルド＆再起動」方式を推奨します。

```bash
# 1. バックエンドをビルド
make backend-build

# 2. ビルドされたサーバーを起動
make backend-start

# 3. コードを変更したら、Ctrl+Cでサーバーを停止して1に戻る
```

### フロントエンド開発

フロントエンドはパッケージ間の依存関係があるため、事前ビルドが必要です。

```bash
# 1. フロントエンドパッケージをビルド（初回または依存関係更新時）
make frontend-build

# 2. 開発サーバーを起動（Watchモード）
make frontend-dev
```

**注意**: `make frontend-build`はpnpmのワークスペース機能を使用して、依存関係を自動的に解決し、正しい順序でビルドします。

### 便利なコマンド

```bash
# 型チェック
make typecheck

# リント
make lint

# フォーマット
make format

# テスト
make test

# 完全クリーンアップ（問題発生時）
make fresh
```

### 開発ワークフロー

実際の開発シナリオごとの詳細な手順については、以下のドキュメントを参照してください：

📖 **[開発ワークフローガイド](./docs/development-workflow.md)**

- TypeSpec API定義を変更する場合の手順
- 新しい依存関係を追加する場合の手順
- 新しいエンドポイントを追加する場合の手順
- データベーススキーマを変更する場合の手順
- バグ修正を行う場合の手順

## 🧪 テスト

### ユニットテスト

```bash
# すべてのテストを実行
pnpm test

# 特定のパッケージのテストを実行
pnpm --filter @beauty-salon/domain test
pnpm --filter @beauty-salon/usecase test
```

### 統合テスト

```bash
# testcontainersを使用した統合テスト
pnpm test:integration
```

### テスト戦略

1. **ドメイン層**: 純粋関数のユニットテスト
2. **ユースケース層**: モックを使用したビジネスロジックのテスト
3. **リポジトリ層**: testcontainersを使用した実DBテスト
4. **API層**: スーパーテストによるE2Eテスト

## 📝 主要な設計パターン

### Result型によるエラーハンドリング

```typescript
type Result<T, E> = 
  | { type: 'ok'; value: T }
  | { type: 'err'; error: E }

// 例外を投げずにエラーを扱う
const result = await customerRepository.findById(id)
if (result.type === 'err') {
  return result // エラーを伝播
}
// result.value は Customer 型として安全に使用可能
```

### Sum型とパターンマッチング

```typescript
// すべての状態を網羅的に処理
match(customer)
  .with({ type: 'active' }, ({ data }) => 
    // アクティブな顧客の処理
  )
  .with({ type: 'suspended' }, ({ data, reason }) => 
    // 停止中の顧客の処理
  )
  .with({ type: 'deleted' }, ({ data, deletedAt }) => 
    // 削除済み顧客の処理
  )
  .exhaustive() // すべてのケースを網羅していることを保証
```

### Brand型によるID管理

```typescript
// 異なるエンティティのIDを型レベルで区別
type CustomerId = Brand<string, 'CustomerId'>
type SalonId = Brand<string, 'SalonId'>

// コンパイル時にIDの誤用を防止
function bookAppointment(customerId: CustomerId, salonId: SalonId) {
  // customerIdとsalonIdを間違えて渡すとコンパイルエラー
}
```

## 🛠️ 開発ツール

### コード品質

```bash
# Linting（Biome使用）
pnpm lint

# フォーマット
pnpm format

# 型チェック
pnpm typecheck

# 未使用コードの検出
pnpm knip
```

### デバッグ

```bash
# 開発サーバーの起動（ホットリロード付き）
pnpm dev

# ログレベルの設定
LOG_LEVEL=debug pnpm dev

# 特定のパッケージのみ起動
pnpm --filter @beauty-salon/api dev
```

## 🗄️ データベースマイグレーション

### マイグレーションコマンド

```bash
# 1. マイグレーションファイルの生成（スキーマ変更時）
pnpm run db:generate

# 2. マイグレーションの実行
pnpm run db:migrate

# 3. データベースのリセット（開発環境のみ）
pnpm run db:reset

# 4. シードデータの投入
pnpm run db:seed
```

### 冪等性を意識した運用方法

#### 開発環境での洗い替え手順

開発初期や大規模な変更時のみ使用：

```bash
# 1. データベースを完全にリセット
pnpm run db:reset

# 2. 新しいマイグレーションファイルを生成
pnpm run db:generate

# 3. マイグレーションを実行
pnpm run db:migrate

# 4. 必要に応じてシードデータを投入
pnpm run db:seed
```

#### 開発環境での積み上げ式運用（推奨）

##### カラム追加の例

```bash
# 1. スキーマファイルを編集（例：customersテーブルにlastVisitedカラムを追加）
# backend/packages/infrastructure/src/database/schema.ts

# 2. 新しいマイグレーションファイルを生成
pnpm run db:generate
# → scripts/0002_add_last_visited.sql が生成される

# 3. マイグレーションを実行
pnpm run db:migrate
```

##### カラム削除・データ型変更の例

```bash
# 開発環境では2段階で実施
# 1. 新しいカラムを追加（例：phoneNumber → phone_number_v2）
pnpm run db:generate
pnpm run db:migrate

# 2. データ移行スクリプトを実行
# 3. 古いカラムを削除
pnpm run db:generate
pnpm run db:migrate
```

##### インデックス追加の例

```bash
# 1. スキーマファイルにインデックス定義を追加
# 2. マイグレーション生成・実行
pnpm run db:generate
pnpm run db:migrate
```

#### 本番環境での安全な運用

1. **マイグレーションの作成時**
   - 破壊的変更（DROP、RENAMEなど）は避ける
   - 新しいカラムはNULL許容またはデフォルト値を設定
   - 既存データを保持しながら段階的に移行
   - マイグレーションファイルは**絶対に編集・削除しない**

2. **マイグレーションの実行時**
   ```bash
   # 本番環境では必ずバックアップを取得
   pg_dump -U postgres -d beauty_salon > backup_$(date +%Y%m%d_%H%M%S).sql
   
   # マイグレーションを実行（積み上げ式で適用）
   pnpm run db:migrate
   ```

3. **ロールバック対応**
   - 各マイグレーションに対応するロールバックSQLを準備
   - `scripts/rollback/`ディレクトリに保管

#### マイグレーション運用のベストプラクティス

1. **開発環境**
   - 基本的に積み上げ式で運用
   - チーム開発では他のメンバーのマイグレーションと競合しないよう注意
   - 大規模変更時のみ洗い替えを検討

2. **ステージング環境**
   - 本番環境と同じ積み上げ式で運用
   - 本番適用前の最終確認

3. **本番環境**
   - 必ず積み上げ式で運用
   - 既存のマイグレーションファイルは変更禁止
   - バックアップとロールバック計画を準備

#### マイグレーションファイルの命名規則

Drizzleが自動生成するファイル名：
- `0001_material_ironclad.sql` （初回）
- `0002_add_customer_fields.sql` （カラム追加）
- `0003_create_indexes.sql` （インデックス追加）

ファイル名の数字は順序を表し、この順番で適用されます。

### マイグレーションファイルの管理

```
backend/apps/migration/
├── scripts/                    # マイグレーションファイル
│   ├── 0000_drop_existing_types.sql
│   ├── 0001_material_ironclad.sql
│   └── meta/
│       ├── _journal.json       # マイグレーション履歴
│       └── 0001_snapshot.json  # スキーマスナップショット
├── src/
│   ├── migrate.ts             # マイグレーション実行スクリプト
│   ├── reset.ts               # データベースリセットスクリプト
│   └── seed.ts                # シードデータ投入スクリプト
└── drizzle.config.ts          # Drizzle設定ファイル
```

### トラブルシューティング

#### ENUM型の重複エラー
```sql
-- 既存のENUM型を削除してから再作成
DROP TYPE IF EXISTS "public"."booking_status" CASCADE;
```

#### テーブルの重複エラー
```bash
# データベースをリセットしてから再実行
pnpm run db:reset
pnpm run db:migrate
```

#### マイグレーション履歴の不整合
```bash
# マイグレーション履歴をクリア
rm -rf backend/apps/migration/scripts/meta
pnpm run db:generate
```

#### マイグレーション実行後もテーブルが作成されない
```bash
# Drizzleのマイグレーション履歴テーブルを削除
PGPASSWORD=postgres psql -h localhost -U postgres -d beauty_salon \
  -c "DROP TABLE IF EXISTS drizzle.__drizzle_migrations"

# マイグレーションを再実行
pnpm run db:migrate
```

#### シードスクリプトで "relation does not exist" エラー
```bash
# テーブルの存在を確認
PGPASSWORD=postgres psql -h localhost -U postgres -d beauty_salon -c "\dt"

# テーブルが存在しない場合は、マイグレーションを実行
pnpm run db:migrate

# その後シードを実行
pnpm run db:seed
```

#### インポートパスエラー（seed.ts）
```typescript
// 正しいインポートパス
import { 
  salons, 
  openingHours, 
  staff, 
  services, 
  customers
} from '../../../packages/infrastructure/src/database/schema.js'
```

#### 開発環境での完全リセット手順
開発中に問題が解決しない場合の最終手段：

```bash
# 1. データベースを完全にリセット
pnpm run db:reset

# 2. Drizzleのマイグレーション履歴を削除
PGPASSWORD=postgres psql -h localhost -U postgres -d beauty_salon \
  -c "DROP TABLE IF EXISTS drizzle.__drizzle_migrations"

# 3. マイグレーションメタデータを削除
rm -rf backend/apps/migration/scripts/meta

# 4. 新しいマイグレーションを生成
pnpm run db:generate

# 5. マイグレーションを実行
pnpm run db:migrate

# 6. シードデータを投入
pnpm run db:seed

# 7. 動作確認
PGPASSWORD=postgres psql -h localhost -U postgres -d beauty_salon -c "\dt"
```

## 📚 ドキュメント

- [TypeSpec API型定義ルール](./docs/typespec-api-type-rules.md) - API設計の型定義ルール
- [バックエンドアーキテクチャガイドライン](./docs/backend-architecture-guidelines.md) - 詳細な実装ガイド
- [Sum型とパターンマッチング](./docs/sum-types-pattern-matching.md) - Sum型の使い方
- [型安全性の原則](./docs/type-safety-principles.md) - TypeScriptの厳格な設定
- [テスト要件](./docs/testing-requirements.md) - テスト実装のガイドライン

## ✅ 実装済み

### 認証・認可機能（OWASP準拠）

#### 必須の認証機能
- [x] パスワードリセット機能
  - [x] パスワードリセット申請API（POST /auth/forgot-password）
  - [x] リセットトークン検証API（GET /auth/reset-password/verify）
  - [x] パスワード変更API（POST /auth/reset-password）
  - [x] リセットトークンの有効期限（15分）
  - [x] ワンタイムトークン（使用後無効化）
- [x] メールアドレス検証
  - [x] メール検証送信API（POST /auth/verify-email/send）
  - [x] メール検証確認API（POST /auth/verify-email/confirm）
  - [x] 未検証ユーザーのアクセス制限
- [x] 二要素認証（2FA）
  - [x] 2FA有効化API（POST /auth/2fa/enable）
  - [x] QRコード生成API（GET /auth/2fa/qr-code）
  - [x] 2FA無効化API（POST /auth/2fa/disable）
  - [x] TOTPコード検証API（POST /auth/2fa/verify）
  - [x] バックアップコード生成API（POST /auth/2fa/backup-codes）
- [x] アカウントロック機能
  - [x] ログイン試行回数の記録
  - [x] アカウントロック（5回失敗後）
  - [x] アカウントロック解除API（管理者用）
  - [x] 一時ロック通知メール
- [x] パスワード変更機能
  - [x] パスワード変更API（POST /auth/change-password）
  - [x] 現在のパスワード確認必須
  - [x] パスワード履歴チェック（過去3回分）
  - [x] パスワード変更通知メール

#### セキュリティ強化
- [x] パスワードポリシー
  - [x] 最小12文字以上
  - [x] 大文字・小文字・数字・特殊文字を含む
  - [x] 一般的な弱いパスワードのブラックリスト
  - [x] ユーザー情報（名前、メール）を含まない
- [x] セッション管理
  - [x] アクティブセッション一覧API（GET /auth/sessions）
  - [x] 特定セッション無効化API（DELETE /auth/sessions/:id）
  - [x] 全セッション無効化API（POST /auth/logout-all）
  - [x] セッションタイムアウト（30分）
  - [x] Remember Me機能（オプション）
- [x] IPアドレス制限
  - [x] 信頼できるIPアドレスのホワイトリスト（管理者用）
  - [x] 不審なIPからのアクセス検知
  - [x] 地理的位置による制限（オプション）

## 🚧 実装予定

### make ci-checkの作成

- [x] CIがパスするのと等価なコマンドを用意してローカルでもCIパスを確認できるようにする
  - [x] コードフォーマットチェック（pnpm format:check）
  - [x] リンティング（pnpm lint）
  - [x] 型チェック（pnpm typecheck）
  - [x] 未使用依存関係チェック（pnpm knip）
  - [x] API仕様生成（pnpm generate:spec）
  - [x] APIクライアント生成（pnpm generate:api）
  - [x] セキュリティ監査（pnpm audit）
  - [x] ビルド（make build）

### make backend-build,make frontend-buildでpnpm generateも自動で走るようにする

- [x] pnpm generateが自動実行されるように設定
- [x] pnpm format:fixも自動で走るようにする
- [x] すべての環境（dev/test/stg/prod）のビルドコマンドに適用

### API機能拡張
- [x] APIレートリミット
  - [x] グローバルレートリミット（100リクエスト/15分）
  - [x] 認証エンドポイント用（5リクエスト/15分）
  - [x] パスワードリセット用（3リクエスト/1時間）
  - [x] 管理者エンドポイント用（200リクエスト/15分）
  - [x] アップロード用（20リクエスト/1時間）
  - [x] 検索API用（30リクエスト/1分）

### セキュリティレビュー（高優先度）
- [x] OWASPセキュリティ要件の完全性チェック
  - [x] ブルートフォース攻撃対策の実装確認（レートリミット実装済み）
  - [x] SQLインジェクション対策の検証
    - [x] Drizzle ORMのパラメータ化クエリ使用確認
    - [x] LIKE句でのエスケープ処理実装
    - [x] 動的SQLの安全な構築
  - [x] XSS対策の実装状況確認
    - [x] XSSミドルウェアの実装（xss、DOMPurify使用）
    - [x] 入力データの自動サニタイゼーション
    - [x] セキュリティヘッダーの設定
  - [x] CSRF対策（CSRFトークン）
    - [x] CSRFトークン生成・検証ミドルウェア
    - [x] セッションベースのトークン管理
    - [x] SameSite Cookieの設定
  - [x] 機密情報の暗号化（個人情報、支払い情報）
    - [x] AES-256-GCM暗号化サービスの実装
    - [x] 顧客の電話番号暗号化
    - [x] 暗号化キーの安全な管理
  - [x] HTTPS強制とセキュアクッキー設定
    - [x] HTTPSリダイレクトミドルウェア
    - [x] セキュアクッキーフラグの自動設定
    - [x] HSTSヘッダーの設定
  - [x] セキュリティヘッダーの追加（X-Frame-Options, CSP等）
    - [x] Helmetによる包括的なセキュリティヘッダー設定
    - [x] CSP（Content Security Policy）の実装
    - [x] X-Frame-Options、X-Content-Type-Options等
  - [x] APIレートリミット（DDoS対策）
  - [x] 入力検証とサニタイゼーション
    - [x] Zodによる厳格な入力検証
    - [x] パスワード強度チェック
    - [x] 共通バリデーションヘルパーの実装

### アーキテクチャレビュー（高優先度）
- [x] 依存関係の最適化
  - [x] 不必要な再エクスポートの除去
  - [x] 循環依存の検証
  - [x] レイヤー間の依存方向の確認

### 運用機能
- [x] ファイルアップロード（MinIO/R2）
  - [x] プロフィール画像のアップロード
  - [x] サロン画像の管理
  - [x] ファイルサイズ制限とフォーマット検証
  - [x] 署名付きURLによる直接アップロード/ダウンロード
  - [x] 共有リンク機能（パスワード保護、有効期限、ダウンロード回数制限）
- [x] メール送信（優先度：高）
  - [x] メールテンプレートエンジン
  - [x] メールキューシステム（非ブロッキング送信）
  - [x] 予約確認メール
  - [x] パスワードリセットメール
  - [x] メールアドレス検証メール
  - [x] 2FA設定メール
  - [x] アカウントロック通知メール
  - [x] セキュリティアラートメール
  - [x] キャンセル通知メール
  - [x] プロバイダー切り替え（Development/MailHog/Mailgun）
- [x] ロギングとモニタリング
  - [x] 構造化ログの実装（Sum型ベース）
  - [x] エラートラッキング（Sentry）
    - [x] Sentryインテグレーションサービス（Sum型によるエラー分類）
    - [x] エラーコンテキスト自動収集（セキュリティ配慮）
    - [x] エラーハンドラーミドルウェアとの統合
    - [x] 構造化ログとの相関ID連携
  - [x] メトリクス収集（Prometheus）
    - [x] Prometheusクライアント実装（Sum型によるメトリクス定義）
    - [x] APIメトリクスミドルウェア（リクエスト数、レスポンスタイム、エラー率）
    - [x] ビジネスメトリクスサービス（予約数、売上、顧客満足度等）
    - [x] ヘルスチェックエンドポイント（/health、/health/ready）
    - [x] PrometheusとGrafanaのDocker統合

### テスト
- [ ] 統合テスト（testcontainers）
  - [ ] リポジトリ層の統合テスト
  - [ ] APIエンドポイントのE2Eテスト
  - [ ] 認証フローのテスト
- [ ] ユニットテストの充実
  - [ ] ドメインロジックのテスト
  - [ ] ユースケース層のテスト
  - [ ] エラーケースの網羅的テスト

### パフォーマンス最適化（据え置きで一旦スキップ）
- [ ] N+1問題の確認と対策
- [ ] データベースインデックスの最適化
- [ ] APIレスポンスタイムの計測と改善
