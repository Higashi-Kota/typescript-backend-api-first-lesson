# TypeScriptバックエンド開発ガイドライン

このドキュメントは、TypeScriptを使用した新規バックエンド開発における徹底準拠指標の概要です。型安全性を最大限に活用し、Sum型とts-patternを駆使した堅牢なアーキテクチャを実現します。

## 📋 目次

### コア開発原則
1. [型安全性の原則](#型安全性の原則)
2. [Sum型とパターンマッチング](#sum型とパターンマッチング)
3. [ユニフォーム実装ガイド](#ユニフォーム実装ガイド)
4. [テスト要件](#テスト要件)
5. [クリーンアップ方針](#クリーンアップ方針)

### アーキテクチャ設計
6. [バックエンドアーキテクチャガイドライン](#バックエンドアーキテクチャガイドライン)
7. [TypeScript設定](#typescript設定)
8. [Brand型を利用したID管理](#brand型を利用したid管理)

### API開発
9. [API開発ガイド](#api開発ガイド)
10. [TypeSpec/OpenAPI利用ガイド](#typespecopenapi利用ガイド)
11. [型生成システム](#型生成システム)

### 開発フロー
12. [開発ワークフロー](#開発ワークフロー)
13. [リリースワークフロー](#リリースワークフロー)

### 追加リソース
14. [その他のドキュメント](#その他のドキュメント)

## 🔒 型安全性の原則

TypeScriptの型システムを最大限活用し、実行時エラーをコンパイル時に検出します。

### 主要原則
- `any`型の使用は絶対禁止
- 型アサーションと型ガードの禁止
- ネストした型オブジェクトを避け、フラットな判別共用体を使用
- 配列アクセスは直接行い、undefinedチェックで型情報を保持

**[→ 詳細を読む](./docs/type-safety-principles.md)**

## 🎨 Sum型とパターンマッチング

判別共用体（Sum型）とts-patternによる網羅的パターンマッチングで、型安全な処理を実現します。

### 特徴
- すべての状態をSum型で表現
- `match()`と`exhaustive()`で全ケースの処理を保証
- Result型による例外フリーなエラーハンドリング
- 複雑なビジネスロジックの明確な表現

**[→ 詳細を読む](./docs/sum-types-pattern-matching.md)**

## 🎯 ユニフォーム実装ガイド

一貫性のある実装パターンを定義し、保守性の高いコードベースを実現します。

### 統一パターン
- ページネーション実装
- レスポンスフォーマット
- エラーハンドリング
- 日時処理（date-fns使用）
- クエリパラメータ処理
- 権限チェック
- 構造化ログ
- UUID/ID検証

**[→ 詳細を読む](./docs/uniform-implementation-guide.md)**


## 🧪 テスト要件

品質を保証するためのテスト要件と実装パターンです。

### テスト方針
- AAA（Arrange-Act-Assert）パターンの採用
- Sum型を活用したテストシナリオ管理
- 実データによる動的な検証
- 最低5パターンのエラーケーステスト

**[→ 詳細を読む](./docs/testing-requirements.md)**

## 🔥 クリーンアップ方針

YAGNI原則に基づいた、クリーンなコードベースの維持方針です。

### 基本方針
- 未使用コードの徹底削除
- 「将来のため」のコードを残さない
- 継続的なコードベースの整理
- 自動化ツールの活用

**[→ 詳細を読む](./docs/cleanup-policy.md)**

## 🔧 TypeScript設定

厳格なTypeScript設定で型安全性を最大化します。

### 主要設定
- すべての厳格チェックを有効化
- `noUncheckedIndexedAccess`: true
- `exactOptionalPropertyTypes`: true
- ESNEXT機能の活用

**[→ 詳細を読む](./docs/typescript-configuration.md)**

## 🆔 Brand型を利用したID管理

Brand型（Nominal型）を使用して、異なるエンティティのIDを型レベルで区別します。

### 特徴
- `UserId`、`SalonId`などの専用ID型
- Zodスキーマとの統合
- UUID形式の自動検証
- コンパイル時のID混同防止

**[→ 詳細を読む](./docs/branded-types-id-management.md)**

## 🏗️ バックエンドアーキテクチャガイドライン

TypeScriptバックエンド開発における包括的なアーキテクチャガイドラインです。API First開発、クリーンアーキテクチャ、testcontainersを活用した堅牢な設計を実現します。

### 主要内容
- レイヤードアーキテクチャ（Domain/UseCase/Infrastructure/API）
- TypeSpec/OpenAPIからの型定義自動生成とRemapping
- DB ↔ Repository ↔ UseCase ↔ API ↔ Frontend の命名規則
- 依存性逆転の原則（DIP）による疎結合設計
- testcontainersによる統合テスト
- 循環依存の完全排除
- Result型による例外フリーなエラーハンドリング
- データベース設計規則とマイグレーション
- APIセキュリティとルーティング規則
- 機能追加の原則と優先順位付け

**[→ 詳細を読む](./docs/backend-architecture-guidelines.md)**

## 🔄 型生成システム

TypeSpecからOpenAPIを経由してTypeScript型を自動生成するシステムです。

### 型生成スクリプトの場所

- **スクリプト**: `backend/packages/types/scripts/generate-types.ts`
- **パッケージ**: `@beauty-salon-backend/types`
- **使用ツール**: `openapi-typescript`

### 実行方法

```bash
# 全体の型生成（推奨）
pnpm generate

# バックエンド型のみ生成
pnpm generate:backend

# Makefile経由（ビルドプロセスに統合）
make backend-build
```

### 型生成のフロー

1. **TypeSpec定義**: `specs/*.tsp`ファイルを編集
2. **OpenAPI生成**: `pnpm generate:spec`でOpenAPI仕様を生成
3. **TypeScript型生成**: `pnpm generate:backend`で型を生成
4. **ビルド**: 生成された型を使用してビルド

**[→ 型生成システムの詳細](./docs/type-generation-system.md)**

## 🚀 クイックスタート

### 必須の設定

#### TypeScript設定（tsconfig.json）

このプロジェクトでは、フロントエンド・バックエンド共通で最も厳格なTypeScript設定を使用しています。

詳細は[「TypeScript設定ガイド」](./docs/typescript-configuration.md)を参照してください。

#### Biome設定（biome.json）
```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
  "linter": {
    "enabled": true,
    "rules": {
      "correctness": {
        "noUnusedImports": "error",
        "noUnusedVariables": "error",
        "useExhaustiveDependencies": "error"
      },
      "recommended": true,
      "style": {
        "noVar": "error",
        "useAsConstAssertion": "error",
        "useConst": "error"
      },
      "suspicious": {
        "noExplicitAny": "error",
        "noImplicitAnyLet": "error"
      }
    }
  }
}
```

**[→ TypeScript設定の詳細](./docs/typescript-configuration.md)**

### 必須の依存関係

```bash
# 型安全なパターンマッチング
pnpm add ts-pattern

# 日時処理
pnpm add date-fns

# バリデーション
pnpm add zod

# UUID
pnpm add uuid
pnpm add -D @types/uuid
```

## 📊 実装優先順位

### 1. 即座に実装すべき（高優先度）
- Sum型による型定義の統一
- ts-patternによる網羅的パターンマッチング
- レスポンスフォーマットの統一
- エラーハンドリングパターンの統一
- 権限チェックパターンの統一

### 2. 段階的に実装（中優先度）
- Result型によるエラーハンドリング
- クエリパラメータパターンの統一
- 日時処理の統一（date-fns使用）
- テストパターンの統一

### 3. 機会があれば実装（低優先度）
- 構造化ログの高度化
- カスタムID型の導入

## ✅ 実装完了後の期待される状態

1. **`pnpm lint`で警告ゼロ**（未使用変数の警告を含む）
2. **`pnpm test`ですべてのテストがグリーン**
3. **APIドキュメントと実装が一致**
4. **テストが実装の実際の動作を検証**
5. **プロダクションコードがクリーンで保守しやすい**

## 📚 API開発ガイド

### APIテストガイド

API開発における網羅的なテスト戦略とベストプラクティスです。

**[→ 詳細を読む](./docs/api-testing-guide.md)**

### TypeSpec/OpenAPI利用ガイド

TypeSpecからOpenAPI仕様を生成し、型安全なAPI開発を実現するためのガイドです。

#### 主要トピック
- OpenAPI-TypeScriptの活用方法
- 型定義の自動生成とマッピング
- APIファーストな開発フロー

**[→ OpenAPI-TypeScript利用ガイド](./docs/openapi-typescript-usage.md)**  
**[→ TypeSpec API型定義ルール](./docs/typespec-api-type-rules.md)**  
**[→ 型生成システムガイド](./docs/type-generation-system.md)**

## 🔄 開発ワークフロー

プロジェクトにおける効率的な開発とリリースのプロセスです。

### 開発ワークフロー
- ブランチ戦略
- コードレビュープロセス
- CI/CDパイプライン

**[→ 詳細を読む](./docs/development-workflow.md)**

### リリースワークフロー
- セマンティックバージョニング
- リリースノートの自動生成
- デプロイメントプロセス

**[→ 詳細を読む](./docs/release-workflow.md)**

## 🛠️ その他のドキュメント

### データベース設計
- 型制約とマッピング規則
- マイグレーション戦略

**[→ DB型制約マッピング](./docs/db-type-constraints-mapping.md)**

### 環境設定
- 環境変数の管理
- 設定の優先順位

**[→ 環境設定ガイド](./docs/env-configuration.md)**

### 外部サービス統合

#### メール送信
- メールプロバイダーの選定と統合
- 送信処理の実装パターン

**[→ メールプロバイダー](./docs/email-providers.md)**  
**[→ メール送信実装](./docs/email-send.md)**

#### ファイルストレージ
- ファイルアップロード処理
- ストレージプロバイダーの統合

**[→ ファイルアップロード](./docs/file-upload.md)**  
**[→ ストレージプロバイダー](./docs/storage-providers.md)**

### モニタリング・監視
- エラートラッキング
- パフォーマンス監視
- ログ収集と分析

**[→ エラートラッキングとモニタリング](./docs/error-tracking-and-monitoring.md)**
