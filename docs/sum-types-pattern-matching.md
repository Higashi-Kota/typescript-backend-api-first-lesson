# Sum型とパターンマッチング

**実装済みのSalonドメイン**で使用されているSum型（判別共用体）とts-patternを使用した網羅的パターンマッチングのガイドです。

## Result型での ts-pattern 活用（実装版）

### 基本的なResult型パターンマッチング

```typescript
// backend/packages/utility/src/result/result.ts
import { match } from 'ts-pattern'

export type Result<T, E> =
  | { type: 'success'; data: T }
  | { type: 'error'; error: E }

// UseCase でのパターンマッチング例
export class CreateSalonUseCase {
  async execute(
    request: ApiCreateSalonRequest
  ): Promise<Result<ApiSalon, DomainError>> {

    const validation = this.validate(request)
    if (Result.isError(validation)) {
      return validation // エラー時の早期return
    }

    const emailExists = await this.repository.existsByEmail(request.contactInfo.email)
    // Result型のネストしたパターンマッチング
    return match(emailExists)
      .with({ type: 'success', data: true }, () =>
        Result.error(DomainErrors.alreadyExists('Salon', 'email', request.contactInfo.email))
      )
      .with({ type: 'success', data: false }, async () => {
        // メイン処理
        const createResult = await this.repository.create(/* ... */)
        return createResult
      })
      .with({ type: 'error' }, ({ error }) => Result.error(error))
      .exhaustive()
  }
}
```

### API層での網羅的エラーハンドリング

```typescript
// backend/packages/api/src/routes/salon.routes.ts
import { match } from 'ts-pattern'

const createSalonHandler: RequestHandler = async (req, res, next) => {
  try {
    const useCase = new CreateSalonUseCase(repository)
    const result = await useCase.execute(req.body)

    // Result型の網羅的処理
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
      .exhaustive() // 全パターンの処理を保証
  } catch (error) {
    next(error)
  }
}
```

## DomainError Sum型パターン（実装版）

### 複数エラー型の判別処理

```typescript
// backend/packages/domain/src/shared/errors.ts
export type DomainError =
  | { type: 'validation'; message: string; code: string; details: string[] }
  | { type: 'notFound'; entity: string; id: string }
  | { type: 'alreadyExists'; entity: string; field: string; value: string }
  | { type: 'businessRule'; rule: string; message: string }
  | { type: 'database'; message: string; cause?: unknown }

// エラーハンドリングでの判別処理
const handleDomainError = (res: Response, error: DomainError): Response => {
  const problemDetails = match(error)
    .with({ type: 'validation' }, ({ message, code, details }) => ({
      type: 'https://example.com/probs/validation-error',
      title: 'Validation Error',
      status: 400,
      detail: message,
      code,
      errors: details,
      timestamp: new Date().toISOString(),
    }))
    .with({ type: 'notFound' }, ({ entity, id }) => ({
      type: 'https://example.com/probs/not-found',
      title: 'Not Found',
      status: 404,
      detail: `${entity} with ID ${id} not found`,
      code: 'NOT_FOUND',
      timestamp: new Date().toISOString(),
    }))
    .with({ type: 'alreadyExists' }, ({ entity, field, value }) => ({
      type: 'https://example.com/probs/already-exists',
      title: 'Already Exists',
      status: 409,
      detail: `${entity} with ${field} '${value}' already exists`,
      code: 'ALREADY_EXISTS',
      timestamp: new Date().toISOString(),
    }))
    .with({ type: 'businessRule' }, ({ rule, message }) => ({
      type: 'https://example.com/probs/business-rule',
      title: 'Business Rule Violation',
      status: 422,
      detail: message,
      code: rule.toUpperCase(),
      timestamp: new Date().toISOString(),
    }))
    .with({ type: 'database' }, ({ message }) => ({
      type: 'https://example.com/probs/internal-error',
      title: 'Internal Server Error',
      status: 500,
      detail: 'An internal error occurred',
      code: 'INTERNAL_ERROR',
      timestamp: new Date().toISOString(),
    }))
    .exhaustive()

  return res.status(problemDetails.status).json(problemDetails)
}
```

## Repository Result型パターン（実装版）

### データベース操作での Result パターン

