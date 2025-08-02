/**
 * Attachment Routes
 * ファイルアップロード関連のAPIエンドポイント
 * CLAUDEガイドラインに準拠
 */

// import { AttachmentId as AttachmentIdBrand } from '@beauty-salon-backend/domain/shared/branded-types'
// import { match } from 'ts-pattern'
import { randomUUID } from 'node:crypto'
import type { StorageService } from '@beauty-salon-backend/domain'
// import { validateRequest } from '../middleware/validation.js' // TODO: Implement validation middleware
import { createStorageServiceWithDefaults } from '@beauty-salon-backend/infrastructure'
import type { components } from '@beauty-salon-backend/types'
import type { Router } from 'express'
import express from 'express'
import { z } from 'zod'
import { type AuthConfig, authenticate } from '../middleware/auth.middleware.js'

// Request schemas
const UploadUrlRequestSchema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.string().min(1).max(100),
  size: z
    .number()
    .int()
    .positive()
    .max(500 * 1024 * 1024), // 500MB max
  salonId: z.string().uuid().optional(),
})

const ListAttachmentsQuerySchema = z.object({
  salonId: z.string().uuid().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})

// const CreateShareLinkRequestSchema = z.object({
//   expiresAt: z.string().datetime().optional(),
//   maxDownloads: z.number().int().positive().optional(),
//   password: z.string().optional(),
//   allowedEmails: z.array(z.string().email()).optional(),
// })

export const createAttachmentRouter = (dependencies: {
  storageService?: StorageService
  attachmentRepository?: unknown // TODO: implement repository with proper type
  authConfig: AuthConfig
}): Router => {
  const router = express.Router()
  const storageService =
    dependencies.storageService ?? createStorageServiceWithDefaults()

  /**
   * Get signed upload URL
   * POST /attachments/upload-url
   */
  router.post(
    '/upload-url',
    authenticate(dependencies.authConfig),
    // validateRequest({
    //   body: UploadUrlRequestSchema,
    // }),
    async (req, res) => {
      try {
        const {
          filename,
          contentType: _contentType,
          size: _size,
          salonId: _salonId,
        } = UploadUrlRequestSchema.parse(req.body)
        const userId = req.user?.id ?? ''

        // TODO: Check user permissions for salon if salonId is provided
        // TODO: Check storage quota for user

        // Generate unique key for the file
        const key = `users/${userId}/${randomUUID()}/${filename}`

        // Get signed upload URL
        const urlResult = await storageService.getSignedUploadUrl(key, {
          expiresIn: 3600, // 1 hour
        })

        if (urlResult.type === 'err') {
          return res.status(500).json({
            code: 'STORAGE_ERROR',
            message: 'Failed to generate upload URL',
          })
        }

        const response: components['schemas']['Models.UploadUrlResponse'] = {
          uploadUrl: urlResult.value.url,
          key,
          expiresAt: urlResult.value.expiresAt.toISOString(),
        }

        // TODO: Create attachment record in database with 'pending' status

        res.json(response)
      } catch (error) {
        console.error('Upload URL generation error:', error)
        res.status(500).json({
          code: 'INTERNAL_ERROR',
          message: 'Failed to generate upload URL',
        })
      }
    }
  )

  /**
   * List attachments
   * GET /attachments
   */
  router.get(
    '/',
    authenticate(dependencies.authConfig),
    // validateRequest({
    //   query: ListAttachmentsQuerySchema,
    // }),
    async (req, res) => {
      try {
        const parsedQuery = ListAttachmentsQuerySchema.parse(req.query)
        const { page, limit } = parsedQuery
        // const _salonId = parsedQuery.salonId
        // const _userId = req.user?.id ?? ''

        // TODO: Implement attachment listing from repository
        // For now, return empty list
        const response: components['schemas']['Models.PaginatedAttachments'] = {
          items: [],
          total: 0,
          page,
          limit,
          totalPages: 0,
        }

        res.json(response)
      } catch (error) {
        console.error('List attachments error:', error)
        res.status(500).json({
          code: 'INTERNAL_ERROR',
          message: 'Failed to list attachments',
        })
      }
    }
  )

  /**
   * Get attachment details
   * GET /attachments/:attachmentId
   */
  router.get(
    '/:attachmentId',
    authenticate(dependencies.authConfig),
    async (req, res) => {
      try {
        const { attachmentId: _attachmentId } = req.params

        // TODO: Get attachment from repository
        // TODO: Check user permissions

        res.status(404).json({
          code: 'NOT_FOUND',
          message: 'Attachment not found',
        })
      } catch (error) {
        console.error('Get attachment error:', error)
        res.status(500).json({
          code: 'INTERNAL_ERROR',
          message: 'Failed to get attachment',
        })
      }
    }
  )

  /**
   * Get download URL
   * GET /attachments/:attachmentId/download-url
   */
  router.get(
    '/:attachmentId/download-url',
    authenticate(dependencies.authConfig),
    async (req, res) => {
      try {
        const { attachmentId: _attachmentId } = req.params
        // const _inline = req.query.inline === 'true'

        // TODO: Get attachment from repository
        // TODO: Check user permissions

        // For now, return not found
        res.status(404).json({
          code: 'NOT_FOUND',
          message: 'Attachment not found',
        })
      } catch (error) {
        console.error('Get download URL error:', error)
        res.status(500).json({
          code: 'INTERNAL_ERROR',
          message: 'Failed to get download URL',
        })
      }
    }
  )

  /**
   * Delete attachment
   * DELETE /attachments/:attachmentId
   */
  router.delete(
    '/:attachmentId',
    authenticate(dependencies.authConfig),
    async (req, res) => {
      try {
        const { attachmentId: _attachmentId } = req.params

        // TODO: Get attachment from repository
        // TODO: Check user permissions
        // TODO: Delete from storage
        // TODO: Delete from database

        res.status(404).json({
          code: 'NOT_FOUND',
          message: 'Attachment not found',
        })
      } catch (error) {
        console.error('Delete attachment error:', error)
        res.status(500).json({
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete attachment',
        })
      }
    }
  )

  /**
   * Create share link
   * POST /attachments/:attachmentId/share-links
   */
  router.post(
    '/:attachmentId/share-links',
    authenticate(dependencies.authConfig),
    // validateRequest({
    //   body: CreateShareLinkRequestSchema,
    // }),
    async (req, res) => {
      try {
        const { attachmentId: _attachmentId } = req.params
        // const _shareData = CreateShareLinkRequestSchema.parse(req.body)

        // TODO: Get attachment from repository
        // TODO: Check user permissions
        // TODO: Create share link

        res.status(404).json({
          code: 'NOT_FOUND',
          message: 'Attachment not found',
        })
      } catch (error) {
        console.error('Create share link error:', error)
        res.status(500).json({
          code: 'INTERNAL_ERROR',
          message: 'Failed to create share link',
        })
      }
    }
  )

  /**
   * List share links
   * GET /attachments/:attachmentId/share-links
   */
  router.get(
    '/:attachmentId/share-links',
    authenticate(dependencies.authConfig),
    async (req, res) => {
      try {
        const { attachmentId: _attachmentId } = req.params

        // TODO: Get attachment from repository
        // TODO: Check user permissions
        // TODO: Get share links

        res.status(404).json({
          code: 'NOT_FOUND',
          message: 'Attachment not found',
        })
      } catch (error) {
        console.error('List share links error:', error)
        res.status(500).json({
          code: 'INTERNAL_ERROR',
          message: 'Failed to list share links',
        })
      }
    }
  )

  /**
   * Delete share link
   * DELETE /share-links/:shareLinkId
   */
  router.delete(
    '/share-links/:shareLinkId',
    authenticate(dependencies.authConfig),
    async (req, res) => {
      try {
        const { shareLinkId: _shareLinkId } = req.params

        // TODO: Get share link from repository
        // TODO: Check user permissions
        // TODO: Delete share link

        res.status(404).json({
          code: 'NOT_FOUND',
          message: 'Share link not found',
        })
      } catch (error) {
        console.error('Delete share link error:', error)
        res.status(500).json({
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete share link',
        })
      }
    }
  )

  return router
}

