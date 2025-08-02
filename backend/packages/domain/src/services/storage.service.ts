import type { Brand } from '../shared/brand.js'
import type { Result } from '../shared/result.js'

// Branded types
export type AttachmentId = Brand<string, 'AttachmentId'>
export type ShareLinkId = Brand<string, 'ShareLinkId'>
export type ShareToken = Brand<string, 'ShareToken'>

// File types
export type FileType = 'image' | 'document' | 'other'
export type ImageFormat = 'jpeg' | 'jpg' | 'png' | 'gif' | 'webp'
export type DocumentFormat = 'pdf' | 'doc' | 'docx' | 'xls' | 'xlsx' | 'csv'

export type FileMetadata = {
  filename: string
  contentType: string
  size: number
  format?: ImageFormat | DocumentFormat
  type: FileType
}

export type UploadFileInput = {
  file: Buffer | ReadableStream
  metadata: FileMetadata
  path?: string
  tags?: Record<string, string>
}

export type StorageError =
  | { type: 'fileSizeExceeded'; maxSize: number; actualSize: number }
  | { type: 'unsupportedFileType'; fileType: string; supportedTypes: string[] }
  | { type: 'storageQuotaExceeded'; quota: number; used: number }
  | { type: 'invalidFileFormat'; message: string }
  | { type: 'providerError'; provider: string; message: string; code?: string }
  | { type: 'notFound'; key: string }
  | { type: 'accessDenied'; reason: string }
  | { type: 'networkError'; message: string }

export type UploadResult = {
  id: AttachmentId
  key: string
  url: string
  size: number
  uploadedAt: Date
}

export type SignedUrlOptions = {
  expiresIn: number // seconds
  contentDisposition?: 'inline' | 'attachment'
  filename?: string
}

export type SignedUrlResult = {
  url: string
  expiresAt: Date
}

export type StorageObject = {
  id: AttachmentId
  key: string
  metadata: FileMetadata
  uploadedAt: Date
  tags?: Record<string, string>
}

export type ShareLinkInput = {
  attachmentId: AttachmentId
  expiresAt?: Date
  maxDownloads?: number
  password?: string
  allowedEmails?: string[]
}

export type ShareLink = {
  id: ShareLinkId
  token: ShareToken
  attachmentId: AttachmentId
  expiresAt?: Date
  maxDownloads?: number
  downloadCount: number
  hasPassword: boolean
  allowedEmails?: string[]
  createdAt: Date
}

export interface StorageService {
  // File operations
  upload(input: UploadFileInput): Promise<Result<UploadResult, StorageError>>
  download(
    key: string
  ): Promise<Result<{ data: Buffer; metadata: FileMetadata }, StorageError>>
  delete(key: string): Promise<Result<void, StorageError>>
  exists(key: string): Promise<Result<boolean, StorageError>>

  // URL generation
  getSignedUploadUrl(
    key: string,
    options?: SignedUrlOptions
  ): Promise<Result<SignedUrlResult, StorageError>>
  getSignedDownloadUrl(
    key: string,
    options?: SignedUrlOptions
  ): Promise<Result<SignedUrlResult, StorageError>>

  // Metadata operations
  getMetadata(key: string): Promise<Result<StorageObject, StorageError>>
  updateTags(
    key: string,
    tags: Record<string, string>
  ): Promise<Result<void, StorageError>>

  // Provider information
  getProvider(): string
  isHealthy(): Promise<boolean>
}

// Storage limits by subscription tier
export type SubscriptionTier = 'free' | 'pro' | 'enterprise'

export type StorageLimits = {
  maxFileSizeMB: number
  maxTotalStorageGB: number | null // null means unlimited
  allowedFileTypes: FileType[]
}

export const STORAGE_LIMITS: Record<SubscriptionTier, StorageLimits> = {
  free: {
    maxFileSizeMB: 5,
    maxTotalStorageGB: 0.1, // 100MB
    allowedFileTypes: ['image', 'document'],
  },
  pro: {
    maxFileSizeMB: 50,
    maxTotalStorageGB: 10,
    allowedFileTypes: ['image', 'document'],
  },
  enterprise: {
    maxFileSizeMB: 500,
    maxTotalStorageGB: null, // unlimited
    allowedFileTypes: ['image', 'document', 'other'],
  },
}

// Helper functions
export const getFileType = (contentType: string): FileType => {
  if (contentType.startsWith('image/')) {
    return 'image'
  }
  if (
    contentType === 'application/pdf' ||
    contentType.includes('document') ||
    contentType.includes('sheet') ||
    contentType === 'text/csv'
  ) {
    return 'document'
  }
  return 'other'
}

export const getImageFormat = (
  contentType: string
): ImageFormat | undefined => {
  const formats: Record<string, ImageFormat> = {
    'image/jpeg': 'jpeg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
  }
  return formats[contentType]
}

export const getDocumentFormat = (
  contentType: string,
  filename: string
): DocumentFormat | undefined => {
  const formats: Record<string, DocumentFormat> = {
    'application/pdf': 'pdf',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      'docx',
    'application/vnd.ms-excel': 'xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'text/csv': 'csv',
  }

  if (formats[contentType]) {
    return formats[contentType]
  }

  // Fallback to extension
  const ext = filename.split('.').pop()?.toLowerCase()
  if (ext && ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv'].includes(ext)) {
    return ext as DocumentFormat
  }

  return undefined
}
