# テスト要件

TypeScriptバックエンド開発におけるテスト要件と実装パターンを定義します。

## 単体テスト（Unit Test）

### 基本要件

- **新規ロジックに対する細粒度のテストを実装**
- 条件分岐、バリデーション、エラーケースなどを網羅
- 概念テスト・型だけのテストは不可

### 純粋関数のテスト例

```typescript
// domain/task/taskLogic.test.ts
import { describe, it, expect } from 'vitest';
import { calculateTaskPriority } from './taskLogic';
import { subDays } from 'date-fns';

describe('calculateTaskPriority', () => {
  const currentDate = new Date('2024-01-15');
  
  it('should return 0 for draft tasks', () => {
    const task = { type: 'draft' as const, id: '1', title: 'Test' };
    const result = calculateTaskPriority(task, currentDate);
    
    expect(result).toEqual({ type: 'ok', value: 0 });
  });
  
  it('should return error for overdue tasks', () => {
    const task = {
      type: 'assigned' as const,
      id: '1',
      title: 'Test',
      assignee: { id: 'user1', name: 'Test User' },
      dueDate: subDays(currentDate, 1)
    };
    const result = calculateTaskPriority(task, currentDate);
    
    expect(result).toEqual({ type: 'err', error: 'Task is overdue' });
  });
  
  it('should calculate priority based on days until due', () => {
    const testCases = [
      { daysUntilDue: 1, expectedPriority: 5 },
      { daysUntilDue: 3, expectedPriority: 4 },
      { daysUntilDue: 7, expectedPriority: 3 },
      { daysUntilDue: 14, expectedPriority: 2 },
    ];
    
    testCases.forEach(({ daysUntilDue, expectedPriority }) => {
      const task = {
        type: 'assigned' as const,
        id: '1',
        title: 'Test',
        assignee: { id: 'user1', name: 'Test User' },
        dueDate: addDays(currentDate, daysUntilDue)
      };
      const result = calculateTaskPriority(task, currentDate);
      
      expect(result).toEqual({ type: 'ok', value: expectedPriority });
    });
  });
});
```

## 統合テスト（Integration Test）

### 基本要件

- APIレベルでの**E2Eフロー確認**
- リクエスト／レスポンス構造の妥当性
- DB書き込み・読み出しの整合性
- エラーハンドリングの検証
- **Testcontainersを使用した実際のデータベース環境でのテスト**

### AAA（Arrange-Act-Assert）パターン

各テストを以下の3つのフェーズで構成：

```typescript
it('should handle example feature', async () => {
  // Arrange（準備）: テストの前提条件を設定
  const app = await setupTestApp();
  const user = await createAndAuthenticateUser(app);
  const initialData = createTestData();
  
  // Act（実行）: テスト対象の操作を実行
  const response = await request(app)
    .post('/api/endpoint')
    .set('Authorization', `Bearer ${user.token}`)
    .send(initialData);
  
  // Assert（検証）: 期待される結果を確認
  expect(response.status).toBe(200);
  await verifyDatabaseState(db, expectedState);
  await verifySideEffects(app);
});
```

### テスト設計の必須要素

#### 1. Arrange（準備）フェーズ

- 実際のデータを作成（モックやハードコードされた値を避ける）
- 必要な前提条件をすべて満たす
- テスト環境の初期状態を明確に定義

```typescript
// ✅ 良い例: 実際のデータを動的に作成
const user = await createTestUser({
  email: `test-${randomUUID()}@example.com`,
  role: 'member'
});

const task = await createTestTask({
  title: 'Test Task',
  assigneeId: user.id,
  dueDate: addDays(new Date(), 7)
});

// ❌ 悪い例: ハードコードされた値
const userId = 'user-123'; // 固定ID
const taskId = 'task-456'; // 固定ID
```

#### 2. Act（実行）フェーズ

- 実際のユーザー操作を再現
- 1つのテストにつき1つの主要なアクションに焦点を当てる
- APIエンドポイントへの実際のHTTPリクエストを実行

```typescript
const response = await request(app)
  .put(`/tasks/${task.id}`)
  .set('Authorization', `Bearer ${user.token}`)
  .send({
    status: 'completed'
  });
```

#### 3. Assert（検証）フェーズ

