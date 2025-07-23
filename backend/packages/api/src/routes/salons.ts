/**
 * Salon API Routes
 * OpenAPIで生成された型を使用したAPI実装
 * CLAUDEガイドラインに準拠
 */

import { Router } from 'express'
import { match } from 'ts-pattern'
import { z } from 'zod'
import { authenticate, authorize } from '../middleware/auth.middleware.js'
import type { AuthConfig } from '../middleware/auth.middleware.js'
import type { TypedRequest, TypedResponse } from '../types/express.js'

import type { SalonRepository } from '@beauty-salon-backend/domain'
import type { components } from '@beauty-salon-backend/types/api'
import {
  createDeleteSalonErrorResponse,
  createSalonErrorResponse,
  createSalonUseCase,
  createSuspendReactivateErrorResponse,
  createUpdateSalonErrorResponse,
  deleteSalonUseCase,
  getSalonByIdUseCase,
  listSalonsUseCase,
  mapCreateSalonRequest,
  mapDeleteSalonRequest,
  mapGetSalonByIdRequest,
  mapReactivateSalonRequest,
  mapSalonListToResponse,
  mapSuspendSalonRequest,
  mapUpdateSalonRequest,
  reactivateSalonUseCase,
  suspendSalonUseCase,
  updateSalonUseCase,
} from '@beauty-salon-backend/usecase'
import {
  normalizeCreateSalonRequest,
  normalizeUpdateSalonRequest,
  toSalonResponse,
} from '../utils/salon-mappers.js'

// リクエスト/レスポンス型定義
type ListSalonsQuery = {
  keyword?: string
  city?: string
  isActive?: string
  limit?: string
  offset?: string
}

// Salon作成リクエスト型はOpenAPIから生成された型を使用
type CreateSalonRequest = components['schemas']['Models.CreateSalonRequest']

type UpdateSalonRequest = components['schemas']['Models.UpdateSalonRequest']

type SuspendSalonRequest = {
  reason: string
}

// Salonレスポンス型はOpenAPIから生成された型を使用
type SalonResponse = components['schemas']['Models.Salon']

type SalonListResponse = {
  salons: SalonResponse[]
  total: number
  limit: number
  offset: number
}

type ErrorResponse = {
  code: string
  message: string
}

// バリデーションスキーマ
const salonIdSchema = z.string().uuid()
const paginationSchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
})

// 依存関係の注入用の型
export type SalonRouteDeps = {
  salonRepository: SalonRepository
  authConfig: AuthConfig
}

