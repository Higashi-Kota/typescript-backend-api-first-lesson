# 型安全性の原則

TypeScriptバックエンド開発における型安全性の基本原則と実践的なパターンを定義します。

## 基本原則

1. **`any`型の使用は絶対禁止** - Biomeでエラーとして扱う
2. **型アサーションの禁止** - 適切な型定義と判別共用体を使用
3. **型ガードの禁止** - 判別共用体と網羅的パターンマッチングを使用
4. **すべての厳格チェックを有効化**:
   - `noUncheckedIndexedAccess`
   - `exactOptionalPropertyTypes`
   - `noImplicitReturns`
   - すべての関数パラメータと戻り値の型を明示

## ネストした型オブジェクトの回避 - 判別共用体の使用

### 問題のあるパターン

```typescript
// ❌ ネストしたオブジェクトでの型定義
interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  metadata: TaskMetadata; // ネストしたオブジェクト
}

type TaskMetadata = 
  | { type: 'simple'; priority: number }
  | { type: 'scheduled'; dueDate: Date; reminder?: Date }
  | { type: 'recurring'; interval: 'daily' | 'weekly' | 'monthly' }

// 使用時に二段階のプロパティアクセスが必要
if (task.metadata.type === 'scheduled') {
  console.log(task.metadata.dueDate); // ネストしたアクセス
}
```

### 推奨パターン

```typescript
// ✅ フラットな判別共用体
type BaseTask = {
  id: string;
  title: string;
  status: TaskStatus;
};

type Task = BaseTask & (
  | { type: 'simple'; priority: number }
  | { type: 'scheduled'; dueDate: Date; reminder?: Date }
  | { type: 'recurring'; interval: 'daily' | 'weekly' | 'monthly' }
);

// 直接的なプロパティアクセスと自然な型の絞り込み
if (task.type === 'scheduled') {
  console.log(task.dueDate); // 直接アクセス、TypeScriptがdueDateの存在を認識
}
```

## 入力型は処理内容と一致させる

### 問題のあるパターン

```typescript
// ❌ すべてのタスクを受け取るが、特定のタイプのみ処理
function updateScheduledTasks(
  tasks: ReadonlyArray<Task>,
  newDate: Date
): ReadonlyArray<Task> {
  return tasks.map(task => {
    // 実行時の型チェックが必要
    if (task.type === 'scheduled') {
      return { ...task, dueDate: newDate };
    }
    return task; // ほとんどのタスクはそのまま返される
  });
}
```

### 推奨パターン

```typescript
// ✅ 処理対象の型のみを受け取る
type ScheduledTask = Extract<Task, { type: 'scheduled' }>;

function updateScheduledTasks(
  tasks: ReadonlyArray<ScheduledTask>,
  newDate: Date
): ReadonlyArray<ScheduledTask> {
  return tasks.map(task => ({ ...task, dueDate: newDate }));
}

// 呼び出し側で型を絞り込む
const scheduledTasks = tasks.filter(
  (task): task is ScheduledTask => task.type === 'scheduled'
);
const updatedTasks = updateScheduledTasks(scheduledTasks, newDate);
```

## 配列アクセスパターン

```typescript
// ❌ 長さチェック後のアクセス
if (array.length > 0) {
  const first = array[0]; // TypeScriptは配列が空でないことを推論できない
}

// ✅ 直接アクセスしてundefinedチェック
const first = array[0];
if (first !== undefined) {
  // firstの型情報が保持される
}
```

## Nullish Coalescing演算子の使用

### 厳密な型チェックの原則

TypeScriptでは、すべてのデフォルト値設定においてNullish Coalescing演算子（`??`）を使用し、論理OR演算子（`||`）によるFalsy値の横着な判定は禁止します。

### 禁止パターン

```typescript
// ❌ 論理OR演算子によるFalsy値の横着な判定は禁止
const count = data.count || 10;  // 0の場合も10になってしまう
const name = data.name || 'Unknown';  // 空文字列の場合も'Unknown'になってしまう
const isActive = data.isActive || true;  // falseの場合もtrueになってしまう
const isEnabled = data.isEnabled || false;  // 横着な真偽値判定も禁止
```

### 推奨パターン

```typescript
// ✅ すべてのケースでNullish Coalescing演算子を使用
const count = data.count ?? 10;  // 0は有効な値として扱われる
const name = data.name ?? 'Unknown';  // 空文字列は有効な値として扱われる
const notes = data.notes ?? null;  // undefinedをnullに変換（API型定義に合わせる）

// ✅ 真偽値もnullish coalescingを使用
const isEnabled = data.isEnabled ?? false;  // null/undefinedの場合のみfalse
const isActive = data.isActive ?? true;  // null/undefinedの場合のみtrue

// ✅ 真偽値の論理演算は明示的に行う
const hasPermission = (user.isAdmin === true) || (user.hasAccess === true);
const canEdit = (user.role === 'admin') || (user.role === 'editor');
```

