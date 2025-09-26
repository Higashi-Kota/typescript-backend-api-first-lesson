# API Testing Guide - Salon Domain Reference Implementation

このガイドでは、Salonドメインの実装を完全なリファレンスとして、他のドメインを実装する際のテスト戦略とパターンを詳細に説明します。

## 📋 Overview

Salonドメインは、以下の重要な実装パターンを確立しています：
- **Type-First Development**: TypeSpec → OpenAPI → TypeScript
- **Clean Architecture**: Domain/UseCase/Infrastructure/API layers
- **Test Isolation**: Schema-per-test approach
- **No Exceptions**: Result type pattern
- **Type Safety**: No type casting, exhaustive pattern matching

## 🏗️ Test Infrastructure

### Directory Structure
```
backend/packages/api/
├── src/
│   ├── routes/
│   │   └── salon.routes.ts         # Reference API implementation
│   └── __tests__/
│       ├── _shared/
│       │   ├── setup.ts            # Global test setup
│       │   ├── test-helpers.ts     # Test utilities
│       │   ├── test-schema-manager.ts  # Schema isolation
│       │   └── app.ts              # Express app factory
│       └── salon.test.ts           # Reference test suite
```

### Test Setup with Schema Isolation

```typescript
// backend/packages/api/src/__tests__/_shared/setup.ts
import { PostgreSqlContainer } from '@testcontainers/postgresql'
import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest'

beforeAll(async () => {
  // Single container for all tests
  const container = await new PostgreSqlContainer('postgres:15-alpine')
    .withDatabase('testdb')
    .start()

  // Initialize schema manager
  const schemaManager = new TestSchemaManager(container.getConnectionUri())
  await schemaManager.initializeEnums() // Shared enum types

  globalThis.__TEST_CONTAINER__ = container
  globalThis.__SCHEMA_MANAGER__ = schemaManager
})

beforeEach(async () => {
  // Create isolated schema for each test
  const testSchema = await schemaManager.createTestSchema(true)
  globalThis.__TEST_DB__ = testSchema.db
  globalThis.__TEST_SCHEMA__ = testSchema
})

afterEach(async () => {
  // Clean up test schema
  await globalThis.__TEST_SCHEMA__?.cleanup()
})
```

## 🎯 API Route Implementation Pattern

### Key Principles from Salon Routes

