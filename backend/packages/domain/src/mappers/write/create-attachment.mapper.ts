/**
 * Create Attachment Mapper (Write Operation)
 * API Request -> Domain Model -> Database Entity
 */

import type { attachments } from '@beauty-salon-backend/database'
import type { components } from '@beauty-salon-backend/generated'
import { match } from 'ts-pattern'
import type {
  Attachment,
  AttachmentId,
  AttachmentOperationResult,
} from '../../models/attachment'
import { validateAttachment } from '../../models/attachment'
import { brandAttachmentId } from '../../shared/brand-utils'
import type { Result } from '../../shared/result'
import { err, ok } from '../../shared/result'
import { generateId } from '../../shared/utils'

// Type aliases for clarity
type UploadAttachmentRequest =
  components['schemas']['Models.UploadAttachmentRequest']
type AttachmentDbInsert = typeof attachments.$inferInsert

/**
 * Map API Upload Request to Domain Model
 */
export const mapCreateAttachmentApiToDomain = (
  request: UploadAttachmentRequest
): Result<Partial<Attachment>, AttachmentOperationResult> => {
  try {
    const domainAttachment: Partial<Attachment> = {
      key: request.key,
      filename: request.filename,
      contentType: request.contentType,
      size: request.size,
      fileType: request.fileType,
      uploadedBy: request.uploadedBy,
      salonId: request.salonId,
      entityType: request.entityType,
      entityId: request.entityId,
      metadata: request.metadata,
      tags: request.tags,
      uploadedAt: new Date().toISOString(),
    }

    // Validate the domain model
    const validationResult = validateAttachment(domainAttachment)
    if (validationResult.type === 'err') {
      return err({
        type: 'validation_failed',
        errors: validationResult.error,
      })
    }

    return ok(domainAttachment)
  } catch (error) {
    return err({
      type: 'error',
      error: { type: 'system', message: `Mapping error: ${error}` },
    })
  }
}

/**
 * Map Domain Model to Database Entity
 */
export const mapCreateAttachmentDomainToDb = (
  attachment: Partial<Attachment>
): AttachmentDbInsert => {
  return {
    id: attachment.id ?? generateId('att'),
    key: attachment.key!,
    filename: attachment.filename!,
    contentType: attachment.contentType!,
    size: attachment.size!,
    fileType: attachment.fileType ?? 'other',
    uploadedBy: attachment.uploadedBy!,
    salonId: attachment.salonId ?? null,
    entityType: attachment.entityType ?? null,
    entityId: attachment.entityId ?? null,
    metadata: attachment.metadata ?? {},
    tags: attachment.tags ?? {},
    storageProvider: attachment.storageProvider ?? 's3', // Default to S3
    status: attachment.status ?? 'active',
    description: attachment.description ?? null,
    expiresAt: attachment.expiresAt ?? null,
    deletedAt: attachment.deletedAt ?? null,
    uploadedAt: attachment.uploadedAt ?? new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

/**
 * Complete flow: API → Domain → DB
 */
export const createAttachmentWriteFlow = (
  request: UploadAttachmentRequest
): Result<AttachmentDbInsert, AttachmentOperationResult> => {
  // Step 1: Map API to Domain
  const domainResult = mapCreateAttachmentApiToDomain(request)
  if (domainResult.type === 'err') {
    return domainResult
  }

  // Step 2: Add ID using brand utility
  const attachmentIdResult = brandAttachmentId(generateId('att'))
  if (attachmentIdResult.type === 'err') {
    return err({
      type: 'error',
      error: {
        type: 'system',
        message: `Failed to generate attachment ID: ${attachmentIdResult.error.message}`,
      },
    })
  }

  const attachmentWithId: Partial<Attachment> = {
    ...domainResult.value,
    id: attachmentIdResult.value as AttachmentId,
  }

  // Step 3: Map Domain to Database
  try {
    const dbInsert = mapCreateAttachmentDomainToDb(attachmentWithId)
    return ok(dbInsert)
  } catch (error) {
    return err({
      type: 'error',
      error: {
        type: 'system',
        message: `Failed to map to database format: ${error}`,
      },
    })
  }
}

/**
 * Handle create operation result
 */
export const handleCreateAttachmentResult = (
  result: AttachmentOperationResult
): string => {
  return match(result)
    .with({ type: 'uploaded' }, ({ attachment, uploadUrl }) =>
      uploadUrl
        ? `Attachment ${attachment.id} uploaded successfully. Upload URL: ${uploadUrl}`
        : `Attachment ${attachment.id} uploaded successfully`
    )
    .with(
      { type: 'validation_failed' },
      ({ errors }) =>
        `Validation failed: ${errors.map((e) => `${e.field}: ${e.message}`).join(', ')}`
    )
    .with(
      { type: 'storage_quota_exceeded' },
      ({ currentUsage, maxQuota }) =>
        `Storage quota exceeded. Current: ${currentUsage}, Max: ${maxQuota}`
    )
    .with(
      { type: 'file_too_large' },
      ({ size, maxSize }) => `File too large. Size: ${size}, Max: ${maxSize}`
    )
    .with(
      { type: 'invalid_file_type' },
      ({ contentType }) => `Invalid file type: ${contentType}`
    )
    .with({ type: 'unauthorized' }, ({ action }) => `Unauthorized to ${action}`)
    .with({ type: 'error' }, ({ error }) =>
      match(error)
        .with({ type: 'system' }, ({ message }) => `System error: ${message}`)
        .with(
          { type: 'validation' },
          ({ errors }) =>
            `Validation errors: ${errors.map((e) => e.message).join(', ')}`
        )
        .with(
          { type: 'businessRule' },
          ({ message }) => `Business rule: ${message}`
        )
        .otherwise(() => 'Unknown error')
    )
    .otherwise(() => 'Unknown error occurred')
}
