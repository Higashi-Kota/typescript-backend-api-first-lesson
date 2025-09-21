# TypeScriptバックエンドアーキテクチャガイドライン

このガイドは、`docs/architecture-overview.md`で定義された最新アーキテクチャを日本語で補足し、開発判断に必要な実装パターンを整理します。すべての選択は次の柱に従ってください。

- **APIファースト開発**: TypeSpec → OpenAPI → TypeScript の単一ソース運用
- **DB駆動モデル**: Drizzle `$inferSelect` / `$inferInsert` をドメインモデルの源泉とする
- **Result型パターン**: 例外禁止、`Result<T, E>` + ts-pattern による網羅的エラーハンドリング
- **分離マッパー**: Write (API→DB) と Read (DB→API) の明確な分離
- **ブランド型**: エンティティID用の型安全性強化 (`SalonId`, `CustomerId` など)

---

## アーキテクチャ全体像

```
┌─────────────────────────────────────────┐
│           API Layer (Express)           │ ← HTTPルーティング、NO検証、ts-pattern
├─────────────────────────────────────────┤
│        Domain Layer (Business Logic)    │ ← UseCase（検証実行）、マッパー、リポジトリIF
├─────────────────────────────────────────┤
│   Infrastructure Layer (External I/O)   │ ← Drizzle Repository実装
├─────────────────────────────────────────┤
│        Database Layer (Schemas)         │ ← Drizzle スキーマ (真実の源)
└─────────────────────────────────────────┘
```

### レイヤーとパッケージ (実装版)

| レイヤー | パッケージ | 実装例 | 説明 |
|----------|------------|--------|------|
| API | `@beauty-salon-backend/api` | `salon.routes.ts` | Express ハンドラー、型抽出、ts-pattern、**検証なし** |
| Domain | `@beauty-salon-backend/domain` | `create-salon.usecase.ts`, `salon.mapper.ts` | UseCase（**検証実行**）、分離マッパー、Repository IF |
| Infrastructure | `@beauty-salon-backend/infrastructure` | `salon.repository.impl.ts` | Drizzle 実装、Result型、トランザクション |
| Database | `@beauty-salon-backend/database` | `schema.ts` | Drizzle schemas (`$inferSelect` の源泉) |
| Generated | `@beauty-salon-backend/generated` | `api-types.ts` | TypeSpec生成型（operations, components） |
| Utility | `@beauty-salon-backend/utility` | `result.ts` | Result型、ブランド型、共通ユーティリティ |

> **重要原則**:
> - **APIルートで検証しない** - すべての検証はUseCaseで実行
> - DomainはInfrastructureを知らない
> - InfrastructureがDomainのインターフェースを実装
> - API層で依存注入

---

## ディレクトリ構造

```
backend/
├── packages/
│   ├── api/
│   │   └── src/
│   │       ├── routes/
│   │       │   └── salon.routes.ts       # CRUDルート、型抽出、検証なし
│   │       └── index.ts                  # Express アプリ設定
│   ├── domain/
│   │   └── src/
│   │       ├── models/
│   │       │   └── salon.ts             # ブランド型、API/DB型インポート
│   │       ├── business-logic/
│   │       │   ├── salon/               # Salon UseCase群
│   │       │   │   ├── create-salon.usecase.ts
│   │       │   │   ├── get-salon.usecase.ts
│   │       │   │   └── ...usecase.ts
│   │       │   └── _shared/validators/  # 共通バリデーション
│   │       ├── mappers/
│   │       │   ├── write/
│   │       │   │   └── salon.mapper.ts  # API→DB変換
│   │       │   └── read/
│   │       │       └── salon.mapper.ts  # DB→API変換
│   │       ├── repositories/
│   │       │   └── salon.repository.ts  # ISalonRepository IF
│   │       └── shared/
│   │           ├── errors.ts           # DomainErrors ファクトリー
│   │           └── pagination.ts       # ページネーション
│   ├── infrastructure/
│   │   └── src/
│   │       ├── repositories/
│   │       │   └── salon.repository.impl.ts  # Drizzle実装
│   │       └── database/
│   │           ├── connection.ts            # DB接続管理
│   │           └── index.ts
│   ├── utility/                        # Result型、ブランド型
│   ├── generated/                      # TypeSpec→TypeScript型
│   └── database/                       # Drizzleスキーマ（源泉）
└── apps/
    └── server/                         # Express アプリ
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
HTTP Request → API (型抽出のみ) → UseCase (検証+orchestrate) →
Domain Write Mapper → Infrastructure Repository → DB →
Domain Read Mapper → API Response → HTTP Response
```

