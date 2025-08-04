# Code Style and Conventions

## TypeScript Configuration
- **Target**: ESNext with strict mode enabled
- **Key Settings**:
  - `strict: true` - All strict checks enabled
  - `noUncheckedIndexedAccess: true` - Array access safety
  - `noUnusedLocals: true` - No unused variables
  - `noUnusedParameters: true` - No unused parameters
  - `noFallthroughCasesInSwitch: true` - Switch safety

## Code Formatting (Biome)
- **Indentation**: 2 spaces
- **Quotes**: Single quotes for JavaScript/TypeScript
- **Semicolons**: As needed (no unnecessary semicolons)
- **Trailing Commas**: ES5 style
- **Line Endings**: LF (Unix style)

## Linting Rules
- **No `any` types** - `noExplicitAny: error`
- **No `var`** - Use `const` or `let`
- **No unused imports/variables** - Automatically flagged
- **Use const assertions** - For literal types
- **Exhaustive dependencies** - React hooks compliance

## Naming Conventions

### Files and Directories
- **Files**: kebab-case (e.g., `customer-repository.ts`)
- **Test Files**: `*.test.ts` or in `__tests__/` directory
- **Directories**: kebab-case

### Code Elements
- **Interfaces/Types**: PascalCase (e.g., `CustomerData`)
- **Classes**: PascalCase
- **Functions**: camelCase (e.g., `createCustomer`)
- **Constants**: camelCase or UPPER_SNAKE_CASE for config
- **Variables**: camelCase
- **Brand Types**: PascalCase with "Id" suffix (e.g., `CustomerId`)

## Type Patterns

### Sum Types (Discriminated Unions)
```typescript
type Entity =
  | { type: 'active'; data: EntityData }
  | { type: 'suspended'; data: EntityData; reason: string }
  | { type: 'deleted'; data: EntityData; deletedAt: Date }
```

### Result Type Pattern
```typescript
type Result<T, E> = 
  | { type: 'ok'; value: T }
  | { type: 'err'; error: E }
```

### Brand Types for IDs
```typescript
type CustomerId = Brand<string, 'CustomerId'>
type SalonId = Brand<string, 'SalonId'>
```

## Import Organization
1. External libraries
2. Internal packages (`@beauty-salon/*`)
3. Relative imports (`../`, `./`)
4. Type imports last

## Pattern Matching
- Always use `ts-pattern` for Sum types
- Use `.exhaustive()` to ensure all cases handled
- No switch statements without exhaustive checks

## Error Handling
- Never throw exceptions in domain/usecase layers
- Always return Result types
- Use Sum types for error variants
- Log errors at API layer only

## Testing Conventions
- AAA pattern: Arrange, Act, Assert
- Minimum 5 error case tests per function
- Use Sum types for test scenarios
- Test with real data, not mocks when possible
- Use testcontainers for integration tests

## Documentation
- No unnecessary comments in code
- Use TypeScript types as documentation
- Complex business logic should have brief explanations
- API endpoints should have OpenAPI documentation

## Git Commit Messages
- Present tense, imperative mood
- Concise and descriptive
- Reference issue numbers when applicable
- Examples:
  - "Add customer search endpoint"
  - "Fix validation in reservation model"
  - "Update dependencies"

## File Structure Pattern
```typescript
// 1. Imports
import { match } from 'ts-pattern'

// 2. Type definitions
type Customer = { ... }

// 3. Constants
const MAX_RETRIES = 3

// 4. Main functions
export const createCustomer = () => { ... }

// 5. Helper functions (if needed)
const validateEmail = () => { ... }
```