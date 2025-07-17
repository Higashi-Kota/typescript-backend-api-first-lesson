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

## まとめ

すべての実装パターンにおいて、以下の原則を徹底しています：

1. **Sum型による状態の明確な表現**
2. **ts-patternによる網羅的な処理**
3. **不変性の保証（readonly、Object.freeze）**
4. **Result型によるエラーハンドリング**
5. **型レベルでの安全性の保証**

これらのパターンを適用することで、実行時エラーを最小限に抑え、保守性の高いコードベースを実現します。