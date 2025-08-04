# Task Completion Checklist

## Before Considering a Task Complete

### 1. Code Quality Checks
```bash
# Run formatting
pnpm format:fix

# Run linter
pnpm lint

# Type checking
pnpm typecheck

# Check for unused code
pnpm knip
```

### 2. Type Generation (if API changes)
```bash
# Regenerate types if TypeSpec/OpenAPI changed
pnpm generate

# Format generated files
pnpm format:fix
```

### 3. Testing
```bash
# Run tests for affected packages
pnpm test

# For backend changes, run integration tests
pnpm test:integration
```

### 4. CI Validation
```bash
# Run complete CI check locally
make ci-check
```

### 5. Build Verification
```bash
# Ensure everything builds
make build

# For backend changes
make backend-build
make backend-start  # Verify it runs

# For frontend changes  
make frontend-build
make frontend-dev   # Verify it runs
```

## Expected State After Task Completion

✅ **All checks must pass:**
- `pnpm lint` - No warnings or errors
- `pnpm typecheck` - No type errors
- `pnpm test` - All tests green
- `pnpm format:check` - Properly formatted
- `make ci-check` - All CI checks pass

✅ **Code follows conventions:**
- Sum types for state management
- Result types for error handling
- Pattern matching with exhaustive checks
- No `any` types or type assertions
- AAA pattern in tests

✅ **Documentation updated (if needed):**
- API changes reflected in TypeSpec
- Complex logic has brief comments
- README updated for new features

## Common Issues to Check

### TypeScript Errors
- Ensure `noUncheckedIndexedAccess` compliance
- Check for implicit `any` types
- Verify exhaustive pattern matching

### API Consistency
- Request/response types match TypeSpec
- Error responses follow standard format
- Pagination follows uniform pattern

### Database Changes
- Migration files generated
- Seeds updated if needed
- Repository methods tested

### Security
- No hardcoded secrets
- Input validation in place
- Authentication/authorization checked
- Rate limiting for sensitive endpoints

## Quick Validation Commands

```bash
# One-liner to check everything
make ci-check && echo "✅ All checks passed!" || echo "❌ Checks failed"

# Quick format and lint
pnpm format:fix && pnpm lint

# Quick type and test
pnpm typecheck && pnpm test
```

## Red Flags - Task NOT Complete If:
- 🚫 Any TypeScript errors
- 🚫 Lint warnings about unused variables
- 🚫 Tests failing or not written
- 🚫 API types don't match implementation
- 🚫 Build fails
- 🚫 `make ci-check` fails

## Final Verification
Before marking complete, ask yourself:
1. Would this pass code review?
2. Are all edge cases handled?
3. Is the code maintainable?
4. Does it follow project patterns?
5. Would CI/CD pipeline succeed?