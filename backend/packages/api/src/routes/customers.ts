/**
 * Customer API Routes
 * OpenAPI型定義を使用したAPI First開発
 */

import type { Request, Response } from 'express'
import { Router } from 'express'
import { match } from 'ts-pattern'
import { z } from 'zod'

import {
  type Customer,
  type CustomerRepository,
  createCustomerId,
  // Import API to domain mappers
  mapCreateCustomerRequestToDomain,
  // Import mappers from domain
  mapCustomerToApiResponse,
  mapCustomerToProfileResponse,
  mapCustomersToPaginatedResponse,
  mapUpdateCustomerRequestToDomain,
} from '@beauty-salon-backend/domain'
import type {
  CreateCustomerRequest,
  CreateCustomerResponse,
  CustomerPathParams,
  ErrorResponse,
  GetCustomerProfileResponse,
  GetCustomerResponse,
  ListCustomersResponse,
  UpdateCustomerRequest,
  UpdateCustomerResponse,
} from '../utils/openapi-types'

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

        // Repository call - use findAll with empty criteria for now
        const result = await customerRepository.findAll({})

        // レスポンス処理
        return match(result)
          .with({ type: 'ok' }, ({ value }) => {
            // Filter based on query parameters if provided
            let customers = value
            if (query.search) {
              const searchLower = query.search.toLowerCase()
              customers = customers.filter(
                (c) =>
                  c.name.toLowerCase().includes(searchLower) ||
                  c.contactInfo.email.toLowerCase().includes(searchLower)
              )
            }
            if (query.tags && query.tags.length > 0) {
              customers = customers.filter((c) =>
                query.tags?.some((tag) => c.tags.includes(tag))
              )
            }

            // Apply pagination
            const startIndex = paginationResult.data.offset
            const endIndex = startIndex + paginationResult.data.limit
            const paginatedCustomers = customers.slice(startIndex, endIndex)

            const response: ListCustomersResponse =
              mapCustomersToPaginatedResponse(
                paginatedCustomers,
                customers.length,
                paginationResult.data.limit,
                paginationResult.data.offset
              )
            res.json(response)
          })
          .with({ type: 'err' }, () => {
            const errorResponse: ErrorResponse = {
              code: 'DATABASE_ERROR',
              message: 'Failed to fetch customers',
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

        // Map request to domain model - the mapper expects CreateCustomerRequest which matches the API type
        const customerData = mapCreateCustomerRequestToDomain(requestData)

        // Generate a new ID
        const idResult = createCustomerId(crypto.randomUUID())
        if (idResult.type === 'err') {
          const errorResponse: ErrorResponse = {
            code: 'INTERNAL_ERROR',
            message: 'Failed to generate customer ID',
          }
          return res.status(500).json(errorResponse)
        }

        // Create full customer object
        const newCustomer: Customer = {
          ...customerData,
          id: idResult.value,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: 'system', // TODO: Get from auth context
          updatedBy: 'system', // TODO: Get from auth context
        }

        // Save through repository
        const result = await customerRepository.save(newCustomer)

        // レスポンス処理
        return match(result)
          .with({ type: 'ok' }, ({ value }) => {
            const response: CreateCustomerResponse =
              mapCustomerToApiResponse(value)
            res
              .status(201)
              .header('Location', `/customers/${value.id}`)
              .json(response)
          })
          .with({ type: 'err' }, () => {
            const errorResponse: ErrorResponse = {
              code: 'DATABASE_ERROR',
              message: 'Failed to create customer',
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

        const customerIdResult = createCustomerId(idResult.data)
        if (customerIdResult.type === 'err') {
          const errorResponse: ErrorResponse = {
            code: 'INVALID_ID',
            message: 'Invalid customer ID',
          }
          return res.status(400).json(errorResponse)
        }

        // Fetch from repository
        const result = await customerRepository.findById(customerIdResult.value)

        // レスポンス処理
        return match(result)
          .with({ type: 'ok' }, ({ value }) => {
            if (value == null) {
              const errorResponse: ErrorResponse = {
                code: 'NOT_FOUND',
                message: 'Customer not found',
              }
              res.status(404).json(errorResponse)
            } else {
              const response: GetCustomerResponse =
                mapCustomerToApiResponse(value)
              res.json(response)
            }
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

        const customerIdResult = createCustomerId(idResult.data)
        if (customerIdResult.type === 'err') {
          const errorResponse: ErrorResponse = {
            code: 'INVALID_ID',
            message: 'Invalid customer ID',
          }
          return res.status(400).json(errorResponse)
        }

        // Fetch customer from repository
        const result = await customerRepository.findById(customerIdResult.value)

        // レスポンス処理
        return match(result)
          .with({ type: 'ok' }, ({ value }) => {
            if (value == null) {
              const errorResponse: ErrorResponse = {
                code: 'NOT_FOUND',
                message: 'Customer not found',
              }
              res.status(404).json(errorResponse)
            } else {
              // TODO: Get stats from other repositories/services
              const stats = {
                totalBookings: 0,
                totalSpent: 0,
                lastVisit: undefined,
                favoriteServices: [],
              }
              const response: GetCustomerProfileResponse =
                mapCustomerToProfileResponse(value, stats)
              res.json(response)
            }
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

        const customerIdResult = createCustomerId(idResult.data)
        if (customerIdResult.type === 'err') {
          const errorResponse: ErrorResponse = {
            code: 'INVALID_ID',
            message: 'Invalid customer ID',
          }
          return res.status(400).json(errorResponse)
        }

        // First, fetch the existing customer
        const existingResult = await customerRepository.findById(
          customerIdResult.value
        )
        if (existingResult.type === 'err') {
          const errorResponse: ErrorResponse = {
            code: 'DATABASE_ERROR',
            message: 'Failed to fetch customer',
          }
          return res.status(500).json(errorResponse)
        }

        if (existingResult.value == null) {
          const errorResponse: ErrorResponse = {
            code: 'NOT_FOUND',
            message: 'Customer not found',
          }
          return res.status(404).json(errorResponse)
        }

        // Map request to partial domain model
        const requestData: UpdateCustomerRequest = req.body
        const updates = mapUpdateCustomerRequestToDomain(requestData)

        // Merge with existing customer
        const updatedCustomer: Customer = {
          ...existingResult.value,
          ...updates,
          updatedAt: new Date().toISOString(),
          updatedBy: 'system', // TODO: Get from auth context
        }

        // Update through repository
        const result = await customerRepository.update(
          customerIdResult.value,
          updatedCustomer
        )

        // レスポンス処理
        return match(result)
          .with({ type: 'ok' }, ({ value }) => {
            if (value == null) {
              const errorResponse: ErrorResponse = {
                code: 'NOT_FOUND',
                message: 'Customer not found',
              }
              res.status(404).json(errorResponse)
            } else {
              const response: UpdateCustomerResponse =
                mapCustomerToApiResponse(value)
              res.json(response)
            }
          })
          .with({ type: 'err' }, () => {
            const errorResponse: ErrorResponse = {
              code: 'DATABASE_ERROR',
              message: 'Failed to update customer',
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

        const customerIdResult = createCustomerId(idResult.data)
        if (customerIdResult.type === 'err') {
          return res.status(400).json({
            code: 'INVALID_ID',
            message: 'Invalid customer ID',
          })
        }

        // Delete through repository (logical deletion)
        const result = await customerRepository.delete(customerIdResult.value)

        // レスポンス処理
        return match(result)
          .with({ type: 'ok' }, () => {
            res.status(204).send()
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
