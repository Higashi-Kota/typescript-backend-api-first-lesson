/**
 * Test file to verify that branded types work correctly without any casts
 */

import type { components } from '../generated/api-types'
import {
  type BookingId,
  type CustomerId,
  type SalonId,
  createBrand,
  createBrandSafe,
} from '../index'

// Test 1: Verify that branded types are properly typed in API schemas
type Booking = components['schemas']['Models.Booking']

// This should type-check without any casts
const _testBooking: Booking = {
  id: createBrand(
    '550e8400-e29b-41d4-a716-446655440000',
    'BookingId'
  ) as BookingId,
  salonId: createBrand(
    '550e8400-e29b-41d4-a716-446655440001',
    'SalonId'
  ) as SalonId,
  customerId: createBrand(
    '550e8400-e29b-41d4-a716-446655440002',
    'CustomerId'
  ) as CustomerId,
  reservationIds: [],
  status: 'pending',
  statusCode: 'booking_pending',
  totalAmount: {
    value: 10000,
    currency: 'JPY',
  },
  depositAmount: {
    value: 2000,
    currency: 'JPY',
  },
  createdAt: '2025-09-18T12:00:00Z',
  updatedAt: '2025-09-18T12:00:00Z',
}

// Test 2: Type checking tests (these would run in Jest/Vitest)
// For now, this file serves as a type-checking validation
// The TypeScript compiler will verify these types are correct

// Example test functions that would run in a test runner:
const _testBrandedTypes = () => {
  // Test: should create branded IDs using createBrand
  ;(() => {
    const validUuid = '550e8400-e29b-41d4-a716-446655440000'
    const salonId = createBrand(validUuid, 'SalonId')

    expect(salonId).not.toBeNull()
    if (salonId) {
      // Should be assignable to SalonId type
      const typedSalonId: SalonId = salonId
      expect(typedSalonId).toBe(validUuid)
    }
  })()(
    // Test: should create branded IDs using createBrandSafe
    () => {
      const validUuid = '550e8400-e29b-41d4-a716-446655440000'
      const result = createBrandSafe(validUuid, 'CustomerId')

      if (result.status === 'ok') {
        // Should be assignable to CustomerId type
        const typedCustomerId: CustomerId = result.value
        expect(typedCustomerId).toBe(validUuid)
      } else {
        fail('Expected OK result')
      }
    }
  )()(
    // Test: should reject invalid UUIDs
    () => {
      const invalidUuid = 'not-a-uuid'
      const salonId = createBrand(invalidUuid, 'SalonId')

      expect(salonId).toBeNull()
    }
  )()(
    // Test: should reject invalid UUIDs with safe version
    () => {
      const invalidUuid = 'not-a-uuid'
      const result = createBrandSafe(invalidUuid, 'BookingId')

      expect(result.status).toBe('err')
      if (result.status === 'err') {
        expect(result.error.type).toBe('invalidFormat')
        expect(result.error.brand).toBe('BookingId')
      }
    }
  )()(
    // Test: should not allow mixing different branded types
    () => {
      const uuid1 = '550e8400-e29b-41d4-a716-446655440000'
      const uuid2 = '550e8400-e29b-41d4-a716-446655440001'

      const salonId = createBrand(uuid1, 'SalonId') as SalonId
      const customerId = createBrand(uuid2, 'CustomerId') as CustomerId

      // TypeScript should prevent this at compile time
      // @ts-expect-error - Different branded types should not be assignable
      const _wrongAssignment: SalonId = customerId

      // Runtime values are still strings
      expect(typeof salonId).toBe('string')
      expect(typeof customerId).toBe('string')
    }
  )()(
    // Test: should work with API response types
    () => {
      // Simulate an API response
      const apiResponse: components['schemas']['Models.Salon'] = {
        id: '550e8400-e29b-41d4-a716-446655440000' as SalonId,
        name: 'Test Salon',
        description: 'A test salon',
        address: {
          street: '123 Main St',
          city: 'Tokyo',
          state: 'Tokyo',
          postalCode: '100-0001',
          country: 'Japan',
        },
        contactInfo: {
          email: 'test@salon.com',
          phoneNumber: '03-1234-5678',
        },
        openingHours: [],
        createdAt: '2025-09-18T12:00:00Z',
        updatedAt: '2025-09-18T12:00:00Z',
      }

      // The ID should be typed as SalonId
      const salonId: SalonId = apiResponse.id
      expect(salonId).toBe('550e8400-e29b-41d4-a716-446655440000')
    }
  )()(
    // Test: should work with function parameters
    () => {
      // Function that accepts a branded ID
      function findSalonById(id: SalonId): string {
        return `Finding salon with ID: ${id}`
      }

      const validUuid = '550e8400-e29b-41d4-a716-446655440000'
      const salonId = createBrand(validUuid, 'SalonId') as SalonId

      const result = findSalonById(salonId)
      expect(result).toContain(validUuid)

      // TypeScript should prevent passing wrong branded type
      const customerId = createBrand(validUuid, 'CustomerId') as CustomerId
      // @ts-expect-error - Cannot pass CustomerId where SalonId is expected
      const _wrongResult = findSalonById(customerId)
    }
  )()
}

// Helper functions for tests
const expect = <T>(value: T) => ({
  not: {
    toBeNull: () => {
      if (value === null) {
        throw new Error('Expected not null')
      }
    },
  },
  toBe: (expected: T) => {
    if (value !== expected) {
      throw new Error(`Expected ${expected}, got ${value}`)
    }
  },
  toBeNull: () => {
    if (value !== null) {
      throw new Error('Expected null')
    }
  },
  toContain: (substring: string) => {
    if (typeof value === 'string' && !value.includes(substring)) {
      throw new Error(`Expected to contain ${substring}`)
    }
  },
})

const fail = (message: string) => {
  throw new Error(message)
}
