/**
 * Update Attachment Mapper (Write Operation)
 * API Request -> Domain Model -> Database Entity
 */

import { match } from 'ts-pattern'
import type {
  Attachment,
  AttachmentChanges,
  AttachmentId,
  AttachmentOperationResult,
} from '../../models/attachment'
import type { ValidationError } from '../../shared/errors'
import type { Result } from '../../shared/result'
import { err, ok } from '../../shared/result'

// Type aliases for clarity
type ApiUpdateRequest = {
  filename?: string
  description?: string
  tags?: { [key: string]: string }
  metadata?: { [key: string]: unknown }
  expiresAt?: string
}
type DomainAttachment = Attachment
type DbAttachmentUpdate = {
  filename?: string
  description?: string | null
  tags?: any
  metadata?: any
  expiresAt?: string | null
  updatedAt: Date
}

/**
 * Map API Update Request to Domain Model (partial update)
 */
export const mapUpdateAttachmentApiToDomain = (
  request: ApiUpdateRequest,
  _existingAttachment: DomainAttachment
): Result<Partial<DomainAttachment>, ValidationError[]> => {
  try {
    const updates: Partial<DomainAttachment> = {}

    if (request.filename !== undefined) {
      updates.filename = request.filename
    }

    if (request.description !== undefined) {
      updates.description = request.description
    }

    if (request.tags !== undefined) {
      updates.tags = request.tags
    }

    if (request.metadata !== undefined) {
      updates.metadata = request.metadata
    }

    if (request.expiresAt !== undefined) {
      updates.expiresAt = request.expiresAt
    }

    // Validate filename
    const errors: ValidationError[] = []

    if (updates.filename !== undefined) {
      if (updates.filename.length === 0) {
        errors.push({ field: 'filename', message: 'Filename cannot be empty' })
      } else if (updates.filename.length > 255) {
        errors.push({
          field: 'filename',
          message: 'Filename cannot exceed 255 characters',
        })
      } else if (updates.filename.includes('../')) {
        errors.push({
          field: 'filename',
          message: 'Filename contains invalid characters',
        })
      }
    }

    if (updates.expiresAt !== undefined) {
      const expiryDate = new Date(updates.expiresAt)
      if (Number.isNaN(expiryDate.getTime())) {
        errors.push({ field: 'expiresAt', message: 'Invalid expiry date' })
      } else if (expiryDate <= new Date()) {
        errors.push({
          field: 'expiresAt',
          message: 'Expiry date must be in the future',
        })
      }
    }

    if (errors.length > 0) {
      return err(errors)
    }

    return ok(updates)
  } catch (error) {
    return err([{ field: 'general', message: `Mapping error: ${error}` }])
  }
}

/**
 * Map Domain Model updates to Database Update
 */
export const mapUpdateAttachmentDomainToDb = (
  updates: Partial<DomainAttachment>,
  _updatedBy?: string
): DbAttachmentUpdate => {
  const dbUpdate: DbAttachmentUpdate = {
    updatedAt: new Date(),
  }

  if (updates.filename !== undefined) {
    dbUpdate.filename = updates.filename
  }

  if (updates.description !== undefined) {
    dbUpdate.description = updates.description ?? null
  }

  if (updates.tags !== undefined) {
    dbUpdate.tags = updates.tags
  }

  if (updates.metadata !== undefined) {
    dbUpdate.metadata = updates.metadata
  }

  if (updates.expiresAt !== undefined) {
    dbUpdate.expiresAt = updates.expiresAt ?? null
  }

  return dbUpdate
}

/**
 * Complete flow: API → Domain → DB
 */
export const updateAttachmentWriteFlow = (
  _attachmentId: AttachmentId,
  request: ApiUpdateRequest,
  existingAttachment: DomainAttachment
): Result<DbAttachmentUpdate, AttachmentOperationResult> => {
  // Step 1: Map API to Domain
  const domainResult = mapUpdateAttachmentApiToDomain(
    request,
    existingAttachment
  )

  if (domainResult.type === 'err') {
    return err({ type: 'validation_failed', errors: domainResult.error })
  }

  // Step 2: Map Domain to DB
  try {
    const dbUpdate = mapUpdateAttachmentDomainToDb(domainResult.value)
    return ok(dbUpdate)
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
 * Track changes for audit
 */
export const trackAttachmentChanges = (
  oldAttachment: DomainAttachment,
  newAttachment: Partial<DomainAttachment>
): AttachmentChanges => {
  const changes: AttachmentChanges = {}

  if (
    newAttachment.filename &&
    newAttachment.filename !== oldAttachment.filename
  ) {
    changes.filename = {
      from: oldAttachment.filename,
      to: newAttachment.filename,
    }
  }

  if (newAttachment.description !== oldAttachment.description) {
    changes.description = {
      from: oldAttachment.description,
      to: newAttachment.description,
    }
  }

  if (newAttachment.tags) {
    const oldTags = Object.keys(oldAttachment.tags || {})
    const newTags = Object.keys(newAttachment.tags || {})
    const added = newTags.filter((tag) => !oldTags.includes(tag))
    const removed = oldTags.filter((tag) => !newTags.includes(tag))

    if (added.length > 0 || removed.length > 0) {
      changes.tags = { added, removed }
    }
  }

  if (
    newAttachment.metadata &&
    newAttachment.metadata !== oldAttachment.metadata
  ) {
    changes.metadata = {
      from: oldAttachment.metadata,
      to: newAttachment.metadata,
    }
  }

  return changes
}

/**
 * Handle update operation result
 */
export const handleUpdateAttachmentResult = (
  result: AttachmentOperationResult
): string => {
  return match(result)
    .with(
      { type: 'updated' },
      ({ attachment, changes }) =>
        `Attachment ${attachment.id} updated successfully. Changes: ${changes.join(', ')}`
    )
    .with(
      { type: 'validation_failed' },
      ({ errors }) =>
        `Validation failed: ${errors.map((e) => `${e.field}: ${e.message}`).join(', ')}`
    )
    .with(
      { type: 'not_found' },
      ({ attachmentId }) => `Attachment with ID ${attachmentId} not found`
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
