# TypeSpecディレクトリ構成ガイド

## 概要

TypeSpec定義ファイルは`specs`ディレクトリに配置され、モジュール化されたディレクトリ構成を採用しています。共通で参照される資産は`_shared`フォルダに配置され、明確な責任分離を実現しています。

## ディレクトリ構成

```
specs/
├── models/                     # データモデル定義
│   ├── _shared/                # 共通モデルパターン
│   │   └── common-api-patterns.tsp  # 汎用APIパターン（ページネーション、エラー等）
│   ├── auth.tsp               # 認証モデル
│   ├── booking.tsp            # 予約モデル
│   ├── common.tsp             # 基本型定義
│   ├── customer.tsp           # 顧客モデル
│   ├── inventory.tsp          # 在庫モデル
│   ├── payment.tsp            # 支払いモデル
│   ├── permission.tsp         # 権限モデル
│   ├── reservation.tsp        # 仮予約モデル
│   ├── review.tsp             # レビューモデル
│   ├── salon.tsp              # サロンモデル
│   ├── service.tsp            # サービスモデル
│   ├── staff.tsp              # スタッフモデル
│   └── treatment.tsp          # 施術モデル
│
├── operations/                 # API操作定義
│   ├── _shared/                # 共通操作パターン
│   │   └── base-operations.tsp  # CRUD、バルク操作の基底インターフェース
│   ├── attachment-operations.tsp
│   ├── auth-operations.tsp
│   ├── booking-operations.tsp
│   ├── customer-operations.tsp
│   ├── inventory-operations.tsp
│   ├── payment-operations.tsp
│   ├── permission-operations.tsp
│   ├── reservation-operations.tsp
│   ├── review-operations.tsp
│   ├── salon-operations.tsp
│   ├── service-operations.tsp
│   ├── staff-operations.tsp
│   └── treatment-operations.tsp
│
├── main.tsp                    # メインエントリーポイント
├── package.json
├── tspconfig.yaml              # TypeSpec設定
├── scripts/                    # TypeSpec生成物のポストプロセス
│   └── postprocess-openapi.ts  # OpenAPIのEnumを共通スキーマ参照に差し替え
└── tsp-output/                 # 生成されたOpenAPI仕様
    └── @typespec/
        └── openapi3/
            └── generated/
                └── openapi.yaml
```

## `_shared`フォルダの役割

### models/_shared/common-api-patterns.tsp

APIの汎用パターンを定義:
- **エラーハンドリング**: RFC 7807 Problem Details仕様
- **ページネーション**: カーソルベース/オフセットベース
- **レスポンスラッパー**: 統一されたAPIレスポンス形式
- **バルク操作**: 一括処理のリクエスト/レスポンス
- **監査情報**: 作成・更新・削除の履歴
- **検索パラメータ**: 高度なフィルタリングと検索
- **ヘルスチェック**: システム状態の確認
- **レート制限**: API利用制限の情報

### operations/_shared/base-operations.tsp

標準的なCRUD操作のインターフェース:
- **CrudOperations**: 基本的なCRUD操作
- **BulkOperations**: 一括操作（作成、更新、削除）
- **SearchOperations**: 高度な検索とフィルタリング
- **AuditOperations**: 監査履歴と履歴管理

## import構造

### main.tspからのimport

```typespec
// main.tsp
import "./models/_shared/common-api-patterns.tsp";
import "./models/common.tsp";
import "./models/customer.tsp";
// ... 他のモデル

import "./operations/salon-operations.tsp";
import "./operations/customer-operations.tsp";
// ... 他の操作
```

### 操作ファイルからのimport

