/**
 * Review API Routes
 * OpenAPIで生成された型を使用したAPI実装
 * CLAUDEガイドラインに準拠
 */

import { Router } from 'express'
import { match } from 'ts-pattern'
import { z } from 'zod'
import {
  authenticate,
  authorize,
  optionalAuthenticate,
} from '../middleware/auth.middleware.js'
import type { AuthConfig } from '../middleware/auth.middleware.js'

import {
  createDeleteReviewErrorResponse,
  createReviewErrorResponse,
  createReviewStatusChangeErrorResponse,
  createReviewUseCase,
  createUpdateReviewErrorResponse,
  deleteReviewUseCase,
  getReviewByIdUseCase,
  getReviewDetailByIdUseCase,
  getSalonReviewSummaryUseCase,
  getSalonReviewsUseCase,
  hideReviewUseCase,
  incrementHelpfulCountUseCase,
  listReviewsUseCase,
  mapCreateReviewRequest,
  mapDeleteReviewRequest,
  mapGetReviewByIdRequest,
  mapGetReviewDetailByIdRequest,
  mapGetSalonReviewSummaryRequest,
  mapGetSalonReviewsRequest,
  mapHideReviewRequest,
  mapIncrementHelpfulCountRequest,
  mapListReviewsRequest,
  mapPublishReviewRequest,
  mapReviewDetailToResponse,
  mapReviewListToResponse,
  mapReviewSummaryToResponse,
  mapReviewToResponse,
  mapUpdateReviewRequest,
  publishReviewUseCase,
  updateReviewUseCase,
} from '@backend/usecase'
import type {
  ReservationRepository,
  ReviewRepository,
} from '@beauty-salon-backend/domain'

// バリデーションスキーマ
const reviewIdSchema = z.string().uuid()
const paginationSchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
})

// 依存関係の注入用の型
export type ReviewRouteDeps = {
  reviewRepository: ReviewRepository
  reservationRepository: ReservationRepository
  authConfig: AuthConfig
}

