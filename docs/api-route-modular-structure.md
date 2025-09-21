# API Route Modular Structure Guide

This guide documents the modular route structure pattern implemented in the Salon domain, serving as a reference for implementing other domains.

## 📂 Directory Structure Pattern

```
backend/packages/api/src/routes/
├── [domain]/                      # Domain folder (e.g., salon, customer, staff)
│   ├── _shared/                   # Shared types and utilities
│   │   ├── types.ts               # Type definitions extracted from generated code
│   │   ├── utils.ts               # Utility functions (error handling, pagination)
│   │   └── index.ts               # Re-exports for convenience
│   ├── list-[domain].handler.ts   # GET /api/v1/[domain] - List all resources
│   ├── create-[domain].handler.ts # POST /api/v1/[domain] - Create new resource
│   ├── get-[domain].handler.ts    # GET /api/v1/[domain]/:id - Get single resource
│   ├── update-[domain].handler.ts # PUT /api/v1/[domain]/:id - Update resource
│   ├── delete-[domain].handler.ts # DELETE /api/v1/[domain]/:id - Delete resource
│   ├── search-[domain].handler.ts # GET /api/v1/[domain]/search - Search resources
│   └── index.ts                    # Route aggregation and registration
└── [domain].routes.ts (deprecated) # Old monolithic file - to be removed
```

## 🎯 Key Principles

### 1. Single Responsibility
Each handler file is responsible for exactly one API endpoint, making the code easier to maintain and test.

### 2. Shared Code Centralization
Common types, utilities, and error handlers are centralized in the `_shared` folder to avoid duplication.

### 3. Type Safety First
All types are extracted from auto-generated OpenAPI types, ensuring consistency with the API specification.

### 4. Clear Endpoint Mapping
The index.ts file clearly shows the mapping between routes and handlers, serving as documentation.

## 📝 Implementation Pattern

### _shared/types.ts - Type Definitions

```typescript
import type { components, operations } from '@beauty-salon-backend/generated'

// ============================================================================
// Operation Types - Maps to API endpoints
// ============================================================================
export type List[Domain]Operation = operations['[Domain]Crud_list']
export type Get[Domain]Operation = operations['[Domain]Crud_get']
export type Delete[Domain]Operation = operations['[Domain]Crud_delete']
export type Create[Domain]Operation = operations['[Domain]Crud_create']
export type Update[Domain]Operation = operations['[Domain]Crud_update']
export type Search[Domain]Operation = operations['[Domain]Crud_search']

// ============================================================================
// Model Types - Core domain models
// ============================================================================
export type [Domain] = components['schemas']['Models.[Domain]']
export type Create[Domain]Request = components['schemas']['Models.Create[Domain]Request']
export type Update[Domain]Request = components['schemas']['Models.Update[Domain]Request']

// ============================================================================
// Response Types - API response structures
// ============================================================================
export type CursorPaginationResponse<T> = {
  data: T[]
  meta: components['schemas']['Models.PaginationMeta']
  links: components['schemas']['Models.PaginationLinks']
}

export type Get[Domain]Response = Extract<
  Get[Domain]Operation['responses']['200']['content']['application/json'],
  { data: unknown }
>

// ============================================================================
// Query Parameter Types
// ============================================================================
export type List[Domain]Query = NonNullable<
  List[Domain]Operation['parameters']['query']
>

// ============================================================================
// Error Types
// ============================================================================
export type ErrorResponse = components['schemas']['Models.ProblemDetails']
```

### _shared/utils.ts - Common Utilities

```typescript
import { toProblemDetails } from '@beauty-salon-backend/domain'
import type { DomainError } from '@beauty-salon-backend/domain'
import type { Response } from 'express'
import type { ErrorResponse } from './types'

/**
 * Standard error handler for domain errors
 * Converts domain errors to Problem Details format (RFC 7807)
 */
export const handleDomainError = (
  res: Response<ErrorResponse>,
  error: DomainError
): Response<ErrorResponse> => {
  const problemDetails = toProblemDetails(error)
  return res.status(problemDetails.status).json(problemDetails)
}

/**
 * Convert cursor to page number for backward compatibility
 */
export const cursorToPage = (
  cursor: string | undefined,
  limit: number
): number => {
  if (!cursor) return 1

  if (cursor.startsWith('offset:')) {
    const offset = Number(cursor.replace('offset:', ''))
    return Math.floor(offset / limit) + 1
  }

  return 1
}
```

### Handler Pattern Example

```typescript
import { [Action][Domain]UseCase } from '@beauty-salon-backend/domain'
import { [Domain]Repository } from '@beauty-salon-backend/infrastructure'
import type { Database } from '@beauty-salon-backend/infrastructure'
import type { RequestHandler, Response } from 'express'
import { match } from 'ts-pattern'
import type {
  [Response]Type,
  ErrorResponse,
  [Request]Type,
} from './_shared'
import { handleDomainError } from './_shared'

/**
 * [HTTP_METHOD] /api/v1/[domain] - [Description]
 *
 * Features:
 * - [Feature 1]
 * - [Feature 2]
 * - [Feature 3]
 */
export const [action][Domain]Handler: RequestHandler<
  [PathParams],
  [Response]Type | ErrorResponse,
  [RequestBody],
  [QueryParams]
> = async (req, res, next) => {
  try {
    // Extract parameters
    const { /* params */ } = req.params
    const { /* query */ } = req.query

    // Get dependencies and execute use case
    const db = req.app.locals.database as Database
    const repository = new [Domain]Repository(db)
    const useCase = new [Action][Domain]UseCase(repository)

    const result = await useCase.execute(/* params */)

    // Handle result with pattern matching
    match(result)
      .with({ type: 'success' }, ({ data }) => {
        const response: [Response]Type = {
          data,
          meta: {
            correlationId: `req-${Date.now()}`,
            timestamp: new Date().toISOString(),
            version: '1.0.0',
          },
          links: {
            self: `/[domain]/${data.id}`,
            list: '/[domain]',
          },
        }
        res.status([STATUS_CODE]).json(response)
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

### index.ts - Route Aggregation

```typescript
import { Router } from 'express'

