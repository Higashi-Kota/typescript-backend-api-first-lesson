# 環境変数設定ガイド

## 概要

本システムの環境変数設定について説明します。環境変数はプロジェクトルート直下の`.env`ファイルで一元管理し、Docker環境での運用を前提としています。Zodスキーマによる厳格な検証を行い、型安全性を保証します。

## 環境変数ファイルの構成

```
/project-root/
├── .env                 # 実際の環境変数（gitignore対象）
├── .env.example         # サンプル設定（リポジトリに含める）
├── .env.test           # テスト用設定
├── docker-compose.yml   # Docker構成（.envを参照）
└── backend/
    └── packages/
        └── config/      # 環境変数の検証とアクセス
```

## Docker環境での利用

docker-compose.ymlでは、ルート直下の`.env`ファイルを自動的に読み込みます：

```yaml
services:
  backend:
    env_file:
      - .env
    environment:
      # Docker内部での通信用にホスト名を上書き
      MAILHOG_HOST: mailhog
      MINIO_ENDPOINT: http://minio:9000
```

## 必須環境変数

### データベース設定

```env
# PostgreSQL接続設定
DATABASE_URL=postgresql://user:password@localhost:5432/beauty_salon_dev
DATABASE_POOL_SIZE=20
DATABASE_CONNECTION_TIMEOUT=30000

# データベースSSL設定（本番環境）
DATABASE_SSL_ENABLED=true
DATABASE_SSL_CA=/path/to/ca.pem
```

### 認証設定

```env
# JWT設定
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your-refresh-secret-key-here
JWT_REFRESH_EXPIRES_IN=30d

# セッション設定
SESSION_SECRET=your-session-secret-here
SESSION_COOKIE_NAME=beauty_salon_session
SESSION_COOKIE_MAX_AGE=86400000
SESSION_COOKIE_SECURE=true
SESSION_COOKIE_SAME_SITE=strict

# パスワードリセット
PASSWORD_RESET_TOKEN_EXPIRES_IN=3600
PASSWORD_RESET_URL=https://example.com/reset-password

# メール確認
EMAIL_VERIFICATION_TOKEN_EXPIRES_IN=86400
EMAIL_VERIFICATION_URL=https://example.com/verify-email

# 2要素認証
TWO_FACTOR_ISSUER=Beauty Salon
TWO_FACTOR_WINDOW=2
```

### メール設定

```env
# メールプロバイダー選択
EMAIL_PROVIDER=mailgun  # development | mailhog | mailgun

# 共通設定
EMAIL_FROM_ADDRESS=noreply@example.com
EMAIL_FROM_NAME=Beauty Salon
EMAIL_REPLY_TO=support@example.com

# MailHog設定（開発環境）
MAILHOG_HOST=localhost
MAILHOG_PORT=1025

# Mailgun設定（本番環境）
MAILGUN_API_KEY=key-xxxxxxxxxxxxxxxxxx
MAILGUN_DOMAIN=mg.example.com
MAILGUN_REGION=US  # US | EU
MAILGUN_TEST_MODE=false
MAILGUN_WEBHOOK_SIGNING_KEY=xxxxxxxxxx
```

### ストレージ設定

```env
# ストレージプロバイダー選択
STORAGE_PROVIDER=minio  # minio | r2

# MinIO設定（開発環境）
MINIO_ENDPOINT=http://localhost:9000
MINIO_BUCKET=beauty-salon-dev
MINIO_REGION=us-east-1
MINIO_ACCESS_KEY_ID=minioadmin
MINIO_SECRET_ACCESS_KEY=minioadmin

# Cloudflare R2設定（本番環境）
R2_ENDPOINT=https://xxx.r2.cloudflarestorage.com
R2_BUCKET=beauty-salon-prod
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key

# ストレージ共通設定
STORAGE_MAX_FILE_SIZE=524288000  # 500MB
STORAGE_ALLOWED_EXTENSIONS=jpg,jpeg,png,gif,pdf,doc,docx,xls,xlsx
STORAGE_UPLOAD_URL_EXPIRES_IN=3600
STORAGE_DOWNLOAD_URL_EXPIRES_IN=86400
```

### アプリケーション設定

```env
# 基本設定
NODE_ENV=development  # development | test | production
PORT=3000
HOST=0.0.0.0
API_PREFIX=/api
API_VERSION=v1

# CORS設定
CORS_ORIGIN=http://localhost:3001,http://localhost:3002
CORS_CREDENTIALS=true
CORS_MAX_AGE=86400

# レート制限
RATE_LIMIT_WINDOW_MS=900000  # 15分
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS=false
RATE_LIMIT_SKIP_FAILED_REQUESTS=false

# ロギング
LOG_LEVEL=info  # error | warn | info | debug
LOG_FORMAT=json  # json | pretty
LOG_FILE_PATH=./logs/app.log
LOG_FILE_MAX_SIZE=10485760  # 10MB
LOG_FILE_MAX_FILES=5

# セキュリティ
BCRYPT_ROUNDS=12
ENCRYPTION_KEY=32-character-encryption-key-here
CSRF_SECRET=your-csrf-secret-here
```

