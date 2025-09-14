# Repository Guidelines

## プロジェクト構成とモジュール
- 形態: pnpm ワークスペースのモノレポ。
- 主要ディレクトリ: `backend/apps`（`server`, `migration`）、`backend/packages`（`domain`, `infrastructure`, `mappers`, `config`, `database`, `test-utils`）、`frontend/packages`、`specs`（TypeSpec 定義）、`docs`（設計/運用資料）。
- 代表エントリ: `backend/apps/server/src/index.ts`（API 起動）、`specs/main.tsp`（API 仕様）。

## ビルド・開発・テスト
- 開発起動: `pnpm dev:backend`（バックエンドのみ並列起動）。
- 依存サービス起動: `docker-compose up -d`（Postgres / Mailhog / Minio ほか）。
- ビルド: `pnpm build:backend`（バックエンド全体）/ `pnpm build`（全パッケージ）。
- テスト: `pnpm test:backend`（単体）/ `pnpm test:integration`（統合）/ `pnpm test`（全体）。
- 型/整形: `pnpm typecheck` / `pnpm format`（Biome）。
- 生成物: `pnpm generate`（TypeSpec→OpenAPI/コード）/ `pnpm db:migrate`（マイグレーション）。
- 本番起動例: `pnpm start:backend:prod`。

## コーディングスタイル・命名
- ツール: Biome（`biome.json`）。インデント2スペース、シングルクォート、セミコロンは必要時のみ、ES5 互換のトレーリングカンマ、インポート自動整列。
- ルール例: 未使用 import/変数禁止、`any` 明示禁止、`const` 推奨。
- 命名: ファイル名は`kebab-case`、型/クラスは`PascalCase`、変数/関数は`camelCase`、定数は`UPPER_SNAKE_CASE`。

## テスト指針
- フレームワーク: Vitest（`vitest.config.ts`）。カバレッジは V8 レポーター（text/json/html）、`dist` 等は除外。
- 命名: ユニット `*.test.ts`、統合 `*.integration.test.ts`、例: `backend/packages/infrastructure/tests/repositories/*.test.ts`。
- 実行例: `pnpm test:backend` / `pnpm test:integration`。閾値は現状固定なし。重要ロジックの網羅と失敗時の再現手順明記を推奨。

## コミット・PR ガイドライン
- コミット: 履歴は短い命令形が中心（例: "Fix deps"）。範囲は任意。可能なら Conventional Commits を推奨（例: `feat:`, `fix:`）。
- PR 要件: 目的/背景/変更点、関連 Issue、テスト計画（コマンド/結果）、スクリーンショット（UI 変更時）。`pnpm format && pnpm typecheck && pnpm test` での事前確認を必須化。

## セキュリティ・設定
- 機密情報はコミットしない。`.env.example` をコピーして `.env` を作成（テストは `.env.test`）。
- Node/Pnpm バージョンは Volta で固定（`package.json#volta`）。
- ローカル DB/ストレージを使う統合テストは `docker-compose up -d` 後に実施。
