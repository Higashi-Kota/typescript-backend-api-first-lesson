/**
 * Customer API Routes
 * OpenAPI型定義を使用したAPI First開発
 */

import type { Request, Response } from 'express'
import { Router } from 'express'
import { match } from 'ts-pattern'
import { z } from 'zod'

import {
  type CustomerRepository,
  createCustomerIdSafe,
} from '@beauty-salon-backend/domain'
import {
  mapCreateCustomerRequest,
  mapCreateCustomerUseCaseErrorToResponse,
  mapCustomerListToResponse,
  mapCustomerProfileToResponse,
  mapCustomerToResponse,
  mapUpdateCustomerRequest,
  mapUpdateCustomerUseCaseErrorToResponse,
} from '@beauty-salon-backend/mappers'
import {
  createCustomerUseCase,
  deleteCustomerUseCase,
  getCustomerByIdUseCase,
  getCustomerProfileUseCase,
  listCustomersUseCase,
  updateCustomerUseCase,
} from '@beauty-salon-backend/usecase'
import type {
  CreateCustomerRequest,
  CreateCustomerResponse,
  UpdateCustomerRequest,
  UpdateCustomerResponse,
  GetCustomerResponse,
  GetCustomerProfileResponse,
  ListCustomersResponse,
  CustomerPathParams,
  ErrorResponse,
} from '../utils/openapi-types.js'

