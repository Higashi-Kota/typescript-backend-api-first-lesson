# TypeScriptバックエンドアーキテクチャガイドライン

このガイドは、`docs/architecture-overview.md`で定義された最新アーキテクチャを日本語で補足し、開発判断に必要な実装パターンを整理します。すべての選択は次の柱に従ってください。

- **APIファースト開発**: TypeSpec → OpenAPI → TypeScript の単一ソース運用
- **クリーンアーキテクチャ**: API / UseCase / Domain / Infrastructure の責務分離
- **型安全性の徹底**: Sum型 + ts-pattern + Result型 + DB駆動型
- **パッケージ境界の明確化**: `@beauty-salon-backend/*` と `@beauty-salon-frontend/*`

---

## アーキテクチャ全体像

```
┌─────────────────────────────────────────┐
│           API Layer (Express)           │ ← HTTPルーティング・入出力境界
├─────────────────────────────────────────┤
│      Use Case Layer (Business Flow)     │ ← ドメインサービスのオーケストレーション
├─────────────────────────────────────────┤
│        Domain Layer (Pure Logic)        │ ← ルール/モデル/マッパー/リポジトリIF
├─────────────────────────────────────────┤
│   Infrastructure Layer (External I/O)   │ ← DB・メール・ストレージなどの実装
└─────────────────────────────────────────┘
```

### レイヤーとパッケージ

| レイヤー | 主ディレクトリ | 主なエクスポート | 説明 |
|----------|----------------|------------------|------|
| API | `backend/packages/api` | `@beauty-salon-backend/api` | Expressエントリポイント、リクエスト検証、レスポンス変換、OpenAPI同期 |
| UseCase | `backend/packages/domain/src/business-logic` | `@beauty-salon-backend/domain/business-logic` | ユースケース（アプリケーションサービス）。Result型でDomainとInfrastructureを調停 |
| Domain | `backend/packages/domain` | `@beauty-salon-backend/domain` | DB駆動モデル、Write/Readマッパー、Repositoryインターフェース、Resultユーティリティ |
| Infrastructure | `backend/packages/infrastructure` | `@beauty-salon-backend/infrastructure` | Repository実装、メール・ストレージ・監視など外部接続 |

> **原則**: 依存は外側→内側のみ。`api → domain → infrastructure` は禁止。InfrastructureはDomainのIFを実装し、依存解決はAPI層または`apps/server`で行う。

---

## ディレクトリ構造

```
backend/
├── packages/
│   ├── api/
│   │   └── src/
│   │       ├── routes/
│   │       ├── middleware/
│   │       ├── presenters/           # Domain Result → HTTP レスポンス
│   │       └── bootstrap/            # DI・サーバー初期化
│   ├── domain/
│   │   └── src/
│   │       ├── models/               # Sum型エンティティ／値オブジェクト
│   │       ├── business-logic/       # UseCase（Result型）
│   │       ├── mappers/
│   │       │   ├── write/            # API → Domain → DB
│   │       │   └── read/             # DB → Domain → API
│   │       ├── repositories/         # IF（実装なし）
│   │       └── shared/               # result.ts / validators.ts / guards.ts
│   ├── infrastructure/
│   │   └── src/
│   │       ├── repositories/         # Repository implementations
│   │       ├── services/             # Email / Storage / Monitoring
│   │       └── adapters/             # 3rd party adapters
│   ├── generated/                    # OpenAPI由来の型
│   ├── database/                     # Drizzleスキーマ・マイグレーション
│   └── test-utils/                   # テスト用helpers
└── apps/
    └── server/                       # Expressアプリ (API層を実行)
```

---

## 依存ルールと禁止事項

- Domain層は標準ライブラリと`ts-pattern`など純粋ロジック限定。外部サービス呼び出し禁止。
- UseCase層はDomainモデルとRepository IFを結合し、`Result`で成功/失敗を返す。`throw`禁止。
- InfrastructureはDomainのIFを実装し、外部I/Oを担当。戻り値は必ず`Result`。
- API層はTypeSpec由来の型で入出力を検証し、UseCase層を呼び出すのみ。
- `any`や型アサーションは禁止。DB駆動型とSum型で表現力を確保。

---

## データフロー

### 書き込み（Create/Update）
```
HTTP Request → API (検証) → UseCase (orchestrate) →
Domain Write Mapper → Infrastructure Repository → DB →
Domain Read Mapper → API Presenter → HTTP Response
```

### 読み取り（Get/List）
```
HTTP Request → API → UseCase → Infrastructure Repository →
Domain Read Mapper → API Presenter → HTTP Response
```

Domain層は純粋ロジックを維持し、Infrastructureに例外を閉じ込めます。Infrastructureで捕捉した`Error`は`Result`へ変換し、UseCaseで網羅的に処理します。

---

## 型生成パイプライン

1. **TypeSpec定義** (`/specs`) が唯一のAPI契約。
2. `pnpm --filter '@beauty-salon-backend/specs' run compile` で OpenAPI (`specs/tsp-output/.../openapi.yaml`) を生成。
3. `pnpm --filter '@beauty-salon-backend/generated' run generate` で TypeScript 型を `backend/packages/generated/src` に出力。
4. API層は `@beauty-salon-backend/generated` の型のみを信頼。
5. Domainマッパーで OpenAPI 型 ↔ Domain モデルを橋渡し。