// Share routes (no auth required)
export const createShareRouter = (): Router => {
  const router = express.Router()

  /**
   * Get shared file
   * GET /share/:shareToken
   */
  router.get('/:shareToken', async (req, res) => {
    try {
      const { shareToken: _shareToken } = req.params
      const { password: _password } = req.query

      // TODO: Get share link by token
      // TODO: Validate password if required
      // TODO: Check expiration and download limits
      // TODO: Return attachment info

      res.status(404).json({
        code: 'NOT_FOUND',
        message: 'Share link not found or expired',
      })
    } catch (error) {
      console.error('Get shared file error:', error)
      res.status(500).json({
        code: 'INTERNAL_ERROR',
        message: 'Failed to access shared file',
      })
    }
  })

  /**
   * Download shared file
   * GET /share/:shareToken/download
   */
  router.get('/:shareToken/download', async (req, res) => {
    try {
      const { shareToken: _shareToken } = req.params
      const { password: _password } = req.query

      // TODO: Get share link by token
      // TODO: Validate password if required
      // TODO: Check expiration and download limits
      // TODO: Increment download count
      // TODO: Generate download URL

      res.status(404).json({
        code: 'NOT_FOUND',
        message: 'Share link not found or expired',
      })
    } catch (error) {
      console.error('Download shared file error:', error)
      res.status(500).json({
        code: 'INTERNAL_ERROR',
        message: 'Failed to download shared file',
      })
    }
  })

  return router
}