export const createSalonRoutes = (deps: SalonRouteDeps): Router => {
  const router = Router()
  const { salonRepository, authConfig } = deps

  /**
   * GET /salons - List salons
   */
  router.get(
    '/',
    async (
      req: TypedRequest<unknown, ListSalonsQuery>,
      res: TypedResponse<SalonListResponse | ErrorResponse>,
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

        // UseCase実行
        const result = await listSalonsUseCase(
          {
            keyword: req.query.keyword,
            city: req.query.city,
            isActive: req.query.isActive === 'true' ? true : undefined,
            limit: paginationResult.data.limit,
            offset: paginationResult.data.offset,
          },
          { salonRepository }
        )

        // レスポンス処理
        return match(result)
          .with({ type: 'ok' }, ({ value }) => {
            res.json(mapSalonListToResponse(value))
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
   * POST /salons - Create salon
   * 認証必須: admin, staffのみ
   */
  router.post(
    '/',
    authenticate(authConfig),
    authorize('admin', 'staff'),
    async (
      req: TypedRequest<CreateSalonRequest>,
      res: TypedResponse<components['schemas']['Models.Salon'] | ErrorResponse>,
      next
    ) => {
      try {
        // リクエストボディの基本的な検証
        if (
          !req.body.name ||
          !req.body.address ||
          !req.body.contactInfo ||
          !req.body.openingHours
        ) {
          return res.status(400).json({
            code: 'INVALID_REQUEST',
            message:
              'Name, address, contact info, and opening hours are required',
          })
        }

        // リクエストボディの正規化
        const normalizedRequest = normalizeCreateSalonRequest(req.body)

        // UseCase実行
        const input = mapCreateSalonRequest(normalizedRequest, req.user?.id)
        const result = await createSalonUseCase(input, { salonRepository })

        // レスポンス処理
        return match(result)
          .with({ type: 'ok' }, ({ value }) => {
            const response = toSalonResponse(value)
            res
              .status(201)
              .header('Location', `/salons/${value.data.id}`)
              .json(response)
          })
          .with({ type: 'err' }, ({ error }) => {
            const statusCode = match(error.type)
              .with(
                'invalidName',
                'invalidEmail',
                'invalidPhoneNumber',
                'invalidOpeningHours',
                () => 400
              )
              .with('databaseError', () => 500)
              .otherwise(() => 400)

            res.status(statusCode).json(createSalonErrorResponse(error))
          })
          .exhaustive()
      } catch (error) {
        next(error)
      }
    }
  )

  /**
   * GET /salons/:id - Get salon
   */
  router.get(
    '/:id',
    async (
      req: TypedRequest<unknown, unknown, { id: string }>,
      res: TypedResponse<components['schemas']['Models.Salon'] | ErrorResponse>,
      next
    ) => {
      try {
        // パスパラメータのバリデーション
        const idResult = salonIdSchema.safeParse(req.params.id)
        if (!idResult.success) {
          return res.status(400).json({
            code: 'INVALID_ID',
            message: 'Invalid salon ID format',
          })
        }

        // UseCase実行
        const mappedInput = mapGetSalonByIdRequest(idResult.data)
        if (mappedInput.type === 'err') {
          return res.status(400).json({
            code: 'INVALID_ID',
            message: mappedInput.error.message,
          })
        }
        const result = await getSalonByIdUseCase(mappedInput.value, {
          salonRepository,
        })

        // レスポンス処理
        return match(result)
          .with({ type: 'ok' }, ({ value }) => {
            const response = toSalonResponse(value)
            res.json(response)
          })
          .with({ type: 'err', error: { type: 'notFound' } }, () => {
            res.status(404).json({
              code: 'NOT_FOUND',
              message: 'Salon not found',
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
   * PUT /salons/:id - Update salon
   * 認証必須: admin, staffのみ
   */
  router.put(
    '/:id',
    authenticate(authConfig),
    authorize('admin', 'staff'),
    async (
      req: TypedRequest<UpdateSalonRequest, unknown, { id: string }>,
      res: TypedResponse<components['schemas']['Models.Salon'] | ErrorResponse>,
      next
    ) => {
      try {
        // パスパラメータのバリデーション
        const idResult = salonIdSchema.safeParse(req.params.id)
        if (!idResult.success) {
          return res.status(400).json({
            code: 'INVALID_ID',
            message: 'Invalid salon ID format',
          })
        }

        // リクエストボディの正規化
        const normalizedRequest = normalizeUpdateSalonRequest(req.body)

        // UseCase実行
        const mappedInput = mapUpdateSalonRequest(
          idResult.data,
          normalizedRequest,
          req.user?.id
        )
        if (mappedInput.type === 'err') {
          return res.status(400).json({
            code: 'INVALID_ID',
            message: mappedInput.error.message,
          })
        }
        const result = await updateSalonUseCase(mappedInput.value, {
          salonRepository,
        })

        // レスポンス処理
        return match(result)
          .with({ type: 'ok' }, ({ value }) => {
            const response = toSalonResponse(value)
            res.json(response)
          })
          .with({ type: 'err', error: { type: 'notFound' } }, () => {
            res.status(404).json({
              code: 'NOT_FOUND',
              message: 'Salon not found',
            })
          })
          .with({ type: 'err' }, ({ error }) => {
            const statusCode = match(error.type)
              .with(
                'invalidName',
                'invalidEmail',
                'invalidPhoneNumber',
                'invalidOpeningHours',
                () => 400
              )
              .with('databaseError', () => 500)
              .otherwise(() => 400)

            res.status(statusCode).json(createUpdateSalonErrorResponse(error))
          })
          .exhaustive()
      } catch (error) {
        next(error)
      }
    }
  )

  /**
   * DELETE /salons/:id - Delete salon
   * 認証必須: adminのみ
   */
  router.delete(
    '/:id',
    authenticate(authConfig),
    authorize('admin'),
    async (
      req: TypedRequest<unknown, unknown, { id: string }>,
      res: TypedResponse<{ message: string } | ErrorResponse>,
      next
    ) => {
      try {
        // パスパラメータのバリデーション
        const idResult = salonIdSchema.safeParse(req.params.id)
        if (!idResult.success) {
          return res.status(400).json({
            code: 'INVALID_ID',
            message: 'Invalid salon ID format',
          })
        }

        // UseCase実行
        const mappedInput = mapDeleteSalonRequest(
          idResult.data,
          req.user?.id ?? 'system'
        )
        if (mappedInput.type === 'err') {
          return res.status(400).json({
            code: 'INVALID_ID',
            message: mappedInput.error.message,
          })
        }
        const result = await deleteSalonUseCase(mappedInput.value, {
          salonRepository,
        })

        // レスポンス処理
        return match(result)
          .with({ type: 'ok' }, () => {
            res.status(204).send()
          })
          .with({ type: 'err', error: { type: 'notFound' } }, () => {
            res.status(404).json({
              code: 'NOT_FOUND',
              message: 'Salon not found',
            })
          })
          .with({ type: 'err' }, ({ error }) => {
            res.status(500).json(createDeleteSalonErrorResponse(error))
          })
          .exhaustive()
      } catch (error) {
        next(error)
      }
    }
  )

  /**
   * POST /salons/:id/suspend - Suspend salon
   * 認証必須: adminのみ
   */
  router.post(
    '/:id/suspend',
    authenticate(authConfig),
    authorize('admin'),
    async (
      req: TypedRequest<SuspendSalonRequest, unknown, { id: string }>,
      res: TypedResponse<components['schemas']['Models.Salon'] | ErrorResponse>,
      next
    ) => {
      try {
        // パスパラメータのバリデーション
        const idResult = salonIdSchema.safeParse(req.params.id)
        if (!idResult.success) {
          return res.status(400).json({
            code: 'INVALID_ID',
            message: 'Invalid salon ID format',
          })
        }

        // リクエストボディの検証
        if (!req.body.reason) {
          return res.status(400).json({
            code: 'INVALID_REQUEST',
            message: 'Suspension reason is required',
          })
        }

        // UseCase実行
        const mappedInput = mapSuspendSalonRequest(
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
        const result = await suspendSalonUseCase(mappedInput.value, {
          salonRepository,
        })

        // レスポンス処理
        return match(result)
          .with({ type: 'ok' }, ({ value }) => {
            const response = toSalonResponse(value)
            res.json(response)
          })
          .with({ type: 'err', error: { type: 'notFound' } }, () => {
            res.status(404).json({
              code: 'NOT_FOUND',
              message: 'Salon not found',
            })
          })
          .with(
            { type: 'err', error: { type: 'constraintViolation' } },
            ({ error }) => {
              res.status(409).json({
                code: 'CONFLICT',
                message: error.message,
              })
            }
          )
          .with({ type: 'err' }, ({ error }) => {
            res.status(500).json(createSuspendReactivateErrorResponse(error))
          })
          .exhaustive()
      } catch (error) {
        next(error)
      }
    }
  )

  /**
   * POST /salons/:id/reactivate - Reactivate salon
   * 認証必須: adminのみ
   */
  router.post(
    '/:id/reactivate',
    authenticate(authConfig),
    authorize('admin'),
    async (
      req: TypedRequest<unknown, unknown, { id: string }>,
      res: TypedResponse<components['schemas']['Models.Salon'] | ErrorResponse>,
      next
    ) => {
      try {
        // パスパラメータのバリデーション
        const idResult = salonIdSchema.safeParse(req.params.id)
        if (!idResult.success) {
          return res.status(400).json({
            code: 'INVALID_ID',
            message: 'Invalid salon ID format',
          })
        }

        // UseCase実行
        const mappedInput = mapReactivateSalonRequest(
          idResult.data,
          req.user?.id ?? 'system'
        )
        if (mappedInput.type === 'err') {
          return res.status(400).json({
            code: 'INVALID_ID',
            message: mappedInput.error.message,
          })
        }
        const result = await reactivateSalonUseCase(mappedInput.value, {
          salonRepository,
        })

        // レスポンス処理
        return match(result)
          .with({ type: 'ok' }, ({ value }) => {
            const response = toSalonResponse(value)
            res.json(response)
          })
          .with({ type: 'err', error: { type: 'notFound' } }, () => {
            res.status(404).json({
              code: 'NOT_FOUND',
              message: 'Salon not found',
            })
          })
          .with(
            { type: 'err', error: { type: 'constraintViolation' } },
            ({ error }) => {
              res.status(409).json({
                code: 'CONFLICT',
                message: error.message,
              })
            }
          )
          .with({ type: 'err' }, ({ error }) => {
            res.status(500).json(createSuspendReactivateErrorResponse(error))
          })
          .exhaustive()
      } catch (error) {
        next(error)
      }
    }
  )

  return router
}
