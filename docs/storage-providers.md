# ストレージプロバイダー仕様

## 概要

本システムでは、環境に応じて複数のストレージプロバイダーをサポートしています。開発環境ではMinIO（S3互換）、本番環境ではCloudflare R2を使用し、AWS SDK for JavaScriptを通じて統一的なインターフェースで操作します。

## サポートプロバイダー

### 1. MinIO Provider

オープンソースのS3互換オブジェクトストレージ。ローカル開発環境で使用します。

**特徴:**
- S3互換API
- Docker/Docker Composeで簡単に起動
- Web管理コンソール付き
- マルチテナント対応
- イレイジャーコーディング対応

**必要な設定:**
```env
STORAGE_PROVIDER=minio
MINIO_ENDPOINT=http://localhost:9000
MINIO_BUCKET=beauty-salon-dev
MINIO_REGION=us-east-1
MINIO_ACCESS_KEY_ID=minioadmin
MINIO_SECRET_ACCESS_KEY=minioadmin
```

**起動方法:**
```bash
# Docker Composeで起動
docker-compose up -d minio

# または単独で起動
docker run -d \
  -p 9000:9000 \
  -p 9001:9001 \
  --name minio \
  -e MINIO_ROOT_USER=minioadmin \
  -e MINIO_ROOT_PASSWORD=minioadmin \
  minio/minio server /data --console-address ":9001"
```

### 2. Cloudflare R2 Provider

Cloudflareのオブジェクトストレージサービス。本番環境で使用します。

**特徴:**
- S3互換API
- エグレス料金無料
- グローバルCDN統合
- 自動レプリケーション
- Workers統合可能

**必要な設定:**
```env
STORAGE_PROVIDER=r2
R2_ENDPOINT=https://xxx.r2.cloudflarestorage.com
R2_BUCKET=beauty-salon-prod
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
```

## プロバイダー比較

| 機能 | MinIO | Cloudflare R2 |
|------|-------|---------------|
| S3互換性 | ✅ 完全互換 | ✅ 主要API対応 |
| 料金 | 無料（自己ホスト） | 従量課金 |
| エグレス料金 | なし | 無料 |
| 最大オブジェクトサイズ | 5TB | 5TB |
| マルチパートアップロード | ✅ | ✅ |
| 署名付きURL | ✅ | ✅ |
| オブジェクトタグ | ✅ | ❌（メタデータで代替） |
| バージョニング | ✅ | ✅ |
| ライフサイクル | ✅ | ✅ |
| 管理コンソール | ✅ | ✅ |

## 実装詳細

### 共通実装パターン

両プロバイダーはAWS SDK for JavaScriptを使用して実装：

```typescript
import { S3Client } from '@aws-sdk/client-s3'

// MinIO設定
const minioClient = new S3Client({
  endpoint: 'http://localhost:9000',
  region: 'us-east-1',
  credentials: {
    accessKeyId: 'minioadmin',
    secretAccessKey: 'minioadmin',
  },
  forcePathStyle: true,  // MinIOでは必須
})

// R2設定
const r2Client = new S3Client({
  endpoint: 'https://xxx.r2.cloudflarestorage.com',
  region: 'auto',  // R2は常に'auto'
  credentials: {
    accessKeyId: 'your-access-key',
    secretAccessKey: 'your-secret-key',
  },
})
```

### ファイル操作の実装

#### アップロード

```typescript
async upload(input: UploadFileInput): Promise<Result<UploadResult, StorageError>> {
  try {
    const key = this.generateKey(input.metadata.filename, input.path)
    const buffer = await this.streamToBuffer(input.file)

    await this.client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: buffer,
      ContentType: input.metadata.contentType,
      ContentLength: input.metadata.size,
      Metadata: {
        originalFilename: input.metadata.filename,
        fileType: input.metadata.type,
        ...(input.tags || {}),
      },
    }))

    return ok({
      id: AttachmentId.create(randomUUID()),
      key,
      url: `${this.endpoint}/${this.bucket}/${key}`,
      size: input.metadata.size,
      uploadedAt: new Date(),
    })
  } catch (error) {
    return this.handleError(error, 'upload')
  }
}
```

#### ダウンロード

