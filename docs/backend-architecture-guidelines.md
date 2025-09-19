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
export interface CustomerRepository {
  save(command: CreateCustomerCommand): Promise<Result<Customer, RepositoryError>>;
  findById(id: CustomerId): Promise<Result<Customer | null, RepositoryError>>;
}
```

### Infrastructure実装

```typescript
// backend/packages/infrastructure/src/repositories/customer.repository.impl.ts
export class DrizzleCustomerRepository implements CustomerRepository {
  async save(command: CreateCustomerCommand) {
    try {
      const [record] = await this.db.insert(customers).values(mapCommandToRow(command)).returning();
      return ok(mapRowToDomain(record));
    } catch (error) {
      return err({ type: 'database', message: 'Failed to save customer', cause: error });
    }
  }
}
```

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
