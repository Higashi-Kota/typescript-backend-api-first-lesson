/**
 * Attachment Domain Model
 * File and media management with share links
 */

import type { components } from '@beauty-salon-backend/generated'
import { match } from 'ts-pattern'
import type { Brand } from '../shared/brand'
import type { DomainError, ValidationError } from '../shared/errors'
import type { Result } from '../shared/result'
import { err, ok } from '../shared/result'

// Brand the ID types for type safety
export type AttachmentId = Brand<string, 'AttachmentId'>
export type SalonId = Brand<components['schemas']['Models.SalonId'], 'SalonId'>
export type CustomerId = Brand<
  components['schemas']['Models.CustomerId'],
  'CustomerId'
>
export type ShareLinkId = Brand<string, 'ShareLinkId'>
export type ShareToken = string

// Domain Attachment Model - extends generated type
export interface Attachment
  extends Omit<
    components['schemas']['Models.Attachment'],
    'tags' | 'metadata'
  > {
  id: AttachmentId
  // Additional fields from DB not in API
  storageProvider?: string
  status?: string
  description?: string
  expiresAt?: string
  deletedAt?: string
  // Properly typed fields
  tags?: { [key: string]: string }
  metadata?: { [key: string]: unknown }
}

// Share Link Model
export interface ShareLink {
  id: ShareLinkId
  attachmentId: AttachmentId
  token: ShareToken
  expiresAt?: string
  maxDownloads?: number
  currentDownloads: number
  isActive: boolean
  createdAt: string
  createdBy: string
  lastAccessedAt?: string
}

// Download Log Model
export interface DownloadLog {
  id: string
  attachmentId: AttachmentId
  shareLinkId?: ShareLinkId
  downloadedBy: string
  downloadedAt: string
  ipAddress?: string
  userAgent?: string
}

// Attachment State Management (Sum Type)
export type AttachmentState =
  | { type: 'uploading'; attachment: Attachment; progress: number }
  | { type: 'active'; attachment: Attachment }
  | { type: 'archived'; attachment: Attachment; archivedAt: string }
  | { type: 'expired'; attachment: Attachment; expiredAt: string }
  | {
      type: 'deleted'
      attachmentId: AttachmentId
      deletedAt: string
      deletedBy: string
    }
  | {
      type: 'quarantined'
      attachment: Attachment
      reason: string
      quarantinedAt: string
    }

// Attachment Operation Results (Sum Type)
export type AttachmentOperationResult =
  | { type: 'uploaded'; attachment: Attachment; uploadUrl?: string }
  | { type: 'updated'; attachment: Attachment; changes: string[] }
  | { type: 'deleted'; attachmentId: AttachmentId }
  | { type: 'archived'; attachment: Attachment }
  | { type: 'restored'; attachment: Attachment }
  | { type: 'share_link_created'; shareLink: ShareLink }
  | { type: 'share_link_revoked'; shareLinkId: ShareLinkId }
  | { type: 'download_logged'; downloadLog: DownloadLog }
  | { type: 'validation_failed'; errors: ValidationError[] }
  | { type: 'not_found'; attachmentId: AttachmentId }
  | { type: 'storage_quota_exceeded'; currentUsage: number; maxQuota: number }
  | { type: 'file_too_large'; size: number; maxSize: number }
  | { type: 'invalid_file_type'; contentType: string }
  | { type: 'unauthorized'; action: string }
  | { type: 'error'; error: DomainError }

// Attachment Search Result
export type AttachmentSearchResult =
  | { type: 'found'; attachments: Attachment[]; totalCount: number }
  | { type: 'empty'; query: AttachmentSearchQuery }
  | { type: 'error'; error: DomainError }

export interface AttachmentSearchQuery {
  salonId?: SalonId
  customerId?: CustomerId
  entityType?: string
  entityId?: string
  contentType?: string
  minSize?: number
  maxSize?: number
  uploadedFrom?: string
  uploadedTo?: string
  includeDeleted?: boolean
  tags?: string[]
}