export const createReviewRoutes = (deps: ReviewRouteDeps): Router => {
  const router = Router()
  const { reviewRepository, reservationRepository, authConfig } = deps

  /**
   * GET /reviews - List reviews
   */
  router.get('/', async (req, res, next) => {
    try {
      // クエリパラメータのパース
      const paginationResult = paginationSchema.safeParse(req.query)
      if (!paginationResult.success) {
        return res.status(400).json({
          code: 'INVALID_PAGINATION',
          message: 'Invalid pagination parameters',
        })
      }

      // UseCase実行
      const mappedInput = mapListReviewsRequest({
        salonId: req.query.salonId as string | undefined,
        customerId: req.query.customerId as string | undefined,
        staffId: req.query.staffId as string | undefined,
        reservationId: req.query.reservationId as string | undefined,
        minRating: req.query.minRating
          ? Number(req.query.minRating)
          : undefined,
        maxRating: req.query.maxRating
          ? Number(req.query.maxRating)
          : undefined,
        isVerified: req.query.isVerified === 'true' ? true : undefined,
        limit: paginationResult.data.limit,
        offset: paginationResult.data.offset,
      })
      if (mappedInput.type === 'err') {
        return res.status(400).json({
          code: 'INVALID_ID',
          message: mappedInput.error.message,
        })
      }
      const result = await listReviewsUseCase(mappedInput.value, {
        reviewRepository,
      })

      // レスポンス処理
      return match(result)
        .with({ type: 'ok' }, ({ value }) => {
          res.json(mapReviewListToResponse(value))
        })
        .with({ type: 'err' }, ({ error }) => {
          const statusCode = error.type === 'databaseError' ? 500 : 400
          res.status(statusCode).json({
            code: error.type.toUpperCase(),
            message:
              error.type === 'databaseError' ? error.message : 'Bad request',
          })
        })
        .exhaustive()
    } catch (error) {
      next(error)
    }
  })

  /**
   * POST /reviews - Create review
   * 認証必須: customerのみ（予約した本人のみレビュー可能）
   */
  router.post(
    '/',
    authenticate(authConfig),
    authorize('customer'),
    async (req, res, next) => {
      try {
        // リクエストボディの基本的な検証
        if (
          !req.body.salonId ||
          !req.body.customerId ||
          !req.body.reservationId ||
          req.body.rating === undefined
        ) {
          return res.status(400).json({
            code: 'INVALID_REQUEST',
            message: 'Required fields are missing',
          })
        }

        // UseCase実行
        const mappedInput = mapCreateReviewRequest(req.body, req.user?.id)
        if (mappedInput.type === 'err') {
          return res.status(400).json({
            code: 'INVALID_ID',
            message: mappedInput.error.message,
          })
        }
        const result = await createReviewUseCase(mappedInput.value, {
          reviewRepository,
          reservationRepository,
        })

        // レスポンス処理
        return match(result)
          .with({ type: 'ok' }, ({ value }) => {
            res
              .status(201)
              .header('Location', `/reviews/${value.data.id}`)
              .json(mapReviewToResponse(value))
          })
          .with({ type: 'err' }, ({ error }) => {
            const statusCode = match(error.type)
              .with(
                'invalidRating',
                'commentTooLong',
                'tooManyImages',
                () => 400
              )
              .with('reservationNotCompleted', () => 403)
              .with('duplicateReview', () => 409)
              .with('databaseError', () => 500)
              .otherwise(() => 400)

            res.status(statusCode).json(createReviewErrorResponse(error))
          })
          .exhaustive()
      } catch (error) {
        next(error)
      }
    }
  )

  /**
   * GET /reviews/:id - Get review
   */
  router.get('/:id', async (req, res, next) => {
    try {
      // パスパラメータのバリデーション
      const idResult = reviewIdSchema.safeParse(req.params.id)
      if (!idResult.success) {
        return res.status(400).json({
          code: 'INVALID_ID',
          message: 'Invalid review ID format',
        })
      }

      // UseCase実行
      const mappedInput = mapGetReviewByIdRequest(idResult.data)
      if (mappedInput.type === 'err') {
        return res.status(400).json({
          code: 'INVALID_ID',
          message: mappedInput.error.message,
        })
      }
      const result = await getReviewByIdUseCase(mappedInput.value, {
        reviewRepository,
      })

      // レスポンス処理
      return match(result)
        .with({ type: 'ok' }, ({ value }) => {
          res.json(mapReviewToResponse(value))
        })
        .with({ type: 'err', error: { type: 'notFound' } }, () => {
          res.status(404).json({
            code: 'NOT_FOUND',
            message: 'Review not found',
          })
        })
        .with({ type: 'err' }, () => {
          res.status(500).json({
            code: 'INTERNAL_ERROR',
            message: 'An error occurred',
          })
        })
        .exhaustive()
    } catch (error) {
      next(error)
    }
  })

  /**
   * GET /reviews/:id/detail - Get review detail
   */
  router.get('/:id/detail', async (req, res, next) => {
    try {
      // パスパラメータのバリデーション
      const idResult = reviewIdSchema.safeParse(req.params.id)
      if (!idResult.success) {
        return res.status(400).json({
          code: 'INVALID_ID',
          message: 'Invalid review ID format',
        })
      }

      // UseCase実行
      const mappedInput = mapGetReviewDetailByIdRequest(idResult.data)
      if (mappedInput.type === 'err') {
        return res.status(400).json({
          code: 'INVALID_ID',
          message: mappedInput.error.message,
        })
      }
      const result = await getReviewDetailByIdUseCase(mappedInput.value, {
        reviewRepository,
      })

      // レスポンス処理
      return match(result)
        .with({ type: 'ok' }, ({ value }) => {
          res.json(mapReviewDetailToResponse(value))
        })
        .with({ type: 'err', error: { type: 'notFound' } }, () => {
          res.status(404).json({
            code: 'NOT_FOUND',
            message: 'Review not found',
          })
        })
        .with({ type: 'err' }, () => {
          res.status(500).json({
            code: 'INTERNAL_ERROR',
            message: 'An error occurred',
          })
        })
        .exhaustive()
    } catch (error) {
      next(error)
    }
  })

  /**
   * PUT /reviews/:id - Update review
   * 認証必須: customer（レビュー作成者のみ）またはadmin
   */
  router.put('/:id', authenticate(authConfig), async (req, res, next) => {
    try {
      // パスパラメータのバリデーション
      const idResult = reviewIdSchema.safeParse(req.params.id)
      if (!idResult.success) {
        return res.status(400).json({
          code: 'INVALID_ID',
          message: 'Invalid review ID format',
        })
      }

      // UseCase実行
      const mappedInput = mapUpdateReviewRequest(
        idResult.data,
        req.body,
        req.user?.id
      )
      if (mappedInput.type === 'err') {
        return res.status(400).json({
          code: 'INVALID_ID',
          message: mappedInput.error.message,
        })
      }
      const result = await updateReviewUseCase(mappedInput.value, {
        reviewRepository,
      })

      // レスポンス処理
      return match(result)
        .with({ type: 'ok' }, ({ value }) => {
          res.json(mapReviewToResponse(value))
        })
        .with({ type: 'err', error: { type: 'notFound' } }, () => {
          res.status(404).json({
            code: 'NOT_FOUND',
            message: 'Review not found',
          })
        })
        .with({ type: 'err' }, ({ error }) => {
          const statusCode = match(error.type)
            .with('invalidRating', 'commentTooLong', 'tooManyImages', () => 400)
            .with('cannotEdit', () => 403)
            .with('databaseError', () => 500)
            .otherwise(() => 400)

          res.status(statusCode).json(createUpdateReviewErrorResponse(error))
        })
        .exhaustive()
    } catch (error) {
      next(error)
    }
  })

  /**
   * DELETE /reviews/:id - Delete review
   * 認証必須: adminのみ
   */
  router.delete(
    '/:id',
    authenticate(authConfig),
    authorize('admin'),
    async (req, res, next) => {
      try {
        // パスパラメータのバリデーション
        const idResult = reviewIdSchema.safeParse(req.params.id)
        if (!idResult.success) {
          return res.status(400).json({
            code: 'INVALID_ID',
            message: 'Invalid review ID format',
          })
        }

        // リクエストボディの検証
        if (!req.body.reason) {
          return res.status(400).json({
            code: 'INVALID_REQUEST',
            message: 'Deletion reason is required',
          })
        }

        // UseCase実行
        const mappedInput = mapDeleteReviewRequest(
          idResult.data,
          req.body.reason,
          req.user?.id || 'system'
        )
        if (mappedInput.type === 'err') {
          return res.status(400).json({
            code: 'INVALID_ID',
            message: mappedInput.error.message,
          })
        }
        const result = await deleteReviewUseCase(mappedInput.value, {
          reviewRepository,
        })

        // レスポンス処理
        return match(result)
          .with({ type: 'ok' }, () => {
            res.status(204).send()
          })
          .with({ type: 'err', error: { type: 'notFound' } }, () => {
            res.status(404).json({
              code: 'NOT_FOUND',
              message: 'Review not found',
            })
          })
          .with(
            { type: 'err', error: { type: 'cannotDelete' } },
            ({ error }) => {
              res.status(403).json({
                code: 'CANNOT_DELETE',
                message: error.message,
              })
            }
          )
          .with({ type: 'err' }, ({ error }) => {
            res.status(500).json(createDeleteReviewErrorResponse(error))
          })
          .exhaustive()
      } catch (error) {
        next(error)
      }
    }
  )

  /**
   * POST /reviews/:id/publish - Publish review
   * 認証必須: admin, staffのみ
   */
  router.post(
    '/:id/publish',
    authenticate(authConfig),
    authorize('admin', 'staff'),
    async (req, res, next) => {
      try {
        // パスパラメータのバリデーション
        const idResult = reviewIdSchema.safeParse(req.params.id)
        if (!idResult.success) {
          return res.status(400).json({
            code: 'INVALID_ID',
            message: 'Invalid review ID format',
          })
        }

        // UseCase実行
        const mappedInput = mapPublishReviewRequest(
          idResult.data,
          req.user?.id || 'system'
        )
        if (mappedInput.type === 'err') {
          return res.status(400).json({
            code: 'INVALID_ID',
            message: mappedInput.error.message,
          })
        }
        const result = await publishReviewUseCase(mappedInput.value, {
          reviewRepository,
        })

        // レスポンス処理
        return match(result)
          .with({ type: 'ok' }, ({ value }) => {
            res.json(mapReviewToResponse(value))
          })
          .with({ type: 'err', error: { type: 'notFound' } }, () => {
            res.status(404).json({
              code: 'NOT_FOUND',
              message: 'Review not found',
            })
          })
          .with(
            { type: 'err', error: { type: 'cannotPublish' } },
            ({ error }) => {
              res.status(409).json({
                code: 'CANNOT_PUBLISH',
                message: error.message,
              })
            }
          )
          .with({ type: 'err' }, ({ error }) => {
            res.status(500).json(createReviewStatusChangeErrorResponse(error))
          })
          .exhaustive()
      } catch (error) {
        next(error)
      }
    }
  )

  /**
   * POST /reviews/:id/hide - Hide review
   * 認証必須: admin, staffのみ
   */
  router.post(
    '/:id/hide',
    authenticate(authConfig),
    authorize('admin', 'staff'),
    async (req, res, next) => {
      try {
        // パスパラメータのバリデーション
        const idResult = reviewIdSchema.safeParse(req.params.id)
        if (!idResult.success) {
          return res.status(400).json({
            code: 'INVALID_ID',
            message: 'Invalid review ID format',
          })
        }

        // リクエストボディの検証
        if (!req.body.reason) {
          return res.status(400).json({
            code: 'INVALID_REQUEST',
            message: 'Hide reason is required',
          })
        }

        // UseCase実行
        const mappedInput = mapHideReviewRequest(
          idResult.data,
          req.body.reason,
          req.user?.id || 'system'
        )
        if (mappedInput.type === 'err') {
          return res.status(400).json({
            code: 'INVALID_ID',
            message: mappedInput.error.message,
          })
        }
        const result = await hideReviewUseCase(mappedInput.value, {
          reviewRepository,
        })

        // レスポンス処理
        return match(result)
          .with({ type: 'ok' }, ({ value }) => {
            res.json(mapReviewToResponse(value))
          })
          .with({ type: 'err', error: { type: 'notFound' } }, () => {
            res.status(404).json({
              code: 'NOT_FOUND',
              message: 'Review not found',
            })
          })
          .with({ type: 'err', error: { type: 'cannotHide' } }, ({ error }) => {
            res.status(409).json({
              code: 'CANNOT_HIDE',
              message: error.message,
            })
          })
          .with({ type: 'err' }, ({ error }) => {
            res.status(500).json(createReviewStatusChangeErrorResponse(error))
          })
          .exhaustive()
      } catch (error) {
        next(error)
      }
    }
  )

  /**
   * POST /reviews/:id/helpful - Mark review as helpful
   * 認証不要（誰でもhelpfulマーク可能）
   */
  router.post(
    '/:id/helpful',
    optionalAuthenticate(authConfig),
    async (req, res, next) => {
      try {
        // パスパラメータのバリデーション
        const idResult = reviewIdSchema.safeParse(req.params.id)
        if (!idResult.success) {
          return res.status(400).json({
            code: 'INVALID_ID',
            message: 'Invalid review ID format',
          })
        }

        // UseCase実行
        const mappedInput = mapIncrementHelpfulCountRequest(idResult.data)
        if (mappedInput.type === 'err') {
          return res.status(400).json({
            code: 'INVALID_ID',
            message: mappedInput.error.message,
          })
        }
        const result = await incrementHelpfulCountUseCase(mappedInput.value, {
          reviewRepository,
        })

        // レスポンス処理
        return match(result)
          .with({ type: 'ok' }, ({ value }) => {
            res.json(mapReviewToResponse(value))
          })
          .with({ type: 'err', error: { type: 'notFound' } }, () => {
            res.status(404).json({
              code: 'NOT_FOUND',
              message: 'Review not found',
            })
          })
          .with({ type: 'err' }, () => {
            res.status(500).json({
              code: 'INTERNAL_ERROR',
              message: 'An error occurred',
            })
          })
          .exhaustive()
      } catch (error) {
        next(error)
      }
    }
  )

  /**
   * GET /salons/:salonId/reviews - Get salon reviews
   */
  router.get('/salons/:salonId/reviews', async (req, res, next) => {
    try {
      // クエリパラメータのパース
      const paginationResult = paginationSchema.safeParse(req.query)
      if (!paginationResult.success) {
        return res.status(400).json({
          code: 'INVALID_PAGINATION',
          message: 'Invalid pagination parameters',
        })
      }

      // UseCase実行
      const mappedInput = mapGetSalonReviewsRequest(
        req.params.salonId,
        paginationResult.data.limit,
        paginationResult.data.offset
      )
      if (mappedInput.type === 'err') {
        return res.status(400).json({
          code: 'INVALID_ID',
          message: mappedInput.error.message,
        })
      }
      const result = await getSalonReviewsUseCase(mappedInput.value, {
        reviewRepository,
      })

      // レスポンス処理
      return match(result)
        .with({ type: 'ok' }, ({ value }) => {
          res.json(mapReviewListToResponse(value))
        })
        .with({ type: 'err' }, ({ error }) => {
          const statusCode = error.type === 'databaseError' ? 500 : 400
          res.status(statusCode).json({
            code: error.type.toUpperCase(),
            message:
              error.type === 'databaseError' ? error.message : 'Bad request',
          })
        })
        .exhaustive()
    } catch (error) {
      next(error)
    }
  })

  /**
   * GET /salons/:salonId/reviews/summary - Get salon review summary
   */
  router.get('/salons/:salonId/reviews/summary', async (req, res, next) => {
    try {
      // UseCase実行
      const mappedInput = mapGetSalonReviewSummaryRequest(req.params.salonId)
      if (mappedInput.type === 'err') {
        return res.status(400).json({
          code: 'INVALID_ID',
          message: mappedInput.error.message,
        })
      }
      const result = await getSalonReviewSummaryUseCase(mappedInput.value, {
        reviewRepository,
      })

      // レスポンス処理
      return match(result)
        .with({ type: 'ok' }, ({ value }) => {
          res.json(mapReviewSummaryToResponse(value))
        })
        .with({ type: 'err' }, ({ error }) => {
          const statusCode = error.type === 'databaseError' ? 500 : 400
          res.status(statusCode).json({
            code: error.type.toUpperCase(),
            message:
              error.type === 'databaseError' ? error.message : 'Bad request',
          })
        })
        .exhaustive()
    } catch (error) {
      next(error)
    }
  })

  return router
}