### 数値の厳密な検証

```typescript
// ❌ 横着な数値判定
const price = userInput || 0;  // 空文字列やfalseも0になってしまう

// ✅ 厳密な数値検証
const parsePrice = (input: unknown): number => {
  if (typeof input === 'number' && !isNaN(input)) {
    return input;
  }
  if (typeof input === 'string') {
    const parsed = parseFloat(input);
    if (!isNaN(parsed)) {
      return parsed;
    }
  }
  return 0;  // デフォルト値
};

// ✅ 整数の厳密な検証
const parseInt = (input: unknown): number | null => {
  if (typeof input === 'number' && Number.isInteger(input)) {
    return input;
  }
  if (typeof input === 'string') {
    const parsed = Number.parseInt(input, 10);
    if (!isNaN(parsed)) {
      return parsed;
    }
  }
  return null;
};
```

### ドメインモデルとAPI型のマッピング

```typescript
// ✅ すべてのケースでnullish coalescing演算子を使用
export function toApiResponse(domainModel: DomainModel): ApiResponse {
  return {
    id: domainModel.id,
    name: domainModel.name,
    description: domainModel.description ?? null,  // undefined → null
    preferences: domainModel.preferences ?? null,
    tags: domainModel.tags ?? null,
    notes: domainModel.notes ?? null,
    loyaltyPoints: domainModel.loyaltyPoints ?? 0,  // undefinedの場合のみ0
    isActive: domainModel.isActive ?? false,  // undefinedの場合のみfalse
    isVerified: domainModel.isVerified ?? false,
  };
}
```

### 厳密な型チェックの原則

1. **論理OR演算子（`||`）の使用は原則禁止**
   - Falsy値による横着な判定を防ぐため
   - 意図しない値の変換を防ぐため

2. **Nullish Coalescing演算子（`??`）を常に使用**
   - null/undefinedのみをフォールバック
   - すべての型（文字列、数値、真偽値）で一貫して使用

3. **厳密な型検証を行う**
   - 数値は`isNaN()`や`Number.isInteger()`で検証
   - 文字列は明示的な長さや形式チェック
   - 真偽値は厳密等価演算子（`===`）で比較

4. **論理演算は明示的に**
   - 真偽値の論理演算では各条件を明示的に評価
   - 横着なFalsy値判定に頼らない

## 真偽値判定の厳密化

### Falsy値判定の問題点

JavaScriptのFalsy値（`false`, `0`, `""`, `null`, `undefined`, `NaN`）を利用した判定は、意図しない動作を引き起こす可能性があります。特に`!`演算子や`!!`による真偽値変換は避けるべきです。

### 禁止パターン

```typescript
// ❌ 単独の否定演算子によるFalsy判定
if (!value) { ... }  // value が 0, "", false の場合も true になる

// ❌ ダブル否定による真偽値変換
const isValid = !!value;  // 0, "", false も false になる

// ❌ 条件式での暗黙的な真偽値判定
if (user) { ... }  // user が存在するかの判定が曖昧

// ❌ 三項演算子での暗黙的判定
const result = data ? processData(data) : null;
```

### 推奨パターン

```typescript
// ✅ 明示的なnull/undefinedチェック
if (value !== null && value !== undefined) { ... }

// ✅ 厳密な等価性チェック
if (value !== null) { ... }
if (value !== undefined) { ... }

// ✅ 型ガードを使用した明確な判定
if (user !== null) {
  // user は null ではないことが保証される
}

// ✅ オプショナルチェイニングとnullish coalescingの組み合わせ
const name = user?.name ?? 'Anonymous';

// ✅ 配列の要素存在チェック
const firstItem = array[0];
if (firstItem !== undefined) {
  // firstItem の型情報が保持される
}

// ✅ 真偽値の明示的な比較
if (isEnabled === true) { ... }
if (hasPermission === false) { ... }

// ✅ 数値の明示的なチェック
if (count !== 0) { ... }
if (!isNaN(value) && value > 0) { ... }

// ✅ 文字列の明示的なチェック
if (text.length > 0) { ... }
if (text !== '') { ... }
```

### 実践的な例

```typescript
// ❌ 問題のあるパターン
function processUser(user?: User) {
  if (!user) {  // user が undefined の場合のみを想定しているが、他のFalsy値も含まれる
    return null;
  }
  return user.name;
}

// ✅ 推奨パターン
function processUser(user?: User) {
  if (user === null || user === undefined) {
    return null;
  }
  return user.name;
}

// さらに良いパターン（早期リターン）
function processUser(user?: User) {
  if (user == null) {  // null と undefined の両方をチェック
    return null;
  }
  return user.name;
}
```

## ネストした三項演算子の禁止とパターンマッチング

### 三項演算子の制限

複雑な条件分岐において、ネストした三項演算子は可読性を著しく損ない、バグの温床となります。このプロジェクトでは、Biomeの`noNestedTernary`ルールによりネストした三項演算子を禁止し、代わりにts-patternによるパターンマッチングを使用します。

