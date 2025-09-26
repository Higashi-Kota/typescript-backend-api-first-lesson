# ファイルアップロード機能

## 概要

本システムでは、環境に応じて異なるストレージプロバイダーを使用したファイルアップロード機能を提供します。開発環境ではMinIO（S3互換）、本番環境ではCloudflare R2を使用し、直接アップロード/ダウンロードに対応した署名付きURLを提供します。

## アーキテクチャ

### システム構成

```
Frontend (Browser)
    ↓ (1) アップロードURL要求
API Server
    ↓ (2) 署名付きURL生成
Storage Service (MinIO/R2)
    ↑ (3) 直接アップロード
Frontend (Browser)
```

### レイヤー構成

```
Domain Layer (Interface)
    ├── StorageService
    └── AttachmentRepository
         ↓
Infrastructure Layer
    ├── Storage Providers
    │   ├── MinioStorageProvider
    │   └── R2StorageProvider
    └── AttachmentRepositoryImpl
```

## 実装詳細

### 1. ストレージサービスインターフェース

```typescript
export interface StorageService {
  // ファイルアップロード（サーバーサイド）
  upload(input: UploadFileInput): Promise<Result<UploadResult, StorageError>>
  
  // ファイルダウンロード（サーバーサイド）
  download(key: string): Promise<Result<{ data: Buffer; metadata: FileMetadata }, StorageError>>
  
  // ファイル削除
  delete(key: string): Promise<Result<void, StorageError>>
  
  // 署名付きアップロードURL生成
  getSignedUploadUrl(key: string, options?: SignedUrlOptions): Promise<Result<SignedUrlResult, StorageError>>
  
  // 署名付きダウンロードURL生成
  getSignedDownloadUrl(key: string, options?: SignedUrlOptions): Promise<Result<SignedUrlResult, StorageError>>
  
  // ファイルメタデータ取得
  getMetadata(key: string): Promise<Result<StorageObject, StorageError>>
  
  // ファイル存在確認
  exists(key: string): Promise<Result<boolean, StorageError>>
}
```

### 2. ファイルアップロードフロー

#### Step 1: クライアントがアップロードURLを要求

```typescript
// POST /api/v1/attachments/upload-url
{
  "filename": "document.pdf",
  "contentType": "application/pdf",
  "size": 1048576,  // 1MB
  "salonId": "uuid-here"  // オプション
}
```

#### Step 2: サーバーが署名付きURLを生成

```typescript
// AttachmentRouter
async function handleUploadUrlRequest(req: Request, res: Response) {
  const { filename, contentType, size } = req.body
  const userId = req.user.id
  
  // ユニークなキーを生成
  const key = `users/${userId}/${randomUUID()}/${filename}`
  
  // 署名付きURLを生成（1時間有効）
  const urlResult = await storageService.getSignedUploadUrl(key, {
    expiresIn: 3600,
  })
  
  if (urlResult.type === 'ok') {
    // データベースに仮レコード作成
    await attachmentRepository.create({
      key,
      filename,
      contentType,
      size,
      uploadedBy: userId,
      status: 'pending',
    })
    
    return res.json({
      uploadUrl: urlResult.value.url,
      key,
      expiresAt: urlResult.value.expiresAt,
    })
  }
}
```

#### Step 3: クライアントが直接ストレージにアップロード

```javascript
// Frontend
const response = await fetch('/api/v1/attachments/upload-url', {
  method: 'POST',
  body: JSON.stringify({ filename, contentType, size }),
})

const { uploadUrl } = await response.json()

// 直接ストレージにアップロード
await fetch(uploadUrl, {
  method: 'PUT',
  body: file,
  headers: {
    'Content-Type': contentType,
  },
})
```

### 3. 型安全性の確保

```typescript
// Attachment IDの型定義（UUID形式）
export type AttachmentId = string

// Share Link Tokenの型定義（32文字のトークン）
export type ShareLinkToken = string

// バリデーション関数
export const validateAttachmentId = (id: string): Result<AttachmentId, ValidationError> => {
  if (!z.string().uuid().safeParse(id).success) {
    return err({ field: 'id', message: 'Invalid attachment ID format' })
  }
  return ok(id)
}

export const validateShareToken = (token: string): Result<ShareLinkToken, ValidationError> => {
  if (token.length !== 32) {
    return err({ field: 'token', message: 'Invalid share token length' })
  }
  return ok(token)
}

// 使用例
const attachmentIdResult = validateAttachmentId(randomUUID())
const shareTokenResult = validateShareToken(generateSecureToken())
```

