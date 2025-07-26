/**
 * Customer API Routes
 * OpenAPIで生成された型を使用したAPI実装
 */

import type { components } from '@beauty-salon-backend/types/api'
import { Router } from 'express'
import { match } from 'ts-pattern'
import { z } from 'zod'

import {
  type CustomerRepository,
  createCustomerIdSafe,
} from '@beauty-salon-backend/domain'
import {
  createCustomerErrorResponse,
  createCustomerUseCase,
  deleteCustomerUseCase,
  getCustomerByIdUseCase,
  getCustomerProfileUseCase,
  listCustomersUseCase,
  mapCreateCustomerRequest,
  mapUpdateCustomerRequest,
  updateCustomerUseCase,
} from '@beauty-salon-backend/usecase'
import type { TypedRequest, TypedResponse } from '../types/express.js'
import {
  normalizeCreateCustomerRequest,
  normalizeUpdateCustomerRequest,
  toCustomerProfileResponse,
  toCustomerResponse,
} from '../utils/customer-mappers.js'

// APIレスポンス型
type ApiResponse<T> =
  | { type: 'success'; data: T }
  | { type: 'error'; error: { code: string; message: string } }
  | {
      type: 'validationError'
      errors: Array<{ field: string; message: string }>
    }

// バリデーションスキーマ
const customerIdSchema = z.string().uuid()

// 顧客作成バリデーションスキーマ
const createCustomerSchema = z.object({
  name: z.string().min(1).max(100),
  contactInfo: z.object({
    email: z.string().email(),
    phoneNumber: z
      .string()
      .regex(/^[0-9-+() ]+$/, 'Invalid phone number format'),
  }),
  preferences: z
    .string()
    .refine((val) => {
      if (val === null || val === undefined) return true
      try {
        const parsed = JSON.parse(val)
        if (
          parsed.gender &&
          !['male', 'female', 'other', 'prefer_not_to_say'].includes(
            parsed.gender
          )
        ) {
          return false
        }
        return true
      } catch {
        return false
      }
    }, 'Invalid preferences JSON')
    .optional()
    .nullable(),
  tags: z.array(z.string()).max(10, 'Too many tags').optional(),
})

// 顧客更新バリデーションスキーマ
const updateCustomerSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  contactInfo: z
    .object({
      email: z.string().email().optional(),
      phoneNumber: z
        .string()
        .regex(/^[0-9-+() ]+$/, 'Invalid phone number format')
        .optional(),
    })
    .optional(),
  preferences: z
    .string()
    .refine((val) => {
      if (val === null || val === undefined) return true
      try {
        const parsed = JSON.parse(val)
        if (
          parsed.gender &&
          !['male', 'female', 'other', 'prefer_not_to_say'].includes(
            parsed.gender
          )
        ) {
          return false
        }
        return true
      } catch {
        return false
      }
    }, 'Invalid preferences JSON')
    .optional()
    .nullable(),
  tags: z.array(z.string()).max(10, 'Too many tags').optional(),
})
const paginationSchema = z.object({
  page: z
    .string()
    .regex(/^[1-9][0-9]*$/, 'Invalid page number')
    .transform(Number)
    .optional(),
  limit: z
    .string()
    .regex(/^[1-9][0-9]*$/, 'Invalid limit')
    .transform(Number)
    .refine((val) => val <= 100, 'Limit cannot exceed 100')
    .optional(),
})
const searchCustomerSchema = z.object({
  search: z.string().optional(),
  tags: z
    .union([z.string(), z.array(z.string())])
    .transform((val) => {
      if (typeof val === 'string') {
        return val
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean)
      }
      return val
    })
    .optional(),
  email: z.string().email().optional(),
  membershipLevel: z.enum(['bronze', 'silver', 'gold', 'platinum']).optional(),
  isActive: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .optional(),
  // 日付範囲フィルタ
  registeredFrom: z
    .string()
    .refine((val) => {
      try {
        new Date(val).toISOString()
        return true
      } catch {
        return false
      }
    }, 'Invalid date format')
    .optional(),
  registeredTo: z
    .string()
    .refine((val) => {
      try {
        new Date(val).toISOString()
        return true
      } catch {
        return false
      }
    }, 'Invalid date format')
    .optional(),
})