### 読み取り（Get/List）
```
HTTP Request → API (型抽出) → UseCase (検証) → Infrastructure Repository →
Domain Read Mapper → API Response → HTTP Response
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

### Result型（例外禁止）- 実装版

```typescript
// backend/packages/utility/src/result/result.ts
export type Result<T, E> =
  | { type: 'success'; data: T }
  | { type: 'error'; error: E }

export const Result = {
  success<T>(data: T): Result<T, never> {
    return { type: 'success', data }
  },

  error<E>(error: E): Result<never, E> {
    return { type: 'error', error }
  },

  isSuccess<T, E>(result: Result<T, E>): result is { type: 'success'; data: T } {
    return result.type === 'success'
  },

  isError<T, E>(result: Result<T, E>): result is { type: 'error'; error: E } {
    return result.type === 'error'
  },

  map<T, E, U>(result: Result<T, E>, fn: (data: T) => U): Result<U, E> {
    return match(result)
      .with({ type: 'success' }, ({ data }) => Result.success(fn(data)))
      .with({ type: 'error' }, ({ error }) => Result.error(error))
      .exhaustive()
  }
}
```

### 実装例: Salon ドメイン

#### 1. ブランド型モデル

```typescript
// backend/packages/domain/src/models/salon.ts
import type { openingHours, salons } from '@beauty-salon-backend/database'
import type { components } from '@beauty-salon-backend/generated'
import type { Brand, DeepRequired } from '@beauty-salon-backend/utility'

// ブランド型でID型安全性
export const salonIdBrand: unique symbol = Symbol('SalonId')
export type SalonId = Brand<string, typeof salonIdBrand>

// DB駆動型（Drizzle がソース）
export type DbSalon = DeepRequired<typeof salons.$inferSelect>
export type DbNewSalon = DeepRequired<Omit<typeof salons.$inferInsert, 'id'>>