// Attachment Events for audit/tracking
export type AttachmentEvent =
  | {
      type: 'attachment_uploaded'
      attachment: Attachment
      uploadedBy: string
      timestamp: string
    }
  | {
      type: 'attachment_updated'
      attachmentId: AttachmentId
      changes: AttachmentChanges
      updatedBy: string
      timestamp: string
    }
  | {
      type: 'attachment_deleted'
      attachmentId: AttachmentId
      deletedBy: string
      timestamp: string
    }
  | {
      type: 'attachment_archived'
      attachmentId: AttachmentId
      archivedBy: string
      timestamp: string
    }
  | {
      type: 'share_link_created'
      attachmentId: AttachmentId
      shareLink: ShareLink
      createdBy: string
      timestamp: string
    }
  | {
      type: 'share_link_accessed'
      shareLinkId: ShareLinkId
      accessedBy: string
      timestamp: string
    }
  | {
      type: 'attachment_quarantined'
      attachmentId: AttachmentId
      reason: string
      quarantinedBy: string
      timestamp: string
    }

export interface AttachmentChanges {
  filename?: { from: string; to: string }
  description?: { from: string | undefined; to: string | undefined }
  tags?: { added: string[]; removed: string[] }
  metadata?: { from: any; to: any }
}

// Re-export related types from generated schemas
export type CreateShareLinkRequest =
  components['schemas']['Models.CreateShareLinkRequest']
export type UploadAttachmentRequest =
  components['schemas']['Models.UploadAttachmentRequest']
export type UploadUrlResponse =
  components['schemas']['Models.UploadUrlResponse']
export type DownloadUrlResponse =
  components['schemas']['Models.DownloadUrlResponse']

// Additional types for repositories
export type AttachmentData = Attachment
export type CreateAttachmentInput = Partial<Attachment>
export type UpdateAttachmentInput = Partial<Attachment>
export type CreateDownloadLogInput = Partial<DownloadLog>
export type CreateShareLinkInput = Partial<ShareLink>
export type DownloadLogData = DownloadLog
export type ShareLinkData = ShareLink

// Business Logic Functions

/**
 * Validate attachment data
 */
export const validateAttachment = (
  attachment: Partial<Attachment>
): Result<Attachment, ValidationError[]> => {
  const errors: ValidationError[] = []

  if (!attachment.key) {
    errors.push({ field: 'key', message: 'Storage key is required' })
  }

  if (!attachment.filename) {
    errors.push({ field: 'filename', message: 'Filename is required' })
  }

  if (!attachment.contentType) {
    errors.push({ field: 'contentType', message: 'Content type is required' })
  }

  if (attachment.size === undefined || attachment.size === null) {
    errors.push({ field: 'size', message: 'File size is required' })
  } else if (attachment.size < 0) {
    errors.push({ field: 'size', message: 'File size must be positive' })
  }

  if (attachment.filename && attachment.filename.length > 255) {
    errors.push({
      field: 'filename',
      message: 'Filename cannot exceed 255 characters',
    })
  }

  // Validate filename doesn't contain path traversal
  if (attachment.filename?.includes('../')) {
    errors.push({
      field: 'filename',
      message: 'Filename contains invalid characters',
    })
  }

  if (errors.length > 0) {
    return err(errors)
  }

  return ok(attachment as Attachment)
}

/**
 * Validate file type against allowed types
 */
export const validateFileType = (
  contentType: string,
  allowedTypes: string[]
): boolean => {
  // Check exact match
  if (allowedTypes.includes(contentType)) {
    return true
  }

  // Check wildcard patterns (e.g., "image/*")
  for (const allowedType of allowedTypes) {
    if (allowedType.endsWith('/*')) {
      const prefix = allowedType.slice(0, -2)
      if (contentType.startsWith(`${prefix}/`)) {
        return true
      }
    }
  }

  return false
}

/**
 * Calculate storage quota usage
 */
export const calculateStorageUsage = (
  attachments: Attachment[]
): {
  totalSize: number
  fileCount: number
  byType: Map<string, { count: number; size: number }>
} => {
  let totalSize = 0
  const byType = new Map<string, { count: number; size: number }>()

  for (const attachment of attachments) {
    totalSize += attachment.size

    // Group by major content type (e.g., "image", "video")
    const majorType = attachment.contentType.split('/')[0] ?? 'unknown'
    const existing = byType.get(majorType) || { count: 0, size: 0 }
    byType.set(majorType, {
      count: existing.count + 1,
      size: existing.size + attachment.size,
    })
  }

  return {
    totalSize,
    fileCount: attachments.length,
    byType,
  }
}

/**
 * Check if storage quota would be exceeded
 */
export const checkStorageQuota = (
  currentUsage: number,
  fileSize: number,
  maxQuota: number
): boolean => {
  return currentUsage + fileSize <= maxQuota
}

