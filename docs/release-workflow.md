# リリースワークフローガイド

このドキュメントでは、開発（development）以外の環境（production、staging、test）でのビルドとプレビュー/サーブの手順を説明します。

## 📋 目次

1. [環境の概要](#環境の概要)
2. [Test環境](#test環境)
3. [Staging環境](#staging環境)
4. [Production環境](#production環境)
5. [バックエンドのリリース](#バックエンドのリリース)
6. [環境変数の管理](#環境変数の管理)
7. [リリース前チェックリスト](#リリース前チェックリスト)
8. [トラブルシューティング](#トラブルシューティング)

## 環境の概要

### 環境の用途

| 環境 | 用途 | ビルド最適化 | ソースマップ | APIエンドポイント |
|------|------|------------|--------------|------------------|
| development | 開発・デバッグ | なし | あり | http://localhost:3000 |
| test | 自動テスト・CI | なし | あり | テストモック |
| staging | 本番前の最終確認 | あり | あり | ステージングAPI |
| production | 本番環境 | あり | なし | 本番API |

### ビルド成果物の違い

- **development/test**: デバッグ情報を含む、最適化なし
- **staging**: 本番と同じ最適化、ただしソースマップ付き
- **production**: 完全に最適化、最小サイズ、ソースマップなし

## Test環境

テスト環境は主に自動テストとCI/CDパイプラインで使用されます。

### テスト環境のビルド

```bash
# フロントエンドをテスト環境用にビルド
make frontend-build:test

# バックエンドをテスト環境用にビルド
make backend-build:test
```

### テスト環境でのプレビュー

```bash
# フロントエンドをプレビュー（ポート: 4001-4003）
make frontend-preview:test

# すべてを起動（バックエンドとフロントエンド）
make preview:test
```

### 個別アプリのプレビュー

```bash
# ポータルアプリのみ（ポート: 4001）
make frontend-preview:test-portal

# 管理画面のみ（ポート: 4002）
make frontend-preview:test-admin

# ダッシュボードのみ（ポート: 4003）
make frontend-preview:test-dashboard
```

## Staging環境

ステージング環境は本番環境と同じ構成で、リリース前の最終確認に使用します。

### ステージング環境のビルド

```bash
# フロントエンドをステージング環境用にビルド
make frontend-build:stg

# バックエンドをステージング環境用にビルド
make backend-build:stg
```

### ステージング環境でのプレビュー

```bash
# フロントエンドをプレビュー（ポート: 5001-5003）
make frontend-preview:stg

# すべてを起動（バックエンドとフロントエンド）
make preview:stg
```

### 個別アプリのプレビュー

```bash
# ポータルアプリのみ（ポート: 5001）
make frontend-preview:stg-portal

# 管理画面のみ（ポート: 5002）
make frontend-preview:stg-admin

# ダッシュボードのみ（ポート: 5003）
make frontend-preview:stg-dashboard
```

## Production環境

本番環境は実際のユーザーが使用する環境です。

### 本番環境のビルド

```bash
# フロントエンドを本番環境用にビルド
make frontend-build:prod

# バックエンドを本番環境用にビルド
make backend-build:prod
```

### 本番環境でのプレビュー（ローカル確認用）

```bash
# フロントエンドをプレビュー（ポート: 8001-8003）
make frontend-preview:prod

# すべてを起動（バックエンドとフロントエンド）
make preview:prod
```

### 個別アプリのプレビュー

```bash
# ポータルアプリのみ（ポート: 8001）
make frontend-preview:prod-portal

# 管理画面のみ（ポート: 8002）
make frontend-preview:prod-admin

# ダッシュボードのみ（ポート: 8003）
make frontend-preview:prod-dashboard
```

## バックエンドのリリース

### 環境別のバックエンドビルドと起動

```bash
# Test環境
make backend-build:test
make backend-start:test

# Staging環境
make backend-build:stg
make backend-start:stg

# Production環境
make backend-build:prod
make backend-start:prod
```

### 注意事項

- バックエンドの起動前に必ずDockerサービス（DB、Mail、S3）が起動していることを確認
- 環境変数は`.env.{環境名}`ファイルで管理
- 本番環境では`NODE_ENV=production`が自動的に設定される

## 環境変数の管理

### 環境別の設定ファイル

```bash
# 環境別の.envファイルを作成
cp .env.example .env.test
cp .env.example .env.staging
cp .env.example .env.production

# 各ファイルを環境に応じて編集
vim .env.test      # テスト環境の設定
vim .env.staging   # ステージング環境の設定
vim .env.production # 本番環境の設定
```

### 主要な環境変数

```bash
# API接続設定
VITE_API_BASE_URL=https://api.example.com
VITE_API_TIMEOUT=30000

# 認証設定
VITE_AUTH_DOMAIN=auth.example.com
VITE_CLIENT_ID=your-client-id

# 機能フラグ
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_DEBUG_MODE=false

# バックエンド設定
DATABASE_URL=postgresql://user:pass@host:5432/db
JWT_SECRET=your-secret-key
SMTP_HOST=smtp.example.com
```

## リリース前チェックリスト

### 1. コード品質チェック

```bash
# 型チェック
make typecheck

# リント
make lint

# テスト
make test

# 統合テスト
make test:integration
```

### 2. ビルドチェック

```bash
# すべての環境でビルドが成功することを確認
make frontend-build:test
make frontend-build:stg
make frontend-build:prod
```

### 3. 依存関係チェック

```bash
# 未使用の依存関係をチェック
pnpm knip

# セキュリティ脆弱性をチェック
pnpm audit

# 依存関係の更新状況を確認
pnpm update:check
```

### 4. パフォーマンスチェック

```bash
# バンドルサイズの分析
make frontend-analyze

# ビルド時間の確認
time make frontend-build:prod
```

## トラブルシューティング

### ビルドエラーが発生する場合

```bash
# キャッシュをクリアして再ビルド
make clean
make frontend-build:{環境}

# 完全クリーンビルド
make fresh
make frontend-build:{環境}
```

### プレビューサーバーが起動しない場合

```bash
# ポートが使用中でないか確認
lsof -i :8001  # 例：ポート8001の確認

# プロセスを終了
kill -9 $(lsof -t -i:8001)

# 再度プレビューを起動
make frontend-preview:prod
```

### 環境変数が反映されない場合

```bash
# 環境変数ファイルの存在を確認
ls -la .env.*

# 環境変数を明示的に指定して起動
NODE_ENV=production make backend-start:prod
```

### メモリ不足エラー

```bash
# Node.jsのメモリ制限を増やす
export NODE_OPTIONS="--max-old-space-size=4096"
make frontend-build:prod
```

## ベストプラクティス

### 1. 段階的なリリース

1. まずtest環境でビルドとテストを実行
2. staging環境で本番と同じ構成で動作確認
3. 問題がなければproduction環境にデプロイ

### 2. ビルド成果物の保存

```bash
# ビルド成果物をアーカイブ
tar -czf frontend-build-prod-$(date +%Y%m%d-%H%M%S).tar.gz frontend/apps/*/dist

# S3やアーティファクトリポジトリに保存
aws s3 cp frontend-build-prod-*.tar.gz s3://your-bucket/builds/
```

### 3. ロールバック準備

- 前回のビルド成果物を保持
- データベースのバックアップを取得
- 環境変数の変更履歴を記録

### 4. 監視とアラート

- ビルド時間の記録
- バンドルサイズの追跡
- エラー率の監視
- パフォーマンスメトリクスの収集