// バリデーションスキーマ
const customerIdSchema = z.string().uuid()
const paginationSchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
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
   * OpenAPI Operation: CustomerOperations_list
   */
  router.get(
    '/',
    async (
      req: Request,
      res: Response<ListCustomersResponse | ErrorResponse>,
      next
    ) => {
      try {
        // クエリパラメータのパース
        const paginationResult = paginationSchema.safeParse(req.query)
        if (!paginationResult.success) {
          const errorResponse: ErrorResponse = {
            code: 'INVALID_PAGINATION',
            message: 'Invalid pagination parameters',
          }
          return res.status(400).json(errorResponse)
        }

        // TypeScriptにクエリパラメータの型を伝える
        const query = req.query as {
          search?: string
          tags?: string[]
          limit?: string
          offset?: string
        }

        // UseCase実行
        const result = await listCustomersUseCase(
          {
            search: query.search,
            tags: query.tags,
            limit: paginationResult.data.limit,
            offset: paginationResult.data.offset,
          },
          { customerRepository }
        )

        // レスポンス処理
        return match(result)
          .with({ type: 'ok' }, ({ value }) => {
            const response: ListCustomersResponse =
              mapCustomerListToResponse(value)
            res.json(response)
          })
          .with({ type: 'err' }, ({ error }) => {
            const statusCode = error.type === 'databaseError' ? 500 : 400
            const errorResponse: ErrorResponse = {
              code: error.type.toUpperCase(),
              message:
                error.type === 'databaseError' ? error.message : 'Bad request',
            }
            res.status(statusCode).json(errorResponse)
          })
          .exhaustive()
      } catch (error) {
        next(error)
      }
    }
  )

  /**
   * POST /customers - Create customer
   * OpenAPI Operation: CustomerOperations_create
   */
  router.post(
    '/',
    async (
      req: Request<
        unknown,
        CreateCustomerResponse | ErrorResponse,
        CreateCustomerRequest
      >,
      res: Response<CreateCustomerResponse | ErrorResponse>,
      next
    ) => {
      try {
        // リクエストボディの基本的な検証
        const requestData: CreateCustomerRequest = req.body
        if (!(requestData.name && requestData.contactInfo)) {
          const errorResponse: ErrorResponse = {
            code: 'INVALID_REQUEST',
            message: 'Name and contact info are required',
          }
          return res.status(400).json(errorResponse)
        }

        // UseCase実行
        const input = mapCreateCustomerRequest(requestData)
        const result = await createCustomerUseCase(input, {
          customerRepository,
        })

        // レスポンス処理
        return match(result)
          .with({ type: 'ok' }, ({ value }) => {
            const response: CreateCustomerResponse =
              mapCustomerToResponse(value)
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

            const errorResponse: ErrorResponse =
              mapCreateCustomerUseCaseErrorToResponse(error)
            res.status(statusCode).json(errorResponse)
          })
          .exhaustive()
      } catch (error) {
        next(error)
      }
    }
  )

  /**
   * GET /customers/:id - Get customer
   * OpenAPI Operation: CustomerOperations_get
   */
  router.get(
    '/:id',
    async (
      req: Request<CustomerPathParams, GetCustomerResponse | ErrorResponse>,
      res: Response<GetCustomerResponse | ErrorResponse>,
      next
    ) => {
      try {
        // パスパラメータのバリデーション
        const idResult = customerIdSchema.safeParse(req.params.id)
        if (!idResult.success) {
          const errorResponse: ErrorResponse = {
            code: 'INVALID_ID',
            message: 'Invalid customer ID format',
          }
          return res.status(400).json(errorResponse)
        }

        const customerIdResult = createCustomerIdSafe(idResult.data)
        if (customerIdResult.type === 'err') {
          const errorResponse: ErrorResponse = {
            code: 'INVALID_ID',
            message: 'Invalid customer ID',
          }
          return res.status(400).json(errorResponse)
        }

        // UseCase実行
        const result = await getCustomerByIdUseCase(
          { id: customerIdResult.value },
          { customerRepository }
        )

        // レスポンス処理
        return match(result)
          .with({ type: 'ok' }, ({ value }) => {
            const response: GetCustomerResponse = mapCustomerToResponse(value)
            res.json(response)
          })
          .with({ type: 'err', error: { type: 'notFound' } }, () => {
            const errorResponse: ErrorResponse = {
              code: 'NOT_FOUND',
              message: 'Customer not found',
            }
            res.status(404).json(errorResponse)
          })
          .with({ type: 'err' }, () => {
            const errorResponse: ErrorResponse = {
              code: 'INTERNAL_ERROR',
              message: 'An error occurred',
            }
            res.status(500).json(errorResponse)
          })
          .exhaustive()
      } catch (error) {
        next(error)
      }
    }
  )

  /**
   * GET /customers/:id/profile - Get customer profile
   * OpenAPI Operation: CustomerOperations_getProfile
   */
  router.get(
    '/:id/profile',
    async (
      req: Request<
        CustomerPathParams,
        GetCustomerProfileResponse | ErrorResponse
      >,
      res: Response<GetCustomerProfileResponse | ErrorResponse>,
      next
    ) => {
      try {
        // パスパラメータのバリデーション
        const idResult = customerIdSchema.safeParse(req.params.id)
        if (!idResult.success) {
          const errorResponse: ErrorResponse = {
            code: 'INVALID_ID',
            message: 'Invalid customer ID format',
          }
          return res.status(400).json(errorResponse)
        }

        const customerIdResult = createCustomerIdSafe(idResult.data)
        if (customerIdResult.type === 'err') {
          const errorResponse: ErrorResponse = {
            code: 'INVALID_ID',
            message: 'Invalid customer ID',
          }
          return res.status(400).json(errorResponse)
        }

        // UseCase実行
        const result = await getCustomerProfileUseCase(
          { id: customerIdResult.value },
          { customerRepository }
        )

        // レスポンス処理
        return match(result)
          .with({ type: 'ok' }, ({ value }) => {
            const response: GetCustomerProfileResponse =
              mapCustomerProfileToResponse(value)
            res.json(response)
          })
          .with({ type: 'err', error: { type: 'notFound' } }, () => {
            const errorResponse: ErrorResponse = {
              code: 'NOT_FOUND',
              message: 'Customer not found',
            }
            res.status(404).json(errorResponse)
          })
          .with({ type: 'err' }, () => {
            const errorResponse: ErrorResponse = {
              code: 'INTERNAL_ERROR',
              message: 'An error occurred',
            }
            res.status(500).json(errorResponse)
          })
          .exhaustive()
      } catch (error) {
        next(error)
      }
    }
  )

  /**
   * PUT /customers/:id - Update customer
   * OpenAPI Operation: CustomerOperations_update
   */
  router.put(
    '/:id',
    async (
      req: Request<
        CustomerPathParams,
        UpdateCustomerResponse | ErrorResponse,
        UpdateCustomerRequest
      >,
      res: Response<UpdateCustomerResponse | ErrorResponse>,
      next
    ) => {
      try {
        // パスパラメータのバリデーション
        const idResult = customerIdSchema.safeParse(req.params.id)
        if (!idResult.success) {
          const errorResponse: ErrorResponse = {
            code: 'INVALID_ID',
            message: 'Invalid customer ID format',
          }
          return res.status(400).json(errorResponse)
        }

        const customerIdResult = createCustomerIdSafe(idResult.data)
        if (customerIdResult.type === 'err') {
          const errorResponse: ErrorResponse = {
            code: 'INVALID_ID',
            message: 'Invalid customer ID',
          }
          return res.status(400).json(errorResponse)
        }

        // UseCase実行
        const requestData: UpdateCustomerRequest = req.body
        const input = mapUpdateCustomerRequest(
          customerIdResult.value,
          requestData
        )
        const result = await updateCustomerUseCase(input, {
          customerRepository,
        })

        // レスポンス処理
        return match(result)
          .with({ type: 'ok' }, ({ value }) => {
            const response: UpdateCustomerResponse =
              mapCustomerToResponse(value)
            res.json(response)
          })
          .with({ type: 'err', error: { type: 'notFound' } }, () => {
            const errorResponse: ErrorResponse = {
              code: 'NOT_FOUND',
              message: 'Customer not found',
            }
            res.status(404).json(errorResponse)
          })
          .with({ type: 'err', error: { type: 'customerSuspended' } }, () => {
            const errorResponse: ErrorResponse = {
              code: 'CUSTOMER_SUSPENDED',
              message: 'Cannot update suspended customer',
            }
            res.status(409).json(errorResponse)
          })
          .with({ type: 'err' }, ({ error }) => {
            const statusCode = match(error.type)
              .with('notFound', 'customerNotFound', () => 404)
              .with('customerSuspended', () => 409)
              .with('duplicateEmail', () => 409)
              .with(
                'invalidEmail',
                'invalidPhoneNumber',
                'invalidName',
                () => 400
              )
              .with(
                'databaseError',
                'connectionError',
                'constraintViolation',
                () => 500
              )
              .otherwise(() => 400)

            const errorResponse: ErrorResponse =
              mapUpdateCustomerUseCaseErrorToResponse(error)
            res.status(statusCode).json(errorResponse)
          })
          .exhaustive()
      } catch (error) {
        next(error)
      }
    }
  )

  /**
   * DELETE /customers/:id - Delete customer
   * OpenAPI Operation: CustomerOperations_delete
   */
  router.delete(
    '/:id',
    async (req: Request<CustomerPathParams>, res: Response, next) => {
      try {
        // パスパラメータのバリデーション
        const idResult = customerIdSchema.safeParse(req.params.id)
        if (!idResult.success) {
          return res.status(400).json({
            code: 'INVALID_ID',
            message: 'Invalid customer ID format',
          })
        }

        const customerIdResult = createCustomerIdSafe(idResult.data)
        if (customerIdResult.type === 'err') {
          return res.status(400).json({
            code: 'INVALID_ID',
            message: 'Invalid customer ID',
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
              code: 'NOT_FOUND',
              message: 'Customer not found',
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

  return router
}