// 依存関係の注入用の型
export type CustomerRouteDeps = {
  customerRepository: CustomerRepository
}

export const createCustomerRoutes = (deps: CustomerRouteDeps): Router => {
  const router = Router()
  const { customerRepository } = deps

  /**
   * GET /customers - List customers
   */
  router.get(
    '/',
    async (
      req: TypedRequest<
        unknown,
        components['schemas']['Models.SearchCustomerRequest'] & {
          page?: string
          limit?: string
        }
      >,
      res: TypedResponse<
        | {
            data: components['schemas']['Models.Customer'][]
            pagination: {
              page: number
              limit: number
              total: number
              totalPages: number
            }
          }
        | ApiResponse<never>
      >,
      next
    ) => {
      try {
        // クエリパラメータのパース
        const paginationResult = paginationSchema.safeParse(req.query)
        const searchResult = searchCustomerSchema.safeParse(req.query)

        if (!paginationResult.success || !searchResult.success) {
          return res.status(400).json({
            type: 'validationError',
            errors: [
              ...(!paginationResult.success
                ? paginationResult.error.errors.map((e) => ({
                    field: e.path.join('.'),
                    message: e.message,
                  }))
                : []),
              ...(!searchResult.success
                ? searchResult.error.errors.map((e) => ({
                    field: e.path.join('.'),
                    message: e.message,
                  }))
                : []),
            ],
          })
        }

        // ページ番号からオフセットを計算
        const page = paginationResult.data.page ?? 1
        const limit = paginationResult.data.limit ?? 20
        const offset = (page - 1) * limit

        // UseCase実行
        const result = await listCustomersUseCase(
          {
            search: searchResult.data.search,
            tags: searchResult.data.tags,
            email: searchResult.data.email,
            membershipLevel: searchResult.data.membershipLevel,
            isActive: searchResult.data.isActive,
            registeredFrom: searchResult.data.registeredFrom,
            registeredTo: searchResult.data.registeredTo,
            limit,
            offset,
          },
          { customerRepository }
        )

        // レスポンス処理
        return match(result)
          .with({ type: 'ok' }, ({ value }) => {
            const customers = value.data.map((customer) =>
              toCustomerResponse(customer)
            )
            const totalPages = Math.ceil(value.total / limit)
            res.json({
              data: customers,
              pagination: {
                page,
                limit,
                total: value.total,
                totalPages,
              },
            })
          })
          .with({ type: 'err' }, ({ error }) => {
            const statusCode = error.type === 'databaseError' ? 500 : 400
            const errorCode =
              error.type === 'databaseError'
                ? 'INTERNAL_SERVER_ERROR'
                : error.type.toUpperCase()
            const message =
              error.type === 'databaseError'
                ? 'An unexpected error occurred'
                : 'Bad request'
            res.status(statusCode).json({
              type: 'error',
              error: {
                code: errorCode,
                message,
              },
            })
          })
          .exhaustive()
      } catch (error) {
        next(error)
      }
    }
  )

  /**
   * POST /customers - Create customer
   */
  router.post(
    '/',
    async (
      req: TypedRequest<components['schemas']['Models.CreateCustomerRequest']>,
      res: TypedResponse<
        components['schemas']['Models.Customer'] | ApiResponse<never>
      >,
      next
    ) => {
      try {
        // リクエストボディのバリデーション
        const validationResult = createCustomerSchema.safeParse(req.body)
        if (!validationResult.success) {
          return res.status(400).json({
            type: 'validationError',
            errors: validationResult.error.errors.map((e) => ({
              field: e.path.join('.'),
              message: e.message,
            })),
          })
        }

        // リクエストボディの正規化
        const normalizedRequest = normalizeCreateCustomerRequest(req.body)

        // UseCase実行
        const input = mapCreateCustomerRequest(normalizedRequest)
        const result = await createCustomerUseCase(input, {
          customerRepository,
        })

        // レスポンス処理
        return match(result)
          .with({ type: 'ok' }, ({ value }) => {
            const response = toCustomerResponse(value)
            res
              .status(201)
              .header('Location', `/customers/${value.data.id}`)
              .json(response)
          })
          .with({ type: 'err' }, ({ error }) => {
            const statusCode = match(error.type)
              .with('duplicateEmail', () => 409)
              .with(
                'invalidEmail',
                'invalidPhoneNumber',
                'invalidName',
                () => 400
              )
              .with('databaseError', () => 500)
              .otherwise(() => 400)

            res.status(statusCode).json({
              type: 'error',
              error: createCustomerErrorResponse(error),
            })
          })
          .exhaustive()
      } catch (error) {
        next(error)
      }
    }
  )

  /**
   * GET /customers/:id - Get customer
   */
  router.get(
    '/:id',
    async (
      req: TypedRequest<unknown, unknown, { id: string }>,
      res: TypedResponse<
        components['schemas']['Models.Customer'] | ApiResponse<never>
      >,
      next
    ) => {
      try {
        // パスパラメータのバリデーション
        const idResult = customerIdSchema.safeParse(req.params.id)
        if (!idResult.success) {
          return res.status(400).json({
            type: 'validationError',
            errors: [{ field: 'id', message: 'Invalid customer ID format' }],
          })
        }

        const customerIdResult = createCustomerIdSafe(idResult.data)
        if (customerIdResult.type === 'err') {
          return res.status(400).json({
            type: 'validationError',
            errors: [{ field: 'id', message: 'Invalid customer ID' }],
          })
        }

        // UseCase実行
        const result = await getCustomerByIdUseCase(
          { id: customerIdResult.value },
          { customerRepository }
        )

        // レスポンス処理
        return match(result)
          .with({ type: 'ok' }, ({ value }) => {
            const response = toCustomerResponse(value)
            res.json(response)
          })
          .with({ type: 'err', error: { type: 'notFound' } }, () => {
            res.status(404).json({
              type: 'error',
              error: {
                code: 'NOT_FOUND',
                message: 'Customer not found',
              },
            })
          })
          .with({ type: 'err' }, () => {
            res.status(500).json({
              type: 'error',
              error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'An unexpected error occurred',
              },
            })
          })
          .exhaustive()
      } catch (error) {
        next(error)
      }
    }
  )

  /**
   * GET /customers/:id/profile - Get customer profile
   */
  router.get(
    '/:id/profile',
    async (
      req: TypedRequest<unknown, unknown, { id: string }>,
      res: TypedResponse<
        components['schemas']['Models.CustomerProfile'] | ApiResponse<never>
      >,
      next
    ) => {
      try {
        // パスパラメータのバリデーション
        const idResult = customerIdSchema.safeParse(req.params.id)
        if (!idResult.success) {
          return res.status(400).json({
            type: 'validationError',
            errors: [{ field: 'id', message: 'Invalid customer ID format' }],
          })
        }

        const customerIdResult = createCustomerIdSafe(idResult.data)
        if (customerIdResult.type === 'err') {
          return res.status(400).json({
            type: 'validationError',
            errors: [{ field: 'id', message: 'Invalid customer ID' }],
          })
        }

        // UseCase実行
        const result = await getCustomerProfileUseCase(
          { id: customerIdResult.value },
          { customerRepository }
        )

        // レスポンス処理
        return match(result)
          .with({ type: 'ok' }, ({ value }) => {
            const response = toCustomerProfileResponse(value)
            res.json(response)
          })
          .with({ type: 'err', error: { type: 'notFound' } }, () => {
            res.status(404).json({
              type: 'error',
              error: {
                code: 'NOT_FOUND',
                message: 'Customer not found',
              },
            })
          })
          .with({ type: 'err' }, () => {
            res.status(500).json({
              type: 'error',
              error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'An unexpected error occurred',
              },
            })
          })
          .exhaustive()
      } catch (error) {
        next(error)
      }
    }
  )

  /**
   * PUT /customers/:id - Update customer
   */
  router.put(
    '/:id',
    async (
      req: TypedRequest<
        components['schemas']['Models.UpdateCustomerRequest'],
        unknown,
        { id: string }
      >,
      res: TypedResponse<
        components['schemas']['Models.Customer'] | ApiResponse<never>
      >,
      next
    ) => {
      try {
        // パスパラメータのバリデーション
        const idResult = customerIdSchema.safeParse(req.params.id)
        if (!idResult.success) {
          return res.status(400).json({
            type: 'validationError',
            errors: [{ field: 'id', message: 'Invalid customer ID format' }],
          })
        }

        const customerIdResult = createCustomerIdSafe(idResult.data)
        if (customerIdResult.type === 'err') {
          return res.status(400).json({
            type: 'validationError',
            errors: [{ field: 'id', message: 'Invalid customer ID' }],
          })
        }

        // リクエストボディのバリデーション
        const bodyValidationResult = updateCustomerSchema.safeParse(req.body)
        if (!bodyValidationResult.success) {
          return res.status(400).json({
            type: 'validationError',
            errors: bodyValidationResult.error.errors.map((e) => ({
              field: e.path.join('.'),
              message: e.message,
            })),
          })
        }

        // リクエストボディの正規化
        const normalizedRequest = normalizeUpdateCustomerRequest(req.body)

        // UseCase実行
        const input = mapUpdateCustomerRequest(
          customerIdResult.value,
          normalizedRequest
        )
        const result = await updateCustomerUseCase(input, {
          customerRepository,
        })

        // レスポンス処理
        return match(result)
          .with({ type: 'ok' }, ({ value }) => {
            const response = toCustomerResponse(value)
            res.json(response)
          })
          .with({ type: 'err', error: { type: 'notFound' } }, () => {
            res.status(404).json({
              type: 'error',
              error: {
                code: 'NOT_FOUND',
                message: 'Customer not found',
              },
            })
          })
          .with({ type: 'err', error: { type: 'customerSuspended' } }, () => {
            res.status(403).json({
              type: 'error',
              error: {
                code: 'CUSTOMER_SUSPENDED',
                message: 'Cannot update suspended customer',
              },
            })
          })
          .with({ type: 'err' }, ({ error }) => {
            const statusCode = match(error.type)
              .with('duplicateEmail', () => 409)
              .with('databaseError', () => 500)
              .otherwise(() => 400)
            res.status(statusCode).json({
              type: 'error',
              error: createCustomerErrorResponse(error),
            })
          })
          .exhaustive()
      } catch (error) {
        next(error)
      }
    }
  )

  /**
   * DELETE /customers/:id - Delete customer
   */
  router.delete(
    '/:id',
    async (
      req: TypedRequest<unknown, unknown, { id: string }>,
      res: TypedResponse<undefined | ApiResponse<never>>,
      next
    ) => {
      try {
        // パスパラメータのバリデーション
        const idResult = customerIdSchema.safeParse(req.params.id)
        if (!idResult.success) {
          return res.status(400).json({
            type: 'validationError',
            errors: [{ field: 'id', message: 'Invalid customer ID format' }],
          })
        }

        const customerIdResult = createCustomerIdSafe(idResult.data)
        if (customerIdResult.type === 'err') {
          return res.status(400).json({
            type: 'validationError',
            errors: [{ field: 'id', message: 'Invalid customer ID' }],
          })
        }

        // UseCase実行（論理削除）
        const result = await deleteCustomerUseCase(
          { id: customerIdResult.value },
          { customerRepository }
        )

        // レスポンス処理
        return match(result)
          .with({ type: 'ok' }, () => {
            res.status(204).send()
          })
          .with({ type: 'err', error: { type: 'notFound' } }, () => {
            res.status(404).json({
              type: 'error',
              error: {
                code: 'NOT_FOUND',
                message: 'Customer not found',
              },
            })
          })
          .with({ type: 'err' }, () => {
            res.status(500).json({
              type: 'error',
              error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'An unexpected error occurred',
              },
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