- レスポンスのステータスコードと本文を検証
- データベースの状態変更を確認
- 副作用（ログ、通知、関連データの更新）を検証
- エラーケースではエラーメッセージの内容も確認

```typescript
// レスポンスの検証
expect(response.status).toBe(200);
expect(response.body.type).toBe('success');
expect(response.body.data.status).toBe('completed');

// データベースの状態を確認
const updatedTask = await db.task.findUnique({
  where: { id: task.id }
});
expect(updatedTask?.status).toBe('completed');
expect(updatedTask?.completedAt).toBeDefined();

// 副作用の検証（例：監査ログ）
const auditLog = await db.auditLog.findFirst({
  where: {
    entityId: task.id,
    action: 'UPDATE'
  }
});
expect(auditLog).toBeDefined();
```

### Sum型とts-patternを活用したテストシナリオ

```typescript
// backend/packages/api/src/__tests__/task.integration.test.ts
import { match } from 'ts-pattern';

describe('Task API', () => {
  // テストシナリオをSum型で定義
  const scenarios: TestScenario[] = [
    { type: 'happyPath', description: 'creates task with valid data' },
    { 
      type: 'errorCase', 
      error: { type: 'validation', fields: [] }, 
      description: 'rejects invalid title' 
    },
    { 
      type: 'edgeCase', 
      condition: 'max title length', 
      description: 'handles maximum title length' 
    },
  ];

  scenarios.forEach(scenario => {
    it(`should ${scenario.description}`, async () => {
      // 共通のセットアップ
      const userResult = await builder.user()
        .withRole('member')
        .build();
      
      if (userResult.type !== 'ok') {
        throw new Error('Failed to create test user');
      }
      
      const user = userResult.value;

      // シナリオに基づいた実行とアサーション
      await match(scenario)
        .with({ type: 'happyPath' }, async () => {
          const response = await client.request('POST', '/tasks', {
            token: user.token,
            body: {
              title: 'Test Task',
              priority: 3,
            },
          });

          assertTestResult(response, (res) => {
            expect(res.status).toBe(201);
            assertApiResponse(res.body, (data) => {
              expect(data.title).toBe('Test Task');
              expect(data.createdBy).toBe(user.id);
            });
          });
        })
        .with({ type: 'errorCase' }, async ({ error }) => {
          const response = await client.request('POST', '/tasks', {
            token: user.token,
            body: { title: '' }, // 無効なデータ
          });

          assertTestResult(response, (res) => {
            expect(res.status).toBe(400);
            assertApiError(res.body, error);
          });
        })
        .with({ type: 'edgeCase' }, async () => {
          const maxLengthTitle = 'a'.repeat(200);
          const response = await client.request('POST', '/tasks', {
            token: user.token,
            body: {
              title: maxLengthTitle,
              priority: 3,
            },
          });

          assertTestResult(response, (res) => {
            expect(res.status).toBe(201);
            assertApiResponse(res.body, (data) => {
              expect(data.title).toBe(maxLengthTitle);
            });
          });
        })
        .exhaustive();
    });
  });
});
```

### 統合テストのベストプラクティス

#### 1. 独立性の確保

```typescript
// 各テストは独立した環境で実行
beforeEach(async () => {
  // 新しいデータベーススキーマを作成
  const schemaName = `test_${randomUUID().replace(/-/g, '_')}`;
  await createTestSchema(schemaName);
  
  // テスト用のアプリケーションインスタンスを作成
  app = await createTestApp({ schemaName });
});

afterEach(async () => {
  // スキーマをドロップしてクリーンアップ
  await dropTestSchema(schemaName);
});
```

**重要**: Testcontainersとスキーマ分離を組み合わせることで、コンテナの起動コストを削減しつつ、テスト間の完全なデータ隔離を実現します。

### Testcontainersの活用

統合テストでは**Testcontainers**を徹底的に活用し、実際のデータベース環境でテストを実行します。コンテナの再利用とスキーマ分離を組み合わせることで、高速かつ完全に隔離されたテスト環境を実現します。

#### 基本設定

