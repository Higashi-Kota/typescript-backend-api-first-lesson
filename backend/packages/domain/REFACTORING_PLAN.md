# Domain Package Refactoring Plan

## Overview

This document outlines the comprehensive refactoring strategy for the `@beauty-salon-backend/domain` package to align with TypeSpec-generated types and the new architecture requirements.

## Core Principles

1. **All types from generated package**: No manual type definitions - use `@beauty-salon-backend/generated`
2. **Sum types everywhere**: Use discriminated unions for all state representations
3. **Pattern matching**: Use `ts-pattern` with exhaustive matching for all branching logic
4. **Result types**: All operations return `Result<T, E>` - no exceptions
5. **Mapper organization**: Split by Write/Read and organized per API operation
6. **Business logic separation**: Use cases in `business-logic/` folder

## Directory Structure

```
backend/packages/domain/
├── src/
│   ├── models/                    # Domain models using Sum types
│   │   ├── customer.ts
│   │   ├── salon.ts
│   │   ├── booking.ts
│   │   ├── reservation.ts
│   │   ├── service.ts
│   │   ├── staff.ts
│   │   ├── review.ts
│   │   ├── user.ts
│   │   ├── attachment.ts
│   │   ├── payment.ts
│   │   ├── inventory.ts
│   │   ├── medical-chart.ts
│   │   ├── permission.ts
│   │   └── index.ts
│   │
│   ├── mappers/
│   │   ├── write/                 # Write operations (API → Domain → DB)
│   │   │   ├── api-to-domain/
│   │   │   │   ├── customer/
│   │   │   │   │   ├── create-customer.mapper.ts
│   │   │   │   │   ├── update-customer.mapper.ts
│   │   │   │   │   └── index.ts
│   │   │   │   ├── salon/
│   │   │   │   ├── booking/
│   │   │   │   └── ...
│   │   │   │
│   │   │   └── domain-to-db/
│   │   │       ├── customer/
│   │   │       │   ├── create-customer.mapper.ts
│   │   │       │   ├── update-customer.mapper.ts
│   │   │       │   └── index.ts
│   │   │       └── ...
│   │   │
│   │   ├── read/                  # Read operations (DB → Domain → API)
│   │   │   ├── db-to-domain/
│   │   │   │   ├── customer/
│   │   │   │   │   ├── get-customer.mapper.ts
│   │   │   │   │   ├── list-customers.mapper.ts
│   │   │   │   │   └── index.ts
│   │   │   │   └── ...
│   │   │   │
│   │   │   └── domain-to-api/
│   │   │       ├── customer/
│   │   │       │   ├── get-customer.mapper.ts
│   │   │       │   ├── list-customers.mapper.ts
│   │   │       │   └── index.ts
│   │   │       └── ...
│   │   │
│   │   └── utils/
│   │       ├── date.helper.ts
│   │       ├── json.helper.ts
│   │       └── index.ts
│   │
│   ├── business-logic/            # Business logic/use cases
│   │   ├── customer/
│   │   │   ├── create-customer.usecase.ts
│   │   │   ├── update-customer.usecase.ts
│   │   │   ├── get-customer.usecase.ts
│   │   │   ├── list-customers.usecase.ts
│   │   │   ├── delete-customer.usecase.ts
│   │   │   ├── merge-customers.usecase.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── booking/
│   │   │   ├── create-booking.usecase.ts
│   │   │   ├── cancel-booking.usecase.ts
│   │   │   ├── update-booking.usecase.ts
│   │   │   ├── process-payment.usecase.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── reservation/
│   │   ├── salon/
│   │   ├── staff/
│   │   ├── service/
│   │   ├── review/
│   │   ├── auth/
│   │   ├── inventory/
│   │   ├── payment/
│   │   └── index.ts
│   │
│   ├── repositories/              # Repository interfaces
│   │   ├── customer.repository.ts
│   │   ├── salon.repository.ts
│   │   ├── booking.repository.ts
│   │   └── ...
│   │
│   ├── services/                  # Domain services interfaces
│   │   ├── email.service.ts
│   │   ├── storage.service.ts
│   │   └── index.ts
│   │
│   └── shared/                    # Shared utilities
│       ├── result.ts
│       ├── errors.ts
│       ├── pagination.ts
│       ├── brand.ts
│       └── index.ts
```

## Implementation Steps

### Phase 1: Domain Models (Priority: HIGH)

#### Customer Model Example
```typescript
// src/models/customer.ts
import type { components } from '@beauty-salon-backend/generated'
import type { Result } from '../shared/result'
import { match } from 'ts-pattern'

// Use generated types directly
export type Customer = components['schemas']['Models.Customer']
export type CustomerId = components['schemas']['Models.CustomerId']
export type CreateCustomerRequest = components['schemas']['Models.CreateCustomerRequest']
export type UpdateCustomerRequest = components['schemas']['Models.UpdateCustomerRequest']

// Domain-specific Sum types for business logic
export type CustomerState =
  | { type: 'active' }
  | { type: 'inactive'; reason: string; since: Date }
  | { type: 'suspended'; reason: string; until?: Date }
  | { type: 'deleted'; deletedAt: Date }
  | { type: 'blacklisted'; reason: string; since: Date }

export type CustomerAction =
  | { type: 'create'; data: CreateCustomerRequest }
  | { type: 'update'; id: CustomerId; data: UpdateCustomerRequest }
  | { type: 'suspend'; id: CustomerId; reason: string; until?: Date }
  | { type: 'reactivate'; id: CustomerId }
  | { type: 'delete'; id: CustomerId }
  | { type: 'blacklist'; id: CustomerId; reason: string }
```

