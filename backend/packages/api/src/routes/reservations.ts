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
import type { TypedRequest, TypedResponse } from '../types/express.js'
import {
  toReservationDetailResponse,
  toReservationResponse,
} from '../utils/reservation-mappers.js'

import type {
  ReservationRepository,
  ReservationStatus,
  ServiceRepository,
} from '@beauty-salon-backend/domain'
import {
  createSalonIdSafe,
  createServiceIdSafe,
} from '@beauty-salon-backend/domain'
import type { components } from '@beauty-salon-backend/types/api'
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
  mapReservationListToResponse,
  mapUpdateReservationRequest,
  markAsNoShowUseCase,
  updateReservationUseCase,
} from '@beauty-salon-backend/usecase'

// リクエスト/レスポンス型定義
type ListReservationsQuery = {
  customerId?: string
  salonId?: string
  staffId?: string
  serviceId?: string
  status?: ReservationStatus
  from?: string
  to?: string
  isPaid?: string
  limit?: string
  offset?: string
}

type CreateReservationRequest = {
  customerId: string
  salonId: string
  staffId: string
  serviceId: string
  startTime: string
  notes?: string
}

type UpdateReservationRequest = {
  startTime?: string
  endTime?: string
  staffId?: string
  notes?: string
}

// Reservationレスポンス型はOpenAPIから生成された型を使用
type ReservationResponse = components['schemas']['Models.Reservation']

type ReservationListResponse = {
  reservations: ReservationResponse[]
  total: number
  limit: number
  offset: number
}

// ReservationDetailResponse型はOpenAPIから生成された型を使用
// 直接components['schemas']['Models.ReservationDetail']を使用するため削除

type AvailableSlotsQuery = {
  salonId: string
  serviceId: string
  staffId?: string
  date: string
  duration?: string
}

type AvailableSlotsResponse = {
  slots: Array<{
    startTime: string
    endTime: string
    staffId: string
  }>
}

type ErrorResponse = {
  code: string
  message: string
}

// バリデーションスキーマ
const reservationIdSchema = z.string().uuid()
const paginationSchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
})

// 依存関係の注入用の型
export type ReservationRouteDeps = {
  reservationRepository: ReservationRepository
  serviceRepository: ServiceRepository
  authConfig: AuthConfig
}