## データベーススキーマ

### attachments テーブル

```sql
CREATE TABLE attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  filename TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES users(id),
  salon_id UUID REFERENCES salons(id),
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### share_links テーブル

```sql
CREATE TABLE share_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attachment_id UUID NOT NULL REFERENCES attachments(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP,
  max_downloads INTEGER,
  download_count INTEGER NOT NULL DEFAULT 0,
  password_hash TEXT,
  allowed_emails TEXT[],
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### download_logs テーブル

```sql
CREATE TABLE download_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attachment_id UUID NOT NULL REFERENCES attachments(id),
  share_link_id UUID REFERENCES share_links(id),
  downloaded_by UUID REFERENCES users(id),
  ip_address TEXT,
  user_agent TEXT,
  downloaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

## APIエンドポイント

### アップロード関連

```typescript
// アップロードURL取得
POST /api/attachments/upload-url
Authorization: Bearer <token>
{
  "filename": "document.pdf",
  "contentType": "application/pdf",
  "size": 1048576
}

// アップロード完了通知
POST /api/attachments/:attachmentId/complete
Authorization: Bearer <token>

// ファイル一覧取得
GET /api/attachments?page=1&limit=20&salonId=xxx
Authorization: Bearer <token>

// ファイル詳細取得
GET /api/attachments/:attachmentId
Authorization: Bearer <token>

// ダウンロードURL取得
GET /api/attachments/:attachmentId/download-url?inline=true
Authorization: Bearer <token>

// ファイル削除
DELETE /api/attachments/:attachmentId
Authorization: Bearer <token>
```

### 共有リンク関連

```typescript
// 共有リンク作成
POST /api/attachments/:attachmentId/share-links
Authorization: Bearer <token>
{
  "expiresAt": "2024-12-31T23:59:59Z",
  "maxDownloads": 10,
  "password": "optional-password",
  "allowedEmails": ["user@example.com"]
}

// 共有リンク一覧
GET /api/attachments/:attachmentId/share-links
Authorization: Bearer <token>

// 共有リンク削除
DELETE /api/share-links/:shareLinkId
Authorization: Bearer <token>

// 共有ファイル取得（認証不要）
GET /api/share/:shareToken?password=xxx

// 共有ファイルダウンロード（認証不要）
GET /api/share/:shareToken/download?password=xxx
```

## セキュリティ考慮事項

### 1. アクセス制御

```typescript
// ファイルオーナーチェック
async function checkFileOwnership(
  attachmentId: AttachmentId,
  userId: UserId
): Promise<boolean> {
  const attachment = await attachmentRepository.findById(attachmentId)
  
  if (attachment.type === 'err') {
    return false
  }
  
  // オーナーまたは関連サロンのメンバーか確認
  return (
    attachment.value.uploadedBy === userId ||
    (attachment.value.salonId && 
     await checkSalonMembership(attachment.value.salonId, userId))
  )
}
```

### 2. ファイルサイズ制限

```typescript
const MAX_FILE_SIZE = 500 * 1024 * 1024  // 500MB

const FileSizeSchema = z
  .number()
  .int()
  .positive()
  .max(MAX_FILE_SIZE, 'File size exceeds maximum allowed')
```

### 3. ファイルタイプ制限

```typescript
const ALLOWED_CONTENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
] as const

const ContentTypeSchema = z.enum(ALLOWED_CONTENT_TYPES)
```

### 4. 署名付きURLの有効期限

```typescript
// アップロードURL: 1時間
const UPLOAD_URL_EXPIRY = 3600

// ダウンロードURL: 24時間（設定可能）
const DOWNLOAD_URL_EXPIRY = 86400

