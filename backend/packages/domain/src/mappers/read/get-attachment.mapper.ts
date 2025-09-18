/**
 * Get Attachment Mapper (Read Operation)
 * Database Entity -> Domain Model -> API Response
 */

import type { attachments } from '@beauty-salon-backend/database'
import type { components } from '@beauty-salon-backend/generated'
import type {
  Attachment,
  AttachmentOperationResult,
} from '../../models/attachment'
import type { Result } from '../../shared/result'
import { err, ok } from '../../shared/result'

// Type aliases for clarity
type AttachmentDbRecord = typeof attachments.$inferSelect
type AttachmentApiResponse = components['schemas']['Models.Attachment']

/**
 * Map Database Record to Domain Model
 */
export const mapGetAttachmentDbToDomain = (
  record: AttachmentDbRecord
): Result<Attachment, AttachmentOperationResult> => {
  try {
    const domainAttachment: Attachment = {
      id: record.id as any, // Will be branded
      key: record.key,
      filename: record.filename,
      contentType: record.contentType,
      size: record.size,
      fileType: record.fileType as any,
      uploadedBy: record.uploadedBy,
      salonId: record.salonId ?? undefined,
      entityType: record.entityType ?? undefined,
      entityId: record.entityId ?? undefined,
      metadata: record.metadata as any,
      tags: record.tags as any,
      uploadedAt: record.uploadedAt,
      // Additional fields from DB
      storageProvider: record.storageProvider ?? undefined,
      status: record.status ?? undefined,
      description: record.description ?? undefined,
      expiresAt: record.expiresAt ?? undefined,
      deletedAt: record.deletedAt ?? undefined,
    }

    return ok(domainAttachment)
  } catch (error) {
    return err({
      type: 'error',
      error: {
        type: 'system',
        message: `Failed to map database record: ${error}`,
      },
    })
  }
}

/**
 * Map Domain Model to API Response
 */
export const mapGetAttachmentDomainToApi = (
  attachment: Attachment
): AttachmentApiResponse => {
  return {
    id: attachment.id,
    key: attachment.key,
    filename: attachment.filename,
    contentType: attachment.contentType,
    size: attachment.size,
    fileType: attachment.fileType,
    uploadedBy: attachment.uploadedBy,
    salonId: attachment.salonId,
    entityType: attachment.entityType,
    entityId: attachment.entityId,
    metadata: attachment.metadata,
    tags: attachment.tags,
    uploadedAt: attachment.uploadedAt,
  }
}

/**
 * Complete flow: DB → Domain → API
 */
export const getAttachmentReadFlow = (
  record: AttachmentDbRecord | null
): Result<AttachmentApiResponse, AttachmentOperationResult> => {
  // Handle not found case
  if (!record) {
    return err({
      type: 'not_found',
      attachmentId: 'unknown' as any,
    })
  }

  // Step 1: Map DB to Domain
  const domainResult = mapGetAttachmentDbToDomain(record)
  if (domainResult.type === 'err') {
    return domainResult
  }

  // Step 2: Map Domain to API
  try {
    const apiResponse = mapGetAttachmentDomainToApi(domainResult.value)
    return ok(apiResponse)
  } catch (error) {
    return err({
      type: 'error',
      error: {
        type: 'system',
        message: `Failed to map to API response: ${error}`,
      },
    })
  }
}

/**
 * Map multiple attachments for list operations
 */
export const mapAttachmentListDbToDomain = (
  records: AttachmentDbRecord[]
): Result<Attachment[], AttachmentOperationResult> => {
  try {
    const attachments: Attachment[] = []

    for (const record of records) {
      const result = mapGetAttachmentDbToDomain(record)
      if (result.type === 'err') {
        return result
      }
      attachments.push(result.value)
    }

    return ok(attachments)
  } catch (error) {
    return err({
      type: 'error',
      error: {
        type: 'system',
        message: `Failed to map attachment list: ${error}`,
      },
    })
  }
}

/**
 * Map attachment list to API response
 */
export const mapAttachmentListDomainToApi = (
  attachments: Attachment[]
): AttachmentApiResponse[] => {
  return attachments.map(mapGetAttachmentDomainToApi)
}

/**
 * Complete flow for list operations
 */
export const getAttachmentListReadFlow = (
  records: AttachmentDbRecord[]
): Result<AttachmentApiResponse[], AttachmentOperationResult> => {
  // Step 1: Map DB to Domain
  const domainResult = mapAttachmentListDbToDomain(records)
  if (domainResult.type === 'err') {
    return domainResult
  }

  // Step 2: Map Domain to API
  try {
    const apiResponses = mapAttachmentListDomainToApi(domainResult.value)
    return ok(apiResponses)
  } catch (error) {
    return err({
      type: 'error',
      error: {
        type: 'system',
        message: `Failed to map to API response: ${error}`,
      },
    })
  }
}

/**
 * Map paginated results
 */
export const mapPaginatedAttachmentsToApi = (
  attachments: Attachment[],
  totalCount: number,
  offset: number,
  limit: number
): components['schemas']['Models.PaginatedAttachments'] => {
  return {
    items: mapAttachmentListDomainToApi(attachments),
    total: totalCount,
    offset,
    limit,
    hasMore: offset + limit < totalCount,
  }
}
