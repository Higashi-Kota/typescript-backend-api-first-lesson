/**
 * Attachment Repository Interface
 */

import type { UserId } from '../models/user.js'
import type {
  AttachmentId,
  ShareLinkId,
  ShareToken,
} from '../shared/branded-types.js'
import type { RepositoryError } from '../shared/errors.js'
import type { PaginatedResult, PaginationParams } from '../shared/pagination.js'
import type { Result } from '../shared/result.js'

export type AttachmentStatus =
  | 'active'
  | 'soft_deleted'
  | 'hard_deleted'
  | 'virus_detected'

export type AttachmentData = {
  id: AttachmentId
  key: string
  filename: string
  contentType: string
  size: number
  uploadedBy: UserId
  status: AttachmentStatus
  scanStatus: 'pending' | 'clean' | 'infected' | 'error'
  scanMessage: string | null
  deletedAt: Date | null
  expiresAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export type CreateAttachmentInput = {
  key: string
  filename: string
  contentType: string
  size: number
  uploadedBy: UserId
  expiresAt?: Date
}

export type UpdateAttachmentInput = {
  id: AttachmentId
  status?: AttachmentStatus
  scanStatus?: 'pending' | 'clean' | 'infected' | 'error'
  scanMessage?: string | null
  deletedAt?: Date | null
}

export type ShareLinkData = {
  id: ShareLinkId
  attachmentId: AttachmentId
  token: ShareToken
  password: string | null
  maxDownloads: number | null
  downloadCount: number
  expiresAt: Date | null
  createdBy: UserId
  createdAt: Date
  updatedAt: Date
}

export type CreateShareLinkInput = {
  attachmentId: AttachmentId
  token: ShareToken
  password?: string
  maxDownloads?: number
  expiresAt?: Date
  createdBy: UserId
}

export type DownloadLogData = {
  id: string
  attachmentId: AttachmentId
  downloadedBy: UserId | null
  ipAddress: string
  userAgent: string | null
  shareToken: ShareToken | null
  downloadedAt: Date
}

export type CreateDownloadLogInput = {
  attachmentId: AttachmentId
  downloadedBy?: UserId
  ipAddress: string
  userAgent?: string
  shareToken?: ShareToken
}

export type AttachmentSearchCriteria = {
  uploadedBy?: UserId
  status?: AttachmentStatus
  scanStatus?: 'pending' | 'clean' | 'infected' | 'error'
  filename?: string
  contentType?: string
  minSize?: number
  maxSize?: number
  uploadedAfter?: Date
  uploadedBefore?: Date
}

export interface AttachmentRepository {
  // Attachment CRUD
  create(
    input: CreateAttachmentInput
  ): Promise<Result<AttachmentData, RepositoryError>>
  findById(
    id: AttachmentId
  ): Promise<Result<AttachmentData | null, RepositoryError>>
  findByKey(
    key: string
  ): Promise<Result<AttachmentData | null, RepositoryError>>
  update(
    input: UpdateAttachmentInput
  ): Promise<Result<AttachmentData, RepositoryError>>
  softDelete(id: AttachmentId): Promise<Result<void, RepositoryError>>
  hardDelete(id: AttachmentId): Promise<Result<void, RepositoryError>>

  // Search and listing
  search(
    criteria: AttachmentSearchCriteria,
    pagination: PaginationParams
  ): Promise<Result<PaginatedResult<AttachmentData>, RepositoryError>>

  // User's attachments
  findByUser(
    userId: UserId,
    pagination: PaginationParams
  ): Promise<Result<PaginatedResult<AttachmentData>, RepositoryError>>

  // Storage quota
  getUserStorageUsage(userId: UserId): Promise<Result<number, RepositoryError>>

  // Share links
  createShareLink(
    input: CreateShareLinkInput
  ): Promise<Result<ShareLinkData, RepositoryError>>
  findShareLinkByToken(
    token: ShareToken
  ): Promise<Result<ShareLinkData | null, RepositoryError>>
  incrementShareLinkDownloadCount(
    id: ShareLinkId
  ): Promise<Result<void, RepositoryError>>
  deleteShareLink(id: ShareLinkId): Promise<Result<void, RepositoryError>>

  // Download logs
  createDownloadLog(
    input: CreateDownloadLogInput
  ): Promise<Result<void, RepositoryError>>
  getDownloadHistory(
    attachmentId: AttachmentId,
    pagination: PaginationParams
  ): Promise<Result<PaginatedResult<DownloadLogData>, RepositoryError>>

  // Cleanup
  deleteExpiredAttachments(): Promise<Result<number, RepositoryError>>
  deleteExpiredShareLinks(): Promise<Result<number, RepositoryError>>
}
