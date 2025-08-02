/**
 * Customer API Routes
 * OpenAPIで生成された型を使用したAPI実装
 */

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
  mapCustomerListToResponse,
  mapCustomerProfileToResponse,
  mapCustomerToResponse,
  mapUpdateCustomerRequest,
  updateCustomerUseCase,
} from '@beauty-salon-backend/usecase'

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
      const result = await listCustomersUseCase(
        {
          search: req.query.search as string | undefined,
          tags: req.query.tags as string[] | undefined,
          limit: paginationResult.data.limit,
          offset: paginationResult.data.offset,
        },
        { customerRepository }
      )

      // レスポンス処理
      return match(result)
        .with({ type: 'ok' }, ({ value }) => {
          res.json(mapCustomerListToResponse(value))
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
   * POST /customers - Create customer
   */
  router.post('/', async (req, res, next) => {
    try {
      // リクエストボディの基本的な検証
      if (!(req.body.name && req.body.contactInfo)) {
        return res.status(400).json({
          code: 'INVALID_REQUEST',
          message: 'Name and contact info are required',
        })
      }

      // UseCase実行
      const input = mapCreateCustomerRequest(req.body)
      const result = await createCustomerUseCase(input, { customerRepository })

      // レスポンス処理
      return match(result)
        .with({ type: 'ok' }, ({ value }) => {
          res
            .status(201)
            .header('Location', `/customers/${value.data.id}`)
            .json(mapCustomerToResponse(value))
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

          res.status(statusCode).json(createCustomerErrorResponse(error))
        })
        .exhaustive()
    } catch (error) {
      next(error)
    }
  })

  /**
   * GET /customers/:id - Get customer
   */
  router.get('/:id', async (req, res, next) => {
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

      // UseCase実行
      const result = await getCustomerByIdUseCase(
        { id: customerIdResult.value },
        { customerRepository }
      )

      // レスポンス処理
      return match(result)
        .with({ type: 'ok' }, ({ value }) => {
          res.json(mapCustomerToResponse(value))
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
  })

  /**
   * GET /customers/:id/profile - Get customer profile
   */
  router.get('/:id/profile', async (req, res, next) => {
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

      // UseCase実行
      const result = await getCustomerProfileUseCase(
        { id: customerIdResult.value },
        { customerRepository }
      )

      // レスポンス処理
      return match(result)
        .with({ type: 'ok' }, ({ value }) => {
          res.json(mapCustomerProfileToResponse(value))
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
  })

  /**
   * PUT /customers/:id - Update customer
   */
  router.put('/:id', async (req, res, next) => {
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

      // UseCase実行
      const input = mapUpdateCustomerRequest(customerIdResult.value, req.body)
      const result = await updateCustomerUseCase(input, { customerRepository })

      // レスポンス処理
      return match(result)
        .with({ type: 'ok' }, ({ value }) => {
          res.json(mapCustomerToResponse(value))
        })
        .with({ type: 'err', error: { type: 'notFound' } }, () => {
          res.status(404).json({
            code: 'NOT_FOUND',
            message: 'Customer not found',
          })
        })
        .with({ type: 'err', error: { type: 'customerSuspended' } }, () => {
          res.status(409).json({
            code: 'CUSTOMER_SUSPENDED',
            message: 'Cannot update suspended customer',
          })
        })
        .with({ type: 'err' }, ({ error }) => {
          res.status(400).json(createCustomerErrorResponse(error))
        })
        .exhaustive()
    } catch (error) {
      next(error)
    }
  })

  /**
   * DELETE /customers/:id - Delete customer
   */
  router.delete('/:id', async (req, res, next) => {
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
  })

  return router
}
