# Uniform Implementation Guide - Based on Salon Domain Reference

このガイドは、Salonドメインの実装から抽出した統一的な実装パターンを定義します。すべてのドメインで一貫性のある実装を実現するための実践的なガイドです。

## 📋 Table of Contents

1. [API Layer Patterns](#api-layer-patterns)
2. [Use Case Patterns](#use-case-patterns)
3. [Mapper Patterns](#mapper-patterns)
4. [Error Handling](#error-handling)
5. [Pagination Implementation](#pagination-implementation)
6. [Response Formatting](#response-formatting)
7. [Validation Patterns](#validation-patterns)
8. [Database Operations](#database-operations)
9. [Testing Patterns](#testing-patterns)
10. [Type Safety Patterns](#type-safety-patterns)

## API Layer Patterns

### Route Handler Structure

**Critical Rule**: Routes MUST NOT contain validation logic. They only:
1. Extract types from generated operations
2. Get dependencies (DB, repository)
3. Call use case
4. Handle Result with pattern matching

```typescript
// ✅ CORRECT: No validation in route
const createHandler: RequestHandler<
  Record<string, never>,
  CreateResponse | ErrorResponse,
  CreateRequest
> = async (req, res, next) => {
  try {
    const db = req.app.locals.database as Database
    const repository = new Repository(db)

    // Use object-based dependency injection
    const useCase = new CreateUseCase({ repository })

    // Direct delegation - NO validation here
    const result = await useCase.execute(req.body)

    match(result)
      .with({ type: 'success' }, ({ data }) => {
        const response = buildSuccessResponse(data)
        res.status(201).json(response)
      })
      .with({ type: 'error' }, ({ error }) => {
        handleDomainError(res as Response<ErrorResponse>, error)
      })
      .exhaustive()
  } catch (error) {
    next(error)
  }
}
```

### Type Extraction Pattern

Always extract types from auto-generated operations:

```typescript
// Operations
type ListOperation = operations['DomainCrud_list']
type GetOperation = operations['DomainCrud_get']
type CreateOperation = operations['DomainCrud_create']
type UpdateOperation = operations['DomainCrud_update']
type DeleteOperation = operations['DomainCrud_delete']

// Models
type Domain = components['schemas']['Models.Domain']
type CreateRequest = components['schemas']['Models.CreateDomainRequest']
type UpdateRequest = components['schemas']['Models.UpdateDomainRequest']

// Response extraction with Extract utility
type GetResponse = Extract<
  GetOperation['responses']['200']['content']['application/json'],
  { data: unknown }
>

// Query params with NonNullable
type ListQuery = NonNullable<ListOperation['parameters']['query']>
```

## Use Case Patterns

### Dependency Injection Pattern

Use cases use object-based dependency injection for maintainability:

```typescript
// Dependencies interface for the domain
export interface DomainUseCaseDependencies {
  repository: IDomainRepository
  // Future dependencies can be added here:
  // emailService?: IEmailService
  // notificationService?: INotificationService
}

// Base use case with dependencies
export abstract class BaseDomainUseCase {
  protected readonly repository: DomainUseCaseDependencies['repository']

  constructor(protected readonly dependencies: DomainUseCaseDependencies) {
    this.repository = dependencies.repository
  }
}
```

### Use Case Structure

ALL validation and business logic happens in use cases:

```typescript
export class CreateDomainUseCase extends BaseDomainUseCase {
  async execute(
    request: ApiCreateDomainRequest
  ): Promise<Result<ApiDomain, DomainError>> {
    // 1. Validate request
    const validation = this.validateRequest(request)
    if (Result.isError(validation)) {
      return validation
    }

    // 2. Check business rules
    const existingCheck = await this.checkDuplicate(request.email)
    if (Result.isError(existingCheck)) {
      return existingCheck
    }

    // 3. Map API to DB types
    const dbEntity = DomainWriteMapper.fromCreateRequest(request)

    // 4. Execute database operation
    const saveResult = await this.repository.create(dbEntity)
    if (Result.isError(saveResult)) {
      return saveResult
    }

    // 5. Map DB to API types
    const apiEntity = DomainReadMapper.toApiDomain(saveResult.data)

    return Result.success(apiEntity)
  }

  private validateRequest(
    request: ApiCreateDomainRequest
  ): Result<void, DomainError> {
    const errors: string[] = []

    // Collect all validation errors
    if (!request.name || request.name.length < 2) {
      errors.push('Name must be at least 2 characters')
    }

    if (!this.isValidEmail(request.email)) {
      errors.push('Invalid email format')
    }

    if (errors.length > 0) {
      return Result.error(
        DomainErrorFactory.validation('Validation failed', errors)
      )
    }

    return Result.success(undefined)
  }
}
```

## Mapper Patterns

### Strict Separation of Read and Write Mappers

```typescript
// Write Mapper: API → DB
export const DomainWriteMapper = {
  fromCreateRequest(request: ApiCreateRequest): DbNewDomain {
    return {
      name: request.name,
      email: request.email,
      // Map nested objects
      address: request.address.street,
      city: request.address.city,
      // Handle nullable fields
      description: request.description ?? null,
    }
  },

  fromUpdateRequest(request: ApiUpdateRequest): Partial<DbDomain> {
    return {
      ...(request.name && { name: request.name }),
      ...(request.email && { email: request.email }),
      updatedAt: new Date(),
    }
  },
}

// Read Mapper: DB → API
export const DomainReadMapper = {
  toApiDomain(dbDomain: DbDomain): ApiDomain {
    return {
      id: dbDomain.id,
      name: dbDomain.name,
      email: dbDomain.email,
      // Reconstruct nested objects
      address: {
        street: dbDomain.address,
        city: dbDomain.city,
        postalCode: dbDomain.postalCode,
      },
      // Handle nullable fields
      description: dbDomain.description,
      createdAt: dbDomain.createdAt,
      updatedAt: dbDomain.updatedAt,
    }
  },

  toApiDomainList(dbDomains: DbDomain[]): ApiDomain[] {
    return dbDomains.map((domain) => this.toApiDomain(domain))
  },
}
```

## Error Handling

### Domain Error Factory Pattern

```typescript
export const DomainErrorFactory = {
  validation(message: string, details: string[]): DomainError {
    return {
      type: 'validation',
      message,
      code: 'VALIDATION_ERROR',
      details,
    }
  },

  notFound(entity: string, field: string, value: unknown): DomainError {
    return {
      type: 'notFound',
      entity,
      field,
      value,
    }
  },

  alreadyExists(entity: string, field: string, value: unknown): DomainError {
    return {
      type: 'alreadyExists',
      entity,
      field,
      value,
    }
  },

  database(message: string, cause: unknown): DomainError {
    return {
      type: 'database',
      message,
      cause,
    }
  },
}

// Problem Details conversion
export function toProblemDetails(error: DomainError): ProblemDetails {
  return match(error)
    .with({ type: 'validation' }, (e) => ({
      type: 'https://example.com/probs/validation-error',
      title: 'Validation failed',
      status: 400,
      detail: e.message,
      errors: e.details,
    }))
    .with({ type: 'notFound' }, (e) => ({
      type: 'https://example.com/probs/not-found',
      title: 'Resource not found',
      status: 404,
      detail: `${e.entity} with ${e.field} '${e.value}' not found`,
    }))
    .with({ type: 'alreadyExists' }, (e) => ({
      type: 'https://example.com/probs/conflict',
      title: 'Resource already exists',
      status: 409,
      detail: `${e.entity} with ${e.field} '${e.value}' already exists`,
    }))
    .exhaustive()
}
```

## Pagination Implementation

### Cursor-based Pagination Response

```typescript
type CursorPaginationResponse<T> = {
  data: T[]
  meta: {
    total: number
    limit: number
    cursor?: string
    hasMore: boolean
  }
  links: {
    self: string
    next?: string
    prev?: string
  }
}

// List handler with pagination
const listHandler: RequestHandler<
  Record<string, never>,
  CursorPaginationResponse<Domain> | ErrorResponse,
  unknown,
  Partial<ListQuery>
> = async (req, res, next) => {
  const limit = Number(req.query.limit) || 20
  const cursor = req.query.cursor || undefined

  // Convert cursor to page for backward compatibility
  let page = 1
  if (cursor?.startsWith('offset:')) {
    const offset = Number(cursor.replace('offset:', ''))
    page = Math.floor(offset / limit) + 1
  }

  const result = await useCase.execute(page, limit)

  match(result)
    .with({ type: 'success' }, ({ data }) => {
      const response: CursorPaginationResponse<Domain> = {
        data: data.data,
        meta: data.meta,
        links: data.links,
      }
      res.json(response)
    })
    .exhaustive()
}
```

## Response Formatting

### Standard Response Structures

```typescript
// Success response with metadata
interface SuccessResponse<T> {
  data: T
  meta: {
    correlationId: string
    timestamp: string
    version: string
  }
  links: {
    self: string
    [key: string]: string
  }
}

// Error response (Problem Details)
interface ErrorResponse {
  type: string
  title: string
  status: number
  detail: string
  instance?: string
  errors?: string[]
}

// Build success response
function buildSuccessResponse<T>(data: T, id?: string): SuccessResponse<T> {
  return {
    data,
    meta: {
      correlationId: `req-${Date.now()}`,
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    },
    links: {
      self: id ? `/api/v1/domains/${id}` : '/api/v1/domains',
      ...(id && { list: '/api/v1/domains' }),
    },
  }
}
```

## Validation Patterns

### Centralized in Use Cases

```typescript
class ValidationHelper {
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  static isValidPhone(phone: string): boolean {
    // Japanese phone number format
    const phoneRegex = /^0\d{1,4}-\d{1,4}-\d{4}$/
    return phoneRegex.test(phone)
  }

  static isValidPostalCode(code: string): boolean {
    // Japanese postal code
    const postalRegex = /^\d{3}-\d{4}$/
    return postalRegex.test(code)
  }

  static isValidUUID(id: string): boolean {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    return uuidRegex.test(id)
  }
}
```

## Database Operations

### Repository Pattern with Result Type

```typescript
export interface IDomainRepository {
  findAll(
    pagination: PaginationParams
  ): Promise<Result<PaginatedResult<DbDomain>, DomainError>>

  findById(id: string): Promise<Result<DbDomain | null, DomainError>>

  create(domain: DbNewDomain): Promise<Result<DbDomain, DomainError>>

  update(
    id: string,
    updates: Partial<DbDomain>
  ): Promise<Result<DbDomain, DomainError>>

  delete(id: string): Promise<Result<void, DomainError>>
}

// Implementation
export class DomainRepository implements IDomainRepository {
  constructor(private db: Database) {}

  async findById(id: string): Promise<Result<DbDomain | null, DomainError>> {
    try {
      const result = await this.db
        .select()
        .from(domains)
        .where(and(eq(domains.id, id), isNull(domains.deletedAt)))
        .limit(1)

      return Result.success(result[0] || null)
    } catch (error) {
      return Result.error(
        DomainErrorFactory.database('Failed to fetch domain', error)
      )
    }
  }

  async delete(id: string): Promise<Result<void, DomainError>> {
    try {
      // Soft delete pattern
      await this.db
        .update(domains)
        .set({ deletedAt: new Date() })
        .where(eq(domains.id, id))

      return Result.success(undefined)
    } catch (error) {
      return Result.error(
        DomainErrorFactory.database('Failed to delete domain', error)
      )
    }
  }
}
```

## Testing Patterns

### Integration Test Structure

```typescript
describe('Domain API Integration Tests', () => {
  let app: Express
  let db: ReturnType<typeof getTestDb>

  beforeEach(() => {
    app = createTestApp()
    db = getTestDb()
  })

  describe('POST /api/v1/domains', () => {
    it('should create with valid data', async () => {
      const data = createValidDomainData()

      const response = await request(app)
        .post('/api/v1/domains')
        .send(data)

      expect(response.status).toBe(201)
      expect(response.body.data).toBeDefined()

      // Always verify DB state
      const result = await db.execute(sql`SELECT * FROM domains`)
      expect(result.length).toBe(1)
      expect(result[0].name).toBe(data.name)
    })

    it('should return validation error', async () => {
      const invalidData = {
        ...createValidDomainData(),
        email: 'invalid-email',
      }

      const response = await request(app)
        .post('/api/v1/domains')
        .send(invalidData)
        .expect(400)

      expect(response.body.type).toContain('validation-error')
      expect(response.body.errors).toContain('Invalid email format')
    })
  })
})
```

## Type Safety Patterns

### No Type Casting Rule

```typescript
// ❌ WRONG: Type casting
const data = result.data as ApiDomain[]

// ✅ CORRECT: Use proper mapper methods
const data = DomainReadMapper.toApiDomainList(result.data)

// ❌ WRONG: Any type
const handler: RequestHandler<any, any, any> = async (req, res) => {}

// ✅ CORRECT: Explicit types
const handler: RequestHandler<
  { id: string },
  GetResponse | ErrorResponse,
  unknown,
  Partial<QueryParams>
> = async (req, res) => {}
```

### Exhaustive Pattern Matching

```typescript
// Always use .exhaustive() for completeness
match(result)
  .with({ type: 'success' }, handleSuccess)
  .with({ type: 'error' }, handleError)
  .exhaustive() // Ensures all cases handled
```

## 📋 Implementation Checklist

When implementing a new domain:

### API Layer
- [ ] Extract all types from operations
- [ ] NO validation logic in routes
- [ ] Proper RequestHandler type parameters
- [ ] Pattern matching with exhaustive
- [ ] Standard error handler function

### Use Case Layer
- [ ] ALL validation in use cases
- [ ] Error aggregation pattern
- [ ] Business rule checks
- [ ] Result type for all returns
- [ ] Mapper usage for type conversion

### Mapper Layer
- [ ] Separate Read and Write mappers
- [ ] Handle nullable fields correctly
- [ ] No type casting
- [ ] Consistent naming patterns

### Testing
- [ ] Integration tests for all endpoints
- [ ] Minimum 5 error scenarios
- [ ] Database state verification
- [ ] No mocking of repositories
- [ ] Factory functions for test data

## 🎯 Key Takeaways

1. **Validation belongs in Use Cases, NOT in routes**
2. **Always use Result type, never throw exceptions**
3. **Extract types from generated operations**
4. **Use mappers to avoid type casting**
5. **Verify database state in tests**
6. **Pattern match exhaustively**
7. **Soft delete with deletedAt field**

This guide is based on the proven Salon domain implementation and ensures consistency across all domains.