// API型（TypeSpec がソース）
export type ApiSalon = components['schemas']['Models.Salon']
export type ApiCreateSalonRequest = components['schemas']['Models.CreateSalonRequest']
```

#### 2. Write/Read マッパー（分離）

```typescript
// backend/packages/domain/src/mappers/write/salon.mapper.ts
export const SalonWriteMapper = {
  fromCreateRequest(request: ApiCreateSalonRequest): {
    salon: DbNewSalon
    openingHours: DbNewOpeningHours[]
  } {
    // API → DB 正確な変換（プロパティ名一致）
    const salon: DbNewSalon = {
      name: request.name,
      description: request.description,
      postalCode: request.address.postalCode,  // address.postalCode → postalCode
      prefecture: request.address.prefecture,
      city: request.address.city,
      address: request.address.street,         // address.street → address
      phoneNumber: request.contactInfo.phoneNumber,
      email: request.contactInfo.email,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    const openingHours = request.openingHours.map(oh =>
      this.mapOpeningHours(oh, '')
    )

    return { salon, openingHours }
  }
}

// backend/packages/domain/src/mappers/read/salon.mapper.ts
export const SalonReadMapper = {
  toApiSalon(dbSalon: DbSalon, openingHours: DbOpeningHours[]): ApiSalon {
    // DB → API 変換
    return {
      id: dbSalon.id,
      name: dbSalon.name,
      description: dbSalon.description,
      address: {
        street: dbSalon.address,               // address → address.street
        city: dbSalon.city,
        prefecture: dbSalon.prefecture,
        postalCode: dbSalon.postalCode,        // postalCode → address.postalCode
        country: 'Japan',
      },
      contactInfo: {
        phoneNumber: dbSalon.phoneNumber,
        email: dbSalon.email,
        websiteUrl: dbSalon.websiteUrl,
      },
      openingHours: openingHours.map(oh => this.toApiOpeningHours(oh)),
      rating: dbSalon.rating ? Number.parseFloat(dbSalon.rating) : null,
      createdAt: dbSalon.createdAt,
      updatedAt: dbSalon.updatedAt,
    }
  }
}
```

#### 3. UseCase (検証実行 + Result型パターン)

```typescript
// backend/packages/domain/src/business-logic/salon/create-salon.usecase.ts
export class CreateSalonUseCase extends BaseSalonUseCase {
  async execute(
    request: ApiCreateSalonRequest
  ): Promise<Result<ApiSalon, DomainError>> {

    // 1. バリデーション（UseCaseで実行）
    const validation = this.validate(request)
    if (Result.isError(validation)) {
      return validation
    }

    // 2. ビジネスルール（メール重複チェック）
    const emailExists = await this.repository.existsByEmail(request.contactInfo.email)
    if (Result.isError(emailExists)) {
      return emailExists
    }
    if (emailExists.data) {
      return Result.error(
        DomainErrors.alreadyExists('Salon', 'email', request.contactInfo.email)
      )
    }

    // 3. Write Mapper でDB形式に変換
    const { salon, openingHours } = SalonWriteMapper.fromCreateRequest(request)

    // 4. Repository でトランザクション実行
    const createResult = await this.repository.create(
      { ...salon, id: toSalonID(createId()) },
      openingHours
    )
    if (Result.isError(createResult)) {
      return createResult
    }

    // 5. Read Mapper でAPI形式に変換
    const openingHoursResult = await this.repository.findOpeningHours(
      toSalonID(createResult.data.id)
    )
    const apiSalon = SalonReadMapper.toApiSalon(
      createResult.data,
      Result.isSuccess(openingHoursResult) ? openingHoursResult.data : []
    )

    return Result.success(apiSalon)
  }
}
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

## APIルート実装パターン （重要）

### APIルートの責任

APIルートは**型抽出とUseCase呼び出しのみ**を行います。**検証はUseCaseで実行**されます。

#### 実装原則

1. **型抽出**: operations/componentsから直接型を抽出
2. **検証なし**: ルートハンドラでバリデーションを行わない
3. **UseCase委譲**: すべてのビジネスロジックをUseCaseに委譲
4. **Resultハンドリング**: ts-patternでexhaustiveにmatch

#### APIルート構造

```
backend/packages/api/src/
├── routes/
│   ├── salon.routes.ts          # Salon CRUDルート
│   ├── customer.routes.ts       # Customer CRUDルート
│   └── reservation.routes.ts    # Reservation CRUDルート
└── index.ts                      # Expressアプリ設定
```

#### APIルートフロー

```typescript
// APIルートでの処理フロー
HTTP Request
    ↓
型抽出 (operations/componentsから直接)
    ↓
UseCase呼び出し (検証はUseCase内で実行)
    ↓
Result<T, DomainError>
    ↓ match()
[success] → HTTP Response生成
[error] → Problem Details変換
```

#### 実装例

```typescript
// backend/packages/api/src/routes/salon.routes.ts
import type { components, operations } from '@beauty-salon-backend/generated';
import { match } from 'ts-pattern';

// 型抽出（生成型から直接）
type CreateSalonOperation = operations['SalonCrud_create']
type CreateSalonRequest = components['schemas']['Models.CreateSalonRequest']
type CreateSalonResponse = Extract<
  CreateSalonOperation['responses']['201']['content']['application/json'],
  { data: unknown }
>

// ルートハンドラー（検証なし）
const createSalonHandler: RequestHandler<
  Record<string, never>,
  CreateSalonResponse | ErrorResponse,
  CreateSalonRequest
> = async (req, res, next) => {
  try {
    // 1. 依存取得
    const db = req.app.locals.database as Database
    const repository = new SalonRepository(db)
    const useCase = new CreateSalonUseCase(repository)

    // 2. UseCase実行（検証はUseCase内で）
    const result = await useCase.execute(req.body)

    // 3. Resultハンドリング
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

詳細な実装パターンは [`docs/domain-implementation-reference.md`](./domain-implementation-reference.md) を参照。

---

## UseCaseバリデーションパターン

### バリデーションの実装場所

すべてのバリデーションは**UseCase層で実行**されます。APIルートではバリデーションを行いません。

#### Base UseCaseパターン

```typescript
// backend/packages/domain/src/business-logic/salon/_shared/base-salon.usecase.ts
export abstract class BaseSalonUseCase {
  constructor(protected readonly repository: ISalonRepository) {}

  // 共通バリデーションメソッド
  protected validateName(name: string | undefined): string[] {
    const errors: string[] = []

    if (!name || name.trim().length === 0) {
      errors.push('Name is required')
    } else if (name.length > 255) {
      errors.push('Name must be less than 255 characters')
    }

    return errors
  }

  // Optionalフィールドのハンドリング
  protected validateDescription(
    _description: string | undefined | null
  ): string[] {
    const errors: string[] = []
    // Description is optional/nullable - no validation required
    return errors
  }

  // Update用の部分バリデーション
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

#### Create UseCaseでのバリデーション

```typescript
export class CreateSalonUseCase extends BaseSalonUseCase {
  async execute(
    request: ApiCreateSalonRequest
  ): Promise<Result<ApiSalon, DomainError>> {
    // バリデーションはUseCaseで実行
    const validation = this.validate(request)
    if (Result.isError(validation)) {
      return validation
    }

    // ビジネスルール検証
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

    // 以下、ビジネスロジック実行
  }

  private validate(request: ApiCreateSalonRequest): Result<true, DomainError> {
    const errors: string[] = []

    // すべてのエラーを収集
    errors.push(...this.validateName(request.name))
    errors.push(...this.validateDescription(request.description))
    errors.push(...this.validateAddress(request.address))
    errors.push(...this.validateContactInfo(request.contactInfo))

    if (!request.openingHours || request.openingHours.length === 0) {
      errors.push('Opening hours are required')
    }

    // エラーを集約して返す
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

### バリデーションパターンのポイント

1. **エラー収集パターン**: すべてのエラーを収集して一度に返す
2. **部分バリデーション**: Updateでは提供されたフィールドのみ検証
3. **ビジネスルール**: バリデーション後にビジネスルール検証
4. **Result型返却**: 常にResult型でエラーを返す

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
- [ ] **APIルートでバリデーションを行っていない**
- [ ] **すべてのバリデーションはUseCaseで実行されている**
- [ ] DomainモデルはSum型で表現し、ts-patternで網羅チェックした
- [ ] Result型で例外を封じ、API層まで`throw`が流れていない
- [ ] マッパーは Write / Read に分離されている
- [ ] 新規パッケージ名は `@beauty-salon-backend/*` / `@beauty-salon-frontend/*` に統一されている
- [ ] APIハンドラーはUseCase戻り値を直接HTTPに変換している
- [ ] InfrastructureがDomainのIF以外に依存していない

---

## 参考資料

- [`docs/architecture-overview.md`](./architecture-overview.md) - アーキテクチャ全体像
- [`docs/domain-implementation-reference.md`](./domain-implementation-reference.md) - **ドメイン実装リファレンス（重要）**
- [`docs/type-generation-system.md`](./type-generation-system.md) - 型生成システム
- [`docs/sum-types-pattern-matching.md`](./sum-types-pattern-matching.md) - Sum型とパターンマッチング
- [`docs/uniform-implementation-guide.md`](./uniform-implementation-guide.md) - 統一実装パターン
- [`docs/type-safety-principles.md`](./type-safety-principles.md)
