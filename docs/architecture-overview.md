# Beauty Salon Backend Architecture Overview

## Table of Contents
1. [Architecture Principles](#architecture-principles)
2. [System Layers](#system-layers)
3. [Data Flow](#data-flow)
4. [Directory Structure](#directory-structure)
5. [Package Dependencies](#package-dependencies)
6. [Type Generation Pipeline](#type-generation-pipeline)
7. [Implementation Patterns](#implementation-patterns)
8. [Domain Models](#domain-models)
9. [Build and Development](#build-and-development)

## Architecture Principles

### 1. API-First Development
- **Single Source of Truth**: TypeSpec definitions in `/specs`
- **Type Generation**: TypeSpec → OpenAPI → TypeScript
- **Contract-Driven**: API contracts define system boundaries
- **Auto-generated Types**: No manual type definitions for API entities

### 2. Clean Architecture Layers
```
┌─────────────────────────────────────────┐
│           API Layer (Express)           │ ← HTTP handlers, routing
├─────────────────────────────────────────┤
│      Use Case Layer (Business Logic)    │ ← Orchestration, workflows
├─────────────────────────────────────────┤
│        Domain Layer (Pure Logic)        │ ← Business rules, entities
├─────────────────────────────────────────┤
│   Infrastructure Layer (External I/O)   │ ← Database, email, storage
└─────────────────────────────────────────┘
```

### 3. Type Safety Patterns
- **Sum Types**: Discriminated unions for state management
- **Pattern Matching**: ts-pattern for exhaustive handling
- **Result Types**: No exceptions, all errors as data
- **Brand Types**: Type-safe IDs prevent mixing

### 4. Dependency Rules
- Dependencies point inward (outer layers depend on inner)
- Domain layer has no external dependencies
- Use interfaces for dependency inversion
- Repository pattern for data access abstraction

## System Layers

### Domain Layer (`/backend/packages/domain`)
**Purpose**: Core business logic and rules

**Components**:
- **Models**: Sum type domain entities
- **Business Logic**: Use cases and workflows
- **Mappers**: Type transformation (Write/Read)
- **Repositories**: Interface definitions only

**Key Files**:
```
domain/
├── src/
│   ├── models/              # Domain entities
│   │   ├── customer.ts     # Customer model with sum types
│   │   ├── salon.ts        # Salon model with business rules
│   │   ├── staff.ts        # Staff model
│   │   ├── service.ts      # Service model
│   │   ├── reservation.ts  # Reservation model
│   │   ├── booking.ts      # Booking aggregate
│   │   └── review.ts       # Review model
│   ├── business-logic/      # Use case implementations
│   │   ├── create-customer.usecase.ts
│   │   ├── update-customer.usecase.ts
│   │   └── [entity]-[action].usecase.ts
│   ├── mappers/
│   │   ├── write/          # API → Domain → DB transformations
│   │   │   ├── create-customer.mapper.ts
│   │   │   ├── update-customer.mapper.ts
│   │   │   └── create-salon.mapper.ts
│   │   └── read/           # DB → Domain → API transformations
│   │       ├── get-customer.mapper.ts
│   │       ├── list-customers.mapper.ts
│   │       └── get-salon.mapper.ts
│   ├── repositories/       # Repository interfaces
│   │   ├── customer.repository.ts
│   │   ├── salon.repository.ts
│   │   └── [entity].repository.ts
│   └── shared/             # Shared utilities
│       ├── result.ts       # Result type for error handling
│       ├── brand.ts        # Brand type utility
│       └── index.ts
```

### Infrastructure Layer (`/backend/packages/infrastructure`)
**Purpose**: External service integrations

**Components**:
- **Repository Implementations**: Database access
- **Services**: Email, storage, monitoring
- **Adapters**: Third-party integrations

**Key Files**:
```
infrastructure/
├── src/
│   ├── repositories/       # Concrete implementations
│   │   ├── customer.repository.impl.ts
│   │   ├── salon.repository.impl.ts
│   │   └── [entity].repository.impl.ts
│   ├── services/
│   │   ├── email/         # Email service
│   │   │   ├── email.factory.ts
│   │   │   ├── email-wrapper.service.ts
│   │   │   └── providers/
│   │   ├── storage/       # File storage
│   │   │   ├── storage.factory.ts
│   │   │   └── providers/
│   │   ├── jwt.service.ts
│   │   ├── metrics.service.ts
│   │   └── sentry.service.ts
│   └── config/
│       └── index.ts
```

### API Layer (`/backend/packages/api`)
**Purpose**: HTTP interface and request handling

**Components**:
- **Routes**: Express route definitions
- **Middleware**: Auth, validation, rate limiting
- **Error Handling**: Global error handler
- **OpenAPI**: Documentation generation

**Key Files**:
```
api/
├── src/
│   ├── routes/             # API endpoint handlers
│   │   ├── customers.ts   # Customer endpoints
│   │   ├── salons.ts      # Salon endpoints
│   │   ├── auth.ts        # Authentication endpoints
│   │   └── [entity].ts
│   ├── middleware/
│   │   ├── auth.middleware.ts
│   │   ├── validation.middleware.ts
│   │   ├── error-handler.ts
│   │   └── rate-limiter.ts
│   ├── utils/
│   │   ├── openapi-types.ts
│   │   └── structured-logger.ts
│   └── index.ts           # Express app setup
```

## Data Flow

### Write Operations (Create/Update)
```
HTTP Request
    ↓
[API Layer]
  - Route Handler
  - Validation Middleware
    ↓
[Domain Layer]
  - Use Case (business-logic/)
  - Write Mapper: API → Domain
  - Business Rules Validation
  - Write Mapper: Domain → DB
    ↓
[Infrastructure Layer]
  - Repository Implementation
  - Database Transaction
    ↓
[Domain Layer]
  - Read Mapper: DB → Domain → API
    ↓
HTTP Response
```

### Read Operations (Get/List)
```
HTTP Request
    ↓
[API Layer]
  - Route Handler
    ↓
[Domain Layer]
  - Use Case
    ↓
[Infrastructure Layer]
  - Repository Implementation
  - Database Query
    ↓
[Domain Layer]
  - Read Mapper: DB → Domain → API
    ↓
HTTP Response
```

## Directory Structure

### Complete Project Structure
```
typescript-backend-api-first-lesson/
├── specs/                      # TypeSpec API definitions
│   ├── main.tsp               # Entry point
│   ├── models/                # Data models
│   │   ├── customer.tsp
│   │   ├── salon.tsp
│   │   ├── staff.tsp
│   │   ├── service.tsp
│   │   ├── reservation.tsp
│   │   ├── booking.tsp
│   │   └── review.tsp
│   └── operations/            # API operations
│       ├── customer-operations.tsp
│       ├── salon-operations.tsp
│       └── [entity]-operations.tsp
│
├── backend/                    # Backend monorepo
│   ├── packages/              # Shared packages
│   │   ├── config/           # Configuration management
│   │   ├── database/         # Database schemas
│   │   ├── generated/        # Auto-generated types
│   │   ├── domain/           # Business logic
│   │   ├── infrastructure/   # External services
│   │   ├── api/              # HTTP layer
│   │   └── test-utils/       # Testing utilities
│   └── apps/
│       └── server/           # Express server
│
├── frontend/                   # Frontend applications
├── docs/                      # Documentation
├── docker-compose.yml         # Local development
├── Makefile                   # Build commands
└── CLAUDE.md                  # Development guidelines
```

## Package Dependencies

### Dependency Graph
```
┌──────────┐
│  specs   │ (TypeSpec definitions)
└────┬─────┘
     ↓ generates
┌──────────┐
│generated │ (TypeScript types)
└────┬─────┘
     ↓ imports
┌──────────┐
│  domain  │ (Business logic)
└────┬─────┘
     ↓ implements
┌──────────────┐
│infrastructure│ (Services)
└──────┬───────┘
       ↓ uses
┌──────────┐
│   api    │ (HTTP handlers)
└────┬─────┘
     ↓ served by
┌──────────┐
│  server  │ (Express app)
└──────────┘
```

### Package.json Exports Configuration
Each package uses rslib for building with proper subpath exports:

```json
{
  "name": "@beauty-salon-backend/domain",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./models": {
      "import": "./dist/models/index.js",
      "types": "./dist/models/index.d.ts"
    },
    "./mappers": {
      "import": "./dist/mappers/index.js",
      "types": "./dist/mappers/index.d.ts"
    },
    "./business-logic": {
      "import": "./dist/business-logic/index.js",
      "types": "./dist/business-logic/index.d.ts"
    }
  }
}
```

## Type Generation Pipeline

### 1. Define API Contract (TypeSpec)
```typescript
// specs/models/customer.tsp
@doc("Customer entity for the beauty salon system")
model Customer {
  @doc("Unique identifier")
  id: CustomerId;

  @doc("Customer full name")
  name: string;

  @doc("Contact information")
  contactInfo: ContactInfo;

  @doc("Customer preferences")
  preferences?: string;

  @doc("Loyalty points balance")
  loyaltyPoints: int32 = 0;
}
```

### 2. Generate OpenAPI
```bash
pnpm generate:spec
# Output: specs/tsp-output/@typespec/openapi3/openapi.yaml
```

### 3. Generate TypeScript Types
```bash
pnpm generate:backend
# Output: backend/packages/generated/src/generated/api-types.ts
```

### 4. Use in Domain Model
```typescript
// backend/packages/domain/src/models/customer.ts
import type { components } from '@beauty-salon-backend/generated'
import type { Brand } from '../shared/brand'

// Brand the ID for type safety
export type CustomerId = Brand<components['schemas']['Models.CustomerId'], 'CustomerId'>

// Extend generated type
export interface Customer extends Omit<components['schemas']['Models.Customer'], 'id'> {
  id: CustomerId
}

// Sum types for state management
export type CustomerState =
  | { type: 'active'; customer: Customer }
  | { type: 'inactive'; customer: Customer; reason: string }
  | { type: 'suspended'; customer: Customer; until: string }
  | { type: 'deleted'; customerId: CustomerId; deletedAt: string }
```

## Implementation Patterns

### 1. Domain Model Pattern
```typescript
// Sum type for state management
export type EntityState =
  | { type: 'active'; entity: Entity }
  | { type: 'inactive'; reason: string }
  | { type: 'deleted'; deletedAt: string }

// Operation result type
export type OperationResult =
  | { type: 'success'; data: Entity }
  | { type: 'validationError'; errors: ValidationError[] }
  | { type: 'notFound'; id: string }
  | { type: 'businessRuleViolation'; rule: string; message: string }
  | { type: 'systemError'; message: string }

// Pattern matching for exhaustive handling
const handleState = (state: EntityState): string => {
  return match(state)
    .with({ type: 'active' }, () => 'Entity is active')
    .with({ type: 'inactive' }, ({ reason }) => `Inactive: ${reason}`)
    .with({ type: 'deleted' }, ({ deletedAt }) => `Deleted at ${deletedAt}`)
    .exhaustive()
}
```

### 2. Mapper Pattern (Write)
```typescript
// API Request → Domain Model
export const mapCreateApiToDomain = (
  request: CreateCustomerRequest
): Result<Partial<Customer>, ValidationError[]> => {
  const errors: ValidationError[] = []

  // Validate required fields
  if (!request.name) {
    errors.push({ field: 'name', message: 'Required', code: 'required' })
  }

  if (errors.length > 0) return err(errors)

  return ok({
    name: request.name.trim(),
    contactInfo: request.contactInfo,
    createdAt: new Date().toISOString()
  })
}

// Domain Model → Database Entity
export const mapCreateDomainToDb = (
  domain: Partial<Customer>
): Result<CustomerDbInsert, string> => {
  return ok({
    firstName: domain.name?.split(' ')[0] ?? '',
    lastName: domain.name?.split(' ').slice(1).join(' ') ?? '',
    email: domain.contactInfo?.email ?? '',
    phoneNumber: domain.contactInfo?.phoneNumber ?? '',
    createdAt: domain.createdAt ?? new Date().toISOString()
  })
}
```

### 3. Mapper Pattern (Read)
```typescript
// Database Entity → Domain Model
export const mapDbToDomain = (
  db: CustomerDb
): Result<Customer, string> => {
  return ok({
    id: db.id as CustomerId,
    name: `${db.firstName} ${db.lastName}`.trim(),
    contactInfo: {
      email: db.email,
      phoneNumber: db.phoneNumber
    },
    loyaltyPoints: db.loyaltyPoints,
    createdAt: db.createdAt
  })
}

// Domain Model → API Response
export const mapDomainToApi = (
  domain: Customer
): Result<CustomerApiResponse, string> => {
  return ok({
    id: domain.id,
    name: domain.name,
    contactInfo: domain.contactInfo,
    loyaltyPoints: domain.loyaltyPoints,
    createdAt: domain.createdAt
  })
}
```

### 4. Use Case Pattern
```typescript
export class CreateCustomerUseCase {
  constructor(
    private readonly customerRepo: CustomerRepository,
    private readonly emailService: EmailService
  ) {}

  async execute(
    request: CreateCustomerRequest
  ): Promise<Result<Customer, CustomerOperationResult>> {
    // 1. Map and validate
    const domainResult = mapCreateApiToDomain(request)
    if (domainResult.type === 'err') {
      return err({ type: 'validationError', errors: domainResult.error })
    }

    // 2. Check duplicates
    const emailCheck = await this.customerRepo.findByEmail(request.contactInfo.email)
    if (emailCheck.type === 'ok' && emailCheck.value) {
      return err({ type: 'duplicateEmail', email: request.contactInfo.email })
    }

    // 3. Map to database
    const dbResult = mapCreateDomainToDb(domainResult.value)
    if (dbResult.type === 'err') {
      return err({ type: 'systemError', message: dbResult.error })
    }

    // 4. Save to database
    const saveResult = await this.customerRepo.create(dbResult.value)
    if (saveResult.type === 'err') {
      return err({ type: 'systemError', message: 'Failed to save' })
    }

    // 5. Send welcome email (non-blocking)
    this.emailService.sendWelcome(saveResult.value.email).catch(console.error)

    // 6. Map back to domain
    return mapDbToDomain(saveResult.value)
  }
}
```

### 5. Repository Pattern
```typescript
// Interface in domain layer
export interface CustomerRepository {
  findById(id: CustomerId): Promise<Result<CustomerDbEntity | null, RepositoryError>>
  findByEmail(email: string): Promise<Result<CustomerDbEntity | null, RepositoryError>>
  create(data: CustomerDbInsert): Promise<Result<CustomerDbEntity, RepositoryError>>
  update(id: CustomerId, data: CustomerDbUpdate): Promise<Result<CustomerDbEntity, RepositoryError>>
  softDelete(id: CustomerId): Promise<Result<void, RepositoryError>>
}

// Implementation in infrastructure layer
export class CustomerRepositoryImpl implements CustomerRepository {
  constructor(private readonly db: DrizzleClient) {}

  async findById(id: CustomerId): Promise<Result<CustomerDbEntity | null, RepositoryError>> {
    try {
      const result = await this.db
        .select()
        .from(customers)
        .where(eq(customers.id, id))
        .limit(1)

      return ok(result[0] ?? null)
    } catch (error) {
      return err({ type: 'databaseError', message: String(error) })
    }
  }

  async create(data: CustomerDbInsert): Promise<Result<CustomerDbEntity, RepositoryError>> {
    try {
      const [result] = await this.db
        .insert(customers)
        .values(data)
        .returning()

      return ok(result!)
    } catch (error) {
      return err({ type: 'databaseError', message: String(error) })
    }
  }
}
```

## Domain Models

### Customer Model
- **State Management**: Active, Inactive, Suspended, Deleted
- **Operations**: Create, Update, Merge, Delete, Restore
- **Events**: Created, Updated, Merged, StatusChanged
- **Business Rules**: Email uniqueness, phone validation, age restrictions

### Salon Model
- **State Management**: Active, Suspended, Inactive, Pending
- **Operations**: Create, Update, Suspend, Activate
- **Business Rules**: Operating hours validation, capacity calculation
- **Features**: Dynamic feature management, schedule conflict detection

### Staff Model
- **State Management**: Available, Busy, OffDuty, OnLeave
- **Operations**: Create, Update, Schedule, Assign
- **Business Rules**: Availability checking, skill matching

### Service Model
- **Categories**: Hair, Nail, Facial, Body, Special
- **Pricing**: Dynamic pricing, discounts, packages
- **Duration**: Service time calculation, buffer time

### Reservation Model
- **State Management**: Pending, Confirmed, Cancelled, Completed, NoShow
- **Operations**: Create, Confirm, Cancel, Reschedule
- **Business Rules**: Availability checking, conflict detection

### Booking Model (Aggregate)
- **Composition**: Multiple reservations + payment
- **State Management**: Draft, Confirmed, Paid, Completed
- **Operations**: Add reservation, Remove reservation, Process payment

### Review Model
- **Ratings**: Service quality, staff performance, overall experience
- **Moderation**: Pending, Approved, Rejected, Flagged
- **Analytics**: Rating aggregation, sentiment analysis

## Build and Development

### Development Commands
```bash
# Type generation pipeline
pnpm generate              # Run all generation steps
pnpm generate:spec         # TypeSpec → OpenAPI
pnpm generate:backend      # OpenAPI → TypeScript

# Build commands
pnpm build                 # Development build
pnpm build:prod           # Production build with optimization

# Quality checks
pnpm typecheck            # TypeScript type checking
pnpm lint                 # ESLint/Biome linting
pnpm format:fix           # Auto-format code

# Testing
pnpm test                 # Unit tests with Vitest
pnpm test:integration     # Integration tests
pnpm test:e2e            # End-to-end tests

# Development
pnpm dev                  # Start development server
pnpm dev:services         # Start Docker services
```

### Package-specific Commands
```bash
# Domain package
cd backend/packages/domain
pnpm build:prod           # Build with rslib
pnpm typecheck            # Check types
pnpm test                 # Run domain tests

# Infrastructure package
cd backend/packages/infrastructure
pnpm build:prod           # Build with rslib
pnpm test:integration     # Test with testcontainers

# API package
cd backend/packages/api
pnpm build:prod           # Build with rslib
pnpm test:e2e            # API endpoint tests
```

### Verification Commands
```bash
# Verify all packages build correctly
pnpm --filter ./backend/packages/config \
     --filter ./backend/packages/database \
     --filter ./backend/packages/generated \
     --filter ./backend/packages/domain \
     --filter ./backend/packages/infrastructure \
     --filter ./backend/packages/api \
     -r run build:prod

# Run all quality checks
pnpm --filter ./backend/packages/* \
     -r run format:fix

pnpm --filter ./backend/packages/* \
     -r run typecheck
```

## Key Design Decisions

### 1. TypeSpec over Manual OpenAPI
- Better developer experience
- Type-safe by design
- Easier to maintain
- Framework agnostic

### 2. Sum Types for State
- Compile-time exhaustiveness
- Self-documenting states
- Impossible states unrepresentable
- Pattern matching elegance

### 3. Result Types for Errors
- No exceptions thrown
- Errors as first-class values
- Type-safe error propagation
- Better error context

### 4. Separate Write/Read Mappers
- Clear data flow
- Validation at boundaries
- Flexibility in evolution
- CQRS-ready architecture

### 5. Repository Pattern
- Database abstraction
- Easy testing with mocks
- Transaction support
- Migration flexibility

## Migration Path

### From Old Architecture
1. **Models**: Previously hand-written → Now generated from TypeSpec
2. **Use Cases**: Previously in separate package → Now in domain/business-logic
3. **Mappers**: Previously mixed → Now split into Write/Read
4. **Services**: Previously scattered → Now in infrastructure/services
5. **Types**: Previously duplicated → Now single source in generated

### Migration Steps
1. ✅ Define all models in TypeSpec
2. ✅ Generate OpenAPI and TypeScript types
3. ✅ Implement Customer model as template
4. ✅ Create mappers for Customer operations
5. 🔄 Implement remaining models (Salon, Staff, Service, etc.)
6. ⏳ Refactor infrastructure package
7. ⏳ Refactor API package
8. ⏳ Final verification and cleanup

## Testing Strategy

### Unit Tests
- Domain logic (models, business rules)
- Mappers (transformations)
- Use cases (workflows)
- Pure functions

### Integration Tests
- Repository implementations
- Service integrations
- Database operations
- External API calls

### E2E Tests
- Complete API flows
- Authentication flows
- Transaction scenarios
- Error handling

## Performance Considerations

### Optimization Points
- Database query optimization
- Connection pooling
- Caching strategy (Redis)
- Response compression
- Lazy loading

### Monitoring
- Request/response times
- Database query performance
- Error rates
- Resource utilization

## Security Measures

### Input Validation
- TypeSpec schema validation
- Zod runtime validation
- SQL injection prevention
- XSS protection

### Authentication & Authorization
- JWT tokens
- Role-based access
- API key management
- Rate limiting

### Data Protection
- Encryption at rest
- Encryption in transit
- PII handling
- Audit logging

## Future Enhancements

### Planned Features
- GraphQL API layer
- WebSocket support
- Event sourcing
- CQRS implementation
- Microservices split

### Scalability Preparations
- Horizontal scaling ready
- Database sharding points
- Cache layer design
- Message queue integration

## References

- [TypeScript Configuration](./typescript-configuration.md)
- [Testing Requirements](./testing-requirements.md)
- [Development Workflow](./development-workflow.md)
- [API Type Rules](./typespec-api-type-rules.md)
- [Database Mapping](./db-type-constraints-mapping.md)
- [Backend Guidelines](./backend-architecture-guidelines.md)