```typescript
// backend/packages/api/src/routes/salon.routes.ts

// 1. Type Remapping from Auto-generated Types
type Salon = components['schemas']['Models.Salon']
type CreateSalonRequest = components['schemas']['Models.CreateSalonRequest']
type ErrorResponse = components['schemas']['Models.ProblemDetails']

// 2. Response Type Definitions
type CursorPaginationResponse<T> = {
  data: T[]
  meta: components['schemas']['Models.PaginationMeta']
  links: components['schemas']['Models.PaginationLinks']
}

// 3. Standardized Error Handler
const handleDomainError = (
  res: Response<ErrorResponse>,
  error: DomainError
): Response<ErrorResponse> => {
  const problemDetails = toProblemDetails(error)
  return res.status(problemDetails.status).json(problemDetails)
}

// 4. Handler Pattern - Delegate ALL Logic to Use Cases
const createSalonHandler: RequestHandler<
  Record<string, never>,
  CreateSalonResponse | ErrorResponse,
  CreateSalonRequest
> = async (req, res, next) => {
  try {
    const db = req.app.locals.database as Database
    const repository = new SalonRepository(db)
    const useCase = new CreateSalonUseCase(repository)

    // No validation here - use case handles everything
    const result = await useCase.execute(req.body)

    // Pattern matching for response
    match(result)
      .with({ type: 'success' }, ({ data }) => {
        const response: CreateSalonResponse = {
          data,
          meta: {
            correlationId: `req-${Date.now()}`,
            timestamp: new Date().toISOString(),
            version: '1.0.0',
          },
          links: {
            self: `/salons/${data.id}`,
            list: '/salons',
          },
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

## 🧪 Test Implementation Patterns

### 1. Basic CRUD Operations

```typescript
// backend/packages/api/src/__tests__/salon.test.ts
describe('Salon API Integration Tests', () => {
  let app: Express
  let db: ReturnType<typeof getTestDb>

  beforeEach(() => {
    app = createTestApp()
    db = getTestDb()
  })

  describe('POST /api/v1/salons', () => {
    it('should create a salon with valid data', async () => {
      const salonData = {
        name: 'Test Salon',
        description: 'A test salon',
        address: {
          street: '千代田1-1-1 テストビル2F',
          city: '千代田区',
          prefecture: '東京都',
          postalCode: '100-0001',
          country: 'Japan',
        },
        contactInfo: {
          email: 'test@salon.com',
          phoneNumber: '03-1234-5678',
          alternativePhone: null,
          websiteUrl: 'https://test-salon.com',
        },
        openingHours: [...],
        businessHours: null,
        imageUrls: null,
        features: null,
      }

      const response = await request(app)
        .post('/api/v1/salons')
        .send(salonData)

      expect(response.status).toBe(201)
      expect(response.body.data).toBeDefined()
      expect(response.body.data.name).toBe(salonData.name)

      // Verify database state
      const result = await db.execute(sql`SELECT * FROM salons`)
      expect(result.length).toBe(1)
    })
  })
})
```

### 2. Pagination Testing

```typescript
describe('GET /api/v1/salons', () => {
  it('should support pagination', async () => {
    // Create test data directly in DB
    const testSalons = Array.from({ length: 5 }, (_, i) => ({
      id: createId(),
      name: `Salon ${i + 1}`,
      nameKana: `サロン${i + 1}`,
      postalCode: '100-0001',
      prefecture: '東京都',
      city: '千代田区',
      address: `千代田${i + 1}-1-1`,
      phoneNumber: `03-1111-${String(i).padStart(4, '0')}`,
      email: `salon${i + 1}@test.com`,
    }))

    for (const salon of testSalons) {
      await db.execute(sql`
        INSERT INTO salons (id, name, "nameKana", "postalCode",
                           prefecture, city, address, "phoneNumber", email)
        VALUES (${salon.id}, ${salon.name}, ${salon.nameKana},
                ${salon.postalCode}, ${salon.prefecture}, ${salon.city},
                ${salon.address}, ${salon.phoneNumber}, ${salon.email})
      `)
    }

    const response = await request(app)
      .get('/api/v1/salons?limit=2')
      .expect(200)

    // CursorPaginationResponse structure
    expect(response.body).toMatchObject({
      data: expect.arrayContaining([]),
      meta: {
        total: 5,
        limit: 2,
        hasMore: true,
      },
      links: expect.any(Object),
    })
    expect(response.body.data).toHaveLength(2)
  })
})
```

### 3. Error Handling

```typescript
describe('Error Cases', () => {
  it('should return validation error for invalid email', async () => {
    const invalidData = {
      name: 'Test Salon',
      contactInfo: {
        email: 'invalid-email', // Invalid
        phoneNumber: '03-1234-5678',
      },
      // ...other fields
    }

    const response = await request(app)
      .post('/api/v1/salons')
      .send(invalidData)
      .expect(400)

    expect(response.body).toMatchObject({
      type: 'https://example.com/probs/validation-error',
      title: 'Validation failed',
      status: 400,
      detail: expect.stringContaining('Invalid email format'),
    })
  })

  it('should return 404 for non-existent salon', async () => {
    const nonExistentId = createId()

    const response = await request(app)
      .get(`/api/v1/salons/${nonExistentId}`)
      .expect(404)

    expect(response.body).toMatchObject({
      type: 'https://example.com/probs/not-found',
      title: 'Resource not found',
      status: 404,
    })
  })
})
```

## 🔄 Use Case and Mapper Pattern

### Use Case Implementation

```typescript
// backend/packages/domain/src/business-logic/salon/list-salons.usecase.ts
export class ListSalonsUseCase extends BaseSalonUseCase {
  async execute(
    page = 1,
    limit = 20
  ): Promise<Result<PaginatedResult<ApiSalon>, DomainError>> {
    const paginationParams = Pagination.create(page, limit)

    const salonsResult = await this.repository.findAll(paginationParams)
    if (Result.isError(salonsResult)) {
      return salonsResult
    }

    // Use mapper to convert DB → API types
    const apiSalons = SalonReadMapper.toApiSalonFullList(
      salonsResult.data.data,
      new Map() // Opening hours map
    )

    const paginatedResult: PaginatedResult<ApiSalon> = {
      data: apiSalons,
      meta: salonsResult.data.meta,
      links: salonsResult.data.links,
    }

    return Result.success(paginatedResult)
  }
}
```

### Mapper Implementation

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
      openingHours: openingHours.map((oh) => this.toApiOpeningHours(oh)),
      // ... other fields
    }
  },

  toApiSalonFullList(
    dbSalons: DbSalon[],
    openingHoursMap: Map<string, DbOpeningHours[]> = new Map()
  ): ApiSalon[] {
    return dbSalons.map((salon) =>
      this.toApiSalon(salon, openingHoursMap.get(salon.id) ?? [])
    )
  },

  toApiSalonSummary(dbSalon: DbSalon): ApiSalonSummary {
    return {
      id: dbSalon.id,
      name: dbSalon.name,
      address: this.toApiAddress(dbSalon),
      rating: dbSalon.rating ? Number.parseFloat(dbSalon.rating) : null,
      reviewCount: dbSalon.reviewCount,
    }
  },
}
```