### Phase 2: Mappers (Priority: HIGH)

#### Write Mapper Example
```typescript
// src/mappers/write/api-to-domain/customer/create-customer.mapper.ts
import type { paths } from '@beauty-salon-backend/generated'
import type { Customer } from '../../../../models/customer'
import type { Result } from '../../../../shared/result'
import { ok, err } from '../../../../shared/result'
import { match } from 'ts-pattern'

type CreateCustomerRequest = paths['/api/v1/customers']['post']['requestBody']['content']['application/json']
type CreateCustomerDomain = Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>

export const mapCreateCustomerRequestToDomain = (
  request: CreateCustomerRequest
): Result<CreateCustomerDomain, { type: 'validation'; fields: string[] }> => {
  // Validation and mapping logic
  return ok({
    ...request,
    status: { type: 'active' },
    loyaltyPoints: 0,
    membershipInfo: undefined,
    isActive: true
  } as CreateCustomerDomain)
}
```

#### Read Mapper Example
```typescript
// src/mappers/read/domain-to-api/customer/get-customer.mapper.ts
import type { paths } from '@beauty-salon-backend/generated'
import type { Customer } from '../../../../models/customer'
import { match } from 'ts-pattern'

type GetCustomerResponse = paths['/api/v1/customers/{id}']['get']['responses']['200']['content']['application/json']

export const mapCustomerToGetResponse = (
  customer: Customer
): GetCustomerResponse => {
  return customer as GetCustomerResponse
}
```

### Phase 3: Business Logic/Use Cases (Priority: HIGH)

#### Use Case Example
```typescript
// src/business-logic/customer/create-customer.usecase.ts
import type { paths } from '@beauty-salon-backend/generated'
import type { CustomerRepository } from '../../repositories/customer.repository'
import type { Result } from '../../shared/result'
import { ok, err } from '../../shared/result'
import { match } from 'ts-pattern'
import { mapCreateCustomerRequestToDomain } from '../../mappers/write/api-to-domain/customer/create-customer.mapper'
import { mapCustomerToDB } from '../../mappers/write/domain-to-db/customer/create-customer.mapper'

type CreateCustomerRequest = paths['/api/v1/customers']['post']['requestBody']['content']['application/json']
type CreateCustomerResponse = paths['/api/v1/customers']['post']['responses']['201']['content']['application/json']

export type CreateCustomerError =
  | { type: 'validation'; fields: string[] }
  | { type: 'conflict'; message: string }
  | { type: 'internal'; message: string }

export class CreateCustomerUseCase {
  constructor(
    private readonly customerRepository: CustomerRepository
  ) {}

  async execute(
    request: CreateCustomerRequest
  ): Promise<Result<CreateCustomerResponse, CreateCustomerError>> {
    // 1. Map API request to domain
    const domainResult = mapCreateCustomerRequestToDomain(request)
    if (domainResult.type === 'err') {
      return err(domainResult.error)
    }

    // 2. Business logic validations
    const emailCheck = await this.customerRepository.findByEmail(request.contactInfo.email)
    if (emailCheck.type === 'ok' && emailCheck.value != null) {
      return err({ type: 'conflict', message: 'Email already exists' })
    }

    // 3. Save to database
    const dbModel = mapCustomerToDB(domainResult.value)
    const saveResult = await this.customerRepository.save(dbModel)

    return match(saveResult)
      .with({ type: 'ok' }, ({ value }) => ok(value as CreateCustomerResponse))
      .with({ type: 'err' }, ({ error }) =>
        err({ type: 'internal', message: error.message })
      )
      .exhaustive()
  }
}
```

### Phase 4: Repository Interfaces (Priority: MEDIUM)

```typescript
// src/repositories/customer.repository.ts
import type { components } from '@beauty-salon-backend/generated'
import type { Result } from '../shared/result'
import type { PaginatedResult, PaginationParams } from '../shared/pagination'

type Customer = components['schemas']['Models.Customer']
type CustomerId = components['schemas']['Models.CustomerId']

export type CustomerRepositoryError =
  | { type: 'notFound'; id: CustomerId }
  | { type: 'conflict'; field: string; value: string }
  | { type: 'database'; message: string; code?: string }

export interface CustomerRepository {
  findById(id: CustomerId): Promise<Result<Customer, CustomerRepositoryError>>
  findByEmail(email: string): Promise<Result<Customer | null, CustomerRepositoryError>>
  save(customer: Customer): Promise<Result<Customer, CustomerRepositoryError>>
  update(id: CustomerId, updates: Partial<Customer>): Promise<Result<Customer, CustomerRepositoryError>>
  delete(id: CustomerId): Promise<Result<void, CustomerRepositoryError>>
  search(criteria: CustomerSearchCriteria, pagination: PaginationParams): Promise<Result<PaginatedResult<Customer>, CustomerRepositoryError>>
}
```

