# Type Generation System

This document describes the TypeSpec → OpenAPI → TypeScript type generation pipeline as defined in the Clean Architecture.

## Overview

The type generation system follows API-First development principles with TypeSpec as the single source of truth for all API contracts.

## Architecture

```
TypeSpec (Single Source of Truth)
    ↓ tsp compile
OpenAPI (specs/tsp-output/@typespec/openapi3/openapi.yaml)
    ↓ openapi-typescript
TypeScript Types (@beauty-salon-backend/generated)
    ↓
Domain Models & Use Cases
```

## Type Generation Pipeline

### 1. Define API Contracts in TypeSpec

Location: `/specs`

```typespec
// specs/models/customer.tsp
model Customer {
  id: CustomerId;
  name: string;
  email: string;
  contactInfo: ContactInfo;
  loyaltyPoints: int32 = 0;
}
```

### 2. Generate OpenAPI Specification

```bash
pnpm generate:spec
# Output: specs/tsp-output/@typespec/openapi3/openapi.yaml
```

### 3. Generate TypeScript Types

```bash
pnpm generate:backend
# Output: backend/packages/generated/src/generated/api-types.ts
```

### 4. Use Generated Types in Domain Layer

```typescript
// backend/packages/domain/src/models/customer.ts
import type { components } from '@beauty-salon-backend/generated'

// Use generated types as base
type ApiCustomer = components['schemas']['Models.Customer']

// Extend with domain logic
export type CustomerState =
  | { type: 'active'; customer: Customer }
  | { type: 'inactive'; customer: Customer; reason: string }
  | { type: 'suspended'; customer: Customer; until: string }
```

## Package Structure

### Generated Package (`/backend/packages/generated`)

```
generated/
├── src/
│   ├── generated/
│   │   └── api-types.ts  # Auto-generated types
│   └── index.ts          # Re-exports
├── scripts/
│   └── generate-types.ts # Generation script
└── package.json
```

### Generation Script

Location: `backend/packages/generated/scripts/generate-types.ts`

The script:
1. Reads OpenAPI specification from `specs/tsp-output`
2. Uses `openapi-typescript` to generate TypeScript types
3. Outputs to `src/generated/api-types.ts`

## Mapper Pattern

The architecture uses separate Write and Read mappers to transform data between layers:

### Write Mapper (API → Domain → DB)

```typescript
// backend/packages/domain/src/mappers/write/create-customer.mapper.ts
import type { components } from '@beauty-salon-backend/generated'
import type { Result } from '../../shared/result'

export const mapCreateApiToDomain = (
  request: components['schemas']['Models.CreateCustomerRequest']
): Result<CreateCustomerCommand, ValidationError[]> => {
  // Validate and transform API request to domain command
  return ok({
    name: request.name.trim(),
    email: request.email,
    contactInfo: request.contactInfo
  })
}

export const mapCreateDomainToDb = (
  command: CreateCustomerCommand
): DatabaseInsert => {
  // Transform domain command to database format
  return {
    first_name: command.name.split(' ')[0],
    last_name: command.name.split(' ').slice(1).join(' '),
    email: command.email,
    created_at: new Date()
  }
}
```

### Read Mapper (DB → Domain → API)

```typescript
// backend/packages/domain/src/mappers/read/get-customer.mapper.ts
export const mapDbToDomain = (
  record: CustomerDbRecord
): Result<Customer, MappingError> => {
  // Transform database record to domain model
  return ok({
    id: record.id as CustomerId,
    name: `${record.first_name} ${record.last_name}`,
    email: record.email,
    contactInfo: {
      email: record.email,
      phoneNumber: record.phone_number
    }
  })
}

export const mapDomainToApi = (
  customer: Customer
): components['schemas']['Models.Customer'] => {
  // Transform domain model to API response
  return {
    id: customer.id,
    name: customer.name,
    email: customer.email,
    contactInfo: customer.contactInfo,
    loyaltyPoints: customer.loyaltyPoints
  }
}
```

## Commands

### Full Generation Pipeline

```bash
# Generate everything (TypeSpec → OpenAPI → Types)
pnpm generate

# Generate only OpenAPI from TypeSpec
pnpm generate:spec

# Generate only TypeScript types from OpenAPI
pnpm generate:backend
```

### Package-specific Commands

```bash
# In specs package
cd specs
pnpm compile           # Generate OpenAPI

# In generated package
cd backend/packages/generated
pnpm generate         # Generate TypeScript types
```

## Best Practices

### 1. Never Edit Generated Files

All files in `backend/packages/generated/src/generated/` are auto-generated and should never be manually edited.

### 2. Always Regenerate After TypeSpec Changes

When modifying TypeSpec definitions:
1. Update `.tsp` files in `/specs`
2. Run `pnpm generate` to regenerate all types
3. Fix any TypeScript compilation errors
4. Commit both TypeSpec changes and generated files

### 3. Use DB-Driven Types

```typescript
// Types are inferred from database schemas
import type { Customer, NewCustomer } from '@beauty-salon-backend/database'

// Domain model extends DB types
type DomainCustomer = Customer & {
  readonly fullName: string
  readonly isActive: boolean
}
```

### 4. Result Types for Error Handling

```typescript
// Never throw exceptions
export const createCustomer = async (
  request: CreateCustomerRequest
): Promise<Result<Customer, CreateCustomerError>> => {
  // Always return Result type
  return ok(customer) // or err(error)
}
```

## Troubleshooting

### Issue: Types not updating after TypeSpec changes

Solution:
```bash
# Clean and regenerate
rm -rf specs/tsp-output
rm -rf backend/packages/generated/src/generated
pnpm generate
```

### Issue: TypeScript compilation errors after generation

Common causes:
1. Breaking changes in TypeSpec models
2. Mapper functions need updating
3. Use cases need adjustment

Solution:
1. Review generated types in `api-types.ts`
2. Update mappers to match new types
3. Fix use case implementations

### Issue: Namespace mismatch

Ensure correct namespaces:
- Backend: `@beauty-salon-backend/*`
- Frontend: `@beauty-salon-frontend/*`
- Specs: `@beauty-salon/specs`

## Related Documentation

- [Architecture Overview](./architecture-overview.md)
- [TypeSpec API Type Rules](./typespec-api-type-rules.md)
- [Backend Architecture Guidelines](./backend-architecture-guidelines.md)