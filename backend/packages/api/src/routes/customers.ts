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
const paginationSchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
})
const searchCustomerSchema = z.object({
  search: z.string().optional(),
  tags: z.array(z.string()).optional(),
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
          limit?: string
          offset?: string
        }
      >,
      res: TypedResponse<
        | {
            data: components['schemas']['Models.Customer'][]
            total: number
            limit: number
            offset: number
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

        // UseCase実行
        const result = await listCustomersUseCase(
          {
            search: searchResult.data.search,
            tags: searchResult.data.tags,
            limit: paginationResult.data.limit,
            offset: paginationResult.data.offset,
          },
          { customerRepository }
        )

        // レスポンス処理
        return match(result)
          .with({ type: 'ok' }, ({ value }) => {
            const customers = value.data.map((customer) =>
              toCustomerResponse(customer)
            )
            res.json({
              data: customers,
              total: value.total,
              limit: value.limit,
              offset: value.offset,
            })
          })
          .with({ type: 'err' }, ({ error }) => {
            const statusCode = error.type === 'databaseError' ? 500 : 400
            res.status(statusCode).json({
              type: 'error',
              error: {
                code: error.type.toUpperCase(),
                message: 'Bad request',
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
        // リクエストボディの基本的な検証
        if (!req.body.name || !req.body.contactInfo) {
          return res.status(400).json({
            type: 'validationError',
            errors: [
              ...(!req.body.name
                ? [{ field: 'name', message: 'Name is required' }]
                : []),
              ...(!req.body.contactInfo
                ? [
                    {
                      field: 'contactInfo',
                      message: 'Contact info is required',
                    },
                  ]
                : []),
            ],
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
                code: 'INTERNAL_ERROR',
                message: 'An error occurred',
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
                code: 'INTERNAL_ERROR',
                message: 'An error occurred',
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
            res.status(409).json({
              type: 'error',
              error: {
                code: 'CUSTOMER_SUSPENDED',
                message: 'Cannot update suspended customer',
              },
            })
          })
          .with({ type: 'err' }, ({ error }) => {
            res.status(400).json({
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
                code: 'INTERNAL_ERROR',
                message: 'An error occurred',
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
