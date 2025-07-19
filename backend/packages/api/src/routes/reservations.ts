/**
 * Reservation API Routes
 * OpenAPIで生成された型を使用したAPI実装
 * CLAUDEガイドラインに準拠
 */

import { Router } from 'express'
import { match } from 'ts-pattern'
import { z } from 'zod'
import { authenticate, authorize } from '../middleware/auth.middleware.js'
import type { AuthConfig } from '../middleware/auth.middleware.js'

import type {
  ReservationRepository,
  ReservationStatus,
} from '@beauty-salon-backend/domain'
import {
  cancelReservationUseCase,
  completeReservationUseCase,
  confirmReservationUseCase,
  createCancelReservationErrorResponse,
  createReservationErrorResponse,
  createReservationUseCase,
  createStatusChangeErrorResponse,
  createUpdateReservationErrorResponse,
  findAvailableSlotsUseCase,
  getReservationByIdUseCase,
  getReservationDetailByIdUseCase,
  listReservationsUseCase,
  mapAvailableSlotsToResponse,
  mapCancelReservationRequest,
  mapCompleteReservationRequest,
  mapConfirmReservationRequest,
  mapCreateReservationRequest,
  mapGetReservationByIdRequest,
  mapGetReservationDetailByIdRequest,
  mapListReservationsRequest,
  mapMarkAsNoShowRequest,
  mapReservationDetailToResponse,
  mapReservationListToResponse,
  mapReservationToResponse,
  mapUpdateReservationRequest,
  markAsNoShowUseCase,
  updateReservationUseCase,
} from '@beauty-salon-backend/usecase'

// バリデーションスキーマ
const reservationIdSchema = z.string().uuid()
const paginationSchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
})

// 依存関係の注入用の型
export type ReservationRouteDeps = {
  reservationRepository: ReservationRepository
  authConfig: AuthConfig
}