```typespec
// operations/customer-operations.tsp
import "@typespec/http";
import "@typespec/rest";
import "../models/customer.tsp";
import "../models/_shared/common-api-patterns.tsp";
import "./_shared/base-operations.tsp";

// 基底インターフェースを利用
interface CustomerCrud extends
  CrudOperations<Customer, CreateCustomerRequest, UpdateCustomerRequest, CustomerSearchParams, CustomerId>,
  BulkOperations<Customer, CreateCustomerRequest, UpdateCustomerRequest, CustomerId>,
  SearchOperations<Customer, CustomerSearchParams>,
  AuditOperations<Customer, CustomerId> {}
```

### _sharedファイル間のimport

```typespec
// operations/_shared/base-operations.tsp
import "@typespec/http";
import "@typespec/rest";
import "../../models/common.tsp";
import "../../models/_shared/common-api-patterns.tsp";
```

## 設計原則

### 1. 責任の分離
- `models/`: データ構造とビジネスエンティティ
- `operations/`: APIエンドポイントと操作
- `_shared/`: 共通で再利用される定義

### 2. DRY原則
- 共通パターンは`_shared`に配置
- 基底インターフェースで重複を削減
- 標準化された操作の再利用

### 3. 依存関係の明確化
- `_shared`は他のファイルに依存しない
- ドメイン固有のファイルは`_shared`を利用
- 循環依存を避ける

## 型生成への影響

TypeSpec構造の変更は以下の手順で型生成に反映されます:

1. **TypeSpecファイルの編集**
   ```bash
   # models/_sharedまたはoperations/_sharedの編集
   vim specs/models/_shared/common-api-patterns.tsp
   ```

2. **OpenAPI仕様の生成**
   ```bash
   pnpm generate:spec
   ```

3. **TypeScript型の生成**
   ```bash
   pnpm generate:backend
   ```

## ベストプラクティス

### 新しい共通パターンの追加

1. パターンが3箇所以上で使用される場合、`_shared`への配置を検討
2. 既存の`_shared`ファイルに追加するか、新規ファイルを作成
3. 影響を受けるファイルのimportを更新

### ファイル命名規則

- `_shared/`内のファイルは役割を明確にする名前を使用
  - `common-api-patterns.tsp`: API全体の共通パターン
  - `base-operations.tsp`: 操作の基底定義
  - 将来的: `validation-rules.tsp`, `security-patterns.tsp`など

### インポート順序

```typespec
// 1. 外部パッケージ
import "@typespec/http";
import "@typespec/rest";

// 2. _sharedファイル
import "../models/_shared/common-api-patterns.tsp";
import "./_shared/base-operations.tsp";

// 3. ドメイン固有のファイル
import "../models/customer.tsp";
import "../models/booking.tsp";
```

## トラブルシューティング

### インポートエラー

```
error import-not-found: Couldn't resolve import "..."
```

**解決方法:**
- 相対パスが正しいか確認
- `_shared`フォルダ内からは`../../`でmodelsにアクセス
- operations内からは`../_shared/`でアクセス

### 型の重複エラー

```
Duplicate type name: 'Models.SomeType'
```

**解決方法:**
- 同じ型が複数のファイルで定義されていないか確認
- 共通型は`common.tsp`または`_shared/`に移動
- enumや共通モデルの重複定義を削除

## 関連ドキュメント

- [型生成システムガイド](./type-generation-system.md)
- [TypeSpec API型定義ルール](./typespec-api-type-rules.md)
- [バックエンドアーキテクチャガイドライン](./backend-architecture-guidelines.md)
## ビルド後フック

`specs/package.json` の `compile` スクリプトは `tsp compile .` 実行後に `scripts/postprocess-openapi.ts` を呼び出し、既知の `duplicate-type-name` 問題を回避するためにOpenAPI出力の対象列挙型を `#/components/schemas/Models.*` へ自動置換します。手動で再実行したい場合は以下を利用します。

```bash
cd specs
pnpm run postprocess-openapi
```

`postprocess-openapi.ts` は列挙値の集合が一致した場合のみ置換するため、意図しないスキーマへの干渉を防ぎつつ、共通Enumの再利用を保証します。