```typescript
async download(key: string): Promise<Result<{ data: Buffer; metadata: FileMetadata }, StorageError>> {
  try {
    const response = await this.client.send(new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    }))

    if (!response.Body) {
      return err({ type: 'notFound', key })
    }

    const buffer = await this.streamToBuffer(response.Body)
    const metadata: FileMetadata = {
      filename: response.Metadata?.originalFilename || key.split('/').pop() || 'unknown',
      contentType: response.ContentType || 'application/octet-stream',
      size: response.ContentLength || buffer.length,
      type: (response.Metadata?.fileType as FileType) || 'other',
    }

    return ok({ data: buffer, metadata })
  } catch (error) {
    return this.handleError(error, 'download')
  }
}
```

#### 署名付きURL生成

```typescript
async getSignedUploadUrl(
  key: string,
  options?: SignedUrlOptions
): Promise<Result<SignedUrlResult, StorageError>> {
  try {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
    })

    const expiresIn = options?.expiresIn || 3600  // デフォルト1時間
    const url = await getSignedUrl(this.client, command, { expiresIn })

    return ok({
      url,
      expiresAt: new Date(Date.now() + expiresIn * 1000),
    })
  } catch (error) {
    return this.handleError(error, 'getSignedUploadUrl')
  }
}
```

### エラーハンドリング

統一的なエラーハンドリングパターン：

```typescript
private handleError(error: unknown, operation: string): Result<never, StorageError> {
  console.error(`${this.provider} ${operation} error:`, error)

  // ネットワークエラー
  if (error instanceof Error && error.message.includes('ECONNREFUSED')) {
    return err({
      type: 'networkError',
      message: `Cannot connect to ${this.provider}`,
    })
  }

  // 認証エラー
  if ((error as any)?.name === 'InvalidAccessKeyId') {
    return err({
      type: 'accessDenied',
      reason: 'Invalid access credentials',
    })
  }

  // オブジェクトが見つからない
  if ((error as any)?.name === 'NoSuchKey' || 
      (error as any)?.$metadata?.httpStatusCode === 404) {
    return err({
      type: 'notFound',
      key: 'unknown',
    })
  }

  // その他のプロバイダーエラー
  return err({
    type: 'providerError',
    provider: this.provider,
    message: (error as Error)?.message || 'Unknown error',
  })
}
```

## プロバイダー固有の考慮事項

### MinIO

#### バケットポリシー設定

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": "*",
      "Action": ["s3:GetObject"],
      "Resource": ["arn:aws:s3:::beauty-salon-dev/public/*"]
    }
  ]
}
```

#### ヘルスチェック実装

```typescript
async isHealthy(): Promise<boolean> {
  try {
    await this.client.send(new HeadObjectCommand({
      Bucket: this.bucket,
      Key: '.health-check',
    }))
    return true
  } catch (error) {
    // オブジェクトが存在しない場合も正常
    if ((error as any)?.name === 'NoSuchKey') {
      return true
    }
    return false
  }
}
```

### Cloudflare R2

#### R2特有の制限事項

- オブジェクトタグはサポートされない（メタデータで代替）
- ACLはサポートされない（R2の権限システムを使用）
- リージョンは常に`auto`を指定
- CORS設定はダッシュボードから行う

#### Workers統合

```javascript
// Cloudflare Worker での直接アクセス
export default {
  async fetch(request, env) {
    const object = await env.R2_BUCKET.get('path/to/file')
    
    if (!object) {
      return new Response('Not Found', { status: 404 })
    }
    
    const headers = new Headers()
    object.writeHttpMetadata(headers)
    headers.set('etag', object.httpEtag)
    
    return new Response(object.body, { headers })
  }
}
```

## セキュリティベストプラクティス

### 1. アクセスキーの管理

```typescript
// ❌ 悪い例
const accessKey = "AKIAIOSFODNN7EXAMPLE"

// ✅ 良い例
const accessKey = process.env.STORAGE_ACCESS_KEY_ID
if (!accessKey) {
  throw new Error('STORAGE_ACCESS_KEY_ID is required')
}

// ✅ より安全（AWS Secrets Manager使用）
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager'

