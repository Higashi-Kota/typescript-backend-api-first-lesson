# Sum型とパターンマッチング

TypeScriptにおけるSum型（判別共用体）とts-patternを使用した網羅的パターンマッチングのガイドです。

## ts-patternを使用した網羅的パターンマッチング

### 基本的な使用法

```typescript
import { match, P } from 'ts-pattern';

// Sum型の定義
type ApiResponse<T> = 
  | { status: 'success'; data: T }
  | { status: 'error'; code: string; message: string }
  | { status: 'loading' }
  | { status: 'notFound'; resource: string };

// ts-patternによる網羅的マッチング
function handleResponse<T>(response: ApiResponse<T>): string {
  return match(response)
    .with({ status: 'success' }, ({ data }) => 
      `Success: ${JSON.stringify(data)}`
    )
    .with({ status: 'error' }, ({ code, message }) => 
      `Error ${code}: ${message}`
    )
    .with({ status: 'loading' }, () => 
      'Loading...'
    )
    .with({ status: 'notFound' }, ({ resource }) => 
      `${resource} not found`
    )
    .exhaustive(); // コンパイル時に全ケースの処理を保証
}
```

## 複雑なパターンマッチング

### 複数条件の組み合わせ

```typescript
type PaymentEvent = 
  | { type: 'initiated'; amount: number; currency: string }
  | { type: 'processing'; transactionId: string }
  | { type: 'completed'; transactionId: string; receipt: string }
  | { type: 'failed'; reason: string; retryable: boolean };

type UserRole = 'admin' | 'user' | 'guest';

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