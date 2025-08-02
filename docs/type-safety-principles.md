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

## 論理演算子の使い分け - || vs ??

### 基本原則

- `||`（論理和演算子）: **真偽値の論理演算のみに使用**
- `??`（null 合体演算子）: **デフォルト値/フォールバック値の設定に使用**

### 問題のあるパターン

```typescript
// ❌ フォールバック値に || を使用
const port = process.env.PORT || 3000; // 0や空文字列が falsy として扱われる
const name = user.name || 'Anonymous'; // 空文字列が意図的に設定されていても 'Anonymous' になる
const count = options.count || 10; // count が 0 の場合、意図せず 10 になる
```

### 推奨パターン

```typescript
// ✅ フォールバック値には ?? を使用
const port = process.env.PORT ?? 3000; // undefined/null のみフォールバック
const name = user.name ?? 'Anonymous'; // 空文字列は許容される
const count = options.count ?? 10; // 0 は有効な値として扱われる

// ✅ 真偽値の論理演算には || を使用（ドモルガンの法則など）
const isInvalid = !isActive || !isEnabled; // 純粋な boolean 演算
const shouldProcess = hasPermission || isAdmin; // boolean の結合
const canAccess = (isPublic || isOwner) && !isBlocked; // 複雑な boolean 論理
```

### 具体的な使用例

```typescript
// ✅ 環境変数や設定値の読み込み
const apiUrl = process.env.API_URL ?? 'http://localhost:3000';
const timeout = config.timeout ?? 5000;
const retryCount = options.retries ?? 3;

// ✅ オプショナルな値の処理
function greet(name?: string) {
  const displayName = name ?? 'Guest';
  return `Hello, ${displayName}!`;
}

// ✅ 配列やオブジェクトのデフォルト値
const items = response.data ?? [];
const settings = userPreferences ?? {};

// ✅ boolean の論理演算
const hasAccess = user.isActive && (user.isAdmin || user.hasPermission);
const isDisabled = !isEnabled || isLoading || hasErrors;
```

## 厳密なFalsy判定 - !! や ! の代わりに明示的な比較

### 基本原則

- `!!value` や `!value` による暗黙的なfalsyチェックは禁止
- 明示的な比較演算子を使用して、意図を明確にする

### 問題のあるパターン

```typescript
// ❌ !! による真偽値変換
const hasValue = !!user.name;
const isValid = !!response.data;
const exists = !!array.length;

// ❌ ! による否定チェック
if (!user.email) {
  // null, undefined, 空文字列すべてをfalseとして扱う
}

if (!count) {
  // 0, null, undefined すべてをfalseとして扱う
}
```

### 推奨パターン

```typescript
// ✅ null/undefined の明示的チェック
const hasValue = user.name != null; // null と undefined をチェック
const isValid = response.data !== null && response.data !== undefined;
const exists = array.length > 0;

// ✅ 空文字列の明示的チェック
if (user.email === '') {
  // 空文字列のみをチェック
}

if (user.email == null || user.email === '') {
  // null, undefined, 空文字列をチェック
}

// ✅ 数値の明示的チェック
if (count === 0) {
  // 0 のみをチェック
}

if (count == null) {
  // null と undefined をチェック
}

// ✅ NaN の明示的チェック
if (Number.isNaN(value)) {
  // NaN のみをチェック
}

// ✅ 配列の存在チェック
if (items != null && items.length > 0) {
  // 配列が存在し、要素があることをチェック
}

// ✅ オブジェクトの存在チェック
if (options != null && Object.keys(options).length > 0) {
  // オブジェクトが存在し、プロパティがあることをチェック
}
```

### 具体的な使用例

```typescript
// ✅ ユーザー入力の検証
function validateInput(input?: string): boolean {
  // 明示的に undefined と空文字列をチェック
  if (input == null) {
    return false;
  }
  if (input === '') {
    return false;
  }
  return true;
}

// ✅ API レスポンスの処理
function processResponse(data: unknown): void {
  // 明示的な型チェック
  if (data == null) {
    throw new Error('No data received');
  }
  if (typeof data !== 'object') {
    throw new Error('Invalid data format');
  }
  // データ処理...
}

// ✅ 配列要素の存在チェック
function getFirstItem<T>(items?: T[]): T | undefined {
  if (items == null || items.length === 0) {
    return undefined;
  }
  return items[0];
}

// ✅ 真偽値の明示的な判定
function isActive(status?: boolean): boolean {
  // undefined と false を区別
  if (status === undefined) {
    return false; // デフォルト値
  }
  return status === true; // 明示的な true チェック
}
```

### チェックの使い分け

| 比較 | 用途 |
|------|------|
| `value == null` | null と undefined の両方をチェック |
| `value === null` | null のみをチェック |
| `value === undefined` | undefined のみをチェック |
| `value === ''` | 空文字列のみをチェック |
| `value === 0` | 数値の 0 のみをチェック |
| `Number.isNaN(value)` | NaN のみをチェック |
| `Array.isArray(value) && value.length > 0` | 配列で要素があることをチェック |

### Boolean メソッドの戻り値に対する否定

Boolean を返すメソッドの否定には `!` を使用します（`=== false` は不要）：

```typescript
// ❌ 不必要な === false
if (allowedRoles.includes(role) === false) { }
if (str.startsWith('http') === false) { }
if (array.every(predicate) === false) { }

// ✅ Boolean メソッドには ! を使用
if (!allowedRoles.includes(role)) { }
if (!str.startsWith('http')) { }
if (!array.every(predicate)) { }
```

#### 重要な区別

1. **Boolean メソッドの否定**: `!` を使用（正しい）
   - `!array.includes(item)`
   - `!str.startsWith(prefix)`
   - `!obj.hasOwnProperty(key)`

2. **Falsy チェック**: 明示的な比較を使用（`!` は避ける）
   - `value == null` （null/undefined チェック）
   - `value === ''` （空文字列チェック）
   - `value === 0` （ゼロチェック）

3. **Boolean 変数の否定**: `!` を使用（正しい）
   - `!isEnabled`
   - `!hasPermission`
   - `!isValid`

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