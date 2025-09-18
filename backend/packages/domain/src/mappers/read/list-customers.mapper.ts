/**
 * List Customers Mapper (Read Operation)
 * Database Entities -> Domain Models -> API Response
 */

import type { customers } from '@beauty-salon-backend/database'
import type { components, operations } from '@beauty-salon-backend/generated'
import type { Customer, CustomerSearchResult } from '../../models/customer'
import type { Result } from '../../shared/result'
import { err, ok } from '../../shared/result'
import {
  mapGetCustomerDbToDomain,
  mapGetCustomerDomainToApi,
} from './get-customer.mapper'

// ============================================================================
// Type Definitions
// ============================================================================

type CustomerDb = typeof customers.$inferSelect
type CustomerApiResponse = components['schemas']['Models.Customer']
type ListCustomersParams =
  operations['CustomerOperations_list']['parameters']['query']
type ListCustomersResponse = {
  data: CustomerApiResponse[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}

// ============================================================================
// Query Parameters to Database Filter
// ============================================================================

export const mapListCustomersQueryToDbFilter = (
  params?: ListCustomersParams
): {
  where: Record<string, any>
  orderBy: Record<string, 'asc' | 'desc'>
  limit: number
  offset: number
} => {
  const where: Record<string, any> = {
    deletedAt: null, // Exclude soft-deleted records
  }

  // Add filters based on query parameters
  if (params?.search) {
    // Search in name, email, or phone
    where.OR = [
      { firstName: { contains: params.search, mode: 'insensitive' } },
      { lastName: { contains: params.search, mode: 'insensitive' } },
      { email: { contains: params.search, mode: 'insensitive' } },
      { phoneNumber: { contains: params.search } },
    ]
  }

  if (params?.tags && Array.isArray(params.tags)) {
    where.tags = { hasEvery: params.tags }
  }

  // Sorting - default to createdAt desc
  const orderBy: Record<string, 'asc' | 'desc'> = {
    createdAt: 'desc',
  }

  // Pagination
  const limit = Math.min(params?.limit ?? 20, 100) // Max 100 items per page
  const offset = params?.offset ?? 0

  return {
    where,
    orderBy,
    limit,
    offset,
  }
}

// ============================================================================
// Database to Domain Mapping (List)
// ============================================================================

export const mapListCustomersDbToDomain = (
  dbCustomers: CustomerDb[]
): Result<Customer[], string> => {
  const domainCustomers: Customer[] = []
  const errors: string[] = []

  for (const dbCustomer of dbCustomers) {
    const result = mapGetCustomerDbToDomain(dbCustomer)
    if (result.type === 'err') {
      errors.push(`Customer ${dbCustomer.id}: ${result.error}`)
      continue
    }
    domainCustomers.push(result.value)
  }

  if (errors.length > 0 && domainCustomers.length === 0) {
    return err(`Failed to map customers: ${errors.join('; ')}`)
  }

  return ok(domainCustomers)
}

// ============================================================================
// Domain to API Mapping (List)
// ============================================================================

export const mapListCustomersDomainToApi = (
  domainCustomers: Customer[]
): Result<CustomerApiResponse[], string> => {
  const apiCustomers: CustomerApiResponse[] = []
  const errors: string[] = []

  for (const domain of domainCustomers) {
    const result = mapGetCustomerDomainToApi(domain)
    if (result.type === 'err') {
      errors.push(`Customer ${domain.id}: ${result.error}`)
      continue
    }
    apiCustomers.push(result.value)
  }

  if (errors.length > 0 && apiCustomers.length === 0) {
    return err(`Failed to map to API: ${errors.join('; ')}`)
  }

  return ok(apiCustomers)
}

// ============================================================================
// Complete List Flow
// ============================================================================

export const listCustomersReadFlow = (
  dbCustomers: CustomerDb[],
  total: number,
  params?: ListCustomersParams
): Result<ListCustomersResponse, string> => {
  // Step 1: Database to Domain
  const domainResult = mapListCustomersDbToDomain(dbCustomers)
  if (domainResult.type === 'err') {
    return err(domainResult.error)
  }

  // Step 2: Domain to API
  const apiResult = mapListCustomersDomainToApi(domainResult.value)
  if (apiResult.type === 'err') {
    return err(apiResult.error)
  }

  // Step 3: Build response with pagination
  const limit = Math.min(params?.limit ?? 20, 100)
  const offset = params?.offset ?? 0
  const page = Math.floor(offset / limit) + 1
  const hasMore = offset + limit < total

  const response: ListCustomersResponse = {
    data: apiResult.value,
    total,
    page,
    limit,
    hasMore,
  }

  return ok(response)
}

// ============================================================================
// Search Customers Flow
// ============================================================================

export const searchCustomersReadFlow = (
  dbCustomers: CustomerDb[],
  searchParams: components['schemas']['Models.SearchCustomerRequest']
): Result<CustomerSearchResult, string> => {
  // If no customers found
  if (dbCustomers.length === 0) {
    return ok({
      type: 'empty',
      query: searchParams,
    })
  }

  // Map to domain
  const domainResult = mapListCustomersDbToDomain(dbCustomers)
  if (domainResult.type === 'err') {
    return ok({
      type: 'error',
      message: domainResult.error,
    })
  }

  // Return found customers
  return ok({
    type: 'found',
    customers: domainResult.value,
    total: dbCustomers.length,
    page: 1,
    limit: dbCustomers.length,
  })
}

// ============================================================================
// Helper Functions
// ============================================================================

export const buildSearchQuery = (
  params: components['schemas']['Models.SearchCustomerRequest']
): Record<string, any> => {
  const conditions: any[] = []

  // Search in multiple fields if search parameter is provided
  if (params.search) {
    conditions.push({
      OR: [
        { firstName: { contains: params.search, mode: 'insensitive' } },
        { lastName: { contains: params.search, mode: 'insensitive' } },
        { email: { contains: params.search, mode: 'insensitive' } },
        { phoneNumber: { contains: params.search } },
      ],
    })
  }

  if (params.tags && params.tags.length > 0) {
    conditions.push({ tags: { hasEvery: params.tags } })
  }

  return conditions.length > 0
    ? { AND: conditions, deletedAt: null }
    : { deletedAt: null }
}

export const calculatePagination = (
  total: number,
  page: number,
  limit: number
): {
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
  nextPage: number | null
  prevPage: number | null
} => {
  const totalPages = Math.ceil(total / limit)
  const hasNext = page < totalPages
  const hasPrev = page > 1

  return {
    totalPages,
    hasNext,
    hasPrev,
    nextPage: hasNext ? page + 1 : null,
    prevPage: hasPrev ? page - 1 : null,
  }
}