// Import all handlers
import { create[Domain]Handler } from './create-[domain].handler'
import { delete[Domain]Handler } from './delete-[domain].handler'
import { get[Domain]Handler } from './get-[domain].handler'
import { list[Domain]Handler } from './list-[domain].handler'
import { search[Domain]Handler } from './search-[domain].handler'
import { update[Domain]Handler } from './update-[domain].handler'

/**
 * [Domain] Routes Configuration
 *
 * Routes:
 * - GET    /api/v1/[domain]          → list[Domain]Handler
 * - POST   /api/v1/[domain]          → create[Domain]Handler
 * - GET    /api/v1/[domain]/search   → search[Domain]Handler
 * - GET    /api/v1/[domain]/:id      → get[Domain]Handler
 * - PUT    /api/v1/[domain]/:id      → update[Domain]Handler
 * - DELETE /api/v1/[domain]/:id      → delete[Domain]Handler
 */
const router = Router()

// List and Create operations
router.get('/[domain]', list[Domain]Handler)
router.post('/[domain]', create[Domain]Handler)

// Search operation (before :id to avoid route conflicts)
router.get('/[domain]/search', search[Domain]Handler)

// Single resource operations
router.get('/[domain]/:id', get[Domain]Handler)
router.put('/[domain]/:id', update[Domain]Handler)
router.delete('/[domain]/:id', delete[Domain]Handler)

export default router
```

## 🔄 Migration Steps

To migrate an existing monolithic route file to the modular structure:

1. **Create domain folder structure**
   ```bash
   mkdir -p src/routes/[domain]/_shared
   ```

2. **Extract types to _shared/types.ts**
   - Move all type definitions from the monolithic file
   - Organize by category (Operations, Models, Responses, Queries, Errors)

3. **Extract utilities to _shared/utils.ts**
   - Move handleDomainError function
   - Move any pagination utilities
   - Move any other shared functions

4. **Create individual handler files**
   - One file per endpoint
   - Import necessary types from _shared
   - Keep handler logic focused and single-purpose

5. **Create index.ts for route aggregation**
   - Import all handlers
   - Define router and register routes
   - Add documentation comments

6. **Update main app router import**
   ```typescript
   // Before
   import [domain]Routes from './routes/[domain].routes'

   // After
   import [domain]Routes from './routes/[domain]'
   ```

7. **Test and verify**
   - Run existing tests to ensure functionality
   - Verify type checking passes

## ✅ Benefits

1. **Improved Maintainability**
   - Each handler is isolated and easy to modify
   - Changes to one endpoint don't affect others

2. **Better Code Organization**
   - Clear separation of concerns
   - Easy to locate specific endpoint logic

3. **Enhanced Testability**
   - Individual handlers can be tested in isolation
   - Mocking is simplified

4. **Clearer Documentation**
   - Each handler has its own JSDoc comments
   - Route mapping is explicit in index.ts

5. **Easier Collaboration**
   - Reduced merge conflicts
   - Clear ownership boundaries

6. **Type Safety**
   - Centralized type definitions
   - Consistent type usage across handlers

## 📊 Real Implementation Reference

The Salon domain serves as the reference implementation:

```
backend/packages/api/src/routes/salon/
├── _shared/
│   ├── types.ts      (67 lines)
│   ├── utils.ts      (39 lines)
│   └── index.ts      (4 lines)
├── list-salons.handler.ts    (59 lines)
├── create-salon.handler.ts   (59 lines)
├── search-salons.handler.ts  (68 lines)
├── get-salon.handler.ts      (58 lines)
├── update-salon.handler.ts   (63 lines)
├── delete-salon.handler.ts   (46 lines)
└── index.ts                   (40 lines)

Total: ~453 lines (vs ~336 lines in monolithic file)
```

While the modular approach has more total lines, it provides:
- Better separation of concerns
- Easier navigation
- Reduced cognitive load
- Improved maintainability

## 🎯 Implementation Checklist

When implementing for a new domain:

- [ ] Create domain folder with _shared subfolder
- [ ] Define all types in _shared/types.ts
- [ ] Create utility functions in _shared/utils.ts
- [ ] Implement list handler
- [ ] Implement create handler
- [ ] Implement get handler
- [ ] Implement update handler
- [ ] Implement delete handler
- [ ] Implement search handler (if applicable)
- [ ] Create index.ts with route registration
- [ ] Update main app router import
- [ ] Run tests to verify functionality
- [ ] Run type checking
- [ ] Update API documentation