### 外部サービス設定

```env
# Redis設定（オプション）
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=
REDIS_DB=0
REDIS_KEY_PREFIX=beauty_salon:

# Sentryエラー監視（オプション）
SENTRY_DSN=https://xxx@sentry.io/yyy
SENTRY_ENVIRONMENT=development
SENTRY_RELEASE=1.0.0
SENTRY_TRACES_SAMPLE_RATE=0.1

# モニタリング設定
PROMETHEUS_PORT=9090
GRAFANA_PORT=3100
GRAFANA_USER=admin
GRAFANA_PASSWORD=admin
POSTGRES_EXPORTER_PORT=9187

# CDN設定（オプション）
CDN_BASE_URL=https://cdn.example.com
CDN_ENABLE=true
```

## 環境変数の検証

### Zodスキーマによる検証

```typescript
// config/env.schema.ts
import { z } from 'zod'

export const envSchema = z.object({
  // Node環境
  NODE_ENV: z.enum(['development', 'test', 'production']),
  PORT: z.coerce.number().int().positive().default(3000),
  
  // データベース
  DATABASE_URL: z.string().url(),
  DATABASE_POOL_SIZE: z.coerce.number().int().positive().default(20),
  
  // JWT
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('7d'),
  
  // メール
  EMAIL_PROVIDER: z.enum(['development', 'mailhog', 'mailgun']),
  EMAIL_FROM_ADDRESS: z.string().email(),
  
  // ストレージ
  STORAGE_PROVIDER: z.enum(['minio', 'r2']),
  STORAGE_MAX_FILE_SIZE: z.coerce.number().int().positive(),
})

// 環境変数の読み込みと検証
export function loadEnv() {
  const result = envSchema.safeParse(process.env)
  
  if (!result.success) {
    console.error('環境変数の検証エラー:')
    console.error(result.error.format())
    process.exit(1)
  }
  
  return result.data
}
```

### プロバイダー別の条件付き検証

```typescript
// メールプロバイダー別の検証
const emailConfigSchema = z.discriminatedUnion('provider', [
  z.object({
    provider: z.literal('development'),
  }),
  z.object({
    provider: z.literal('mailhog'),
    host: z.string().default('localhost'),
    port: z.coerce.number().default(1025),
  }),
  z.object({
    provider: z.literal('mailgun'),
    apiKey: z.string().min(1),
    domain: z.string().min(1),
    region: z.enum(['US', 'EU']).default('US'),
  }),
])

// ストレージプロバイダー別の検証
const storageConfigSchema = z.discriminatedUnion('provider', [
  z.object({
    provider: z.literal('minio'),
    endpoint: z.string().url(),
    bucket: z.string().min(1),
    accessKeyId: z.string().min(1),
    secretAccessKey: z.string().min(1),
  }),
  z.object({
    provider: z.literal('r2'),
    endpoint: z.string().url(),
    bucket: z.string().min(1),
    accountId: z.string().min(1),
    accessKeyId: z.string().min(1),
    secretAccessKey: z.string().min(1),
  }),
])
```

## 環境別の設定例

### 開発環境（.env.development）

```env
NODE_ENV=development
PORT=3000
API_PREFIX=/api

# データベース（Docker）
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/beauty_salon_dev

# 認証（開発用の固定値）
JWT_SECRET=development-secret-key-minimum-32-characters-long
SESSION_SECRET=development-session-secret

# メール（MailHog）
EMAIL_PROVIDER=mailhog
EMAIL_FROM_ADDRESS=dev@example.com
MAILHOG_HOST=localhost
MAILHOG_PORT=1025

# ストレージ（MinIO）
STORAGE_PROVIDER=minio
MINIO_ENDPOINT=http://localhost:9000
MINIO_BUCKET=beauty-salon-dev
MINIO_ACCESS_KEY_ID=minioadmin
MINIO_SECRET_ACCESS_KEY=minioadmin

# ロギング
LOG_LEVEL=debug
LOG_FORMAT=pretty
```

### テスト環境（.env.test）

```env
NODE_ENV=test
PORT=3001

# テスト用データベース
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/beauty_salon_test

# テスト用の固定シークレット
JWT_SECRET=test-secret-key-minimum-32-characters-long-fixed

# メール（開発プロバイダー）
EMAIL_PROVIDER=development

# ストレージ（MinIO）
STORAGE_PROVIDER=minio
MINIO_ENDPOINT=http://localhost:9000
MINIO_BUCKET=beauty-salon-test

# ロギング
LOG_LEVEL=error
```

### 本番環境（.env.production）