export const createReservationRoutes = (deps: ReservationRouteDeps): Router => {
  const router = Router()
  const { reservationRepository, authConfig } = deps

  /**
   * GET /reservations - List reservations
   * 認証必須: admin, staffのみ（customerは自分の予約のみフィルタリング可能）
   */
  router.get('/', authenticate(authConfig), async (req, res, next) => {
    try {
      // クエリパラメータのパース
      const paginationResult = paginationSchema.safeParse(req.query)
      if (!paginationResult.success) {
        return res.status(400).json({
          code: 'INVALID_PAGINATION',
          message: 'Invalid pagination parameters',
        })
      }

      // ロールに応じたフィルタリング
      const customerId =
        req.user?.role === 'customer'
          ? req.user.id
          : (req.query.customerId as string | undefined)

      // UseCase実行
      const mappedInput = mapListReservationsRequest({
        salonId: req.query.salonId as string | undefined,
        customerId,
        staffId: req.query.staffId as string | undefined,
        serviceId: req.query.serviceId as string | undefined,
        status: req.query.status as ReservationStatus | undefined,
        startDate: req.query.from
          ? new Date(req.query.from as string)
          : undefined,
        endDate: req.query.to ? new Date(req.query.to as string) : undefined,
        isPaid:
          req.query.isPaid === 'true'
            ? true
            : req.query.isPaid === 'false'
              ? false
              : undefined,
        limit: paginationResult.data.limit,
        offset: paginationResult.data.offset,
      })
      if (mappedInput.type === 'err') {
        return res.status(400).json({
          code: 'INVALID_ID',
          message: mappedInput.error.message,
        })
      }
      const result = await listReservationsUseCase(mappedInput.value, {
        reservationRepository,
      })

      // レスポンス処理
      return match(result)
        .with({ type: 'ok' }, ({ value }) => {
          res.json(mapReservationListToResponse(value))
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
   * POST /reservations - Create reservation
   * 認証必須: customer, staff, admin
   */
  router.post('/', authenticate(authConfig), async (req, res, next) => {
    try {
      // リクエストボディの基本的な検証
      if (
        !req.body.salonId ||
        !req.body.customerId ||
        !req.body.staffId ||
        !req.body.serviceId ||
        !req.body.startTime ||
        !req.body.endTime
      ) {
        return res.status(400).json({
          code: 'INVALID_REQUEST',
          message: 'Required fields are missing',
        })
      }

      // UseCase実行
      const mappedInput = mapCreateReservationRequest(req.body, req.user?.id)
      if (mappedInput.type === 'err') {
        return res.status(400).json({
          code: 'INVALID_ID',
          message: mappedInput.error.message,
        })
      }
      const result = await createReservationUseCase(mappedInput.value, {
        reservationRepository,
      })

      // レスポンス処理
      return match(result)
        .with({ type: 'ok' }, ({ value }) => {
          res
            .status(201)
            .header('Location', `/reservations/${value.data.id}`)
            .json(mapReservationToResponse(value))
        })
        .with({ type: 'err' }, ({ error }) => {
          const statusCode = match(error.type)
            .with(
              'invalidTimeRange',
              'invalidAmount',
              'pastTimeNotAllowed',
              () => 400
            )
            .with('slotConflict', 'slotNotAvailable', () => 409)
            .with('databaseError', () => 500)
            .otherwise(() => 400)

          res.status(statusCode).json(createReservationErrorResponse(error))
        })
        .exhaustive()
    } catch (error) {
      next(error)
    }
  })

  /**
   * GET /reservations/:id - Get reservation
   * 認証必須: 予約オーナー、staff、admin
   */
  router.get('/:id', authenticate(authConfig), async (req, res, next) => {
    try {
      // パスパラメータのバリデーション
      const idResult = reservationIdSchema.safeParse(req.params.id)
      if (!idResult.success) {
        return res.status(400).json({
          code: 'INVALID_ID',
          message: 'Invalid reservation ID format',
        })
      }

      // UseCase実行
      const mappedInput = mapGetReservationByIdRequest(idResult.data)
      if (mappedInput.type === 'err') {
        return res.status(400).json({
          code: 'INVALID_ID',
          message: mappedInput.error.message,
        })
      }
      const result = await getReservationByIdUseCase(mappedInput.value, {
        reservationRepository,
      })

      // レスポンス処理
      return match(result)
        .with({ type: 'ok' }, ({ value }) => {
          res.json(mapReservationToResponse(value))
        })
        .with({ type: 'err', error: { type: 'notFound' } }, () => {
          res.status(404).json({
            code: 'NOT_FOUND',
            message: 'Reservation not found',
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
   * GET /reservations/:id/detail - Get reservation detail
   * 認証必須: 予約オーナー、staff、admin
   */
  router.get(
    '/:id/detail',
    authenticate(authConfig),
    async (req, res, next) => {
      try {
        // パスパラメータのバリデーション
        const idResult = reservationIdSchema.safeParse(req.params.id)
        if (!idResult.success) {
          return res.status(400).json({
            code: 'INVALID_ID',
            message: 'Invalid reservation ID format',
          })
        }

        // UseCase実行
        const mappedInput = mapGetReservationDetailByIdRequest(idResult.data)
        if (mappedInput.type === 'err') {
          return res.status(400).json({
            code: 'INVALID_ID',
            message: mappedInput.error.message,
          })
        }
        const result = await getReservationDetailByIdUseCase(
          mappedInput.value,
          { reservationRepository }
        )

        // レスポンス処理
        return match(result)
          .with({ type: 'ok' }, ({ value }) => {
            res.json(mapReservationDetailToResponse(value))
          })
          .with({ type: 'err', error: { type: 'notFound' } }, () => {
            res.status(404).json({
              code: 'NOT_FOUND',
              message: 'Reservation not found',
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
   * PUT /reservations/:id - Update reservation
   * 認証必須: 予約オーナー、staff、admin
   */
  router.put('/:id', authenticate(authConfig), async (req, res, next) => {
    try {
      // パスパラメータのバリデーション
      const idResult = reservationIdSchema.safeParse(req.params.id)
      if (!idResult.success) {
        return res.status(400).json({
          code: 'INVALID_ID',
          message: 'Invalid reservation ID format',
        })
      }

      // UseCase実行
      const mappedInput = mapUpdateReservationRequest(
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
      const result = await updateReservationUseCase(mappedInput.value, {
        reservationRepository,
      })

      // レスポンス処理
      return match(result)
        .with({ type: 'ok' }, ({ value }) => {
          res.json(mapReservationToResponse(value))
        })
        .with({ type: 'err', error: { type: 'notFound' } }, () => {
          res.status(404).json({
            code: 'NOT_FOUND',
            message: 'Reservation not found',
          })
        })
        .with({ type: 'err' }, ({ error }) => {
          const statusCode = match(error.type)
            .with('invalidTimeRange', 'pastTimeNotAllowed', () => 400)
            .with('cannotModify', () => 403)
            .with('slotConflict', () => 409)
            .with('databaseError', () => 500)
            .otherwise(() => 400)

          res
            .status(statusCode)
            .json(createUpdateReservationErrorResponse(error))
        })
        .exhaustive()
    } catch (error) {
      next(error)
    }
  })

  /**
   * POST /reservations/:id/cancel - Cancel reservation
   * 認証必須: 予約オーナー、staff、admin
   */
  router.post(
    '/:id/cancel',
    authenticate(authConfig),
    async (req, res, next) => {
      try {
        // パスパラメータのバリデーション
        const idResult = reservationIdSchema.safeParse(req.params.id)
        if (!idResult.success) {
          return res.status(400).json({
            code: 'INVALID_ID',
            message: 'Invalid reservation ID format',
          })
        }

        // リクエストボディの検証
        if (!req.body.reason) {
          return res.status(400).json({
            code: 'INVALID_REQUEST',
            message: 'Cancellation reason is required',
          })
        }

        // UseCase実行
        const mappedInput = mapCancelReservationRequest(
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
        const result = await cancelReservationUseCase(mappedInput.value, {
          reservationRepository,
        })

        // レスポンス処理
        return match(result)
          .with({ type: 'ok' }, ({ value }) => {
            res.json(mapReservationToResponse(value))
          })
          .with({ type: 'err', error: { type: 'notFound' } }, () => {
            res.status(404).json({
              code: 'NOT_FOUND',
              message: 'Reservation not found',
            })
          })
          .with(
            { type: 'err', error: { type: 'cannotCancel' } },
            ({ error }) => {
              res.status(403).json({
                code: 'CANNOT_CANCEL',
                message: error.message,
              })
            }
          )
          .with({ type: 'err' }, ({ error }) => {
            res.status(500).json(createCancelReservationErrorResponse(error))
          })
          .exhaustive()
      } catch (error) {
        next(error)
      }
    }
  )

  /**
   * POST /reservations/:id/confirm - Confirm reservation
   * 認証必須: staff, adminのみ
   */
  router.post(
    '/:id/confirm',
    authenticate(authConfig),
    authorize('staff', 'admin'),
    async (req, res, next) => {
      try {
        // パスパラメータのバリデーション
        const idResult = reservationIdSchema.safeParse(req.params.id)
        if (!idResult.success) {
          return res.status(400).json({
            code: 'INVALID_ID',
            message: 'Invalid reservation ID format',
          })
        }

        // UseCase実行
        const mappedInput = mapConfirmReservationRequest(
          idResult.data,
          req.user?.id || 'system'
        )
        if (mappedInput.type === 'err') {
          return res.status(400).json({
            code: 'INVALID_ID',
            message: mappedInput.error.message,
          })
        }
        const result = await confirmReservationUseCase(mappedInput.value, {
          reservationRepository,
        })

        // レスポンス処理
        return match(result)
          .with({ type: 'ok' }, ({ value }) => {
            res.json(mapReservationToResponse(value))
          })
          .with({ type: 'err', error: { type: 'notFound' } }, () => {
            res.status(404).json({
              code: 'NOT_FOUND',
              message: 'Reservation not found',
            })
          })
          .with(
            { type: 'err', error: { type: 'invalidStatus' } },
            ({ error }) => {
              res.status(409).json({
                code: 'INVALID_STATUS',
                message: error.message,
              })
            }
          )
          .with({ type: 'err' }, ({ error }) => {
            res.status(500).json(createStatusChangeErrorResponse(error))
          })
          .exhaustive()
      } catch (error) {
        next(error)
      }
    }
  )

  /**
   * POST /reservations/:id/complete - Complete reservation
   * 認証必須: staff, adminのみ
   */
  router.post(
    '/:id/complete',
    authenticate(authConfig),
    authorize('staff', 'admin'),
    async (req, res, next) => {
      try {
        // パスパラメータのバリデーション
        const idResult = reservationIdSchema.safeParse(req.params.id)
        if (!idResult.success) {
          return res.status(400).json({
            code: 'INVALID_ID',
            message: 'Invalid reservation ID format',
          })
        }

        // UseCase実行
        const mappedInput = mapCompleteReservationRequest(
          idResult.data,
          req.user?.id || 'system'
        )
        if (mappedInput.type === 'err') {
          return res.status(400).json({
            code: 'INVALID_ID',
            message: mappedInput.error.message,
          })
        }
        const result = await completeReservationUseCase(mappedInput.value, {
          reservationRepository,
        })

        // レスポンス処理
        return match(result)
          .with({ type: 'ok' }, ({ value }) => {
            res.json(mapReservationToResponse(value))
          })
          .with({ type: 'err', error: { type: 'notFound' } }, () => {
            res.status(404).json({
              code: 'NOT_FOUND',
              message: 'Reservation not found',
            })
          })
          .with(
            { type: 'err', error: { type: 'invalidStatus' } },
            ({ error }) => {
              res.status(409).json({
                code: 'INVALID_STATUS',
                message: error.message,
              })
            }
          )
          .with({ type: 'err' }, ({ error }) => {
            res.status(500).json(createStatusChangeErrorResponse(error))
          })
          .exhaustive()
      } catch (error) {
        next(error)
      }
    }
  )

  /**
   * POST /reservations/:id/no-show - Mark as no-show
   * 認証必須: staff, adminのみ
   */
  router.post(
    '/:id/no-show',
    authenticate(authConfig),
    authorize('staff', 'admin'),
    async (req, res, next) => {
      try {
        // パスパラメータのバリデーション
        const idResult = reservationIdSchema.safeParse(req.params.id)
        if (!idResult.success) {
          return res.status(400).json({
            code: 'INVALID_ID',
            message: 'Invalid reservation ID format',
          })
        }

        // UseCase実行
        const mappedInput = mapMarkAsNoShowRequest(
          idResult.data,
          req.user?.id || 'system'
        )
        if (mappedInput.type === 'err') {
          return res.status(400).json({
            code: 'INVALID_ID',
            message: mappedInput.error.message,
          })
        }
        const result = await markAsNoShowUseCase(mappedInput.value, {
          reservationRepository,
        })

        // レスポンス処理
        return match(result)
          .with({ type: 'ok' }, ({ value }) => {
            res.json(mapReservationToResponse(value))
          })
          .with({ type: 'err', error: { type: 'notFound' } }, () => {
            res.status(404).json({
              code: 'NOT_FOUND',
              message: 'Reservation not found',
            })
          })
          .with(
            { type: 'err', error: { type: 'invalidStatus' } },
            ({ error }) => {
              res.status(409).json({
                code: 'INVALID_STATUS',
                message: error.message,
              })
            }
          )
          .with({ type: 'err' }, ({ error }) => {
            res.status(500).json(createStatusChangeErrorResponse(error))
          })
          .exhaustive()
      } catch (error) {
        next(error)
      }
    }
  )

  /**
   * POST /reservations/check-availability - Check availability
   */
  router.post('/check-availability', async (req, res, next) => {
    try {
      // リクエストボディの検証
      if (
        !req.body.salonId ||
        !req.body.serviceId ||
        !req.body.date ||
        !req.body.duration
      ) {
        return res.status(400).json({
          code: 'INVALID_REQUEST',
          message: 'Required fields are missing',
        })
      }

      // UseCase実行
      const result = await findAvailableSlotsUseCase(
        {
          salonId: req.body.salonId,
          serviceId: req.body.serviceId,
          date: new Date(req.body.date),
          duration: req.body.duration,
        },
        { reservationRepository }
      )

      // レスポンス処理
      return match(result)
        .with({ type: 'ok' }, ({ value }) => {
          res.json(mapAvailableSlotsToResponse(value))
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
