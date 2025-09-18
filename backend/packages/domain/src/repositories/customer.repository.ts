/**
 * Customer Repository Interface
 *
 * Domain layer repository interface for customer operations
 * Implementation is done in Infrastructure layer
 * Uses Result types for error handling
 */

import type { customers } from '@beauty-salon-backend/database'
import type { CustomerId } from '../models/customer'
import type { Result } from '../shared/result'

// Database entity type
export type CustomerDbEntity = typeof customers.$inferSelect

// Repository error types
export type CustomerRepositoryError =
  | { type: 'notFound'; id: string }
  | { type: 'databaseError'; message: string }
  | { type: 'connectionError'; message: string }
  | { type: 'transactionError'; message: string }

// Search parameters
export type CustomerSearchParams = {
  limit: number
  offset: number
  search?: string // Search in name, email, phone
  tags?: string[]
  membershipTier?: string
  isActive?: boolean
  salonId?: string
  includeDeleted?: boolean
  sortBy?: 'createdAt' | 'updatedAt' | 'name' | 'loyaltyPoints'
  sortOrder?: 'asc' | 'desc'
}

// Database insert/update types (from mappers)
export type CustomerDbInsert = typeof customers.$inferInsert

export type CustomerDbUpdate = Partial<CustomerDbInsert>

/**
 * Customer Repository Interface
 * All methods return Result types for error handling
 */
export interface CustomerRepository {
  // Basic CRUD operations

  /**
   * Find customer by ID
   * Returns null if not found
   */
  findById(
    id: CustomerId
  ): Promise<Result<CustomerDbEntity | null, CustomerRepositoryError>>

  /**
   * Find customer by email
   * Returns null if not found
   */
  findByEmail(
    email: string
  ): Promise<Result<CustomerDbEntity | null, CustomerRepositoryError>>

  /**
   * Find customer by phone number
   * Returns null if not found
   */
  findByPhone(
    phoneNumber: string
  ): Promise<Result<CustomerDbEntity | null, CustomerRepositoryError>>

  /**
   * Find customer by referral code
   * Returns null if not found
   */
  findByReferralCode(
    code: string
  ): Promise<Result<CustomerDbEntity | null, CustomerRepositoryError>>

  /**
   * Create a new customer
   * Returns created entity with generated ID
   */
  create(
    data: CustomerDbInsert
  ): Promise<Result<CustomerDbEntity, CustomerRepositoryError>>

  /**
   * Update an existing customer
   * Returns updated entity
   */
  update(
    id: CustomerId,
    data: CustomerDbUpdate
  ): Promise<Result<CustomerDbEntity, CustomerRepositoryError>>

  /**
   * Soft delete a customer (set deletedAt)
   */
  softDelete(id: CustomerId): Promise<Result<void, CustomerRepositoryError>>

  /**
   * Hard delete a customer (physical deletion)
   */
  hardDelete(id: CustomerId): Promise<Result<void, CustomerRepositoryError>>

  // Search and listing

  /**
   * Search customers with filtering and pagination
   * Returns list of entities matching criteria
   */
  search(
    params: CustomerSearchParams
  ): Promise<Result<CustomerDbEntity[], CustomerRepositoryError>>

  /**
   * Count customers matching search criteria
   * Used for pagination total count
   */
  count(
    params: CustomerSearchParams
  ): Promise<Result<number, CustomerRepositoryError>>

  /**
   * Find all customers with pagination
   * Convenience method for listing without filters
   */
  findAll(
    limit: number,
    offset: number
  ): Promise<Result<CustomerDbEntity[], CustomerRepositoryError>>

  // Batch operations

  /**
   * Find customers by multiple IDs
   * Returns all found entities (may be less than requested)
   */
  findByIds(
    ids: CustomerId[]
  ): Promise<Result<CustomerDbEntity[], CustomerRepositoryError>>

  /**
   * Find customers by salon ID
   * Used for salon-specific customer lists
   */
  findBySalonId(
    salonId: string,
    limit: number,
    offset: number
  ): Promise<Result<CustomerDbEntity[], CustomerRepositoryError>>

  // Statistics and aggregation

  /**
   * Count by membership tier
   * Returns counts grouped by tier
   */
  countByMembershipTier(): Promise<
    Result<
      Record<'regular' | 'silver' | 'gold' | 'platinum' | 'vip', number>,
      CustomerRepositoryError
    >
  >

  /**
   * Check if email exists (for duplicate checking)
   */
  emailExists(
    email: string,
    excludeId?: CustomerId
  ): Promise<Result<boolean, CustomerRepositoryError>>

  /**
   * Check if phone exists (for duplicate checking)
   */
  phoneExists(
    phoneNumber: string,
    excludeId?: CustomerId
  ): Promise<Result<boolean, CustomerRepositoryError>>

  // Transaction support

  /**
   * Execute operations in a transaction
   * Automatically rolls back on error
   */
  withTransaction<T>(
    fn: (
      repo: CustomerRepository
    ) => Promise<Result<T, CustomerRepositoryError>>
  ): Promise<Result<T, CustomerRepositoryError>>
}