```typescript
// tests/setup/testcontainers.ts
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { RedisContainer } from '@testcontainers/redis';
import { GenericContainer } from 'testcontainers';

export class TestEnvironment {
  private static instance: TestEnvironment;
  private postgresContainer?: PostgreSqlContainer;
  private redisContainer?: RedisContainer;
  
  static async getInstance(): Promise<TestEnvironment> {
    if (!TestEnvironment.instance) {
      TestEnvironment.instance = new TestEnvironment();
      await TestEnvironment.instance.start();
    }
    return TestEnvironment.instance;
  }
  
  async start(): Promise<void> {
    // PostgreSQLコンテナの起動
    this.postgresContainer = await new PostgreSqlContainer('postgres:15-alpine')
      .withExposedPorts(5432)
      .withDatabase('testdb')
      .withUsername('testuser')
      .withPassword('testpass')
      .withReuse() // コンテナの再利用で高速化
      .start();
    
    // Redisコンテナの起動
    this.redisContainer = await new RedisContainer('redis:7-alpine')
      .withExposedPorts(6379)
      .withReuse()
      .start();
  }
  
  getPostgresConnectionString(): string {
    if (!this.postgresContainer) {
      throw new Error('PostgreSQL container not started');
    }
    return this.postgresContainer.getConnectionUri();
  }
  
  getRedisConnectionString(): string {
    if (!this.redisContainer) {
      throw new Error('Redis container not started');
    }
    return `redis://${this.redisContainer.getHost()}:${this.redisContainer.getMappedPort(6379)}`;
  }
  
  async stop(): Promise<void> {
    await Promise.all([
      this.postgresContainer?.stop(),
      this.redisContainer?.stop()
    ]);
  }
}
```

#### テストでの使用例

```typescript
// backend/packages/api/src/__tests__/reservation.integration.test.ts
import { TestEnvironment } from '../../setup/testcontainers';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@beauty-salon-backend/database';
import { createApp } from '../../../src/app';
import { createCustomerId, createSalonId, createStaffId } from '@beauty-salon-backend/domain';