## Models to Implement

Based on TypeSpec analysis, the following models need implementation:

### Core Models (Priority: HIGH)
1. **Customer** - Complex model with membership, health info, preferences
2. **Salon** - Business entity with locations, services, staff
3. **Booking** - Transaction aggregating reservations
4. **Reservation** - Individual service appointments
5. **Service** - Service catalog with pricing
6. **Staff** - Staff members with availability
7. **User** - Authentication and authorization
8. **Review** - Customer feedback system

### Supporting Models (Priority: MEDIUM)
1. **Payment** - Payment processing and records
2. **Attachment** - File management
3. **Inventory** - Stock management
4. **MedicalChart** - Customer health records
5. **Permission** - Access control

### Additional Models (Priority: LOW)
1. **Point** - Loyalty point system
2. **PurchaseOrder** - Inventory purchasing
3. **Sales** - Sales reporting

## Operations to Map

Based on TypeSpec operations analysis:

### Customer Operations
- `POST /api/v1/customers` - Create customer
- `GET /api/v1/customers` - List customers
- `GET /api/v1/customers/{id}` - Get customer
- `GET /api/v1/customers/{id}/profile` - Get customer profile
- `PUT /api/v1/customers/{id}` - Update customer
- `DELETE /api/v1/customers/{id}` - Delete customer
- `GET /api/v1/customers/{id}/reservations` - Get customer reservations
- `GET /api/v1/customers/{id}/bookings` - Get customer bookings
- `POST /api/v1/customers/merge` - Merge customers

### Booking Operations
- `POST /api/v1/bookings` - Create booking
- `GET /api/v1/bookings` - List bookings
- `GET /api/v1/bookings/{id}` - Get booking
- `PUT /api/v1/bookings/{id}` - Update booking
- `POST /api/v1/bookings/{id}/cancel` - Cancel booking
- `POST /api/v1/bookings/{id}/process-payment` - Process payment
- `POST /api/v1/bookings/{id}/add-reservation` - Add reservation to booking

### Reservation Operations
- `POST /api/v1/reservations` - Create reservation
- `GET /api/v1/reservations` - List reservations
- `GET /api/v1/reservations/{id}` - Get reservation
- `PUT /api/v1/reservations/{id}` - Update reservation
- `POST /api/v1/reservations/{id}/cancel` - Cancel reservation
- `POST /api/v1/reservations/{id}/reschedule` - Reschedule reservation

### Additional operations for other entities...

## Migration Strategy

### Step 1: Keep existing code running
- Don't delete existing implementations immediately
- Create new implementations alongside old ones

### Step 2: Implement new structure
1. Create new domain models importing from generated types
2. Implement mappers per operation
3. Create use cases in business-logic folder
4. Update repository interfaces

### Step 3: Switch over
1. Update API layer to use new use cases
2. Test thoroughly
3. Remove old implementations

### Step 4: Clean up
- Remove unused code following YAGNI principles
- Remove duplicate type definitions
- Consolidate utilities

## Testing Strategy

For each use case:
1. **Happy path** - Standard successful flow
2. **Validation errors** - Invalid input handling
3. **Business rule violations** - Domain logic enforcement
4. **Repository errors** - Database failure handling
5. **Edge cases** - Boundary conditions

Example test structure:
```typescript
describe('CreateCustomerUseCase', () => {
  it('should create customer successfully', async () => {
    // Arrange
    const request: CreateCustomerRequest = { /* ... */ }

    // Act
    const result = await useCase.execute(request)

    // Assert
    expect(result).toMatchObject({
      type: 'ok',
      value: expect.objectContaining({ /* ... */ })
    })
  })

  it('should return validation error for invalid email', async () => {
    // Test validation error case
  })

  it('should return conflict error for duplicate email', async () => {
    // Test business rule violation
  })

  // ... more test cases
})
```

## Success Criteria

1. ✅ All types imported from `@beauty-salon-backend/generated`
2. ✅ All business logic uses Sum types and pattern matching
3. ✅ All operations return Result types
4. ✅ Mappers organized by Write/Read and operation
5. ✅ Use cases in business-logic folder
6. ✅ Repository interfaces updated
7. ✅ No unused code (YAGNI)
8. ✅ All tests passing
9. ✅ Zero TypeScript errors
10. ✅ Zero lint warnings

## Timeline Estimate

- **Phase 1 (Models)**: 2-3 days
- **Phase 2 (Mappers)**: 3-4 days
- **Phase 3 (Use Cases)**: 4-5 days
- **Phase 4 (Repositories)**: 2-3 days
- **Testing & Cleanup**: 2-3 days

**Total**: ~2-3 weeks for complete refactoring

## Notes

- Start with Customer entity as it's the most complex
- Implement incrementally - one entity at a time
- Keep old code running until new implementation is tested
- Follow strict TypeScript configuration
- Use exhaustive pattern matching everywhere
- Document complex business rules in code comments