// 共有リンク: ユーザー指定または無期限
```

## ストレージプロバイダーの設定

### MinIO（開発環境）

```env
STORAGE_PROVIDER=minio
MINIO_ENDPOINT=http://localhost:9000
MINIO_BUCKET=beauty-salon-dev
MINIO_REGION=us-east-1
MINIO_ACCESS_KEY_ID=minioadmin
MINIO_SECRET_ACCESS_KEY=minioadmin
```

### Cloudflare R2（本番環境）

```env
STORAGE_PROVIDER=r2
R2_ENDPOINT=https://xxx.r2.cloudflarestorage.com
R2_BUCKET=beauty-salon-prod
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
```

## エラーハンドリング

```typescript
export type StorageError =
  | { type: 'notFound'; key: string }
  | { type: 'accessDenied'; reason?: string }
  | { type: 'quotaExceeded'; limit: number; used: number }
  | { type: 'invalidKey'; key: string; reason: string }
  | { type: 'providerError'; provider: string; message: string }
  | { type: 'networkError'; message: string }
  | { type: 'validationError'; field: string; message: string }

// エラー処理の例
const result = await storageService.upload(input)

match(result)
  .with({ type: 'ok' }, ({ value }) => {
    console.log('Upload successful:', value.key)
  })
  .with({ type: 'err', error: { type: 'quotaExceeded' } }, ({ error }) => {
    console.error(`Storage quota exceeded: ${error.used}/${error.limit}`)
  })
  .with({ type: 'err', error: { type: 'accessDenied' } }, ({ error }) => {
    console.error('Access denied:', error.reason)
  })
  .otherwise(({ error }) => {
    console.error('Upload failed:', error)
  })
```

## パフォーマンス最適化

### 1. 並列アップロード

```typescript
// 大きなファイルのマルチパートアップロード
async function uploadLargeFile(
  file: File,
  chunkSize: number = 5 * 1024 * 1024  // 5MB
) {
  const chunks = Math.ceil(file.size / chunkSize)
  const uploadPromises: Promise<void>[] = []
  
  for (let i = 0; i < chunks; i++) {
    const start = i * chunkSize
    const end = Math.min(start + chunkSize, file.size)
    const chunk = file.slice(start, end)
    
    uploadPromises.push(uploadChunk(chunk, i))
  }
  
  await Promise.all(uploadPromises)
}
```

### 2. キャッシュ戦略

```typescript
// メタデータキャッシュ
const metadataCache = new Map<string, {
  data: StorageObject
  timestamp: number
}>()

async function getCachedMetadata(key: string): Promise<StorageObject | null> {
  const cached = metadataCache.get(key)
  
  if (cached && Date.now() - cached.timestamp < 300000) {  // 5分
    return cached.data
  }
  
  return null
}
```

### 3. CDN統合

```typescript
// CloudflareのCDNを使用したURL生成
function getCdnUrl(key: string): string {
  const baseUrl = process.env.CDN_BASE_URL || 'https://cdn.example.com'
  return `${baseUrl}/${key}`
}
```

## 監視とロギング

### アップロードメトリクス

```typescript
// 構造化ログイベント
type StorageLogEvent =
  | { type: 'uploadStarted'; key: string; size: number; userId: string }
  | { type: 'uploadCompleted'; key: string; duration: number }
  | { type: 'uploadFailed'; key: string; error: StorageError }
  | { type: 'downloadRequested'; key: string; userId?: string }
  | { type: 'shareCreated'; attachmentId: string; expiresAt?: Date }

// ログ記録
logger.log({
  type: 'uploadCompleted',
  key: 'users/123/456/document.pdf',
  duration: 2500,
})
```

### ストレージ使用量の追跡

```typescript
// ユーザーごとのストレージ使用量
async function getUserStorageUsage(userId: UserId): Promise<number> {
  const attachments = await attachmentRepository.findByUser(userId)
  
  if (attachments.type === 'err') {
    return 0
  }
  
  return attachments.value.reduce((total, att) => total + att.size, 0)
}

// クォータチェック
async function checkStorageQuota(
  userId: UserId,
  additionalSize: number
): Promise<boolean> {
  const currentUsage = await getUserStorageUsage(userId)
  const userQuota = await getUserQuota(userId)
  
  return currentUsage + additionalSize <= userQuota
}
```