```typescript
// backend/packages/infrastructure/src/repositories/salon.repository.impl.ts
export class SalonRepository implements ISalonRepository {
  async findById(id: SalonId): Promise<Result<DbSalon | null, DomainError>> {
    try {
      const [salon] = await this.db
        .select()
        .from(salons)
        .where(and(eq(salons.id, id), isNull(salons.deletedAt)))
        .limit(1)

      return Result.success(salon ?? null)
    } catch (error) {
      return Result.error(
        DomainErrors.database(
          'Failed to find salon by ID',
          JSON.stringify(error, null, 2)
        )
      )
    }
  }

  async existsByEmail(email: string): Promise<Result<boolean, DomainError>> {
    try {
      const [result] = await this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(salons)
        .where(and(eq(salons.email, email), isNull(salons.deletedAt)))

      return Result.success((result?.count ?? 0) > 0)
    } catch (error) {
      return Result.error(
        DomainErrors.database(
          'Failed to check salon email existence',
          JSON.stringify(error, null, 2)
        )
      )
    }
  }
}
```

## 高度なパターンマッチング（実装可能パターン）

### ガード付きパターンマッチング

```typescript
import { match, P } from 'ts-pattern'

type SalonState =
  | { type: 'active'; salon: DbSalon }
  | { type: 'inactive'; salon: DbSalon; reason: string }
  | { type: 'pending'; salon: DbSalon; reviewDate: string }

const processSalonState = (state: SalonState): string => {
  return match(state)
    .with({ type: 'active' }, ({ salon }) =>
      `Active salon: ${salon.name}`
    )
    .with(
      { type: 'pending', reviewDate: P.when(date =>
        new Date(date) < new Date()
      )},
      ({ salon }) => `Review overdue for: ${salon.name}`
    )
    .with({ type: 'pending' }, ({ salon, reviewDate }) =>
      `Pending review: ${salon.name} (${reviewDate})`
    )
    .with({ type: 'inactive' }, ({ salon, reason }) =>
      `Inactive: ${salon.name} (${reason})`
    )
    .exhaustive()
}
```

### 配列パターンマッチング

```typescript
type ValidationResult =
  | { type: 'success'; data: unknown }
  | { type: 'error'; errors: string[] }

const handleValidationErrors = (result: ValidationResult): string => {
  return match(result)
    .with({ type: 'success' }, () => 'Validation passed')
    .with({ type: 'error', errors: [] }, () => 'No specific errors')
    .with({ type: 'error', errors: [P.string] }, ({ errors }) =>
      `Single error: ${errors[0]}`
    )
    .with({ type: 'error', errors: P.array(P.string) }, ({ errors }) =>
      `Multiple errors: ${errors.join(', ')}`
    )
    .exhaustive()
}
```

interface Context {
  event: PaymentEvent;
  userRole: UserRole;
  timestamp: Date;
}

// 複数の条件を組み合わせたパターンマッチング
function processPaymentEvent(context: Context): void {
  match(context)
    .with(
      { event: { type: 'failed', retryable: true }, userRole: 'admin' },
      ({ event }) => {
        // 管理者の場合、リトライ可能な失敗を自動リトライ
        console.log(`Admin retry for: ${event.reason}`);
      }
    )
    .with(
      { event: { type: 'failed' }, userRole: P.not('admin') },
      ({ event, userRole }) => {
        // 一般ユーザーの場合、サポートに通知
        console.log(`Notify support for ${userRole}: ${event.reason}`);
      }
    )
    .with(
      { event: { type: 'completed' } },
      ({ event }) => {
        // 完了イベントの処理
        console.log(`Payment completed: ${event.transactionId}`);
      }
    )
    .with(
      { event: { type: P.union('initiated', 'processing') } },
      ({ event }) => {
        // 進行中のイベント
        console.log(`Payment in progress: ${event.type}`);
      }
    )
    .exhaustive();
}
```

## ガード付きパターンマッチング

```typescript
type ValidationResult<T> = 
  | { success: true; value: T }
  | { success: false; errors: string[] };

function processValidation<T>(
  result: ValidationResult<T>,
  constraints: { minValue?: number; maxLength?: number }
): string {
  return match(result)
    .with(
      { 
        success: true, 
        value: P.when((v): v is number => 
          typeof v === 'number' && 
          constraints.minValue !== undefined && 
          v < constraints.minValue
        ) 
      },
      () => 'Value is below minimum'
    )
    .with(
      { success: true },
      ({ value }) => `Valid: ${value}`
    )
    .with(
      { success: false, errors: P.array(P.string) },
      ({ errors }) => `Errors: ${errors.join(', ')}`
    )
    .exhaustive();
}
```

## Result型を使用したエラーハンドリング

```typescript
// Result型の定義
export type Result<T, E = AppError> = 
  | { type: 'ok'; value: T }
  | { type: 'err'; error: E };

export function ok<T>(value: T): Extract<Result<T>, { type: 'ok' }> {
  return { type: 'ok', value };
}

export function err<E>(error: E): Extract<Result<never, E>, { type: 'err' }> {
  return { type: 'err', error };
}

// 使用例
function divide(a: number, b: number): Result<number, string> {
  if (b === 0) {
    return err('Division by zero');
  }
  return ok(a / b);
}