```
TypeSpec (単一ソース)
    ↓ tsp compile
OpenAPI (specs/tsp-output/@typespec/openapi3/generated/openapi.yaml)
    ↓ openapi-typescript
@beauty-salon-backend/generated (APIリクエスト/レスポンス/スキーマ)
    ↓
Domainモデル・UseCaseが参照
```

---

## 実装パターン

### Sum型 + ts-pattern

```typescript
// backend/packages/domain/src/models/reservation.ts
export type ReservationState =
  | { type: 'draft'; reservation: DraftReservation }
  | { type: 'confirmed'; reservation: ConfirmedReservation }
  | { type: 'cancelled'; reservation: CancelledReservation; reason: CancellationReason }
  | { type: 'completed'; reservation: CompletedReservation };

export const transitionToConfirmed = (
  state: Extract<ReservationState, { type: 'draft' }>,
  deps: Dependencies
): Result<Extract<ReservationState, { type: 'confirmed' }>, ReservationError> => {
  return match(validateStartTime(state.reservation.startTime, deps.clock))
    .with({ type: 'ok' }, () =>
      ok({
        type: 'confirmed',
        reservation: { ...state.reservation, confirmedAt: deps.clock.now() }
      })
    )
    .with({ type: 'err' }, (error) => err(error))
    .exhaustive();
};
```

### Result型（例外禁止）

```typescript
// backend/packages/domain/src/shared/result.ts
export type Result<T, E> = { type: 'ok'; value: T } | { type: 'err'; error: E };
export const ok = <T>(value: T): Result<T, never> => ({ type: 'ok', value });
export const err = <E>(error: E): Result<never, E> => ({ type: 'err', error });
```

### Write/Readマッパー

```typescript
// backend/packages/domain/src/mappers/write/create-customer.mapper.ts
import type { components } from '@beauty-salon-backend/generated';

export const mapCreateRequestToDomain = (
  request: components['schemas']['Models.CreateCustomerRequest']
): Result<CreateCustomerCommand, ValidationError[]> => {
  const trimmedName = request.name?.trim();
  if (!trimmedName) {
    return err([{ field: 'name', message: 'Name is required' }]);
  }
  return ok({
    name: trimmedName,
    email: request.email,
    contactInfo: request.contactInfo,
  });
};
```

### Repositoryインターフェース

```typescript
// backend/packages/domain/src/repositories/customer.repository.ts
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { PgTransaction } from 'drizzle-orm/pg-core';

// 型エイリアス（統一命名規則）
type DatabaseConnection = NodePgDatabase;
type Transaction = PgTransaction;
type DbOrTx = DatabaseConnection | Transaction;

export interface CustomerRepository {
  // 通常版（トランザクション非対応）
  save(command: CreateCustomerCommand): Promise<Result<Customer, RepositoryError>>;
  findById(id: CustomerId): Promise<Result<Customer | null, RepositoryError>>;

  // トランザクション対応版（WithTxサフィックス）
  saveWithTx(dbOrTx: DbOrTx, command: CreateCustomerCommand): Promise<Result<Customer, RepositoryError>>;
  findByIdWithTx(dbOrTx: DbOrTx, id: CustomerId): Promise<Result<Customer | null, RepositoryError>>;
}

// トランザクション必須のRepository
export interface ReservationRepository {
  // トランザクション必須（排他制御が必要）
  createWithLock(tx: Transaction, command: CreateReservationCommand): Promise<Result<Reservation, RepositoryError>>;
  updateSlotStatus(tx: Transaction, slotId: SlotId, status: SlotStatus): Promise<Result<void, RepositoryError>>;
}
```

### Infrastructure実装

```typescript
// backend/packages/infrastructure/src/repositories/customer.repository.impl.ts
export class DrizzleCustomerRepository implements CustomerRepository {
  constructor(private readonly db: DatabaseConnection) {}

  // 通常版（内部でトランザクション対応版を呼び出し）
  async save(command: CreateCustomerCommand) {
    return this.saveWithTx(this.db, command);
  }

  // トランザクション対応版
  async saveWithTx(dbOrTx: DbOrTx, command: CreateCustomerCommand) {
    try {
      const [record] = await dbOrTx.insert(customers).values(mapCommandToRow(command)).returning();
      return ok(mapRowToDomain(record));
    } catch (error) {
      return err({ type: 'database', message: 'Failed to save customer', cause: error });
    }
  }

  async findById(id: CustomerId) {
    return this.findByIdWithTx(this.db, id);
  }

  async findByIdWithTx(dbOrTx: DbOrTx, id: CustomerId) {
    try {
      const [record] = await dbOrTx
        .select()
        .from(customers)
        .where(eq(customers.id, id))
        .limit(1);

      return ok(record ? mapRowToDomain(record) : null);
    } catch (error) {
      return err({ type: 'database', message: 'Failed to find customer', cause: error });
    }
  }
}

// トランザクション必須Repository実装
export class DrizzleReservationRepository implements ReservationRepository {
  // txパラメータ必須（排他制御）
  async createWithLock(tx: Transaction, command: CreateReservationCommand) {
    try {
      // FOR UPDATE で排他ロック
      const [slot] = await tx
        .select()
        .from(timeSlots)
        .where(eq(timeSlots.id, command.slotId))
        .for('update')
        .limit(1);

      if (!slot || slot.status !== 'available') {
        return err({ type: 'slotUnavailable', message: 'Slot is not available' });
      }

      const [reservation] = await tx.insert(reservations).values(command).returning();
      return ok(mapRowToDomain(reservation));
    } catch (error) {
      return err({ type: 'database', message: 'Failed to create reservation', cause: error });
    }
  }
}
```

