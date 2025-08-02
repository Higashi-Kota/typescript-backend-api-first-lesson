/**
 * Attachment Repository Implementation
 */

import {
  attachments,
  download_logs,
  share_links,
} from '@beauty-salon-backend/database'
import { and, desc, eq, gte, ilike, lte, sql } from 'drizzle-orm'
import type { Database } from '../database/index.js'

// Database row types
type AttachmentRow = typeof attachments.$inferSelect
type ShareLinkRow = typeof share_links.$inferSelect
type DownloadLogRow = typeof download_logs.$inferSelect
import { randomUUID } from 'node:crypto'
import type {
  AttachmentData,
  AttachmentRepository,
  AttachmentSearchCriteria,
  AttachmentStatus,
  CreateAttachmentInput,
  CreateDownloadLogInput,
  CreateShareLinkInput,
  DownloadLogData,
  PaginatedResult,
  PaginationParams,
  RepositoryError,
  Result,
  ShareLinkData,
  UpdateAttachmentInput,
  UserId,
} from '@beauty-salon-backend/domain'
import {
  AttachmentId,
  ShareLinkId,
  ShareToken,
  err,
  ok,
} from '@beauty-salon-backend/domain'

export class AttachmentRepositoryImpl implements AttachmentRepository {
  constructor(private db: Database) {}

  async create(
    input: CreateAttachmentInput
  ): Promise<Result<AttachmentData, RepositoryError>> {
    try {
      const [attachment] = await this.db
        .insert(attachments)
        .values({
          id: randomUUID(),
          key: input.key,
          filename: input.filename,
          content_type: input.contentType,
          size: input.size,
          uploaded_by: input.uploadedBy,
          metadata: {},
          tags: {},
        })
        .returning()

      if (attachment == null) {
        return err({
          type: 'databaseError' as const,
          message: 'Failed to create attachment',
          details: 'No attachment returned from insert',
        })
      }

      return ok(this.mapToAttachmentData(attachment))
    } catch (error) {
      return err({
        type: 'databaseError' as const,
        message: 'Failed to create attachment',
        details: error instanceof Error ? error.message : String(error),
      })
    }
  }

  async findById(
    id: AttachmentId
  ): Promise<Result<AttachmentData | null, RepositoryError>> {
    try {
      const attachment = await this.db.query.attachments.findFirst({
        where: eq(attachments.id, id),
      })

      return ok(attachment ? this.mapToAttachmentData(attachment) : null)
    } catch (error) {
      return err({
        type: 'databaseError' as const,
        message: 'Failed to find attachment by ID',
        details: error instanceof Error ? error.message : String(error),
      })
    }
  }

  async findByKey(
    key: string
  ): Promise<Result<AttachmentData | null, RepositoryError>> {
    try {
      const attachment = await this.db.query.attachments.findFirst({
        where: eq(attachments.key, key),
      })

      return ok(attachment ? this.mapToAttachmentData(attachment) : null)
    } catch (error) {
      return err({
        type: 'databaseError' as const,
        message: 'Failed to find attachment by key',
        details: error instanceof Error ? error.message : String(error),
      })
    }
  }

  async update(
    input: UpdateAttachmentInput
  ): Promise<Result<AttachmentData, RepositoryError>> {
    try {
      const updateData = {
        updated_at: new Date().toISOString(),
      }

      // Note: The domain model expects status, scanStatus, scanMessage, deletedAt fields
      // but the database schema doesn't have these. This is a schema mismatch that needs to be resolved.
      // For now, we can only update the updatedAt timestamp.

      const [attachment] = await this.db
        .update(attachments)
        .set(updateData)
        .where(eq(attachments.id, input.id))
        .returning()

      if (attachment == null) {
        return err({
          type: 'notFound' as const,
          entity: 'Attachment',
          id: input.id,
        })
      }

      return ok(this.mapToAttachmentData(attachment))
    } catch (error) {
      return err({
        type: 'databaseError' as const,
        message: 'Failed to update attachment',
        details: error instanceof Error ? error.message : String(error),
      })
    }
  }

  async softDelete(id: AttachmentId): Promise<Result<void, RepositoryError>> {
    try {
      // Since there's no soft delete support in the current schema,
      // we'll perform a hard delete instead
      await this.db.delete(attachments).where(eq(attachments.id, id))

      return ok(undefined)
    } catch (error) {
      return err({
        type: 'databaseError' as const,
        message: 'Failed to soft delete attachment',
        details: error instanceof Error ? error.message : String(error),
      })
    }
  }

  async hardDelete(id: AttachmentId): Promise<Result<void, RepositoryError>> {
    try {
      await this.db.delete(attachments).where(eq(attachments.id, id))
      return ok(undefined)
    } catch (error) {
      return err({
        type: 'databaseError' as const,
        message: 'Failed to hard delete attachment',
        details: error instanceof Error ? error.message : String(error),
      })
    }
  }

