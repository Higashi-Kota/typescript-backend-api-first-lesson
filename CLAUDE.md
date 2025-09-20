# Development Guidelines

This document defines the core development principles and coding standards for the Beauty Salon Reservation System.

## 🏗️ Architecture

The system follows Clean Architecture with API-First development. See [docs/architecture-overview.md](docs/architecture-overview.md) for detailed architecture documentation.

### Key Principles

1. **API-First**: TypeSpec → OpenAPI → TypeScript types
2. **Clean Architecture**: Domain/UseCase/Infrastructure/API layers
3. **Type Safety**: Sum types with exhaustive pattern matching
4. **Exception-Free**: Result types for all error handling
5. **YAGNI**: No code "for the future"

## 🔒 Type Safety Requirements

### Absolute Rules
- ❌ **NO** `any` types
- ❌ **NO** type assertions (`as`)
- ❌ **NO** type guards
- ❌ **NO** throwing exceptions
- ✅ **USE** Sum types for all state
- ✅ **USE** ts-pattern for exhaustive matching
- ✅ **USE** Result types for errors

### TypeScript Configuration
```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noPropertyAccessFromIndexSignature": true
  }
}
```

See [docs/typescript-configuration.md](docs/typescript-configuration.md) for complete configuration.

## 🎨 Sum Types & Pattern Matching

All state management uses discriminated unions (Sum types) with ts-pattern:

```typescript
// State definition
type EntityState =
  | { type: 'active'; entity: Entity }
  | { type: 'inactive'; reason: string }
  | { type: 'deleted'; deletedAt: string }

// Exhaustive handling
const handleState = (state: EntityState) =>
  match(state)
    .with({ type: 'active' }, ({ entity }) => processActive(entity))
    .with({ type: 'inactive' }, ({ reason }) => processInactive(reason))
    .with({ type: 'deleted' }, ({ deletedAt }) => processDeleted(deletedAt))
    .exhaustive()
```

See [docs/sum-types-pattern-matching.md](docs/sum-types-pattern-matching.md) for patterns.

## 🎯 Implementation Standards

### Uniform Patterns
All implementations must follow standardized patterns for:
- Pagination
- Response formatting
- Error handling
- Date/time processing (date-fns)
- Query parameters
- Authorization
- Logging
- ID validation

See [docs/uniform-implementation-guide.md](docs/uniform-implementation-guide.md) for implementation patterns.

## 🧪 Testing Requirements

### Minimum Coverage
- Unit tests for all domain logic
- Integration tests with testcontainers
- E2E tests for critical paths
- Minimum 5 error scenarios per endpoint

### Test Structure
```typescript
describe('Feature', () => {
  it('should handle success case', async () => {
    // Arrange
    const input = createTestInput()

    // Act
    const result = await executeFeature(input)

    // Assert
    expect(result).toMatchObject({ type: 'success' })
  })
})
```

See [docs/testing-requirements.md](docs/testing-requirements.md) for testing patterns.

## 📁 Package Structure

### Backend Packages
```
backend/packages/
├── domain/           # Pure business logic
├── infrastructure/   # External services
├── api/             # HTTP layer
├── database/        # DB schemas
├── generated/       # Auto-generated types
└── config/          # Configuration
```

### Namespace Convention
- Backend: `@beauty-salon-backend/*`
- Frontend: `@beauty-salon-frontend/*`
- Specs: `@beauty-salon/specs`
- Shared: `@beauty-salon-shared/*`

## 🔄 Development Workflow

### Type Generation Pipeline
1. Define models in TypeSpec (`specs/`)
2. Generate OpenAPI: `pnpm generate:spec`
3. Generate types: `pnpm generate:backend`
4. Implement with generated types

### Code Quality Checks
```bash
pnpm lint        # Linting
pnpm typecheck   # Type checking
pnpm test        # Unit tests
pnpm format:fix  # Auto-format
```

## 🚀 Quick Commands

```bash
# Development
pnpm dev              # Start all services
pnpm generate         # Generate all types

# Database
pnpm db:fresh         # Complete reset with schema and seed
pnpm db:migrate       # Run migrations (Drizzle + SQL files)
pnpm db:seed          # Seed data with statistics
pnpm db:truncate      # Clear all table data
pnpm db:introspect    # Generate TypeScript schema from DB

# Testing
pnpm test             # Unit tests
pnpm test:integration # Integration tests
pnpm test:e2e        # End-to-end tests

# Build
pnpm build           # Development build
pnpm build:prod      # Production build
```

## 📚 Documentation References

### Core Concepts
- [Architecture Overview](docs/architecture-overview.md)
- [Type Safety Principles](docs/type-safety-principles.md)
- [Sum Types & Pattern Matching](docs/sum-types-pattern-matching.md)

### Implementation Guides
- [Backend Architecture](docs/backend-architecture-guidelines.md)
- [Uniform Implementation](docs/uniform-implementation-guide.md)
- [Testing Requirements](docs/testing-requirements.md)
- [Multi-Agent Collaboration](docs/multi-agent-collaboration-framework.md)

### API Development
- [TypeSpec API Rules](docs/typespec-api-type-rules.md)
- [Type Generation System](docs/type-generation-system.md)
- [API Testing Guide](docs/api-testing-guide.md)

## ⚠️ Important Notes

### TypeSpec Enum Naming
All Enum types must end with `Type` suffix (e.g., `ServiceCategoryType`, `PaymentMethodType`)

### DB-Driven Models
Database schemas are the source of truth for domain models:
```typescript
// Types are inferred from Drizzle ORM schemas
type Customer = typeof customers.$inferSelect
type NewCustomer = typeof customers.$inferInsert
```

### Clean Code Policy
- Remove unused code immediately
- No commented-out code
- No "TODO" comments without tickets
- Use YAGNI principle strictly

## 🎯 Definition of Done

✅ All TypeScript strict checks pass
✅ No linting warnings
✅ All tests green
✅ API documentation updated
✅ Code follows Sum type patterns
✅ No exceptions thrown
✅ Result types used for errors
✅ Pattern matching is exhaustive