describe('Reservation API Integration Tests', () => {
  let testEnv: TestEnvironment;
  let prisma: PrismaClient;
  let app: Application;
  
  beforeAll(async () => {
    // Testcontainersで実際のDBを起動
    testEnv = await TestEnvironment.getInstance();
    
    // Drizzle ORMクライアントの初期化
    const queryClient = postgres(testEnv.getPostgresConnectionString());
    db = drizzle(queryClient, { schema });
    
    // マイグレーションの実行
    await db.execute(sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    // Drizzleマイグレーションを実行
    await migrate(db, { migrationsFolder: './migrations' });
    
    // アプリケーションの初期化
    app = createApp({
      database: db,
      redis: testEnv.getRedisConnectionString()
    });
  });
  
  afterAll(async () => {
    // 接続をクローズ
    await queryClient.end();
    // Testcontainersは自動的にクリーンアップされる
  });
  
  beforeEach(async () => {
    // 各テスト前にデータをクリア
    await db.delete(schema.reservations);
    await db.delete(schema.customers);
    await db.delete(schema.staffs);
    await db.delete(schema.salons);
  });
  
  it('should create reservation with real database', async () => {
    // Arrange: 実際のDBにテストデータを作成
    const salonId = createSalonId(randomUUID());
    const [salon] = await db.insert(schema.salons).values({
      id: salonId,
      name: 'Test Salon',
      address: '123 Test St'
    }).returning();
    
    const staffId = createStaffId(randomUUID());
    const [staff] = await db.insert(schema.staffs).values({
      id: staffId,
      name: 'Test Staff',
      salonId: salon.id
    }).returning();
    
    const customerId = createCustomerId(randomUUID());
    const [customer] = await db.insert(schema.customers).values({
      id: customerId,
      name: 'Test Customer',
      email: 'test@example.com',
      phone_number: '090-1234-5678'
    }).returning();
    
    // Act: APIエンドポイントにリクエスト
    const response = await request(app)
      .post('/reservations')
      .send({
        customerId: customer.id,
        staffId: staff.id,
        serviceId: createServiceId(randomUUID()),
        scheduledFor: addDays(new Date(), 1).toISOString()
      });
    
    // Assert: レスポンスとDB状態を検証
    expect(response.status).toBe(201);
    expect(response.body.type).toBe('success');
    
    // 実際のDBから確認
    const [savedReservation] = await db
      .select()
      .from(schema.reservations)
      .where(eq(schema.reservations.id, response.body.data.id))
      .limit(1);
    
    expect(savedReservation).toBeDefined();
    expect(savedReservation?.customerId).toBe(customer.id);
    expect(savedReservation?.staffId).toBe(staff.id);
  });
});
```

#### 複数サービスのテスト

```typescript
// tests/setup/multi-service.ts
export class MultiServiceTestEnvironment {
  private postgresContainer?: PostgreSqlContainer;
  private redisContainer?: RedisContainer;
  private elasticsearchContainer?: GenericContainer;
  private kafkaContainer?: KafkaContainer;
  
  async start(): Promise<void> {
    // 並列でコンテナを起動
    const [postgres, redis, elasticsearch, kafka] = await Promise.all([
      new PostgreSqlContainer('postgres:15-alpine').start(),
      new RedisContainer('redis:7-alpine').start(),
      new GenericContainer('elasticsearch:8.11.0')
        .withExposedPorts(9200)
        .withEnvironment({
          'discovery.type': 'single-node',
          'xpack.security.enabled': 'false'
        })
        .start(),
      new KafkaContainer('confluentinc/cp-kafka:7.5.0').start()
    ]);
    
    this.postgresContainer = postgres;
    this.redisContainer = redis;
    this.elasticsearchContainer = elasticsearch;
    this.kafkaContainer = kafka;
  }
}
```

#### パフォーマンスの最適化

```typescript
// tests/setup/global-setup.ts
import { TestEnvironment } from './testcontainers';

// グローバルセットアップでコンテナを一度だけ起動
export default async function globalSetup() {
  const testEnv = await TestEnvironment.getInstance();
  
  // 環境変数に接続情報を設定
  process.env.DATABASE_URL = testEnv.getPostgresConnectionString();
  process.env.REDIS_URL = testEnv.getRedisConnectionString();
  
  // グローバル変数に保存（teardownで使用）
  (global as any).__TEST_ENV__ = testEnv;
}

// tests/setup/global-teardown.ts
export default async function globalTeardown() {
  const testEnv = (global as any).__TEST_ENV__;
  if (testEnv) {
    await testEnv.stop();
  }
}

// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globalSetup: './tests/setup/global-setup.ts',
    globalTeardown: './tests/setup/global-teardown.ts',
    // ...
  }
});
```

#### データベーススナップショット

```typescript
// tests/utils/database-snapshot.ts
export class DatabaseSnapshot {
  constructor(private prisma: PrismaClient) {}
  
  async create(name: string): Promise<void> {
    // PostgreSQL固有のスナップショット機能を使用
    await this.prisma.$executeRaw`SAVEPOINT ${name}`;
  }
  
  async restore(name: string): Promise<void> {
    await this.prisma.$executeRaw`ROLLBACK TO SAVEPOINT ${name}`;
  }
  
  async release(name: string): Promise<void> {
    await this.prisma.$executeRaw`RELEASE SAVEPOINT ${name}`;
  }
}

// 使用例
describe('Complex transaction tests', () => {
  let snapshot: DatabaseSnapshot;
  
  beforeEach(async () => {
    snapshot = new DatabaseSnapshot(prisma);
    await snapshot.create('test_start');
  });
  
  afterEach(async () => {
    // テスト後に自動的にロールバック
    await snapshot.restore('test_start');
  });
  
  it('should handle complex transaction', async () => {
    // 複雑なトランザクション処理のテスト
    // すべての変更は自動的にロールバックされる
  });
});
```

#### テスト間のデータ隔離：スキーマ分離戦略

Testcontainersでコンテナを再利用しつつ、テスト間の完全なデータ隔離を実現します。

```typescript
// tests/setup/schema-isolation.ts
export class SchemaIsolation {
  private readonly schemaPrefix = 'test_';
  
  constructor(private readonly prisma: PrismaClient) {}
  
  async createIsolatedSchema(): Promise<string> {
    const schemaName = `${this.schemaPrefix}${randomUUID().replace(/-/g, '_')}`;
    
    // 新しいスキーマを作成
    await this.prisma.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
    
    // スキーマに必要な拡張を追加
    await this.prisma.$executeRawUnsafe(
      `CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA "${schemaName}"`
    );
    
    // マイグレーションを新しいスキーマに適用
    await this.applyMigrationsToSchema(schemaName);
    
    return schemaName;
  }
  