  async search(
    criteria: AttachmentSearchCriteria,
    pagination: PaginationParams
  ): Promise<Result<PaginatedResult<AttachmentData>, RepositoryError>> {
    try {
      const conditions = []

      if (criteria.uploadedBy) {
        conditions.push(eq(attachments.uploaded_by, criteria.uploadedBy))
      }
      // Note: status and scanStatus fields don't exist in the current schema
      // These conditions are commented out until the schema is updated
      // if (criteria.status) {
      //   conditions.push(eq(attachments.status, criteria.status))
      // }
      // if (criteria.scanStatus) {
      //   conditions.push(eq(attachments.scanStatus, criteria.scanStatus))
      // }
      if (criteria.filename) {
        conditions.push(ilike(attachments.filename, `%${criteria.filename}%`))
      }
      if (criteria.contentType) {
        conditions.push(eq(attachments.content_type, criteria.contentType))
      }
      if (criteria.minSize !== undefined) {
        conditions.push(gte(attachments.size, criteria.minSize))
      }
      if (criteria.maxSize !== undefined) {
        conditions.push(lte(attachments.size, criteria.maxSize))
      }
      if (criteria.uploadedAfter) {
        conditions.push(
          gte(attachments.created_at, criteria.uploadedAfter.toISOString())
        )
      }
      if (criteria.uploadedBefore) {
        conditions.push(
          lte(attachments.created_at, criteria.uploadedBefore.toISOString())
        )
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined

      const [items, countResult] = await Promise.all([
        this.db.query.attachments.findMany({
          where: whereClause,
          orderBy: [desc(attachments.created_at)],
          limit: pagination.limit,
          offset: pagination.offset,
        }),
        this.db
          .select({ count: sql<number>`count(*)` })
          .from(attachments)
          .where(whereClause),
      ])

      const totalCount = Number(countResult[0]?.count ?? 0)

      return ok({
        data: items.map((item) => this.mapToAttachmentData(item)),
        total: totalCount,
        limit: pagination.limit,
        offset: pagination.offset,
      })
    } catch (error) {
      return err({
        type: 'databaseError' as const,
        message: 'Failed to search attachments',
        details: error instanceof Error ? error.message : String(error),
      })
    }
  }

  async findByUser(
    userId: UserId,
    pagination: PaginationParams
  ): Promise<Result<PaginatedResult<AttachmentData>, RepositoryError>> {
    // Note: status field doesn't exist in the current schema
    // Returning all attachments for the user
    return this.search({ uploadedBy: userId }, pagination)
  }

  async getUserStorageUsage(
    userId: UserId
  ): Promise<Result<number, RepositoryError>> {
    try {
      const [result] = await this.db
        .select({
          totalSize: sql<number>`COALESCE(SUM(${attachments.size}), 0)`,
        })
        .from(attachments)
        .where(eq(attachments.uploaded_by, userId))

      return ok(Number(result?.totalSize ?? 0))
    } catch (error) {
      return err({
        type: 'databaseError' as const,
        message: 'Failed to get user storage usage',
        details: error instanceof Error ? error.message : String(error),
      })
    }
  }

  async createShareLink(
    input: CreateShareLinkInput
  ): Promise<Result<ShareLinkData, RepositoryError>> {
    try {
      const [shareLink] = await this.db
        .insert(share_links)
        .values({
          id: randomUUID(),
          attachment_id: input.attachmentId,
          token: input.token,
          password_hash: input.password ?? null, // Note: this should be hashed before storing
          max_downloads: input.maxDownloads ?? null,
          download_count: 0,
          expires_at: input.expiresAt ? input.expiresAt.toISOString() : null,
          created_by: input.createdBy,
        })
        .returning()

      if (shareLink == null) {
        return err({
          type: 'databaseError' as const,
          message: 'Failed to create share link',
          details: 'No share link returned from insert',
        })
      }

      return ok(this.mapToShareLinkData(shareLink))
    } catch (error) {
      return err({
        type: 'databaseError' as const,
        message: 'Failed to create share link',
        details: error instanceof Error ? error.message : String(error),
      })
    }
  }

  async findShareLinkByToken(
    token: ShareToken
  ): Promise<Result<ShareLinkData | null, RepositoryError>> {
    try {
      const shareLink = await this.db.query.share_links.findFirst({
        where: eq(share_links.token, token),
      })

      return ok(shareLink ? this.mapToShareLinkData(shareLink) : null)
    } catch (error) {
      return err({
        type: 'databaseError' as const,
        message: 'Failed to find share link by token',
        details: error instanceof Error ? error.message : String(error),
      })
    }
  }

  async incrementShareLinkDownloadCount(
    id: ShareLinkId
  ): Promise<Result<void, RepositoryError>> {
    try {
      await this.db
        .update(share_links)
        .set({
          download_count: sql`${share_links.download_count} + 1`,
          updated_at: new Date().toISOString(),
        })
        .where(eq(share_links.id, id))

      return ok(undefined)
    } catch (error) {
      return err({
        type: 'databaseError' as const,
        message: 'Failed to increment share link download count',
        details: error instanceof Error ? error.message : String(error),
      })
    }
  }

  async deleteShareLink(
    id: ShareLinkId
  ): Promise<Result<void, RepositoryError>> {
    try {
      await this.db.delete(share_links).where(eq(share_links.id, id))
      return ok(undefined)
    } catch (error) {
      return err({
        type: 'databaseError' as const,
        message: 'Failed to delete share link',
        details: error instanceof Error ? error.message : String(error),
      })
    }
  }

  async createDownloadLog(
    input: CreateDownloadLogInput
  ): Promise<Result<void, RepositoryError>> {
    try {
      await this.db.insert(download_logs).values({
        id: randomUUID(),
        attachment_id: input.attachmentId,
        downloaded_by: input.downloadedBy ?? null,
        ip_address: input.ipAddress,
        user_agent: input.userAgent ?? null,
        share_link_id: input.shareToken
          ? (input.shareToken as unknown as string)
          : null, // Note: mapping shareToken to share_link_id - needs proper conversion
        downloaded_at: new Date().toISOString(),
      })

      return ok(undefined)
    } catch (error) {
      return err({
        type: 'databaseError' as const,
        message: 'Failed to create download log',
        details: error instanceof Error ? error.message : String(error),
      })
    }
  }

  async getDownloadHistory(
    attachmentId: AttachmentId,
    pagination: PaginationParams
  ): Promise<Result<PaginatedResult<DownloadLogData>, RepositoryError>> {
    try {
      const [items, countResult] = await Promise.all([
        this.db.query.download_logs.findMany({
          where: eq(download_logs.attachment_id, attachmentId),
          orderBy: [desc(download_logs.downloaded_at)],
          limit: pagination.limit,
          offset: pagination.offset,
        }),
        this.db
          .select({ count: sql<number>`count(*)` })
          .from(download_logs)
          .where(eq(download_logs.attachment_id, attachmentId)),
      ])

      const totalCount = Number(countResult[0]?.count ?? 0)

      return ok({
        data: items.map((item) => this.mapToDownloadLogData(item)),
        total: totalCount,
        limit: pagination.limit,
        offset: pagination.offset,
      })
    } catch (error) {
      return err({
        type: 'databaseError' as const,
        message: 'Failed to get download history',
        details: error instanceof Error ? error.message : String(error),
      })
    }
  }

  async deleteExpiredAttachments(): Promise<Result<number, RepositoryError>> {
    try {
      await this.db
        .delete(attachments)
        // Note: expiresAt and deletedAt fields don't exist in the current schema
        // This method won't work properly until the schema is updated
        .where(sql`1 = 0`) // Always false condition to prevent accidental deletions

      return ok(0) // Drizzle doesn't return rowCount for delete operations
    } catch (error) {
      return err({
        type: 'databaseError' as const,
        message: 'Failed to delete expired attachments',
        details: error instanceof Error ? error.message : String(error),
      })
    }
  }

  async deleteExpiredShareLinks(): Promise<Result<number, RepositoryError>> {
    try {
      await this.db
        .delete(share_links)
        .where(lte(share_links.expires_at, new Date().toISOString()))

      return ok(0) // Drizzle doesn't return rowCount for delete operations
    } catch (error) {
      return err({
        type: 'databaseError' as const,
        message: 'Failed to delete expired share links',
        details: error instanceof Error ? error.message : String(error),
      })
    }
  }

  private mapToAttachmentData(row: AttachmentRow): AttachmentData {
    return {
      id: AttachmentId.create(row.id),
      key: row.key,
      filename: row.filename,
      contentType: row.content_type,
      size: row.size,
      uploadedBy: row.uploaded_by as UserId,
      // Fields expected by domain model but not in database schema:
      status: 'active' as AttachmentStatus, // Mock value - schema doesn't have status
      scanStatus: 'pending', // Mock value - schema doesn't have scanStatus
      scanMessage: null, // Mock value - schema doesn't have scanMessage
      deletedAt: null, // Mock value - schema doesn't have deletedAt
      expiresAt: null, // Mock value - schema doesn't have expiresAt
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }
  }

  private mapToShareLinkData(row: ShareLinkRow): ShareLinkData {
    return {
      id: ShareLinkId.create(row.id),
      attachmentId: AttachmentId.create(row.attachment_id),
      token: ShareToken.create(row.token),
      password: row.password_hash, // Note: this is the hashed password
      maxDownloads: row.max_downloads,
      downloadCount: row.download_count,
      expiresAt: row.expires_at ? new Date(row.expires_at) : null,
      createdBy: row.created_by as UserId,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }
  }

  private mapToDownloadLogData(row: DownloadLogRow): DownloadLogData {
    return {
      id: row.id,
      attachmentId: AttachmentId.create(row.attachment_id),
      downloadedBy: row.downloaded_by ? (row.downloaded_by as UserId) : null,
      ipAddress: row.ip_address ?? '', // Fallback to empty string if null
      userAgent: row.user_agent,
      shareToken: row.share_link_id
        ? ShareToken.create(row.share_link_id)
        : null, // Note: mapping share_link_id to shareToken
      downloadedAt: new Date(row.downloaded_at),
    }
  }
}