/**
 * Generate share link token
 */
export const generateShareToken = (): ShareToken => {
  // Generate a URL-safe random token
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
  let token = ''
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return token
}

/**
 * Check if share link is valid
 */
export const isShareLinkValid = (shareLink: ShareLink): boolean => {
  if (!shareLink.isActive) {
    return false
  }

  // Check expiration
  if (shareLink.expiresAt) {
    const now = new Date()
    const expiresAt = new Date(shareLink.expiresAt)
    if (now >= expiresAt) {
      return false
    }
  }

  // Check download limit
  if (shareLink.maxDownloads !== undefined && shareLink.maxDownloads !== null) {
    if (shareLink.currentDownloads >= shareLink.maxDownloads) {
      return false
    }
  }

  return true
}

/**
 * Calculate file expiration date based on type
 */
export const calculateExpirationDate = (
  contentType: string,
  uploadDate: Date
): Date | null => {
  const majorType = contentType.split('/')[0]

  // Different retention policies by file type
  const retentionDays = match(majorType)
    .with('image', () => 365) // Keep images for 1 year
    .with('video', () => 180) // Keep videos for 6 months
    .with('audio', () => 180) // Keep audio for 6 months
    .with('application', () => 90) // Keep documents for 3 months
    .otherwise(() => 30) // Default 30 days for others

  const expirationDate = new Date(uploadDate)
  expirationDate.setDate(expirationDate.getDate() + retentionDays)

  return expirationDate
}

/**
 * Check if attachment can be deleted
 */
export const canDeleteAttachment = (
  attachment: Attachment,
  userId: string,
  userRole?: string
): boolean => {
  // Admins can always delete
  if (userRole === 'admin' || userRole === 'super_admin') {
    return true
  }

  // Check if user is the uploader
  if (attachment.uploadedBy === userId) {
    // Check if not too old (e.g., within 7 days)
    const uploadDate = new Date(attachment.uploadedAt)
    const now = new Date()
    const daysSinceUpload =
      (now.getTime() - uploadDate.getTime()) / (1000 * 60 * 60 * 24)

    return daysSinceUpload <= 7
  }

  return false
}

/**
 * Get attachment status display
 */
export const getAttachmentDisplayInfo = (state: AttachmentState) => {
  return match(state)
    .with({ type: 'uploading' }, ({ attachment, progress }) => ({
      ...attachment,
      status: `Uploading (${progress}%)`,
      statusColor: 'blue',
    }))
    .with({ type: 'active' }, ({ attachment }) => ({
      ...attachment,
      status: 'Active',
      statusColor: 'green',
    }))
    .with({ type: 'archived' }, ({ attachment, archivedAt }) => ({
      ...attachment,
      status: `Archived ${archivedAt}`,
      statusColor: 'gray',
    }))
    .with({ type: 'expired' }, ({ attachment, expiredAt }) => ({
      ...attachment,
      status: `Expired ${expiredAt}`,
      statusColor: 'orange',
    }))
    .with({ type: 'deleted' }, ({ attachmentId, deletedAt }) => ({
      id: attachmentId,
      status: `Deleted ${deletedAt}`,
      statusColor: 'red',
    }))
    .with({ type: 'quarantined' }, ({ attachment, reason }) => ({
      ...attachment,
      status: `Quarantined: ${reason}`,
      statusColor: 'purple',
    }))
    .exhaustive()
}

/**
 * Format file size for display
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) {
    return '0 Bytes'
  }

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`
}

/**
 * Extract file extension from filename
 */
export const getFileExtension = (filename: string): string => {
  const lastDot = filename.lastIndexOf('.')
  if (lastDot === -1) {
    return ''
  }
  return filename.substring(lastDot + 1).toLowerCase()
}

/**
 * Check if file is an image
 */
export const isImageFile = (contentType: string): boolean => {
  return contentType.startsWith('image/')
}

/**
 * Check if file is a video
 */
export const isVideoFile = (contentType: string): boolean => {
  return contentType.startsWith('video/')
}

/**
 * Sanitize filename for storage
 */
export const sanitizeFilename = (filename: string): string => {
  // Remove path components
  const basename = filename.split(/[\\/]/).pop() || filename

  // Replace dangerous characters
  return basename
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/\.{2,}/g, '_')
    .substring(0, 255)
}