// パターンマッチングでの処理
const result = divide(10, 2);
const message = match(result)
  .with({ type: 'ok' }, ({ value }) => `Result: ${value}`)
  .with({ type: 'err' }, ({ error }) => `Error: ${error}`)
  .exhaustive();
```

## Sum型設計のベストプラクティス

### 1. 状態遷移の表現

```typescript
type Task = 
  | { type: 'draft'; id: string; title: string }
  | { type: 'assigned'; id: string; title: string; assignee: User; dueDate: Date }
  | { type: 'inProgress'; id: string; title: string; assignee: User; startedAt: Date }
  | { type: 'completed'; id: string; title: string; assignee: User; completedAt: Date };

// 状態遷移関数
function assignTask(task: Extract<Task, { type: 'draft' }>, assignee: User, dueDate: Date): Extract<Task, { type: 'assigned' }> {
  return {
    type: 'assigned',
    id: task.id,
    title: task.title,
    assignee,
    dueDate
  };
}
```

### 2. APIレスポンスの型安全な処理

```typescript
type ApiResponse<T> = 
  | { type: 'success'; data: T; meta: ResponseMeta }
  | { type: 'error'; error: ErrorDetail; meta: ResponseMeta }
  | { type: 'validationError'; errors: ValidationError[]; meta: ResponseMeta };

// レスポンスのHTTPステータスコード決定
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

### 3. 複雑なビジネスロジックの表現

```typescript
type OrderState = 
  | { type: 'pending'; items: Item[]; createdAt: Date }
  | { type: 'paid'; items: Item[]; paidAt: Date; paymentId: string }
  | { type: 'shipped'; items: Item[]; shippedAt: Date; trackingNumber: string }
  | { type: 'delivered'; items: Item[]; deliveredAt: Date }
  | { type: 'cancelled'; reason: string; cancelledAt: Date };

function canCancelOrder(order: OrderState): boolean {
  return match(order)
    .with({ type: P.union('pending', 'paid') }, () => true)
    .with({ type: P.union('shipped', 'delivered', 'cancelled') }, () => false)
    .exhaustive();
}

function getOrderActions(order: OrderState): string[] {
  return match(order)
    .with({ type: 'pending' }, () => ['pay', 'cancel'])
    .with({ type: 'paid' }, () => ['ship', 'cancel', 'refund'])
    .with({ type: 'shipped' }, () => ['track', 'report_issue'])
    .with({ type: 'delivered' }, () => ['review', 'return'])
    .with({ type: 'cancelled' }, () => ['reorder'])
    .exhaustive();
}
```

## パターンマッチングのアンチパターンと解決策

### アンチパターン: 不完全なマッチング

```typescript
// ❌ exhaustive()を使わない
function badHandle(response: ApiResponse<any>): string {
  return match(response)
    .with({ status: 'success' }, () => 'Success')
    .with({ status: 'error' }, () => 'Error')
    .otherwise(() => 'Unknown'); // 新しいケースが追加されても気付かない
}

// ✅ exhaustive()を使用
function goodHandle(response: ApiResponse<any>): string {
  return match(response)
    .with({ status: 'success' }, () => 'Success')
    .with({ status: 'error' }, () => 'Error')
    .with({ status: 'loading' }, () => 'Loading')
    .with({ status: 'notFound' }, () => 'Not Found')
    .exhaustive(); // 新しいケースが追加されるとコンパイルエラー
}
```

### アンチパターン: 型の絞り込み不足

```typescript
// ❌ 型の絞り込みが不十分
type User = { id: string; name: string; role?: 'admin' | 'user' };

function greetUser(user: User): string {
  if (user.role) {
    return `Hello ${user.role}`;
  }
  return 'Hello guest';
}

// ✅ Sum型で明確に表現
type User = 
  | { id: string; name: string; role: 'admin' }
  | { id: string; name: string; role: 'user' }
  | { id: string; name: string; role: 'guest' };

function greetUser(user: User): string {
  return match(user)
    .with({ role: 'admin' }, ({ name }) => `Hello Admin ${name}`)
    .with({ role: 'user' }, ({ name }) => `Hello ${name}`)
    .with({ role: 'guest' }, () => 'Hello Guest')
    .exhaustive();
}
```

## まとめ

- **Sum型（判別共用体）**を使用して、可能な状態を明確に定義する
- **ts-pattern**の`match`と`exhaustive()`で網羅的な処理を保証する
- **ネストを避け**、フラットな構造で型の絞り込みを容易にする
- **Result型**で例外の代わりに型安全なエラーハンドリングを実現する
- **状態遷移**をSum型で表現し、不正な状態を作れないようにする