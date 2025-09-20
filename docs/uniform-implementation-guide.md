# ユニフォーム実装ガイド

TypeScriptバックエンド開発における統一的な実装パターンを定義します。Sum型とts-patternを活用した型安全な実装を実現します。

## 目次

1. [ページネーション実装](#ページネーション実装)
2. [レスポンスフォーマット](#レスポンスフォーマット)
3. [エラーハンドリング](#エラーハンドリング)
4. [日時処理](#日時処理)
5. [クエリパラメータ](#クエリパラメータ)
6. [権限チェック](#権限チェック)
7. [ロギング](#ロギング)
8. [テストパターン](#テストパターン)
9. [UUID/ID検証](#uuidid検証)
10. [トランザクション管理](#トランザクション管理)

## ページネーション実装

### Sum型とts-patternを活用した型安全なページネーション

```typescript
// shared/types/pagination.ts
import { match } from 'ts-pattern';

// ページネーション状態をSum型で表現
export type PaginationState = 
  | { type: 'initial' }
  | { type: 'loading'; page: number }
  | { type: 'loaded'; data: PaginationMeta }
  | { type: 'error'; message: string };

// ページネーション情報
export interface PaginationMeta {
  readonly page: number;
  readonly perPage: number;
  readonly totalPages: number;
  readonly totalCount: number;
  readonly hasNext: boolean;
  readonly hasPrev: boolean;
}

// ページネーション付きレスポンス
export interface PaginatedResponse<T> {
  readonly items: ReadonlyArray<T>;
  readonly pagination: PaginationMeta;
}

// ページネーション情報の生成（不変性を保証）
export function createPaginationMeta(
  page: number,
  perPage: number,
  totalCount: number
): PaginationMeta {
  const totalPages = Math.ceil(totalCount / perPage);
  
  return Object.freeze({
    page,
    perPage,
    totalPages,
    totalCount,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  });
}

// パターンマッチングを使用したページネーション処理
export function renderPaginationState(state: PaginationState): string {
  return match(state)
    .with({ type: 'initial' }, () => 'Ready to load')
    .with({ type: 'loading' }, ({ page }) => `Loading page ${page}...`)
    .with({ type: 'loaded' }, ({ data }) => 
      `Page ${data.page} of ${data.totalPages} (${data.totalCount} items)`
    )
    .with({ type: 'error' }, ({ message }) => `Error: ${message}`)
    .exhaustive();
}
```

## レスポンスフォーマット

### Sum型によるAPI レスポンスの統一

```typescript
// src/types/response.ts
import { match } from 'ts-pattern';
import type { PaginationMeta } from '../shared/types/pagination';

// APIレスポンスをSum型で表現
export type ApiResponse<T> = 
  | { type: 'success'; data: T; meta: ResponseMeta }
  | { type: 'error'; error: ErrorDetail; meta: ResponseMeta }
  | { type: 'validationError'; errors: ValidationError[]; meta: ResponseMeta };

export interface ResponseMeta {
  readonly requestId: string;
  readonly timestamp: Date;
  readonly pagination?: PaginationMeta;
}

// レスポンスヘルパー関数（不変性を保証）
export function successResponse<T>(
  data: T, 
  meta?: Partial<ResponseMeta>
): Extract<ApiResponse<T>, { type: 'success' }> {
  return Object.freeze({
    type: 'success',
    data,
    meta: {
      requestId: generateRequestId(),
      timestamp: new Date(),
      ...meta,
    },
  });
}

// レスポンス処理のパターンマッチング
export function getResponseStatus<T>(response: ApiResponse<T>): number {
  return match(response)
    .with({ type: 'success' }, () => 200)
    .with({ type: 'validationError' }, () => 400)
    .with({ type: 'error' }, ({ error }) => 
      match(error.code)
        .with('NOT_FOUND', () => 404)
        .with('UNAUTHORIZED', () => 401)
        .with('FORBIDDEN', () => 403)
        .otherwise(() => 500)
    )
    .exhaustive();
}
```

## エラーハンドリング

### Sum型とResult型によるエラーハンドリング

```typescript
// src/errors/AppError.ts
import { match, P } from 'ts-pattern';

// エラーをSum型で表現
export type AppError = 
  | { type: 'validation'; fields: ValidationFieldError[] }
  | { type: 'notFound'; resource: string; id?: string }
  | { type: 'unauthorized' }
  | { type: 'forbidden'; action: string; resource: string }
  | { type: 'conflict'; message: string }
  | { type: 'internal'; message: string; cause?: unknown };

// Result型を使用したエラーハンドリング
export type Result<T, E = AppError> = 
  | { type: 'ok'; value: T }
  | { type: 'err'; error: E };

export function ok<T>(value: T): Extract<Result<T>, { type: 'ok' }> {
  return { type: 'ok', value };
}

export function err<E>(error: E): Extract<Result<never, E>, { type: 'err' }> {
  return { type: 'err', error };
}

// エラーからErrorDetailへの変換
export function toErrorDetail(error: AppError): ErrorDetail {
  return match(error)
    .with({ type: 'validation' }, ({ fields }) => ({
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: { fields },
    }))
    .with({ type: 'notFound' }, ({ resource, id }) => ({
      code: 'NOT_FOUND',
      message: `${resource}${id ? ` with id ${id}` : ''} not found`,
    }))
    .with({ type: 'unauthorized' }, () => ({
      code: 'UNAUTHORIZED',
      message: 'Unauthorized',
    }))
    .with({ type: 'forbidden' }, ({ action, resource }) => ({
      code: 'FORBIDDEN',
      message: `Forbidden: Cannot ${action} ${resource}`,
    }))
    .with({ type: 'conflict' }, ({ message }) => ({
      code: 'CONFLICT',
      message,
    }))
    .with({ type: 'internal' }, ({ message }) => ({
      code: 'INTERNAL_ERROR',
      message,
    }))
    .exhaustive();
}
```

## 日時処理

### date-fnsを使用した型安全な日時処理

```typescript
// src/types/datetime.ts
import { 
  format, 
  parseISO, 
  fromUnixTime, 
  getUnixTime,
  isValid,
  isBefore,
  isAfter,
  addDays,
  subDays,
  startOfDay,
  endOfDay,
  differenceInDays
} from 'date-fns';
import { match } from 'ts-pattern';

// タイムスタンプ型の定義（読み取り専用）
export type Timestamp = Readonly<Date>;

// 日時のパース結果をSum型で表現
export type DateParseResult = 
  | { type: 'valid'; date: Timestamp }
  | { type: 'invalid'; input: string; reason: string };

// 安全な日時パース
export function parseDate(input: string): DateParseResult {
  try {
    const date = parseISO(input);
    if (isValid(date)) {
      return { type: 'valid', date: Object.freeze(date) };
    }
    return { type: 'invalid', input, reason: 'Invalid date format' };
  } catch (error) {
    return { type: 'invalid', input, reason: 'Failed to parse date' };
  }
}

// 日時の比較をSum型で表現
export type DateComparison = 
  | { type: 'before' }
  | { type: 'equal' }
  | { type: 'after' };

export function compareDates(date1: Timestamp, date2: Timestamp): DateComparison {
  if (isBefore(date1, date2)) return { type: 'before' };
  if (isAfter(date1, date2)) return { type: 'after' };
  return { type: 'equal' };
}

// 営業日計算
export type BusinessDayResult = 
  | { type: 'businessDay'; date: Timestamp }
  | { type: 'weekend'; date: Timestamp; nextBusinessDay: Timestamp };

export function getBusinessDay(date: Timestamp): BusinessDayResult {
  const dayOfWeek = date.getDay();
  
  return match(dayOfWeek)
    .with(P.union(0, 6), () => {
      // 週末の場合、次の月曜日を返す
      const daysToAdd = dayOfWeek === 0 ? 1 : 2;
      return {
        type: 'weekend' as const,
        date,
        nextBusinessDay: Object.freeze(addDays(date, daysToAdd)),
      };
    })
    .otherwise(() => ({
      type: 'businessDay' as const,
      date,
    }));
}
```

## クエリパラメータ

### Sum型を使用した型安全なクエリパラメータ処理

```typescript
// src/types/query.ts
import { match, P } from 'ts-pattern';

// クエリパラメータをSum型で表現
export type QueryParam<T> = 
  | { type: 'present'; value: T }
  | { type: 'absent' }
  | { type: 'invalid'; raw: string; reason: string };

// クエリパラメータのパース
export function parseIntParam(value: string | undefined): QueryParam<number> {
  if (value === undefined) return { type: 'absent' };
  
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    return { type: 'invalid', raw: value, reason: 'Not a valid number' };
  }
  
  return { type: 'present', value: parsed };
}

// クエリパラメータから値を取得
export function getParamValue<T>(
  param: QueryParam<T>,
  defaultValue: T
): T {
  return match(param)
    .with({ type: 'present' }, ({ value }) => value)
    .with({ type: 'absent' }, () => defaultValue)
    .with({ type: 'invalid' }, () => defaultValue)
    .exhaustive();
}

// 型安全なクエリビルダー（イミュータブル）
export class QueryBuilder {
  private constructor(
    private readonly baseQuery: string,
    private readonly spec: QuerySpec
  ) {}

  static create(baseQuery: string): QueryBuilder {
    return new QueryBuilder(baseQuery, {
      conditions: [],
    });
  }

  where(condition: QueryCondition): QueryBuilder {
    return new QueryBuilder(this.baseQuery, {
      ...this.spec,
      conditions: [...this.spec.conditions, condition],
    });
  }

  orderBy(field: string, order: SortOrder): QueryBuilder {
    return new QueryBuilder(this.baseQuery, {
      ...this.spec,
      orderBy: { field, order },
    });
  }

  paginate(page: number, pageSize: number): QueryBuilder {
    return new QueryBuilder(this.baseQuery, {
      ...this.spec,
      limit: pageSize,
      offset: (page - 1) * pageSize,
    });
  }

  build(): { query: string; parameters: ReadonlyArray<unknown> } {
    // クエリ構築ロジック
    // ...
    return { query, parameters: Object.freeze(parameters) };
  }
}
```

## 権限チェック

### Sum型による柔軟な権限表現

```typescript
// src/middleware/authorization.ts
import { match, P } from 'ts-pattern';

// 権限をSum型で表現
export type Permission = 
  | { type: 'resource'; resource: Resource; action: Action }
  | { type: 'role'; role: UserRole }
  | { type: 'custom'; check: (user: User) => Promise<boolean> };

// 権限チェック結果
export type PermissionCheckResult = 
  | { type: 'allowed' }
  | { type: 'denied'; reason: string }
  | { type: 'error'; message: string };

// 権限チェックサービス
export class PermissionService {
  async checkPermission(
    user: User | undefined,
    permission: Permission
  ): Promise<PermissionCheckResult> {
    if (!user) {
      return { type: 'denied', reason: 'User not authenticated' };
    }

    return match(permission)
      .with({ type: 'resource' }, async ({ resource, action }) => {
        const allowed = await this.checkResourcePermission(user, resource, action);
        return allowed
          ? { type: 'allowed' as const }
          : { type: 'denied' as const, reason: `Cannot ${action} ${resource}` };
      })
      .with({ type: 'role' }, ({ role }) => {
        const allowed = this.checkRolePermission(user, role);
        return allowed
          ? { type: 'allowed' as const }
          : { type: 'denied' as const, reason: `Requires ${role} role` };
      })
      .with({ type: 'custom' }, async ({ check }) => {
        try {
          const allowed = await check(user);
          return allowed
            ? { type: 'allowed' as const }
            : { type: 'denied' as const, reason: 'Custom permission check failed' };
        } catch (error) {
          return { 
            type: 'error' as const, 
            message: error instanceof Error ? error.message : 'Unknown error' 
          };
        }
      })
      .exhaustive();
  }
}
```

## ロギング

### Sum型を使用した構造化ログ

```typescript
// src/logging/logger.ts
import winston from 'winston';
import { match, P } from 'ts-pattern';

// ログイベントをSum型で表現
export type LogEvent = 
  | { type: 'request'; method: string; path: string; userId?: string }
  | { type: 'response'; statusCode: number; duration: number }
  | { type: 'error'; error: Error; context?: Record<string, unknown> }
  | { type: 'business'; action: string; details: Record<string, unknown> }
  | { type: 'security'; event: SecurityEvent };

export type SecurityEvent = 
  | { kind: 'authFailure'; reason: string; ip: string }
  | { kind: 'permissionDenied'; resource: string; action: string; userId: string }
  | { kind: 'suspiciousActivity'; description: string; userId?: string };

// ログレベルの決定
export function getLogLevel(event: LogEvent): string {
  return match(event)
    .with({ type: 'request' }, () => 'info')
    .with({ type: 'response', statusCode: P.when(code => code >= 500) }, () => 'error')
    .with({ type: 'response', statusCode: P.when(code => code >= 400) }, () => 'warn')
    .with({ type: 'response' }, () => 'info')
    .with({ type: 'error' }, () => 'error')
    .with({ type: 'business' }, () => 'info')
    .with({ type: 'security', event: { kind: 'authFailure' } }, () => 'warn')
    .with({ type: 'security' }, () => 'error')
    .exhaustive();
}

// ログメッセージの生成
export function formatLogMessage(event: LogEvent): string {
  return match(event)
    .with({ type: 'request' }, ({ method, path }) => 
      `${method} ${path} - Request started`
    )
    .with({ type: 'response' }, ({ statusCode, duration }) => 
      `Response ${statusCode} - ${duration}ms`
    )
    .with({ type: 'error' }, ({ error }) => 
      `Error: ${error.message}`
    )
    .with({ type: 'business' }, ({ action }) => 
      `Business action: ${action}`
    )
    .with({ type: 'security', event: { kind: 'authFailure' } }, ({ event }) => 
      `Authentication failed: ${event.reason} from ${event.ip}`
    )
    .with({ type: 'security', event: { kind: 'permissionDenied' } }, ({ event }) => 
      `Permission denied: ${event.action} on ${event.resource} by user ${event.userId}`
    )
    .with({ type: 'security', event: { kind: 'suspiciousActivity' } }, ({ event }) => 
      `Suspicious activity: ${event.description}`
    )
    .exhaustive();
}
```

## テストパターン

### Sum型とts-patternを活用したテスト

```typescript
// tests/common/builders.ts
import { match } from 'ts-pattern';

// テストデータの状態をSum型で表現
export type TestDataState<T> = 
  | { type: 'building'; partial: Partial<T> }
  | { type: 'built'; data: T }
  | { type: 'failed'; error: string };

// テストシナリオをSum型で表現
export type TestScenario = 
  | { type: 'happyPath'; description: string }
  | { type: 'errorCase'; error: AppError; description: string }
  | { type: 'edgeCase'; condition: string; description: string };

// テスト実行結果
export type TestResult<T> = 
  | { type: 'passed'; data: T }
  | { type: 'failed'; reason: string }
  | { type: 'skipped'; reason: string };

// アサーションヘルパー（型安全）
export function assertTestResult<T>(
  result: TestResult<T>,
  assertion: (data: T) => void
): void {
  match(result)
    .with({ type: 'passed' }, ({ data }) => assertion(data))
    .with({ type: 'failed' }, ({ reason }) => {
      throw new Error(`Test failed: ${reason}`);
    })
    .with({ type: 'skipped' }, ({ reason }) => {
      throw new Error(`Test skipped: ${reason}`);
    })
    .exhaustive();
}
```

## UUID/ID検証

### Sum型を使用した安全なID検証

```typescript
// src/middleware/validation.ts
import { validate as uuidValidate, version as uuidVersion } from 'uuid';
import { match, P } from 'ts-pattern';

// ID検証結果をSum型で表現
export type IdValidation<T> = 
  | { type: 'valid'; value: T }
  | { type: 'invalid'; reason: string; raw: string }
  | { type: 'missing' };

// UUID検証（バージョン指定可能）
export function validateUuid(
  value: string | undefined,
  options?: { version?: 4 | 5 }
): IdValidation<string> {
  if (value === undefined || value === '') {
    return { type: 'missing' };
  }

  if (!uuidValidate(value)) {
    return { type: 'invalid', reason: 'Not a valid UUID', raw: value };
  }

  if (options?.version && uuidVersion(value) !== options.version) {
    return {
      type: 'invalid',
      reason: `Expected UUID v${options.version}`,
      raw: value,
    };
  }

  return { type: 'valid', value };
}

// 型安全なパラメータ抽出ミドルウェア
export function extractParams<T extends Record<string, unknown>>(
  validators: {
    [K in keyof T]: (value: string | undefined) => IdValidation<T[K]>
  }
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = validateRequestParams(req.params, validators);
    
    match(result)
      .with({ type: 'allValid' }, ({ params }) => {
        // 検証済みパラメータをリクエストに追加
        req.validatedParams = params;
        next();
      })
      .with({ type: 'invalid' }, ({ errors }) => {
        const errorResponse = validationErrorResponse(
          errors.map(({ param, reason }) => ({
            field: param,
            message: reason,
            code: 'INVALID_PARAM',
          }))
        );
        res.status(400).json(errorResponse);
      })
      .exhaustive();
  };
}
```

## トランザクション管理

### Drizzle ORM トランザクションパターン

UseCase層でのトランザクション管理を型安全に実装するパターンです。

#### 命名規則と引数パターン

トランザクション対応のメソッドで統一的な命名規則を使用します：

```typescript
// 命名規則
type DatabaseConnection = NodePgDatabase;  // 通常のDB接続
type Transaction = PgTransaction;          // トランザクションオブジェクト
type DbOrTx = DatabaseConnection | Transaction;  // どちらでも受け入れ可能

// 1. トランザクション非対応メソッド（通常のDB接続のみ）
class CustomerRepository {
  constructor(private readonly db: DatabaseConnection) {}

  async findById(id: CustomerId): Promise<Result<Customer | null, RepositoryError>> {
    // this.db を使用
  }
}

// 2. トランザクション専用メソッド（トランザクション必須）
class ReservationRepository {
  async createWithLock(
    tx: Transaction,  // 仮引数名は必ず 'tx'
    command: CreateReservationCommand
  ): Promise<Result<Reservation, RepositoryError>> {
    // tx を使用（FOR UPDATE等の排他制御が必要）
  }
}

// 3. トランザクション対応メソッド（オプショナル）
class CustomerRepository {
  // 通常版
  async save(command: CreateCustomerCommand): Promise<Result<Customer, RepositoryError>> {
    return this.saveWithTx(this.db, command);
  }

  // トランザクション対応版（WithTxサフィックス）
  async saveWithTx(
    dbOrTx: DbOrTx,  // 仮引数名は 'dbOrTx'
    command: CreateCustomerCommand
  ): Promise<Result<Customer, RepositoryError>> {
    // dbOrTx を使用（通常のDBでもトランザクションでも動作）
  }
}
```

#### 命名規則まとめ

| パターン | 仮引数名 | 型 | メソッドサフィックス | 使用場面 |
|---------|---------|-----|------------------|----------|
| DB接続のみ | `db` | `DatabaseConnection` | なし | 読み取り専用、単純な操作 |
| トランザクション必須 | `tx` | `Transaction` | なし | 排他制御、複数更新 |
| 両対応 | `dbOrTx` | `DbOrTx` | `WithTx` | 柔軟な実行コンテキスト |

#### 基本的なトランザクションパターン

```typescript
// src/business-logic/shared/transaction.types.ts
import { match } from 'ts-pattern';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { PgTransaction } from 'drizzle-orm/pg-core';

// トランザクション状態をSum型で表現
export type TransactionState =
  | { type: 'pending' }
  | { type: 'executing'; transactionId: string }
  | { type: 'committed'; transactionId: string }
  | { type: 'rolledback'; transactionId: string; reason: string };

// トランザクションコンテキスト
export type TransactionContext = {
  db: NodePgDatabase | PgTransaction;
  state: TransactionState;
  isolationLevel?: IsolationLevel;
};

// 分離レベル定義
export type IsolationLevel =
  | 'read uncommitted'
  | 'read committed'
  | 'repeatable read'
  | 'serializable';

// トランザクション結果
export type TransactionResult<T> = Result<T, TransactionError>;

export type TransactionError =
  | { type: 'deadlock'; retryable: true }
  | { type: 'constraintViolation'; constraint: string; retryable: false }
  | { type: 'timeout'; duration: number; retryable: true }
  | { type: 'serialization'; retryable: true }
  | { type: 'unknown'; message: string; retryable: false };
```

#### UseCase層でのトランザクション実装

```typescript
// src/business-logic/reservation/create-reservation.usecase.ts
import { match } from 'ts-pattern';
import { sql } from 'drizzle-orm';
import type { TransactionContext, TransactionResult } from '../shared/transaction.types';

export class CreateReservationUseCase {
  constructor(
    private readonly db: NodePgDatabase,
    private readonly logger: Logger
  ) {}

  async execute(
    command: CreateReservationCommand
  ): Promise<Result<Reservation, CreateReservationError>> {
    // トランザクション設定
    const txConfig = {
      isolationLevel: 'repeatable read' as const,
      accessMode: 'read write' as const,
      deferrable: false,
    };

    return this.withTransaction(txConfig, async (tx) => {
      // 1. 楽観的ロックでスタッフの空き時間をチェック
      const staffAvailability = await this.checkStaffAvailability(tx, command);
      if (staffAvailability.type === 'err') {
        return err(staffAvailability.error);
      }

      // 2. 予約スロットを悲観的ロックで確保
      const slot = await this.lockReservationSlot(tx, command);
      if (slot.type === 'err') {
        return err(slot.error);
      }

      // 3. 予約を作成
      const reservation = await this.createReservation(tx, command);
      if (reservation.type === 'err') {
        return err(reservation.error);
      }

      // 4. 在庫を更新（悲観的ロック使用）
      const inventory = await this.updateInventory(tx, command);
      if (inventory.type === 'err') {
        return err(inventory.error);
      }

      return ok(reservation.value);
    });
  }

  private async withTransaction<T>(
    config: PgTransactionConfig,
    callback: (tx: PgTransaction) => Promise<Result<T, any>>
  ): Promise<Result<T, any>> {
    try {
      const result = await this.db.transaction(async (tx) => {
        const transactionResult = await callback(tx);

        // Result型でエラーが返された場合は明示的にロールバック
        if (transactionResult.type === 'err') {
          tx.rollback();
        }

        return transactionResult;
      }, config);

      return result;
    } catch (error) {
      // トランザクションエラーをSum型に変換
      return err(this.mapTransactionError(error));
    }
  }

  private async lockReservationSlot(
    tx: PgTransaction,
    command: CreateReservationCommand
  ): Promise<Result<TimeSlot, ReservationError>> {
    try {
      // FOR UPDATE で悲観的ロック
      const [slot] = await tx
        .select()
        .from(timeSlots)
        .where(
          and(
            eq(timeSlots.staffId, command.staffId),
            eq(timeSlots.date, command.date),
            eq(timeSlots.startTime, command.startTime),
            eq(timeSlots.status, 'available')
          )
        )
        .for('update') // 悲観的ロック
        .limit(1);

      if (!slot) {
        return err({
          type: 'slotUnavailable',
          message: 'The selected time slot is not available'
        });
      }

      // スロットを予約済みに更新
      await tx
        .update(timeSlots)
        .set({ status: 'reserved', updatedAt: new Date() })
        .where(eq(timeSlots.id, slot.id));

      return ok(slot);
    } catch (error) {
      return err(this.mapDatabaseError(error));
    }
  }

  private mapTransactionError(error: unknown): TransactionError {
    return match(error)
      .when(
        (e): e is PgError => e?.code === '40001',
        () => ({ type: 'serialization', retryable: true } as const)
      )
      .when(
        (e): e is PgError => e?.code === '40P01',
        () => ({ type: 'deadlock', retryable: true } as const)
      )
      .when(
        (e): e is PgError => e?.code?.startsWith('23'),
        (e) => ({
          type: 'constraintViolation',
          constraint: e.constraint_name || 'unknown',
          retryable: false
        } as const)
      )
      .otherwise((e) => ({
        type: 'unknown',
        message: String(e),
        retryable: false
      } as const));
  }
}
```

#### 楽観的ロックパターン

```typescript
// src/business-logic/shared/optimistic-lock.ts
import { match } from 'ts-pattern';
import { eq, and } from 'drizzle-orm';

export interface VersionedEntity {
  id: string;
  version: number;
  updatedAt: Date;
}

export class OptimisticLockManager<T extends VersionedEntity> {
  async updateWithOptimisticLock<TTable>(
    tx: PgTransaction,
    table: TTable,
    entity: T,
    updates: Partial<T>
  ): Promise<Result<T, OptimisticLockError>> {
    // バージョンチェック付きアップデート
    const result = await tx
      .update(table)
      .set({
        ...updates,
        version: entity.version + 1,
        updatedAt: new Date()
      })
      .where(
        and(
          eq(table.id, entity.id),
          eq(table.version, entity.version) // 楽観的ロック
        )
      )
      .returning();

    if (result.length === 0) {
      return err({
        type: 'optimisticLockFailure',
        entityId: entity.id,
        expectedVersion: entity.version,
        message: 'Entity was modified by another transaction'
      });
    }

    return ok(result[0] as T);
  }
}

// 使用例
export class UpdateCustomerUseCase {
  private readonly lockManager = new OptimisticLockManager<Customer>();

  async execute(
    command: UpdateCustomerCommand
  ): Promise<Result<Customer, UpdateCustomerError>> {
    return this.db.transaction(async (tx) => {
      // 現在のエンティティを取得
      const [current] = await tx
        .select()
        .from(customers)
        .where(eq(customers.id, command.id))
        .limit(1);

      if (!current) {
        return err({ type: 'notFound' });
      }

      // 楽観的ロックでアップデート
      const updated = await this.lockManager.updateWithOptimisticLock(
        tx,
        customers,
        current,
        command.updates
      );

      return match(updated)
        .with({ type: 'ok' }, ({ value }) => ok(value))
        .with({ type: 'err' }, ({ error }) => {
          // リトライ可能なエラーとして返す
          return err({
            type: 'concurrentUpdate',
            retryable: true,
            originalError: error
          });
        })
        .exhaustive();
    });
  }
}
```

#### リトライメカニズム

```typescript
// src/business-logic/shared/transaction-retry.ts
import { match, P } from 'ts-pattern';

export class TransactionRetryManager {
  constructor(
    private readonly maxRetries: number = 3,
    private readonly backoffMs: number = 100
  ) {}

  async executeWithRetry<T>(
    operation: () => Promise<Result<T, TransactionError>>,
    retryConfig?: { maxRetries?: number; backoffMs?: number }
  ): Promise<Result<T, TransactionError>> {
    const config = {
      maxRetries: retryConfig?.maxRetries ?? this.maxRetries,
      backoffMs: retryConfig?.backoffMs ?? this.backoffMs,
    };

    let attempt = 0;
    let lastError: TransactionError | null = null;

    while (attempt < config.maxRetries) {
      const result = await operation();

      // 成功時は即座に返す
      if (result.type === 'ok') {
        return result;
      }

      // エラーをパターンマッチングで処理
      const shouldRetry = match(result.error)
        .with(
          { retryable: true },
          (error) => {
            lastError = error;
            return true;
          }
        )
        .with(
          { retryable: false },
          () => false
        )
        .exhaustive();

      if (!shouldRetry) {
        return result;
      }

      // エクスポネンシャルバックオフ
      const delay = config.backoffMs * Math.pow(2, attempt);
      await this.sleep(delay);
      attempt++;
    }

    return err(lastError || {
      type: 'unknown',
      message: 'Max retries exceeded',
      retryable: false
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 使用例
export class ReservationService {
  private readonly retryManager = new TransactionRetryManager();

  async createReservationWithRetry(
    command: CreateReservationCommand
  ): Promise<Result<Reservation, CreateReservationError>> {
    return this.retryManager.executeWithRetry(
      () => this.createReservationUseCase.execute(command),
      { maxRetries: 5, backoffMs: 200 }
    );
  }
}
```

#### ネストしたトランザクション（セーブポイント）

```typescript
// src/business-logic/shared/savepoint-transaction.ts
export class SavepointTransactionManager {
  async withSavepoint<T>(
    tx: PgTransaction,
    name: string,
    operation: () => Promise<Result<T, any>>
  ): Promise<Result<T, any>> {
    // セーブポイントの作成
    await tx.execute(sql`SAVEPOINT ${sql.identifier(name)}`);

    try {
      const result = await operation();

      if (result.type === 'err') {
        // セーブポイントまでロールバック
        await tx.execute(sql`ROLLBACK TO SAVEPOINT ${sql.identifier(name)}`);
      }

      return result;
    } catch (error) {
      // エラー時はセーブポイントまでロールバック
      await tx.execute(sql`ROLLBACK TO SAVEPOINT ${sql.identifier(name)}`);
      throw error;
    }
  }
}

// 使用例：部分的なロールバックが可能な複雑な処理
export class ComplexBookingUseCase {
  async execute(command: ComplexBookingCommand): Promise<Result<Booking, BookingError>> {
    return this.db.transaction(async (tx) => {
      const savepointManager = new SavepointTransactionManager();

      // メイン予約の作成
      const mainBooking = await this.createMainBooking(tx, command);
      if (mainBooking.type === 'err') {
        return mainBooking;
      }

      // オプショナルなアドオンの処理（失敗しても続行可能）
      const addons = await savepointManager.withSavepoint(
        tx,
        'addon_processing',
        async () => {
          return this.processAddons(tx, command.addons);
        }
      );

      // アドオンが失敗しても、メイン予約は維持
      const finalBooking = match(addons)
        .with({ type: 'ok' }, ({ value }) => ({
          ...mainBooking.value,
          addons: value
        }))
        .with({ type: 'err' }, () => ({
          ...mainBooking.value,
          addons: [],
          warnings: ['Some addons could not be processed']
        }))
        .exhaustive();

      return ok(finalBooking);
    });
  }
}
```

### ベストプラクティス

#### 1. 悲観的ロック vs 楽観的ロック

```typescript
// 悲観的ロック：競合が頻繁に発生する場合
// - 在庫管理
// - 予約スロット
// - 決済処理
const pessimisticLockExample = async (tx: PgTransaction) => {
  const [item] = await tx
    .select()
    .from(inventory)
    .where(eq(inventory.id, itemId))
    .for('update') // 他のトランザクションをブロック
    .limit(1);
};

// 楽観的ロック：競合が稀な場合
// - ユーザープロファイル更新
// - 設定変更
// - マスターデータ更新
const optimisticLockExample = async (tx: PgTransaction) => {
  const result = await tx
    .update(users)
    .set({ name: newName, version: version + 1 })
    .where(and(
      eq(users.id, userId),
      eq(users.version, version) // バージョンチェック
    ))
    .returning();
};
```

#### 2. 分離レベルの選択

```typescript
// 分離レベル選択ガイド
export const selectIsolationLevel = (scenario: TransactionScenario): IsolationLevel => {
  return match(scenario)
    .with({ type: 'reporting' }, () => 'read committed' as const)
    .with({ type: 'reservation' }, () => 'repeatable read' as const)
    .with({ type: 'financial' }, () => 'serializable' as const)
    .with({ type: 'bulkUpdate' }, () => 'read committed' as const)
    .exhaustive();
};
```

#### 3. デッドロック回避

```typescript
// リソースアクセス順序の統一
export class OrderedLockManager {
  async lockResources(
    tx: PgTransaction,
    resources: Array<{ table: string; id: string }>
  ): Promise<Result<void, LockError>> {
    // 常に同じ順序でロックを取得（テーブル名、ID順）
    const sortedResources = resources.sort((a, b) => {
      const tableCompare = a.table.localeCompare(b.table);
      return tableCompare !== 0 ? tableCompare : a.id.localeCompare(b.id);
    });

    for (const resource of sortedResources) {
      await this.lockResource(tx, resource);
    }

    return ok(undefined);
  }
}
```

## まとめ

すべての実装パターンにおいて、以下の原則を徹底しています：

1. **Sum型による状態の明確な表現**
2. **ts-patternによる網羅的な処理**
3. **不変性の保証（readonly、Object.freeze）**
4. **Result型によるエラーハンドリング**
5. **型レベルでの安全性の保証**
6. **トランザクションの適切な管理とエラーハンドリング**

これらのパターンを適用することで、実行時エラーを最小限に抑え、保守性の高いコードベースを実現します。