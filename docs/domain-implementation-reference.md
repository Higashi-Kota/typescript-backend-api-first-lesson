# Domain Implementation Reference Guide

This document provides a comprehensive reference for implementing domains in the Beauty Salon Reservation System, based on the proven Salon domain implementation patterns.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [API Route Implementation](#api-route-implementation)
3. [Use Case Layer](#use-case-layer)
4. [Mapper Pattern](#mapper-pattern)
5. [Error Handling](#error-handling)
6. [Testing Patterns](#testing-patterns)
7. [Implementation Checklist](#implementation-checklist)

## Architecture Overview

### Layer Dependencies

```
API Routes (Express) → Use Cases → Mappers → Repository
     ↓                      ↓          ↓          ↓
Generated Types      Domain Models   DB Types   Database
```

### Key Principles

1. **NO validation in routes** - All validation happens in use cases
2. **Type extraction from operations** - Use generated types directly
3. **Result pattern everywhere** - Never throw exceptions
4. **Exhaustive pattern matching** - Use ts-pattern with `.exhaustive()`
5. **Clean separation** - Each layer has single responsibility

## API Route Implementation

### Type Extraction Pattern

Always extract types from auto-generated operations for type safety:

```typescript
// ============================================================================
// Type remapping from auto-generated types for type safety
// ============================================================================

// Request/Response type extraction from operations
type ListSalonsOperation = operations['SalonCrud_list']
type GetSalonOperation = operations['SalonCrud_get']
type DeleteSalonOperation = operations['SalonCrud_delete']
type CreateSalonOperation = operations['SalonCrud_create']
type UpdateSalonOperation = operations['SalonCrud_update']
type SearchSalonsOperation = operations['SalonCrud_search']

// Model type remapping
type Salon = components['schemas']['Models.Salon']
type CreateSalonRequest = components['schemas']['Models.CreateSalonRequest']
type UpdateSalonRequest = components['schemas']['Models.UpdateSalonRequest']

// Response type extraction using Extract utility
type GetSalonResponse = Extract<
  GetSalonOperation['responses']['200']['content']['application/json'],
  { data: unknown }
>

// Query parameter type remapping with NonNullable
type ListSalonsQuery = NonNullable<ListSalonsOperation['parameters']['query']>

// Error response type
type ErrorResponse = components['schemas']['Models.ProblemDetails']
```

### Route Handler Pattern

Standard pattern for all route handlers:

```typescript
// Standard handler signature with proper types
const createSalonHandler: RequestHandler<
  Record<string, never>,                    // Path params (empty for POST)
  CreateSalonResponse | ErrorResponse,      // Response body types
  CreateSalonRequest,                       // Request body type
  Partial<QueryParams>                      // Query params (optional)
> = async (req, res, next) => {
  try {
    // 1. Get dependencies from app.locals
    const db = req.app.locals.database as Database
    const repository = new SalonRepository(db)
    const useCase = new CreateSalonUseCase(repository)

    // 2. Execute use case (NO validation here!)
    const result = await useCase.execute(req.body)

    // 3. Handle result with exhaustive pattern matching
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
    next(error)  // Pass to Express error handler
  }
}
```

### Error Handler Helper

Centralized error handling with proper type casting:

```typescript
const handleDomainError = (
  res: Response<ErrorResponse>,
  error: DomainError
): Response<ErrorResponse> => {
  const problemDetails = toProblemDetails(error)
  return res.status(problemDetails.status).json(problemDetails)
}
```

### Pagination Handling

Convert between cursor-based and page-based pagination:

```typescript
const listSalonsHandler: RequestHandler<
  Record<string, never>,
  CursorPaginationResponse<Salon> | ErrorResponse,
  unknown,
  Partial<ListSalonsQuery>
> = async (req, res, next) => {
  try {
    // Extract pagination from cursor-based params
    const limit = Number(req.query.limit) || 20
    const cursor = req.query.cursor || undefined

    // Convert cursor to page number for backward compatibility
    let page = 1
    if (cursor?.startsWith('offset:')) {
      const offset = Number(cursor.replace('offset:', ''))
      page = Math.floor(offset / limit) + 1
    }

    // ... execute use case ...

    // Return proper CursorPaginationResponse structure
    const response: CursorPaginationResponse<Salon> = {
      data: data.data,
      meta: data.meta,
      links: data.links,
    }
    res.json(response)
  } catch (error) {
    next(error)
  }
}
```

## Use Case Layer

### Base Use Case Pattern

Create a base use case with shared validation logic:

```typescript
export abstract class BaseSalonUseCase {
  constructor(protected readonly repository: ISalonRepository) {}

  // Shared validation methods
  protected isValidUuid(value: string): boolean {
    return validateUuid(value)
  }

  protected isValidEmail(email: string): boolean {
    return validateEmail(email)
  }

  protected isValidPhoneNumber(phone: string): boolean {
    return validatePhoneNumber(phone)
  }

  // Field validators with error collection
  protected validateName(name: string | undefined): string[] {
    const errors: string[] = []

    if (!name || name.trim().length === 0) {
      errors.push('Name is required')
    } else if (name.length > 255) {
      errors.push('Name must be less than 255 characters')
    }

    return errors
  }

  // Handle optional fields properly
  protected validateDescription(
    _description: string | undefined | null
  ): string[] {
    const errors: string[] = []
    // Description is optional/nullable - no validation required
    return errors
  }

  // Separate validation for create vs update
  protected validateUpdateAddress(address: ApiAddress | undefined): string[] {
    const errors: string[] = []

    if (address !== undefined) {
      if (address.street !== undefined && !address.street) {
        errors.push('Street address cannot be empty')
      }
      // Only validate fields that are provided
    }

    return errors
  }
}
```

### Create Use Case Pattern

Standard create operation flow:

```typescript
export class CreateSalonUseCase extends BaseSalonUseCase {
  async execute(
    request: ApiCreateSalonRequest
  ): Promise<Result<ApiSalon, DomainError>> {
    // 1. Validate request
    const validation = this.validate(request)
    if (Result.isError(validation)) {
      return validation
    }

    // 2. Check business rules (e.g., uniqueness)
    const emailExists = await this.repository.existsByEmail(
      request.contactInfo.email
    )
    if (Result.isError(emailExists)) {
      return emailExists
    }

    if (emailExists.data) {
      return Result.error(
        DomainErrors.alreadyExists('Salon', 'email', request.contactInfo.email)
      )
    }

    // 3. Use Write Mapper to transform API → DB
    const { salon, openingHours } = SalonWriteMapper.fromCreateRequest(request)

    // 4. Save to database with generated ID
    const createResult = await this.repository.create(
      { ...salon, id: toSalonID(createId()) },
      openingHours
    )
    if (Result.isError(createResult)) {
      return createResult
    }

    // 5. Fetch related data if needed
    const openingHoursResult = await this.repository.findOpeningHours(
      toSalonID(createResult.data.id)
    )

    // 6. Use Read Mapper to transform DB → API
    const apiSalon = SalonReadMapper.toApiSalon(
      createResult.data,
      Result.isSuccess(openingHoursResult) ? openingHoursResult.data : []
    )

    return Result.success(apiSalon)
  }

  private validate(request: ApiCreateSalonRequest): Result<true, DomainError> {
    const errors: string[] = []

    // Collect all validation errors
    errors.push(...this.validateName(request.name))
    errors.push(...this.validateDescription(request.description))
    errors.push(...this.validateAddress(request.address))
    errors.push(...this.validateContactInfo(request.contactInfo))

    // Check required arrays
    if (!request.openingHours || request.openingHours.length === 0) {
      errors.push('Opening hours are required')
    }

    // Return aggregated errors
    if (errors.length > 0) {
      return Result.error(
        DomainErrors.validation(
          'Validation failed',
          'SALON_VALIDATION_ERROR',
          errors
        )
      )
    }

    return Result.success(true)
  }
}
```

### Get/Read Use Case Pattern

Simple retrieval with proper error handling:

```typescript
export class GetSalonUseCase extends BaseSalonUseCase {
  async execute(id: SalonId): Promise<Result<ApiSalon, DomainError>> {
    // 1. Validate ID format
    if (!this.isValidUuid(id)) {
      return Result.error(
        DomainErrors.validation('Invalid salon ID format', 'INVALID_SALON_ID')
      )
    }

    // 2. Fetch from repository
    const salonResult = await this.repository.findById(id)
    if (Result.isError(salonResult)) {
      return salonResult
    }

    // 3. Check existence
    if (!salonResult.data) {
      return Result.error(DomainErrors.notFound('Salon', id))
    }

    // 4. Fetch related data
    const openingHoursResult = await this.repository.findOpeningHours(id)
    const openingHours = Result.isSuccess(openingHoursResult)
      ? openingHoursResult.data
      : []

    // 5. Map to API response
    const apiSalon = SalonReadMapper.toApiSalon(salonResult.data, openingHours)
    return Result.success(apiSalon)
  }
}
```

### List Use Case Pattern

Pagination handling:

```typescript
export class ListSalonsUseCase extends BaseSalonUseCase {
  async execute(
    page = 1,
    limit = 20
  ): Promise<Result<PaginatedResult<ApiSalon>, DomainError>> {
    // 1. Create pagination params
    const paginationParams = Pagination.create(page, limit)

    // 2. Fetch paginated data
    const salonsResult = await this.repository.findAll(paginationParams)
    if (Result.isError(salonsResult)) {
      return salonsResult
    }

    // 3. Map to API format with full data
    const apiSalons = SalonReadMapper.toApiSalonFullList(
      salonsResult.data.data,
      new Map() // Opening hours map if needed
    )

    // 4. Return paginated result
    const paginatedResult: PaginatedResult<ApiSalon> = {
      data: apiSalons,
      meta: salonsResult.data.meta,
      links: salonsResult.data.links,
    }

    return Result.success(paginatedResult)
  }
}
```

## Mapper Pattern

### Read Mapper (DB → API)

Transform database entities to API responses:

```typescript
export const SalonReadMapper = {
  // Main entity mapping
  toApiSalon(dbSalon: DbSalon, openingHours: DbOpeningHours[] = []): ApiSalon {
    return {
      id: dbSalon.id,
      name: dbSalon.name,
      description: dbSalon.description,
      address: this.toApiAddress(dbSalon),  // Nested object transformation
      contactInfo: this.toApiContactInfo(dbSalon),
      openingHours: openingHours.map((oh) => this.toApiOpeningHours(oh)),
      businessHours: dbSalon.businessHours as ApiSalon['businessHours'], // JSONB cast
      imageUrls: Array.isArray(dbSalon.imageUrls)
        ? (dbSalon.imageUrls as string[])
        : [],
      features: Array.isArray(dbSalon.features)
        ? (dbSalon.features as string[])
        : [],
      rating: dbSalon.rating ? Number.parseFloat(dbSalon.rating) : null,
      reviewCount: dbSalon.reviewCount,
      createdAt: dbSalon.createdAt,
      createdBy: 'Demo user',  // Audit fields
      updatedAt: dbSalon.updatedAt,
      updatedBy: 'Demo user',
    }
  },

  // Nested object mapping
  toApiAddress(dbSalon: DbSalon): ApiAddress {
    return {
      street: dbSalon.address,  // Field name transformation
      city: dbSalon.city,
      prefecture: dbSalon.prefecture,
      postalCode: dbSalon.postalCode,
      country: 'Japan',  // Business logic default
    }
  },

  // Array handling
  toApiSalonFullList(
    dbSalons: DbSalon[],
    openingHoursMap: Map<string, DbOpeningHours[]> = new Map()
  ): ApiSalon[] {
    return dbSalons.map((salon) =>
      this.toApiSalon(salon, openingHoursMap.get(salon.id) || [])
    )
  },
}
```

### Write Mapper (API → DB)

Transform API requests to database format:

```typescript
export const SalonWriteMapper = {
  // Create request mapping
  fromCreateRequest(request: ApiCreateSalonRequest): {
    salon: DbNewSalon
    openingHours: DbNewOpeningHours[]
  } {
    const salon: DbNewSalon = {
      name: request.name,
      nameKana: null,  // Optional fields set to null
      description: request.description,
      postalCode: request.address.postalCode,
      prefecture: request.address.prefecture,
      city: request.address.city,
      address: request.address.street,  // Field name transformation
      building: null,
      latitude: null,
      longitude: null,
      phoneNumber: request.contactInfo.phoneNumber,
      alternativePhone: request.contactInfo.alternativePhone,
      email: request.contactInfo.email,
      websiteUrl: request.contactInfo.websiteUrl,
      logoUrl: null,
      imageUrls: request.imageUrls,
      features: request.features,
      amenities: [],  // Default empty arrays
      timezone: 'Asia/Tokyo',  // Business defaults
      currency: 'JPY',
      taxRate: '10.00',
      cancellationPolicy: null,
      bookingPolicy: null,
      businessHours: request.businessHours,
      rating: null,
      reviewCount: 0,
      isActive: true,
      deletedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    // Map related entities
    const openingHours: DbNewOpeningHours[] = request.openingHours.map((oh) =>
      this.mapOpeningHours(oh, '')  // salonId set later in transaction
    )

    return { salon, openingHours }
  },

  // Update request mapping (partial)
  fromUpdateRequest(request: ApiUpdateSalonRequest): Partial<DbNewSalon> {
    const updates: Partial<DbNewSalon> = {}

    // Only map fields that are provided
    if (request.name !== undefined) {
      updates.name = request.name
    }

    if (request.description !== undefined) {
      updates.description = request.description
    }

    // Handle nested objects
    if (request.address !== undefined) {
      if (request.address.postalCode !== undefined) {
        updates.postalCode = request.address.postalCode
      }
      if (request.address.prefecture !== undefined) {
        updates.prefecture = request.address.prefecture
      }
      if (request.address.city !== undefined) {
        updates.city = request.address.city
      }
      if (request.address.street !== undefined) {
        updates.address = request.address.street
      }
    }

    // Always update timestamp
    updates.updatedAt = new Date().toISOString()

    return updates
  },

  // Helper for related entities
  mapOpeningHours(hours: ApiOpeningHours, salonId: string): DbNewOpeningHours {
    return {
      salonId,
      dayOfWeek: hours.dayOfWeek,
      specificDate: hours.date,  // Field name transformation
      openTime: hours.openTime,
      closeTime: hours.closeTime,
      isHoliday: hours.isHoliday,
      holidayName: hours.holidayName,
      notes: hours.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  },
}
```

## Error Handling

### Domain Error Factory

Centralized error creation with proper typing:

```typescript
export const DomainErrors = {
  validation(message: string, code: string, details?: unknown): DomainError {
    return {
      type: 'VALIDATION_ERROR' as DomainErrorType,
      message,
      code,
      details,
    }
  },

  notFound(entity: string, id: string): DomainError {
    return {
      type: 'NOT_FOUND' as DomainErrorType,
      message: `${entity} with ID ${id} not found`,
      code: `${entity.toUpperCase()}_NOT_FOUND`,
      details: { entity, id },
    }
  },

  alreadyExists(entity: string, field: string, value: string): DomainError {
    return {
      type: 'ALREADY_EXISTS' as DomainErrorType,
      message: `${entity} with ${field} '${value}' already exists`,
      code: `${entity.toUpperCase()}_ALREADY_EXISTS`,
      details: { entity, field, value },
    }
  },

  database(message: string, details?: unknown): DomainError {
    return {
      type: 'DATABASE_ERROR' as DomainErrorType,
      message,
      code: 'DATABASE_ERROR',
      details,
    }
  },
}
```

### Problem Details Conversion

Convert domain errors to RFC 7807 Problem Details:

```typescript
export function toProblemDetails(
  error: DomainError,
  instance?: string
): ProblemDetails {
  const errorCode = ERROR_CODE_MAP[error.type] || '4001'
  const httpStatus = HTTP_STATUS_MAP[error.type] || 500

  return {
    type: `https://example.com/probs/${error.type.toLowerCase().replace(/_/g, '-')}`,
    title: error.type.replace(/_/g, ' ').toLowerCase(),
    status: httpStatus,
    detail: error.message,
    instance: instance || `urn:error:${Date.now()}`,
    code: errorCode as ErrorCodeType,
    timestamp: new Date().toISOString(),
    errors: error.details
      ? [
          {
            field: 'unknown',
            rule: error.code,
            message: error.message,
            value: undefined,
            constraint: undefined,
          },
        ]
      : undefined,
  }
}
```

## Testing Patterns

### Test Structure

Follow AAA (Arrange-Act-Assert) pattern:

```typescript
describe('POST /api/v1/salons', () => {
  it('should create a salon successfully', async () => {
    // Arrange
    const salonData = {
      name: 'Test Beauty Salon',
      description: null,  // Test nullable fields
      address: {
        street: '千代田1-1-1',
        city: '千代田区',
        prefecture: '東京都',
        postalCode: '100-0001',
        country: 'Japan',
      },
      contactInfo: {
        email: 'test@salon.com',
        phoneNumber: '03-1234-5678',
        alternativePhone: null,
        websiteUrl: null,
      },
      openingHours: [
        {
          dayOfWeek: 'monday',
          date: null,
          openTime: '10:00',
          closeTime: '20:00',
          isHoliday: false,
          holidayName: null,
          notes: null,
        },
        // ... other days
      ],
      businessHours: null,
      imageUrls: null,
      features: null,
    }

    // Act
    const response = await request(app).post('/api/v1/salons').send(salonData)

    // Assert
    expect(response.status).toBe(201)
    expect(response.body.data).toBeDefined()
    expect(response.body.data.name).toBe(salonData.name)
    expect(response.body.data.contactInfo?.email).toBe(
      salonData.contactInfo.email
    )

    // Verify database state
    const result = await db.execute(sql`SELECT * FROM salons`)
    expect(result.length).toBe(1)
    expect(result[0]?.name).toBe(salonData.name)
  })
})
```

### Error Scenario Testing

Test all error cases:

```typescript
it('should return validation error for invalid email', async () => {
  const invalidData = {
    name: 'Test Salon',
    description: null,
    address: { /* ... */ },
    contactInfo: {
      email: 'invalid-email',  // Invalid format
      phoneNumber: '03-1234-5678',
      // ...
    },
    openingHours: [ /* ... */ ],
  }

  const response = await request(app)
    .post('/api/v1/salons')
    .send(invalidData)
    .expect(400)

  expect(response.body.type).toBe(
    'https://example.com/probs/validation-error'
  )
  expect(response.body.detail).toContain('Validation failed')
})

it('should return 404 for non-existent resource', async () => {
  const nonExistentId = createId()

  const response = await request(app)
    .get(`/api/v1/salons/${nonExistentId}`)
    .expect(404)

  expect(response.body.status).toBe(404)
  expect(response.body.type).toContain('not-found')
})
```

### Database State Verification

Always verify database state after operations:

```typescript
it('should soft delete a salon', async () => {
  // Arrange - create test data
  const salonId = createId()
  await db.execute(sql`
    INSERT INTO salons (id, name, ...)
    VALUES (${salonId}, 'To Delete', ...)
  `)

  // Act - perform delete
  const response = await request(app)
    .delete(`/api/v1/salons/${salonId}`)
    .expect(204)

  // Assert - verify soft delete
  const result = await db.execute(
    sql`SELECT * FROM salons WHERE id = ${salonId}`
  )
  expect(result).toHaveLength(1)
  expect(result[0]?.deletedAt).not.toBeNull()  // Soft deleted
})
```

## Implementation Checklist

### For Each New Domain

#### 1. API Layer Setup
- [ ] Extract types from generated operations
- [ ] Create route handlers with proper type signatures
- [ ] Implement error handler helper
- [ ] Set up router with all CRUD endpoints
- [ ] NO validation in routes (delegate to use cases)

#### 2. Use Case Layer
- [ ] Create base use case with shared validation
- [ ] Implement create use case with full validation
- [ ] Implement get/read use case with existence check
- [ ] Implement update use case with partial validation
- [ ] Implement delete use case (soft delete)
- [ ] Implement list use case with pagination
- [ ] Implement search use case if needed

#### 3. Mapper Layer
- [ ] Create Read mapper (DB → API)
- [ ] Handle nested object transformations
- [ ] Handle array fields properly
- [ ] Handle nullable fields correctly
- [ ] Create Write mapper (API → DB)
- [ ] Map only provided fields in update
- [ ] Set proper defaults for create
- [ ] Always update timestamps

#### 4. Error Handling
- [ ] Use DomainErrors factory
- [ ] Convert to Problem Details
- [ ] Return proper HTTP status codes
- [ ] Include detailed error information

#### 5. Testing
- [ ] Test successful operations
- [ ] Test validation errors
- [ ] Test not found scenarios
- [ ] Test duplicate/conflict scenarios
- [ ] Test pagination
- [ ] Verify database state
- [ ] Test error response format

### Type Safety Checklist

- [ ] NO `any` types
- [ ] NO type assertions (`as`)
- [ ] NO throwing exceptions
- [ ] Use Result type everywhere
- [ ] Use exhaustive pattern matching
- [ ] Proper null/undefined handling
- [ ] Type-safe ID generation

### Best Practices

1. **Always use Result type** - Never throw exceptions
2. **Validate in use cases** - Not in routes or mappers
3. **Map at boundaries** - Keep domain logic pure
4. **Test database state** - Not just API responses
5. **Handle nullables properly** - Match DB constraints
6. **Use proper defaults** - Business logic in mappers
7. **Keep routes simple** - Just orchestration
8. **Aggregate validation errors** - Return all at once

## Common Pitfalls to Avoid

1. **Don't validate in routes** - All validation belongs in use cases
2. **Don't throw exceptions** - Always return Result types
3. **Don't skip error scenarios** - Test all error paths
4. **Don't mix concerns** - Keep layers separated
5. **Don't forget timestamps** - Always update them
6. **Don't use magic strings** - Use constants and enums
7. **Don't skip database verification** - Always check state in tests

## Migration Guide from Other Patterns

If migrating from a different pattern:

1. **Move validation from routes to use cases**
2. **Replace try-catch with Result pattern**
3. **Extract types from generated operations**
4. **Separate Read and Write mappers**
5. **Add exhaustive pattern matching**
6. **Update tests to verify database state**
7. **Implement proper error handling with Problem Details**

This reference guide represents the proven patterns from the Salon domain implementation and should be followed for all new domain implementations to ensure consistency and maintainability.