  async dropSchema(schemaName: string): Promise<void> {
    // スキーマとすべてのデータを削除
    await this.prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
  }
  
  private async applyMigrationsToSchema(schemaName: string): Promise<void> {
    // Prismaのスキーマを指定してマイグレーションを実行
    const url = new URL(process.env.DATABASE_URL!);
    url.searchParams.set('schema', schemaName);
    
    const schemaPrisma = new PrismaClient({
      datasources: {
        db: { url: url.toString() }
      }
    });
    
    await schemaPrisma.$migrate.deploy();
    await schemaPrisma.$disconnect();
  }
}

// tests/setup/test-environment.ts
export class TestEnvironmentWithIsolation {
  private static instance: TestEnvironmentWithIsolation;
  private postgresContainer?: PostgreSqlContainer;
  private schemaIsolation?: SchemaIsolation;
  
  async setupTest(): Promise<TestContext> {
    // コンテナは再利用（起動済みの場合は再利用）
    if (!this.postgresContainer) {
      this.postgresContainer = await new PostgreSqlContainer('postgres:15-alpine')
        .withReuse() // コンテナの再利用
        .start();
    }
    
    // スキーマ隔離用のPrismaクライアント
    const adminPrisma = new PrismaClient({
      datasources: {
        db: { url: this.postgresContainer.getConnectionUri() }
      }
    });
    
    this.schemaIsolation = new SchemaIsolation(adminPrisma);
    
    // 新しい隔離されたスキーマを作成
    const schemaName = await this.schemaIsolation.createIsolatedSchema();
    
    // テスト用のPrismaクライアント（隔離されたスキーマを使用）
    const testUrl = new URL(this.postgresContainer.getConnectionUri());
    testUrl.searchParams.set('schema', schemaName);
    
    const testPrisma = new PrismaClient({
      datasources: {
        db: { url: testUrl.toString() }
      }
    });
    
    return {
      prisma: testPrisma,
      schemaName,
      cleanup: async () => {
        await testPrisma.$disconnect();
        await this.schemaIsolation!.dropSchema(schemaName);
        await adminPrisma.$disconnect();
      }
    };
  }
}
```

#### 実際の使用例

```typescript
// backend/packages/usecase/src/reservation/__tests__/reservation.isolation.test.ts
import { TestEnvironmentWithIsolation } from '../../setup/test-environment';

describe('Reservation API with Schema Isolation', () => {
  let testEnv: TestEnvironmentWithIsolation;
  let testContext: TestContext;
  
  beforeAll(async () => {
    testEnv = await TestEnvironmentWithIsolation.getInstance();
  });
  
  beforeEach(async () => {
    // 各テストで新しいスキーマを作成
    testContext = await testEnv.setupTest();
  });
  
  afterEach(async () => {
    // スキーマを削除して完全にクリーンアップ
    await testContext.cleanup();
  });
  
  it('should be completely isolated from other tests', async () => {
    const { prisma } = testContext;
    
    // このテストのデータは他のテストから完全に隔離されている
    const reservation = await prisma.reservation.create({
      data: {
        id: createReservationId(randomUUID()),
        // ...
      }
    });
    
    // 他のテストのデータに影響を与えない
    expect(await prisma.reservation.count()).toBe(1);
  });
  
  it('can run in parallel with other tests', async () => {
    const { prisma } = testContext;
    
    // スキーマが分離されているため、並列実行が可能
    await Promise.all([
      prisma.customer.create({ data: testCustomerData1 }),
      prisma.customer.create({ data: testCustomerData2 }),
      prisma.customer.create({ data: testCustomerData3 })
    ]);
    
    expect(await prisma.customer.count()).toBe(3);
  });
});
```

#### パフォーマンスと隔離のバランス

```typescript
// tests/setup/performance-optimized.ts
export class OptimizedTestEnvironment {
  private static sharedContainer?: PostgreSqlContainer;
  private static connectionPool: Map<string, PrismaClient> = new Map();
  
