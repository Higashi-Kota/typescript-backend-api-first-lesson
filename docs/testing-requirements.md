# Testing Requirements - Salon Domain Reference Implementation

このドキュメントは、Salonドメインの実装を完全なリファレンスとして、テスト要件とパターンを定義します。

## 🎯 Testing Philosophy

### Core Principles
1. **Production-like Testing**: Testcontainersで実際のPostgreSQLを使用
2. **Complete Isolation**: 各テストが独立したスキーマで実行
3. **No Mocking**: 実装とリアルな依存関係でテスト
4. **Type Safety**: テスト全体で型の流れを維持
5. **Fast Feedback**: 高速なテスト実行を最適化

## 📊 Coverage Requirements

### Minimum Coverage Targets
| Layer | Coverage | Test Type |
|-------|----------|-----------|
| API Routes | 100% | Integration |
| Use Cases | 95% | Integration |
| Utilities | 90% | Unit |
| Mappers | 90% | Integration |

### Required Test Scenarios per Endpoint
- **Success cases**: 最低2パターン
- **Error cases**: 最低5パターン
- **Edge cases**: 最低2パターン
- **DB verification**: 全mutation操作後

## 🏗️ Test Infrastructure

### Schema Isolation Architecture

```typescript
// backend/packages/api/src/__tests__/_shared/setup.ts
beforeAll:
  - Start PostgreSQL container (once)
  - Initialize shared enums (once)

beforeEach:
  - Create test-specific schema
  - Apply migrations to schema
  - Set search_path for isolation

afterEach:
  - Drop test schema CASCADE
  - Clean up connections

afterAll:
  - Stop container
```

### Test Helpers Structure

```
backend/packages/api/src/__tests__/_shared/
├── setup.ts              # Global test setup
├── test-helpers.ts       # Utility functions
├── test-schema-manager.ts # Schema management
└── app.ts               # Express app factory
```

## 🧪 Reference Implementation: Salon Domain

### 1. Integration Test Structure

```typescript
// backend/packages/api/src/__tests__/salon.test.ts
describe('Salon API Integration Tests', () => {
  let app: Express
  let db: ReturnType<typeof getTestDb>

  beforeEach(() => {
    app = createTestApp()
    db = getTestDb()
  })

  // CRUD Operations
  describe('POST /api/v1/salons', () => {
    it('should create a salon with valid data', async () => {
      const salonData = createFullSalonData()

      const response = await request(app)
        .post('/api/v1/salons')
        .send(salonData)

      expect(response.status).toBe(201)
      expect(response.body.data).toBeDefined()

      // DB verification
      const result = await db.execute(sql`SELECT * FROM salons`)
      expect(result.length).toBe(1)
    })

    it('should return validation error for invalid email', async () => {
      const invalidData = {
        ...createFullSalonData(),
        contactInfo: { email: 'invalid-email' }
      }

      const response = await request(app)
        .post('/api/v1/salons')
        .send(invalidData)
        .expect(400)

      expect(response.body.type).toContain('validation-error')
    })
  })
})
```

### 2. Test Data Patterns

```typescript
// Factory functions for complete objects
export const createFullSalonData = (): CreateSalonRequest => ({
  name: 'Test Salon',
  description: 'A test salon',
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
  openingHours: generateOpeningHours(),
  businessHours: null,
  imageUrls: null,
  features: null,
})

// Direct DB insertion for existing data
const insertTestSalon = async (db: Database, data: Partial<DbSalon>) => {
  const id = data.id || createId()
  await db.execute(sql`
    INSERT INTO salons (id, name, ...)
    VALUES (${id}, ${data.name}, ...)
  `)
  return id
}
```

### 3. Response Assertions

```typescript
// CursorPaginationResponse structure
expect(response.body).toMatchObject({
  data: expect.arrayContaining([]),
  meta: {
    total: expect.any(Number),
    limit: expect.any(Number),
    hasMore: expect.any(Boolean),
  },
  links: expect.any(Object),
})

// Problem Details error format
expect(response.body).toMatchObject({
  type: 'https://example.com/probs/validation-error',
  title: 'Validation failed',
  status: 400,
  detail: expect.stringContaining('Invalid'),
})
```

## 📝 Implementation Patterns from Salon

### API Route Pattern (No Validation in Routes)

