# Beauty Salon Backend Architecture Overview

## Table of Contents
1. [Architecture Principles](#architecture-principles)
2. [System Layers](#system-layers)
3. [Data Flow](#data-flow)
4. [Directory Structure](#directory-structure)
5. [Package Dependencies](#package-dependencies)
6. [Type Generation Pipeline](#type-generation-pipeline)
7. [Implementation Patterns](#implementation-patterns)
8. [Current Implementation Examples](#current-implementation-examples)
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
│           API Layer (Express)           │ ← HTTP handlers, routing, Zod validation
├─────────────────────────────────────────┤
│      Domain Layer (Business Logic)      │ ← Use cases, mappers, business rules
├─────────────────────────────────────────┤
│   Infrastructure Layer (External I/O)   │ ← Repository implementations, Drizzle
├─────────────────────────────────────────┤
│        Database Layer (Schemas)         │ ← Drizzle schemas as source of truth
└─────────────────────────────────────────┘
```

### 3. Type Safety Patterns
- **DB-Driven Models**: Drizzle `$inferSelect` and `$inferInsert` as source of truth
- **Branded Types**: For entity IDs (e.g., `SalonId`, `CustomerId`)
- **Result Types**: `Result<T, E>` for all error handling (no exceptions)
- **Pattern Matching**: ts-pattern for exhaustive handling of Results and sum types
- **Separate Mappers**: Write (API→DB) and Read (DB→API) transformations

### 4. Dependency Rules
- Dependencies point inward (outer layers depend on inner)
- Domain layer defines repository interfaces
- Infrastructure layer implements repositories
- API layer orchestrates use cases with pattern matching

## System Layers

### Domain Layer (`/backend/packages/domain`)
**Purpose**: Core business logic and rules

**Components**:
- **Models**: Branded types and API/DB type definitions
- **Business Logic**: Use cases with Result type patterns
- **Mappers**: Separate Write (API→DB) and Read (DB→API) mappers
- **Repositories**: Interface definitions only (implemented in infrastructure)
- **Shared**: Errors, pagination, and validators

**Key Files** (Salon Implementation):
```
domain/
├── src/
│   ├── models/
│   │   └── salon.ts        # Branded SalonId, API/DB type imports
│   ├── business-logic/
│   │   ├── salon/          # Salon use cases
│   │   │   ├── create-salon.usecase.ts
│   │   │   ├── get-salon.usecase.ts
│   │   │   ├── update-salon.usecase.ts
│   │   │   ├── delete-salon.usecase.ts
│   │   │   ├── list-salons.usecase.ts
│   │   │   ├── search-salons.usecase.ts
│   │   │   └── _shared/base-salon.usecase.ts
│   │   └── _shared/validators/  # Shared validation logic
│   ├── mappers/
│   │   ├── write/
│   │   │   └── salon.mapper.ts  # API requests → DB inserts
│   │   └── read/
│   │       └── salon.mapper.ts  # DB selects → API responses
│   ├── repositories/
│   │   └── salon.repository.ts  # ISalonRepository interface
│   └── shared/
│       ├── errors.ts       # DomainErrors factory
│       ├── pagination.ts   # Pagination utilities
│       └── index.ts
```

### Infrastructure Layer (`/backend/packages/infrastructure`)
**Purpose**: External service integrations and repository implementations

**Components**:
- **Repository Implementations**: Drizzle-based database access with Result types
- **Database Connection**: Centralized database connection management
- **Services**: Email, storage, monitoring (planned)

**Key Files** (Current Implementation):
```
infrastructure/
├── src/
│   ├── repositories/
│   │   └── salon.repository.impl.ts  # SalonRepository with Drizzle + Result types
│   ├── database/
│   │   ├── connection.ts            # Database connection setup
│   │   └── index.ts                # Export database client
│   └── index.ts                    # Export all implementations
```

**Repository Pattern Example**:
- Implements domain repository interfaces
- Uses Drizzle ORM for database operations
- Returns `Result<T, DomainError>` types (no exceptions)
- Supports transactions for related data operations

### API Layer (`/backend/packages/api`)
**Purpose**: HTTP interface and request handling

**Components**:
- **Routes**: Express route definitions with typed handlers
- **Validation**: Zod `z.custom<T>()` for TypeSpec-generated types
- **Pattern Matching**: ts-pattern for exhaustive Result handling
- **Error Handling**: Problem Details format for standardized errors

**Key Files** (Current Implementation):
```
api/
├── src/
│   ├── routes/
│   │   └── salon.routes.ts         # Complete CRUD operations
│   └── index.ts                   # Express app setup
```

**Route Handler Pattern**:
- Type-safe request/response handlers using generated types
- Zod validation with `z.custom<T>()` pattern
- ts-pattern for exhaustive Result matching
- Problem Details format for all errors
- Standardized response structure with meta/links

## Data Flow

### Write Operations (Create/Update) - Actual Implementation
```
HTTP POST /salons
    ↓
[API Layer: salon.routes.ts]
  - Express RequestHandler with typed parameters
  - Zod validation: z.custom<CreateSalonRequest>().safeParse()
  - Pattern matching on validation result
    ↓
  Result<CreateSalonRequest, ValidationError>
    ↓
[Domain Layer: CreateSalonUseCase]
  - Business validation (email uniqueness, etc.)
  - Write Mapper: API request → DB insert data
  - Repository.create() with transaction for related data
    ↓
[Infrastructure Layer: SalonRepository]
  - Drizzle transaction for salon + opening hours
  - Returns Result<DbSalon, DomainError>
    ↓
[Domain Layer: Read Mapper]
  - DB entity → API response (SalonReadMapper.toApiSalon)
  - Add metadata and links
    ↓
[API Layer: Response]
  - ts-pattern exhaustive matching on Result
  - Problem Details for errors, structured response for success
```

### Read Operations (Get/List) - Actual Implementation
```
HTTP GET /salons/:id
    ↓
[API Layer: salon.routes.ts]
  - Extract typed path parameters
  - No validation needed for simple get
    ↓
[Domain Layer: GetSalonUseCase]
  - Repository.findById() call
    ↓
[Infrastructure Layer: SalonRepository]
  - Drizzle query with soft delete check
  - Returns Result<DbSalon | null, DomainError>
    ↓
[Domain Layer: Read Mapper]
  - DB entity → API response if found
    ↓
[API Layer: Response]
  - ts-pattern matching: success → 200, error → Problem Details
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
│   │   └── api/              # HTTP layer
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
import type { Customer as DbCustomer } from '@beauty-salon-backend/database'
import type { components } from '@beauty-salon-backend/generated'

// DB-driven domain model with computed properties
export type Customer = DbCustomer & {
  readonly fullName: string
  readonly isActive: boolean
  readonly canReserve: boolean
}

// Factory to create domain model from DB
export const createCustomerModel = (dbCustomer: DbCustomer): Customer => {
  return {
    ...dbCustomer,
    get fullName() {
      return `${dbCustomer.firstName} ${dbCustomer.lastName}`.trim()
    },
    get isActive() {
      return dbCustomer.state === 'active'
    },
    get canReserve() {
      return dbCustomer.state === 'active' && dbCustomer.loyaltyPoints >= 0
    }
  }
}
```

## Current Implementation Examples

### 1. Salon Domain - Complete CRUD Implementation

The salon domain demonstrates all established patterns working together. Here are the key implementation examples:

#### Model Definition (Domain Models)
```typescript
// backend/packages/domain/src/models/salon.ts
import type { openingHours, salons } from '@beauty-salon-backend/database'
import type { components, operations } from '@beauty-salon-backend/generated'
import type { Brand, DeepRequired } from '@beauty-salon-backend/utility'

// Branded type for type safety
export const salonIdBrand: unique symbol = Symbol('SalonId')
export type SalonId = Brand<string, typeof salonIdBrand>
export function toSalonID(raw: string): SalonId {
  return raw as SalonId
}

// DB-driven types from Drizzle schemas
export type DbSalon = DeepRequired<typeof salons.$inferSelect>
export type DbNewSalon = DeepRequired<Omit<typeof salons.$inferInsert, 'id'>>

// API types from TypeSpec generation
export type ApiSalon = components['schemas']['Models.Salon']
export type ApiCreateSalonRequest = components['schemas']['Models.CreateSalonRequest']
```

#### Write Mapper (API → DB)
```typescript
// backend/packages/domain/src/mappers/write/salon.mapper.ts
export const SalonWriteMapper = {
  fromCreateRequest(request: ApiCreateSalonRequest): {
    salon: DbNewSalon
    openingHours: DbNewOpeningHours[]
  } {
    const salon: DbNewSalon = {
      name: request.name,
      description: request.description,
      postalCode: request.address.postalCode,
      prefecture: request.address.prefecture,
      city: request.address.city,
      address: request.address.street,
      phoneNumber: request.contactInfo.phoneNumber,
      email: request.contactInfo.email,
      websiteUrl: request.contactInfo.websiteUrl,
      // ... all required fields mapped exactly to DB columns
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    const openingHours = request.openingHours.map(oh =>
      this.mapOpeningHours(oh, '')
    )

    return { salon, openingHours }
  }
}
```

#### Read Mapper (DB → API)
```typescript
// backend/packages/domain/src/mappers/read/salon.mapper.ts
export const SalonReadMapper = {
  toApiSalon(dbSalon: DbSalon, openingHours: DbOpeningHours[] = []): ApiSalon {
    return {
      id: dbSalon.id,
      name: dbSalon.name,
      description: dbSalon.description,
      address: this.toApiAddress(dbSalon),
      contactInfo: this.toApiContactInfo(dbSalon),
      openingHours: openingHours.map(oh => this.toApiOpeningHours(oh)),
      businessHours: dbSalon.businessHours as ApiSalon['businessHours'],
      imageUrls: Array.isArray(dbSalon.imageUrls) ? dbSalon.imageUrls as string[] : [],
      rating: dbSalon.rating ? Number.parseFloat(dbSalon.rating) : null,
      createdAt: dbSalon.createdAt,
      updatedAt: dbSalon.updatedAt,
    }
  }
}
```

#### Use Case with Result Types
```typescript
// backend/packages/domain/src/business-logic/salon/create-salon.usecase.ts
export class CreateSalonUseCase extends BaseSalonUseCase {
  async execute(
    request: ApiCreateSalonRequest
  ): Promise<Result<ApiSalon, DomainError>> {

    // 1. Validate request
    const validation = this.validate(request)
    if (Result.isError(validation)) {
      return validation
    }

    // 2. Check business rules (email uniqueness)
    const emailExists = await this.repository.existsByEmail(request.contactInfo.email)
    if (Result.isError(emailExists)) {
      return emailExists
    }
    if (emailExists.data) {
      return Result.error(
        DomainErrors.alreadyExists('Salon', 'email', request.contactInfo.email)
      )
    }

    // 3. Map and create
    const { salon, openingHours } = SalonWriteMapper.fromCreateRequest(request)
    const createResult = await this.repository.create(
      { ...salon, id: toSalonID(createId()) },
      openingHours
    )
    if (Result.isError(createResult)) {
      return createResult
    }

    // 4. Get related data and return mapped result
    const openingHoursResult = await this.repository.findOpeningHours(
      toSalonID(createResult.data.id)
    )
    const apiSalon = SalonReadMapper.toApiSalon(
      createResult.data,
      Result.isSuccess(openingHoursResult) ? openingHoursResult.data : []
    )

    return Result.success(apiSalon)
  }
}
```

#### Repository Implementation with Drizzle
```typescript
// backend/packages/infrastructure/src/repositories/salon.repository.impl.ts
export class SalonRepository implements ISalonRepository {
  constructor(private readonly db: Database) {}

  async create(
    salon: DbSalon,
    openingHoursData?: DbNewOpeningHours[]
  ): Promise<Result<DbSalon, DomainError>> {
    try {
      const result = await this.db.transaction(async (tx) => {
        const inserted = await tx.insert(salons).values(salon).returning()
        const insertedSalon = inserted[0]

        if (openingHoursData && openingHoursData.length > 0) {
          const openingHoursWithSalonId = openingHoursData.map(oh => ({
            ...oh,
            salonId: insertedSalon.id,
          }))
          await tx.insert(openingHours).values(openingHoursWithSalonId)
        }

        return insertedSalon
      })

      return Result.success(result)
    } catch (error) {
      return Result.error(
        DomainErrors.database(
          'Failed to create salon',
          error instanceof Error ? error.message : error
        )
      )
    }
  }
}
```

#### API Route with Pattern Matching
```typescript
// backend/packages/api/src/routes/salon.routes.ts
const createSalonHandler: RequestHandler<
  Record<string, never>,
  CreateSalonResponse | ErrorResponse,
  CreateSalonRequest
> = async (req, res, next) => {
  try {
    // 1. Validate with Zod
    const validation = createSalonRequestSchema.safeParse(req.body)
    if (!validation.success) {
      return res.status(400).json(problemDetailsFromValidation(validation.error))
    }

    // 2. Execute use case
    const db = getDb()
    const repository = new SalonRepository(db)
    const useCase = new CreateSalonUseCase(repository)
    const result = await useCase.execute(req.body)

    // 3. Pattern match on Result
    match(result)
      .with({ type: 'success' }, ({ data }) => {
        const response: CreateSalonResponse = {
          data,
          meta: { correlationId: `req-${Date.now()}`, timestamp: new Date().toISOString() },
          links: { self: `/salons/${data.id}`, list: '/salons' }
        }
        res.status(201).json(response)
      })
      .with({ type: 'error' }, ({ error }) =>
        handleDomainError(res as Response<ErrorResponse>, error)
      )
      .exhaustive()
  } catch (error) {
    next(error)
  }
}
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
- TypeSpec schema validation at compile time
- Zod v4 runtime validation with `z.custom<T>().check()` pattern
- Type-safe validation for PathParams, QueryParams, and Body
- Result types for all validation errors
- Exhaustive error handling with ts-pattern
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