### 禁止パターン

```typescript
// ❌ ネストした三項演算子
const status = user.isActive 
  ? user.isVerified 
    ? 'active' 
    : 'pending'
  : 'inactive';

// ❌ 複雑な条件のネスト
const price = product.type === 'premium'
  ? user.isMember
    ? product.price * 0.8
    : product.price
  : product.price * 0.9;

// ❌ 真偽値変換のネスト
const isEnabled = value === 'true'
  ? true
  : value === 'false'
    ? false
    : undefined;
```

### 推奨パターン - ts-patternによるフラットな評価

```typescript
import { match } from 'ts-pattern';

// ✅ パターンマッチングによる明確な条件分岐
const status = match({ isActive: user.isActive, isVerified: user.isVerified })
  .with({ isActive: true, isVerified: true }, () => 'active')
  .with({ isActive: true, isVerified: false }, () => 'pending')
  .with({ isActive: false }, () => 'inactive')
  .exhaustive();

// ✅ 複数条件の組み合わせ
const price = match({ type: product.type, isMember: user.isMember })
  .with({ type: 'premium', isMember: true }, () => product.price * 0.8)
  .with({ type: 'premium', isMember: false }, () => product.price)
  .otherwise(() => product.price * 0.9);

// ✅ 文字列から真偽値への変換
const isEnabled = match(value)
  .with('true', () => true)
  .with('false', () => false)
  .otherwise(() => undefined);
```

### より複雑な例

```typescript
// ❌ 深くネストした三項演算子
const message = error.type === 'network'
  ? error.retry
    ? 'Network error. Retrying...'
    : 'Network error. Please check your connection.'
  : error.type === 'auth'
    ? error.code === 401
      ? 'Invalid credentials'
      : 'Authentication failed'
    : 'Unknown error';

// ✅ パターンマッチングによる階層的な条件の平坦化
const message = match(error)
  .with({ type: 'network', retry: true }, () => 'Network error. Retrying...')
  .with({ type: 'network', retry: false }, () => 'Network error. Please check your connection.')
  .with({ type: 'auth', code: 401 }, () => 'Invalid credentials')
  .with({ type: 'auth' }, () => 'Authentication failed')
  .otherwise(() => 'Unknown error');

// ✅ Sum型と組み合わせた型安全なパターンマッチング
type ApiError = 
  | { type: 'network'; retry: boolean; endpoint: string }
  | { type: 'auth'; code: 401 | 403; message: string }
  | { type: 'validation'; fields: string[] }
  | { type: 'unknown'; details?: unknown };

const handleError = (error: ApiError): string => 
  match(error)
    .with({ type: 'network', retry: true }, ({ endpoint }) => 
      `Retrying connection to ${endpoint}...`)
    .with({ type: 'network', retry: false }, ({ endpoint }) => 
      `Failed to connect to ${endpoint}`)
    .with({ type: 'auth', code: 401 }, () => 
      'Please log in to continue')
    .with({ type: 'auth', code: 403 }, () => 
      'You do not have permission')
    .with({ type: 'validation' }, ({ fields }) => 
      `Invalid fields: ${fields.join(', ')}`)
    .with({ type: 'unknown' }, () => 
      'An unexpected error occurred')
    .exhaustive();
```

### パターンマッチングの利点

1. **可読性**: 条件と結果が明確に対応
2. **型安全性**: TypeScriptとの完全な統合
3. **網羅性**: `exhaustive()`による全ケースの処理保証
4. **保守性**: 新しい条件の追加が容易
5. **デバッグ**: 各ケースが独立してテスト可能

## 必須のBiomeルール

```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
  "linter": {
    "enabled": true,
    "rules": {
      "correctness": {
        "noUnusedImports": "error",
        "noUnusedVariables": "error",
        "useExhaustiveDependencies": "error"
      },
      "recommended": true,
      "style": {
        "noVar": "error",
        "useAsConstAssertion": "error",
        "useConst": "error"
      },
      "suspicious": {
        "noExplicitAny": "error",
        "noImplicitAnyLet": "error"
      },
      "nursery": {
        "noNestedTernary": "error"
      }
    }
  }
}
```

## TypeScript設定

TypeScript設定の詳細については、[「TypeScript設定ガイド」](./typescript-configuration.md)を参照してください。

## まとめ

良いTypeScript設計とは：
1. 無効な状態を表現できない型
2. 型アサーションなし（Biomeで強制）
3. 型述語なし（TypeScriptの厳格設定で強制）
4. 網羅的パターンマッチング（TypeScriptとts-patternで強制）
5. 通常の制御フローで自然に絞り込まれる型
6. 関数が実際に処理するものと一致する入力型
7. より良い型の絞り込みのためにネストした型構造をフラット化

目標は、実行時チェックではなく、コンパイラに正しさを保証させることです。