```env
NODE_ENV=production
PORT=8080
API_PREFIX=/api

# 本番データベース
DATABASE_URL=postgresql://user:password@db.example.com:5432/beauty_salon_prod
DATABASE_SSL_ENABLED=true
DATABASE_POOL_SIZE=50

# 本番用シークレット（AWS Secrets Managerから取得）
JWT_SECRET=${AWS_SECRET_JWT}
SESSION_SECRET=${AWS_SECRET_SESSION}

# メール（Mailgun）
EMAIL_PROVIDER=mailgun
EMAIL_FROM_ADDRESS=noreply@example.com
MAILGUN_API_KEY=${AWS_SECRET_MAILGUN_KEY}
MAILGUN_DOMAIN=mg.example.com

# ストレージ（R2）
STORAGE_PROVIDER=r2
R2_ENDPOINT=https://xxx.r2.cloudflarestorage.com
R2_BUCKET=beauty-salon-prod
R2_ACCESS_KEY_ID=${AWS_SECRET_R2_ACCESS_KEY}
R2_SECRET_ACCESS_KEY=${AWS_SECRET_R2_SECRET_KEY}

# セキュリティ
CORS_ORIGIN=https://app.example.com
CORS_CREDENTIALS=true
SESSION_COOKIE_SECURE=true

# 監視
SENTRY_DSN=https://xxx@sentry.io/yyy
SENTRY_ENVIRONMENT=production

# ロギング
LOG_LEVEL=warn
LOG_FORMAT=json
```

## セキュリティベストプラクティス

### 1. シークレットの管理

```typescript
// ❌ 悪い例：ハードコード
const jwtSecret = "my-secret-key"

// ✅ 良い例：環境変数
const jwtSecret = process.env.JWT_SECRET

// ✅ より良い例：シークレットマネージャー
import { getSecret } from './secrets-manager'
const jwtSecret = await getSecret('jwt-secret')
```

### 2. 環境変数の暗号化

```bash
# .env.encryptedファイルの作成
openssl enc -aes-256-cbc -salt -in .env -out .env.encrypted

# 復号化
openssl enc -aes-256-cbc -d -in .env.encrypted -out .env
```

### 3. 環境変数のローテーション

```typescript
// 定期的なシークレットローテーション
async function rotateSecrets() {
  // 新しいシークレットを生成
  const newJwtSecret = generateSecureKey(64)
  
  // シークレットマネージャーに保存
  await updateSecret('jwt-secret', newJwtSecret)
  
  // アプリケーションに通知
  process.emit('secrets:rotated', { jwt: true })
}

// 月次でローテーション
schedule.monthly(rotateSecrets)
```

## トラブルシューティング

### 環境変数が読み込まれない

```typescript
// デバッグ用のログ
console.log('Current environment:', process.env.NODE_ENV)
console.log('Loaded variables:', Object.keys(process.env).filter(k => k.startsWith('APP_')))

// dotenvの明示的な読み込み
import dotenv from 'dotenv'
import path from 'path'

const envFile = process.env.NODE_ENV === 'production' 
  ? '.env' 
  : `.env.${process.env.NODE_ENV}`

dotenv.config({ 
  path: path.resolve(process.cwd(), envFile) 
})
```

### 型安全な環境変数アクセス

```typescript
// 型定義
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'test' | 'production'
      PORT: string
      DATABASE_URL: string
      JWT_SECRET: string
      EMAIL_PROVIDER: 'development' | 'mailhog' | 'mailgun'
      STORAGE_PROVIDER: 'minio' | 'r2'
    }
  }
}

// 型安全なアクセス
const port = parseInt(process.env.PORT, 10)  // 型: string
const provider = process.env.EMAIL_PROVIDER   // 型: 'development' | 'mailhog' | 'mailgun'
```

### 環境変数の検証エラー

```typescript
try {
  const config = loadEnv()
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('環境変数の検証エラー:')
    error.errors.forEach(err => {
      console.error(`- ${err.path.join('.')}: ${err.message}`)
    })
  }
  process.exit(1)
}
```

## Docker開発ワークフロー

### 1. 初回セットアップ

```bash
# .envファイルを作成
cp .env.example .env

# 必要に応じて.envを編集
nano .env

# Dockerコンテナを起動
docker-compose up -d
```

### 2. 開発時の環境変数変更

環境変数を変更した場合は、コンテナの再起動が必要です：

```bash
# .envを編集
nano .env

# 該当するサービスのみ再起動
docker-compose restart backend

# または全体を再起動
docker-compose down
docker-compose up -d
```

### 3. サービス間の通信

Docker Compose内では、サービス名でアクセスできます：

- PostgreSQL: `postgres:5432`
- MailHog: `mailhog:1025`（SMTP）、`mailhog:8025`（Web UI）
- MinIO: `minio:9000`（API）、`minio:9001`（Console）

### 4. 本番環境への移行

本番環境では以下の環境変数を変更：

```bash
NODE_ENV=production
EMAIL_PROVIDER=mailgun
STORAGE_PROVIDER=r2
SESSION_COOKIE_SECURE=true
CORS_ORIGIN=https://app.example.com
```

### 5. シークレット管理

本番環境では環境変数を直接設定せず、シークレット管理サービスを使用：

```bash
# AWS Secrets Manager
aws secretsmanager get-secret-value --secret-id beauty-salon-prod

# Kubernetes Secrets
kubectl create secret generic beauty-salon-secrets --from-env-file=.env.production

# Docker Swarm Secrets
docker secret create beauty_salon_jwt_secret jwt_secret.txt
```