> **トランザクション管理**: UseCase層でのトランザクション、楽観的/悲観的ロック、リトライメカニズムの詳細は [`docs/uniform-implementation-guide.md#トランザクション管理`](./uniform-implementation-guide.md#トランザクション管理) を参照

---

## APIバリデーション戦略

### Zod v4によるリクエスト検証

API層では、Zod v4の`z.custom<T>().check()`パターンを使用して、OpenAPIから生成された型に対する完全な型安全性を保証します。

#### バリデーション原則

1. **型の単一ソース**: TypeSpec → OpenAPI → TypeScript型 → `z.custom<T>()`
2. **検証の階層化**: PathParams → QueryParams → Body の順で検証
3. **Result型での統一**: すべての検証結果を`Result<T, ValidationError[]>`で返す
4. **エラーの詳細化**: フィールドごとに具体的なエラーメッセージを提供

#### 実装場所

```
backend/packages/api/src/
├── validators/
│   ├── request-validators.ts    # 共通バリデーションロジック
│   ├── path-validators.ts       # PathParams検証
│   ├── query-validators.ts      # QueryParams検証
│   └── body-validators.ts       # RequestBody検証
└── middleware/
    └── validation.middleware.ts  # バリデーションミドルウェア
```

#### バリデーションフロー

```typescript
// API層でのバリデーションフロー
HTTP Request
    ↓
バリデーションミドルウェア (z.custom<T>().check())
    ↓
Result<ValidatedRequest, ValidationError[]>
    ↓ match()
[OK] → UseCase呼び出し
[Error] → 400 Bad Request レスポンス
```

#### 実装例

```typescript
// backend/packages/api/src/validators/customer-validators.ts
import { z } from 'zod';
import type { components } from '@beauty-salon-backend/generated';

export const customerPathSchema = z.custom<
  components['schemas']['CustomerPathParams']
>().check((ctx) => {
  const { customerId } = ctx.value;

  // UUID v4形式の検証
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!uuidRegex.test(customerId)) {
    ctx.issues.push({
      code: 'custom',
      message: 'customerId must be a valid UUID v4',
      path: ['customerId']
    });
  }
});

// バリデーション結果をResult型に変換
export function validateCustomerPath(
  params: unknown
): Result<components['schemas']['CustomerPathParams'], ValidationError[]> {
  const result = customerPathSchema.safeParse(params);

  return match(result)
    .with({ success: true }, ({ data }) => ok(data))
    .with({ success: false }, ({ error }) =>
      err(error.issues.map(issue => ({
        field: issue.path.join('.'),
        message: issue.message,
        code: 'VALIDATION_ERROR'
      })))
    )
    .exhaustive();
}
```

詳細な実装パターンは [`docs/uniform-implementation-guide.md#APIリクエストバリデーション`](./uniform-implementation-guide.md#apiリクエストバリデーション) を参照。

---

## テスト戦略

| テスト種別 | 対象レイヤー | ポイント |
|------------|--------------|----------|
| ユニット | Domain / UseCase | Sum型遷移、Result分岐、ビジネスルール |
| 統合 | Infrastructure | Drizzle + 外部サービス、Repository実装 |
| API | APIレイヤー | Request/Responseマッピング、OpenAPI整合性 |
| E2E | apps/server | ユースケース全体、依存解決、エラーパス |

Testcontainersを使用してInfrastructure挙動を検証し、モックはDomain境界までに限定します。

---

## 運用チェックリスト

- [ ] TypeSpecの変更後に`pnpm generate`で型を再生成した
- [ ] DomainモデルはSum型で表現し、ts-patternで網羅チェックした
- [ ] Result型で例外を封じ、API層まで`throw`が流れていない
- [ ] マッパーは Write / Read に分離されている
- [ ] 新規パッケージ名は `@beauty-salon-backend/*` / `@beauty-salon-frontend/*` に統一されている
- [ ] APIハンドラーはUseCase戻り値をPresenterでHTTPに変換している
- [ ] InfrastructureがDomainのIF以外に依存していない

---

## 参考資料

- [`docs/architecture-overview.md`](./architecture-overview.md)
- [`docs/type-generation-system.md`](./type-generation-system.md)
- [`docs/sum-types-pattern-matching.md`](./sum-types-pattern-matching.md)
- [`docs/type-safety-principles.md`](./type-safety-principles.md)
