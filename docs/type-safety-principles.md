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