```typescript
// backend/packages/api/src/routes/salon.routes.ts
const createSalonHandler: RequestHandler<
  Record<string, never>,
  CreateSalonResponse | ErrorResponse,
  CreateSalonRequest
> = async (req, res, next) => {
  try {
    const db = req.app.locals.database as Database
    const salonRepository = new SalonRepository(db)
    const useCase = new CreateSalonUseCase({ salonRepository })

    // Direct delegation to use case
    const result = await useCase.execute(req.body)

    match(result)
      .with({ type: 'success' }, ({ data }) => {
        res.status(201).json({ data, meta: {...}, links: {...} })
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

### Use Case with Mapper Pattern

```typescript
// backend/packages/domain/src/business-logic/salon/list-salons.usecase.ts
export class ListSalonsUseCase extends BaseSalonUseCase {
  async execute(
    page = 1,
    limit = 20
  ): Promise<Result<PaginatedResult<ApiSalon>, DomainError>> {
    const salonsResult = await this.repository.findAll(...)

    if (Result.isError(salonsResult)) {
      return salonsResult
    }

    // Mapper returns correct type
    const apiSalons = SalonReadMapper.toApiSalonFullList(
      salonsResult.data.data,
      new Map()
    )

    return Result.success({
      data: apiSalons, // No type casting needed
      meta: salonsResult.data.meta,
      links: salonsResult.data.links,
    })
  }
}
```

## ✅ Test Implementation Checklist

### For Each New Domain

#### Setup Phase
- [ ] Create `__tests__/[domain].test.ts`
- [ ] Import test helpers and utilities
- [ ] Setup beforeEach hooks

#### CRUD Test Coverage
- [ ] **POST**: Create with valid data
- [ ] **POST**: Validation errors (5+ cases)
- [ ] **GET**: List all with pagination
- [ ] **GET**: Empty list scenario
- [ ] **GET**: Single item by ID
- [ ] **GET**: 404 for non-existent
- [ ] **GET**: 400 for invalid UUID
- [ ] **PUT**: Update existing
- [ ] **PUT**: 404 for non-existent
- [ ] **DELETE**: Soft delete
- [ ] **DELETE**: 404 for non-existent

#### Search/Filter (if applicable)
- [ ] Search by keyword
- [ ] Filter by category
- [ ] Combined filters
- [ ] Empty results

#### Database Verification
- [ ] Verify INSERT after POST
- [ ] Verify UPDATE after PUT
- [ ] Verify soft delete (deletedAt)
- [ ] Check related data

## 🚀 Test Execution

```bash
# Run salon tests (reference)
pnpm test salon.test.ts

# Run all API tests
cd backend/packages/api && pnpm test

# Run with coverage
pnpm test --coverage

# Watch mode during development
pnpm test --watch
```

## 📈 Performance Benchmarks (Salon Domain)

| Operation | Tests | Time | Per Test |
|-----------|-------|------|----------|
| Full Suite | 15 | 4.89s | 326ms |
| POST | 3 | 272ms | 91ms |
| GET List | 3 | 284ms | 95ms |
| GET Single | 3 | 245ms | 82ms |
| PUT | 2 | 184ms | 92ms |
| DELETE | 2 | 254ms | 127ms |
| Search | 2 | 200ms | 100ms |

Target: < 500ms per integration test

## 🔍 Key Lessons from Salon Implementation

### What Works
1. **Schema isolation**: 完全な並行実行が可能
2. **No mocking**: 実際のDBで信頼性の高いテスト
3. **Type safety**: キャストなしで型の流れを維持
4. **Fast execution**: 15テストで5秒未満

### Patterns to Replicate
1. **Test data factories**: 再利用可能なデータ生成
2. **Direct DB insertion**: 既存データシナリオ用
3. **Response structure validation**: API仕様の保証
4. **Error format consistency**: Problem Details準拠

### Anti-patterns to Avoid
- ❌ Type casting in tests
- ❌ Test interdependencies
- ❌ Hardcoded test data
- ❌ Missing DB verification
- ❌ Incomplete error scenarios

## 🎓 Applying to Other Domains

When implementing Customer, Staff, Service domains:

1. **Copy Structure**: Salonテストファイルをテンプレートとして使用
2. **Adapt Fields**: ドメイン固有のフィールドに調整
3. **Business Rules**: ドメイン特有のビジネスルールを追加
4. **Maintain Patterns**: 同じアサーションと検証パターンを維持

Example adaptation for Customer domain:
```typescript
// backend/packages/api/src/__tests__/customer.test.ts
describe('Customer API Integration Tests', () => {
  // Same structure as salon.test.ts
  // Adapt fields: email, phoneNumber, loyaltyPoints, etc.
  // Add customer-specific tests: email verification, loyalty program
})
```

## 📋 Summary

Salon domain demonstrates a complete, production-ready test implementation with:
- 100% endpoint coverage
- Real database testing
- Type-safe patterns
- Fast execution
- Clear structure

Use this as the authoritative reference for all domain test implementations.