export const createReservationRoutes = (deps: ReservationRouteDeps): Router => {
  const router = Router()
  const { reservationRepository, serviceRepository, authConfig } = deps

  /**
   * GET /reservations - List reservations
   * 認証必須: admin, staffのみ（customerは自分の予約のみフィルタリング可能）
   */
  router.get(
    '/',
    authenticate(authConfig),
    async (
      req: TypedRequest<unknown, ListReservationsQuery>,
      res: TypedResponse<ReservationListResponse | ErrorResponse>,
      next
    ) => {
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
          req.user?.role === 'customer' ? req.user.id : req.query.customerId

        // UseCase実行
        const mappedInput = mapListReservationsRequest({
          salonId: req.query.salonId,
          customerId,
          staffId: req.query.staffId,
          serviceId: req.query.serviceId,
          status: req.query.status as ReservationStatus | undefined,
          startDate: req.query.from ? new Date(req.query.from) : undefined,
          endDate: req.query.to ? new Date(req.query.to) : undefined,
          isPaid: match(req.query.isPaid)
            .with('true', () => true as const)
            .with('false', () => false as const)
            .otherwise(() => undefined),
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
    }
  )

  /**
   * POST /reservations - Create reservation
   * 認証必須: customer, staff, admin
   */
  router.post(
    '/',
    authenticate(authConfig),
    async (
      req: TypedRequest<CreateReservationRequest>,
      res: TypedResponse<
        components['schemas']['Models.Reservation'] | ErrorResponse
      >,
      next
    ) => {
      try {
        // リクエストボディの基本的な検証
        if (
          !req.body.salonId ||
          !req.body.customerId ||
          !req.body.staffId ||
          !req.body.serviceId ||
          !req.body.startTime
        ) {
          return res.status(400).json({
            code: 'INVALID_REQUEST',
            message: 'Required fields are missing',
          })
        }

        // ServiceIdを検証してサービス情報を取得
        const serviceIdResult = createServiceIdSafe(req.body.serviceId)
        if (serviceIdResult.type === 'err') {
          return res.status(400).json({
            code: 'INVALID_ID',
            message: 'Invalid service ID format',
          })
        }

        // サービス情報を取得してdurationを確認
        const serviceResult = await serviceRepository.findById(
          serviceIdResult.value
        )
        if (serviceResult.type === 'err') {
          if (serviceResult.error.type === 'notFound') {
            return res.status(404).json({
              code: 'SERVICE_NOT_FOUND',
              message: 'Service not found',
            })
          }
          return res.status(500).json({
            code: 'DATABASE_ERROR',
            message: 'Failed to fetch service information',
          })
        }

        // endTimeを計算（startTime + service duration）
        const startTime = new Date(req.body.startTime)
        const endTime = new Date(
          startTime.getTime() + serviceResult.value.data.duration * 60 * 1000
        )

        // UseCase実行
        const mappedInput = mapCreateReservationRequest(
          {
            ...req.body,
            startTime: req.body.startTime,
            endTime: endTime.toISOString(),
            totalAmount: serviceResult.value.data.price,
            depositAmount: 0,
            notes: req.body.notes ?? null,
          },
          req.user?.id
        )
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
              .json(toReservationResponse(value))
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
    }
  )

  /**
   * GET /reservations/:id - Get reservation
   * 認証必須: 予約オーナー、staff、admin
   */
  router.get(
    '/:id',
    authenticate(authConfig),
    async (
      req: TypedRequest<unknown, unknown, { id: string }>,
      res: TypedResponse<
        components['schemas']['Models.Reservation'] | ErrorResponse
      >,
      next
    ) => {
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
            res.json(toReservationResponse(value))
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
   * GET /reservations/:id/detail - Get reservation detail
   * 認証必須: 予約オーナー、staff、admin
   */
  router.get(
    '/:id/detail',
    authenticate(authConfig),
    async (
      req: TypedRequest<unknown, unknown, { id: string }>,
      res: TypedResponse<
        components['schemas']['Models.ReservationDetail'] | ErrorResponse
      >,
      next
    ) => {
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
            res.json(toReservationDetailResponse(value))
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
  router.put(
    '/:id',
    authenticate(authConfig),
    async (
      req: TypedRequest<UpdateReservationRequest, unknown, { id: string }>,
      res: TypedResponse<
        components['schemas']['Models.Reservation'] | ErrorResponse
      >,
      next
    ) => {
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
            res.json(toReservationResponse(value))
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
    }
  )

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
          req.user?.id ?? 'system'
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
            res.json(toReservationResponse(value))
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
    async (
      req: TypedRequest<unknown, unknown, { id: string }>,
      res: TypedResponse<
        components['schemas']['Models.Reservation'] | ErrorResponse
      >,
      next
    ) => {
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
          req.user?.id ?? 'system'
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
            res.json(toReservationResponse(value))
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
    async (
      req: TypedRequest<unknown, unknown, { id: string }>,
      res: TypedResponse<
        components['schemas']['Models.Reservation'] | ErrorResponse
      >,
      next
    ) => {
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
          req.user?.id ?? 'system'
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
            res.json(toReservationResponse(value))
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
    async (
      req: TypedRequest<unknown, unknown, { id: string }>,
      res: TypedResponse<
        components['schemas']['Models.Reservation'] | ErrorResponse
      >,
      next
    ) => {
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
          req.user?.id ?? 'system'
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
            res.json(toReservationResponse(value))
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
  router.post(
    '/check-availability',
    async (
      req: TypedRequest<AvailableSlotsQuery>,
      res: TypedResponse<AvailableSlotsResponse | ErrorResponse>,
      next
    ) => {
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

        // SalonIdの変換
        const salonIdResult = createSalonIdSafe(req.body.salonId)
        if (salonIdResult.type === 'err') {
          return res.status(400).json({
            code: 'INVALID_ID',
            message: 'Invalid salon ID format',
          })
        }

        // 日付の検証
        const date = new Date(req.body.date)
        if (Number.isNaN(date.getTime())) {
          return res.status(400).json({
            code: 'INVALID_DATE',
            message: 'Invalid date format',
          })
        }

        // UseCase実行
        const result = await findAvailableSlotsUseCase(
          {
            salonId: salonIdResult.value,
            serviceId: req.body.serviceId,
            date,
            duration: req.body.duration
              ? Number.parseInt(req.body.duration)
              : 60,
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
    }
  )

  return router
}