  static async getSharedContainer(): Promise<PostgreSqlContainer> {
    if (!this.sharedContainer) {
      this.sharedContainer = await new PostgreSqlContainer('postgres:15-alpine')
        .withReuse()
        .withCommand([
          'postgres',
          '-c', 'max_connections=200', // 接続数を増やす
          '-c', 'shared_buffers=256MB'
        ])
        .start();
    }
    return this.sharedContainer;
  }
  
  static async createIsolatedContext(): Promise<TestContext> {
    const container = await this.getSharedContainer();
    const schemaName = `test_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    // コネクションプールから取得または新規作成
    const adminUrl = container.getConnectionUri();
    let adminPrisma = this.connectionPool.get(adminUrl);
    
    if (!adminPrisma) {
      adminPrisma = new PrismaClient({
        datasources: { db: { url: adminUrl } },
        log: ['error'] // ログを最小限に
      });
      this.connectionPool.set(adminUrl, adminPrisma);
    }
    
    // スキーマ作成とマイグレーション
    await adminPrisma.$executeRawUnsafe(`CREATE SCHEMA "${schemaName}"`);
    
    // テスト用Prismaクライアント
    const testUrl = new URL(adminUrl);
    testUrl.searchParams.set('schema', schemaName);
    
    const testPrisma = new PrismaClient({
      datasources: { db: { url: testUrl.toString() } }
    });
    
    // マイグレーションを適用
    await testPrisma.$migrate.deploy();
    
    return {
      prisma: testPrisma,
      cleanup: async () => {
        await testPrisma.$disconnect();
        await adminPrisma!.$executeRawUnsafe(`DROP SCHEMA "${schemaName}" CASCADE`);
      }
    };
  }
}
```

#### ベストプラクティス

1. **コンテナの再利用**: `.withReuse()`を使用してテスト実行を高速化
2. **スキーマ分離**: テストごとに独立したスキーマで完全なデータ隔離
3. **並列実行**: スキーマ分離により安全な並列テスト実行
4. **適切なクリーンアップ**: CASCADE削除で確実なデータ削除
5. **実際のDBバージョン**: 本番と同じバージョンのDBを使用
6. **トランザクション分離**: テスト間の干渉を完全に防ぐ

#### 2. 実データによる検証

```typescript
// ❌ 避けるべき例
expect(response.body.deletedCount).toBe(0); // 常に0を期待

// ✅ 推奨される例
// 実際にデータを作成
await createTestRecords(db, 5);
// 削除操作を実行
const response = await deleteOldRecords(app);
// 実際の削除数を検証
expect(response.body.deletedCount).toBe(5);
```

#### 3. Testcontainersを使用したタイムゾーンテスト

```typescript
// 異なるタイムゾーンでのテスト
describe('Timezone handling', () => {
  it('should handle different timezones correctly', async () => {
    // PostgreSQLコンテナを特定のタイムゾーンで起動
    const pgContainer = await new PostgreSqlContainer('postgres:15-alpine')
      .withEnvironment({
        'TZ': 'Asia/Tokyo'
      })
      .start();
    
    const prisma = new PrismaClient({
      datasources: {
        db: { url: pgContainer.getConnectionUri() }
      }
    });
    
    // タイムゾーンを考慮したテストを実行
    const result = await prisma.reservation.create({
      data: {
        scheduledFor: new Date('2024-01-15T10:00:00Z'),
        // ...
      }
    });
    
    // データベースのタイムゾーン設定を確認
    const dbTime = await prisma.$queryRaw`SELECT current_timestamp AT TIME ZONE 'Asia/Tokyo'`;
    // ...
  });
});
```

#### 4. 時間依存テストの扱い

```typescript
// 時間を操作可能にする
const oldData = await createDataWithTimestamp(
  new Date(Date.now() - 91 * 24 * 60 * 60 * 1000)
);
const recentData = await createDataWithTimestamp(
  new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
);

// 90日以上古いデータの削除をテスト
const result = await cleanupOldData(app, 90);
expect(result.deletedCount).toBe(1);
```

#### 4. エラーパスの網羅

各APIエンドポイントに対して最低限以下のケースをテスト：

```typescript
describe('GET /tasks/:taskId', () => {
  it('should return task for valid request', async () => {
    // 正常系
  });
  
  it('should return 400 for invalid task ID', async () => {
    // バリデーションエラー
  });
  
  it('should return 401 for unauthenticated request', async () => {
    // 認証エラー
  });
  
  it('should return 403 for unauthorized user', async () => {
    // 認可エラー
  });
  
  it('should return 404 for non-existent task', async () => {
    // リソース不在
  });
});
```

### アンチパターンと回避策

| アンチパターン | 問題点 | 改善策 |
|--------------|--------|--------|
| 構造のみの検証 | `expect(response.body.data).toBeDefined()` | 実際の値も検証: `expect(response.body.data.count).toBe(10)` |
| 固定値への依存 | モックが常に同じ値を返す | 実データを作成して動的に検証 |
| 副作用の未検証 | APIレスポンスのみ確認 | DB状態、ログ、関連データも確認 |
| テスト間の依存 | 実行順序により結果が変わる | 各テストで必要なデータを準備 |

### テスト完全性チェックリスト

統合テスト実装時の確認事項：

- [ ] 実際のユーザーシナリオを再現しているか
- [ ] データは動的に作成されているか（ハードコード値を避ける）
- [ ] レスポンスの値まで検証しているか（構造だけでなく）
- [ ] データベースの変更を確認しているか
- [ ] エラーケースを網羅しているか（最低5パターン）
- [ ] テストが独立して実行可能か
- [ ] クリーンアップが適切に行われるか

### 構造だけの空テストの削除

以下のような構造のみを検証し、実際の値を確認しないテストは削除すること：

```typescript
// ❌ 削除対象の例
expect(response.body.data).toBeDefined();
expect(Array.isArray(response.body.items)).toBe(true);
expect(typeof response.body.count).toBe('number');

// ✅ 代わりに実際の値を検証
expect(response.body.data.userId).toBe(user.id);
expect(response.body.items).toHaveLength(5);
expect(response.body.count).toBe(10);
```

## テストヘルパーとユーティリティ

### TestDataBuilder パターン

```typescript
// tests/common/builders.ts
export class TestDataBuilder {
  constructor(private readonly app: Application) {}
  
  user(): UserBuilder {
    return UserBuilder.create(this.app);
  }
  
  task(): TaskBuilder {
    return TaskBuilder.create(this.app);
  }
}

export class UserBuilder {
  private constructor(
    private readonly app: Application,
    private readonly state: TestDataState<TestUser>
  ) {}

  static create(app: Application): UserBuilder {
    return new UserBuilder(app, {
      type: 'building',
      partial: {
        email: `test-${randomUUID()}@example.com`,
        role: 'member' as UserRole,
      },
    });
  }

  withEmail(email: string): UserBuilder {
    return match(this.state)
      .with({ type: 'building' }, ({ partial }) => 
        new UserBuilder(this.app, {
          type: 'building',
          partial: { ...partial, email },
        })
      )
      .otherwise(() => this);
  }

  async build(): Promise<Result<TestUser, string>> {
    // ビルド実装
  }
}
```

### アサーションヘルパー

```typescript
// tests/common/assertions.ts
export function assertApiResponse<T>(
  response: unknown,
  assertion: (data: T) => void
): void {
  const apiResponse = response as ApiResponse<T>;
  
  match(apiResponse)
    .with({ type: 'success' }, ({ data }) => assertion(data))
    .with({ type: 'error' }, ({ error }) => {
      throw new Error(`Expected success but got error: ${error.message}`);
    })
    .with({ type: 'validationError' }, ({ errors }) => {
      throw new Error(`Expected success but got validation errors: ${JSON.stringify(errors)}`);
    })
    .exhaustive();
}

export function assertApiError(
  response: unknown,
  expectedError: AppError
): void {
  const apiResponse = response as ApiResponse<never>;
  
  match(apiResponse)
    .with({ type: 'error' }, ({ error }) => {
      expect(error.code).toBe(toErrorDetail(expectedError).code);
    })
    .with({ type: 'validationError' }, () => {
      expect(expectedError.type).toBe('validation');
    })
    .otherwise(() => {
      throw new Error('Expected error response');
    });
}
```

## まとめ

- **構造だけのテストは実装の正しさを保証しない**
- **必ず実際の値まで検証すること**
- **動的に作成したデータと結果を比較すること**
- **Sum型とts-patternでテストシナリオを型安全に管理**
- **AAAパターンで明確な構造を維持**