async function getStorageCredentials() {
  const client = new SecretsManagerClient({ region: 'us-east-1' })
  const response = await client.send(
    new GetSecretValueCommand({ SecretId: 'storage-credentials' })
  )
  return JSON.parse(response.SecretString!)
}
```

### 2. 署名付きURLの制限

```typescript
// アップロードURL生成時の制限
async function generateUploadUrl(
  filename: string,
  contentType: string,
  size: number
): Promise<string> {
  // ファイルサイズチェック
  if (size > MAX_FILE_SIZE) {
    throw new Error('File too large')
  }

  // コンテンツタイプチェック
  if (!ALLOWED_CONTENT_TYPES.includes(contentType)) {
    throw new Error('Invalid content type')
  }

  // 条件付き署名URL
  const command = new PutObjectCommand({
    Bucket: this.bucket,
    Key: generateSecureKey(filename),
    ContentType: contentType,
    ContentLength: size,
  })

  return getSignedUrl(this.client, command, {
    expiresIn: 3600,
    conditions: [
      ['content-length-range', 0, size],
      ['eq', '$Content-Type', contentType],
    ],
  })
}
```

### 3. アクセスパターンの分離

```typescript
// パブリックアクセス用バケット
const PUBLIC_BUCKET = 'beauty-salon-public'

// プライベートアクセス用バケット  
const PRIVATE_BUCKET = 'beauty-salon-private'

// アクセスレベルに応じたバケット選択
function selectBucket(accessLevel: 'public' | 'private'): string {
  return accessLevel === 'public' ? PUBLIC_BUCKET : PRIVATE_BUCKET
}
```

## パフォーマンス最適化

### 1. 並列処理

```typescript
// 複数ファイルの並列アップロード
async function uploadMultipleFiles(
  files: UploadFileInput[]
): Promise<Result<UploadResult[], StorageError>> {
  const uploadPromises = files.map(file => this.upload(file))
  const results = await Promise.allSettled(uploadPromises)

  const successes: UploadResult[] = []
  const errors: StorageError[] = []

  for (const result of results) {
    if (result.status === 'fulfilled' && result.value.type === 'ok') {
      successes.push(result.value.value)
    } else if (result.status === 'fulfilled' && result.value.type === 'err') {
      errors.push(result.value.error)
    }
  }

  if (errors.length > 0) {
    return err(errors[0])  // 最初のエラーを返す
  }

  return ok(successes)
}
```

### 2. ストリーミング

```typescript
// 大きなファイルのストリーミングダウンロード
async function streamDownload(
  key: string,
  outputStream: NodeJS.WritableStream
): Promise<void> {
  const response = await this.client.send(new GetObjectCommand({
    Bucket: this.bucket,
    Key: key,
  }))

  if (response.Body) {
    const stream = response.Body as Readable
    stream.pipe(outputStream)
  }
}
```

### 3. キャッシュ戦略

```typescript
// CloudFront/CDN統合（R2）
function getCdnUrl(key: string): string {
  if (this.provider === 'r2' && process.env.CDN_DOMAIN) {
    return `https://${process.env.CDN_DOMAIN}/${key}`
  }
  return `${this.endpoint}/${this.bucket}/${key}`
}

// メタデータキャッシュ
class MetadataCache {
  private cache = new Map<string, {
    metadata: FileMetadata
    timestamp: number
  }>()

  private readonly TTL = 5 * 60 * 1000  // 5分

  get(key: string): FileMetadata | null {
    const entry = this.cache.get(key)
    if (entry && Date.now() - entry.timestamp < this.TTL) {
      return entry.metadata
    }
    this.cache.delete(key)
    return null
  }

  set(key: string, metadata: FileMetadata): void {
    this.cache.set(key, {
      metadata,
      timestamp: Date.now(),
    })
  }
}
```

## 監視とデバッグ

### ストレージメトリクス

```typescript
// プロバイダー別のメトリクス収集
interface StorageMetrics {
  provider: string
  operation: 'upload' | 'download' | 'delete'
  duration: number
  size?: number
  success: boolean
  error?: string
}

async function trackOperation<T>(
  operation: () => Promise<T>,
  metrics: Omit<StorageMetrics, 'duration' | 'success' | 'error'>
): Promise<T> {
  const start = Date.now()
  
  try {
    const result = await operation()
    
    logger.info('Storage operation completed', {
      ...metrics,
      duration: Date.now() - start,
      success: true,
    })
    
    return result
  } catch (error) {
    logger.error('Storage operation failed', {
      ...metrics,
      duration: Date.now() - start,
      success: false,
      error: (error as Error).message,
    })
    
    throw error
  }
}
```

### デバッグツール

```typescript
// S3 APIコールのデバッグ（開発環境のみ）
if (process.env.NODE_ENV === 'development') {
  client.middlewareStack.add(
    (next) => async (args) => {
      console.log('S3 Request:', args.request)
      const result = await next(args)
      console.log('S3 Response:', result.response)
      return result
    },
    {
      step: 'finalizeRequest',
    }
  )
}
```