## 📝 Implementation Checklist

### For New Domain Implementation

#### 1. Route Handler Setup
- [ ] Import types from `@beauty-salon-backend/generated`
- [ ] Create type remapping (no `unknown`, no type casting)
- [ ] Define RequestHandler with explicit type parameters
- [ ] Implement handleDomainError function
- [ ] Delegate ALL logic to use cases (no validation in routes)
- [ ] Use pattern matching for Result handling

#### 2. Use Case Implementation
- [ ] Extend base use case class
- [ ] Accept API types as input
- [ ] Return Result<ApiType, DomainError>
- [ ] Handle validation in use case
- [ ] Use repository pattern for DB access
- [ ] Apply mappers for type conversion

#### 3. Mapper Pattern
- [ ] Create read mapper for DB → API conversion
- [ ] Create write mapper for API → DB conversion
- [ ] Implement toApiXxx methods for full objects
- [ ] Implement toApiXxxList methods for collections
- [ ] Handle nullable fields correctly (match DB nullability)

#### 4. Test Implementation
- [ ] Create test file in `__tests__/[domain].test.ts`
- [ ] Test all CRUD operations
- [ ] Test pagination with CursorPaginationResponse
- [ ] Test error cases (validation, 404, invalid UUID)
- [ ] Verify database state after operations
- [ ] Use direct DB inserts for test data setup

## 🚀 Running Tests

```bash
# Run specific domain tests
pnpm test salon.test.ts

# Run all API tests
cd backend/packages/api && pnpm test

# Run with coverage
pnpm test --coverage

# Watch mode for development
pnpm test --watch
```

## ⚡ Key Architectural Decisions

### 1. Schema-per-test Isolation
- Each test runs in its own PostgreSQL schema
- No test data conflicts
- Parallel test execution capability
- Automatic cleanup

### 2. No Validation in Routes
- Routes are thin HTTP adapters
- All business logic in use cases
- Consistent error handling via Result type
- Single responsibility principle

### 3. Type-safe Without Casting
- Use mapper methods that return correct types
- Adjust use case return types as needed
- Never use `as` type assertions
- Maintain type flow from DB to API

### 4. Problem Details Standard
- RFC 7807 compliant error responses
- Consistent error structure across all endpoints
- Machine-readable error types
- Human-readable error details

## 📊 Test Output Example

```
✓ src/__tests__/salon.test.ts (15 tests) 4.89s
  ✓ Salon API Integration Tests
    ✓ POST /api/v1/salons
      ✓ should create a salon with valid data 111ms
      ✓ should return validation error for invalid email 82ms
      ✓ should return validation error for missing required fields 79ms
    ✓ GET /api/v1/salons
      ✓ should list all salons 95ms
      ✓ should return empty list when no salons exist 87ms
      ✓ should support pagination 102ms
    ✓ GET /api/v1/salons/:id
      ✓ should get a salon by ID 84ms
      ✓ should return 404 for non-existent salon 83ms
      ✓ should return 400 for invalid UUID 78ms

Test Files  1 passed (1)
     Tests  15 passed (15)
```

## 🔍 Summary

The Salon domain implementation establishes:
1. **Complete type safety** without type casting
2. **Clean separation** between HTTP and business logic
3. **Comprehensive test coverage** with real database
4. **Consistent patterns** for all operations

Use this implementation as the reference when implementing Customer, Staff, Service, and other domains.