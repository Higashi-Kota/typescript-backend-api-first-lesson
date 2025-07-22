/**
 * Test helpers for Customer use case tests
 */

import type {
  CustomerId,
  CustomerRepository,
} from '@beauty-salon-backend/domain'
import { createCustomerId } from '@beauty-salon-backend/domain'
import { vi } from 'vitest'

/**
 * Creates a mock CustomerRepository with all required methods
 */
export const createMockCustomerRepository = (
  overrides?: Partial<CustomerRepository>
): CustomerRepository => {
  return {
    findById: vi.fn(),
    findByEmail: vi.fn(),
    save: vi.fn(),
    delete: vi.fn(),
    search: vi.fn(),
    findAll: vi.fn(),
    findByIds: vi.fn(),
    findByTags: vi.fn(),
    count: vi.fn(),
    countByMembershipLevel: vi.fn(),
    withTransaction: vi.fn(),
    ...overrides,
  }
}

/**
 * Creates a CustomerId from a UUID string, throwing if creation fails
 * This helper avoids the need for non-null assertions in tests
 */
export const createTestCustomerId = (uuid: string): CustomerId => {
  const id = createCustomerId(uuid)
  if (!id) {
    throw new Error(`Failed to create CustomerId from UUID: ${uuid}`)
  }
  return id
}
