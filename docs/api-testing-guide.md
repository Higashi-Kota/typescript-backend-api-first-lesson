# API動作確認ガイド

このガイドでは、開発環境でAPIサーバーを起動し、curlコマンドでAPIの動作を確認する手順を説明します。

## 前提条件

- Node.js 18以上
- pnpm
- Docker（PostgreSQL用）
- curl

## 1. 環境のセットアップ

### 1.1 依存関係のインストール

```bash
# プロジェクトルートで実行
pnpm install
```

### 1.2 環境変数の設定

```bash
# .env.exampleをコピー
cp .env.example .env

# 必要に応じて.envを編集（デフォルト値で動作可能）
```

## 2. データベースのセットアップ

### 2.1 PostgreSQLの起動

```bash
# Docker Composeでデータベースを起動
docker-compose up -d postgres

# 起動確認
docker-compose ps
```

### 2.2 データベースの初期化

```bash
# データベースを完全リセットして再構築（推奨）
pnpm run db:fresh
```

または個別に実行:
```bash
# データベースの完全リセット（テーブル削除・再作成）
pnpm run db:fresh

# または、データのみクリアしてシードデータ投入
pnpm run db:truncate
pnpm run db:seed

# マイグレーションのみ実行する場合
pnpm run db:seed
```

## 3. APIサーバーの起動

### 3.1 開発モードでの起動

```bash
# バックエンド全体を起動（推奨）
pnpm dev:backend

# または、APIサーバーのみを起動
pnpm --filter @beauty-salon-backend/server dev
```

サーバーは `http://localhost:3000` で起動します。

### 3.2 起動確認

```bash
# ヘルスチェック
curl http://localhost:3000/health
```

期待されるレスポンス：
```json
{
  "status": "ok",
  "timestamp": "2024-01-17T10:00:00.000Z"
}
```

## 4. APIエンドポイントのテスト

現在実装されているのは顧客（Customer）APIのみです。

### 4.1 顧客一覧の取得

```bash
# 基本的な一覧取得
curl -X GET http://localhost:3000/api/v1/customers

# ページネーション付き
curl -X GET "http://localhost:3000/api/v1/customers?page=1&limit=10"

# 検索条件付き
curl -X GET "http://localhost:3000/api/v1/customers?email=example@test.com"
```

期待されるレスポンス：
```json
{
  "status": "success",
  "data": {
    "items": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440001",
        "email": "customer1@example.com",
        "name": "田中 太郎",
        "nameKana": "タナカ タロウ",
        "phone": "090-1234-5678",
        "dateOfBirth": "1990-01-01",
        "gender": "male",
        "postalCode": "100-0001",
        "prefecture": "東京都",
        "city": "千代田区",
        "addressLine1": "千代田1-1-1",
        "addressLine2": null,
        "notes": null,
        "createdAt": "2024-01-17T10:00:00.000Z",
        "updatedAt": "2024-01-17T10:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "totalPages": 1
    }
  }
}
```

### 4.2 顧客の作成

```bash
curl -X POST http://localhost:3000/api/v1/customers \
  -H "Content-Type: application/json" \
  -d '{
    "email": "new.customer@example.com",
    "name": "山田 花子",
    "nameKana": "ヤマダ ハナコ",
    "phone": "090-9876-5432",
    "dateOfBirth": "1995-05-15",
    "gender": "female",
    "postalCode": "150-0001",
    "prefecture": "東京都",
    "city": "渋谷区",
    "addressLine1": "渋谷1-1-1"
  }'
```

期待されるレスポンス：
```json
{
  "status": "success",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440002",
    "email": "new.customer@example.com",
    "name": "山田 花子",
    "nameKana": "ヤマダ ハナコ",
    "phone": "090-9876-5432",
    "dateOfBirth": "1995-05-15",
    "gender": "female",
    "postalCode": "150-0001",
    "prefecture": "東京都",
    "city": "渋谷区",
    "addressLine1": "渋谷1-1-1",
    "addressLine2": null,
    "notes": null,
    "createdAt": "2024-01-17T10:00:00.000Z",
    "updatedAt": "2024-01-17T10:00:00.000Z"
  }
}
```

### 4.3 特定の顧客の取得

```bash
# IDを指定して取得（実際のIDに置き換えてください）
curl -X GET http://localhost:3000/api/v1/customers/550e8400-e29b-41d4-a716-446655440001
```

### 4.4 顧客プロフィールの取得

```bash
# プロフィール情報を取得（予約履歴など含む）
curl -X GET http://localhost:3000/api/v1/customers/550e8400-e29b-41d4-a716-446655440001/profile
```

### 4.5 顧客情報の更新

```bash
curl -X PUT http://localhost:3000/api/v1/customers/550e8400-e29b-41d4-a716-446655440001 \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "090-1111-2222",
    "addressLine2": "マンション101号室",
    "notes": "VIP顧客"
  }'
```

### 4.6 顧客の削除（ソフトデリート）

```bash
curl -X DELETE http://localhost:3000/api/v1/customers/550e8400-e29b-41d4-a716-446655440001
```

## 5. エラーレスポンスの例

### 5.1 バリデーションエラー

```bash
# 必須フィールドが不足している場合
curl -X POST http://localhost:3000/api/v1/customers \
  -H "Content-Type: application/json" \
  -d '{
    "email": "invalid-email"
  }'
```

期待されるレスポンス：
```json
{
  "status": "error",
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      },
      {
        "field": "name",
        "message": "Required field"
      }
    ]
  }
}
```

### 5.2 リソースが見つからない

```bash
curl -X GET http://localhost:3000/api/v1/customers/non-existent-id
```

期待されるレスポンス：
```json
{
  "status": "error",
  "error": {
    "code": "NOT_FOUND",
    "message": "Customer not found"
  }
}
```

## 6. 便利なcurlオプション

```bash
# レスポンスをフォーマットして表示
curl -X GET http://localhost:3000/api/v1/customers | jq .

# ヘッダー情報も表示
curl -v -X GET http://localhost:3000/api/v1/customers

# レスポンス時間を測定
curl -w "\n\nTotal time: %{time_total}s\n" -X GET http://localhost:3000/api/v1/customers

# 出力をファイルに保存
curl -X GET http://localhost:3000/api/v1/customers -o customers.json
```

## 7. トラブルシューティング

### 7.1 データベース接続エラー

```bash
# PostgreSQLが起動しているか確認
docker-compose ps

# ログを確認
docker-compose logs postgres

# 再起動
docker-compose restart postgres
```

### 7.2 ポートが使用中

```bash
# 3000番ポートを使用しているプロセスを確認
lsof -i :3000

# 必要に応じてプロセスを終了
kill -9 <PID>
```

### 7.3 依存関係のエラー

```bash
# node_modulesを削除して再インストール
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

## 8. 開発のヒント

1. **ログの確認**: サーバーコンソールに詳細なログが出力されます
2. **Pretty Print**: `jq`コマンドを使用してJSONを整形表示
3. **Request ID**: 各リクエストには一意のIDが付与され、ログ追跡に使用できます
4. **開発ツール**: Postman、Insomnia、Thunder Clientなどを使用するとより快適にテストできます

## 9. 次のステップ

現在は顧客APIのみが実装されています。他のリソース（サロン、サービス、予約など）のAPIは今後実装予定です。

実装パターンは顧客APIと同様になるため、`/backend/packages/api/src/routes/customer.routes.ts`を参考にしてください。