/**
 * Attachment Repository Interface
 */

import type {
  AttachmentData,
  AttachmentId,
  CreateAttachmentInput,
  CreateDownloadLogInput,
  CreateShareLinkInput,
  DownloadLogData,
  ShareLinkData,
  ShareLinkId,
  ShareToken,
  UpdateAttachmentInput,
} from '../models/attachment'
import type { RepositoryError } from '../shared/errors'
import type { PaginatedResult, PaginationParams } from '../shared/pagination'
import type { Result } from '../shared/result'

// Re-export for convenience
export type { ShareLinkId, ShareToken }

export type AttachmentSearchCriteria = {
  uploadedBy?: string
  salonId?: string
  filename?: string
  contentType?: string
  fileType?: string
  minSize?: number
  maxSize?: number
  uploadedAfter?: Date
  uploadedBefore?: Date
  tags?: string[]
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
    userId: string,
    pagination: PaginationParams
  ): Promise<Result<PaginatedResult<AttachmentData>, RepositoryError>>

  // Storage quota
  getUserStorageUsage(userId: string): Promise<Result<number, RepositoryError>>

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
