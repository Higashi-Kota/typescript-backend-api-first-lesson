# クリーンアップ方針

TypeScriptバックエンド開発におけるコードのクリーンアップ方針と期待される状態を定義します。

## 基本原則

**YAGNI（You Aren't Gonna Need It）原則**を徹底し、「将来のために」という理由でコードを残しません。

## 使用されていないコードの取り扱い

### 1. テストでのみ使用されているコード

**方針**: 実装で活用するよう統合する

```typescript
// ❌ 悪い例: テストでのみ使用される関数
export function calculateComplexMetric(data: TaskData): number {
  // 複雑な計算ロジック
}

// テストでのみ呼ばれている
it('should calculate metric correctly', () => {
  const result = calculateComplexMetric(testData);
  expect(result).toBe(42);
});

// ✅ 良い例: 実装でも活用
// backend/packages/domain/src/business-logic/analytics/metrics.service.ts
export class MetricsService {
  async getTaskMetrics(taskId: string): Promise<TaskMetrics> {
    const data = await this.repository.getTaskData(taskId);
    const complexMetric = calculateComplexMetric(data); // 実装で使用
    return { complexMetric, ...otherMetrics };
  }
}
```

### 2. どこでも未使用のコード

**方針**: 削除する

```typescript
// ❌ 削除対象の例

// 未使用のインターフェース
export interface LegacyTaskFormat {
  taskId: number;
  taskName: string;
  taskStatus: 'OPEN' | 'CLOSED';
}

// 未使用の関数
export function convertLegacyTask(legacy: LegacyTaskFormat): Task {
  // 変換ロジック
}

// 未使用のエラータイプ
export class TaskConversionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TaskConversionError';
  }
}
```

### 3. 将来の拡張用コード

**方針**: 削除する（YAGNI原則）

```typescript
// ❌ 削除対象の例

// "将来的に" 複数の通知チャネルをサポートする想定
export type NotificationChannel = 'email' | 'sms' | 'push' | 'slack';

export interface NotificationConfig {
  channel: NotificationChannel;
  // 現在はemailのみ実装
  emailSettings?: EmailSettings;
  // 将来の実装用（削除すべき）
  smsSettings?: SmsSettings;
  pushSettings?: PushSettings;
  slackSettings?: SlackSettings;
}

// ✅ 現在必要なものだけ
export interface NotificationConfig {
  emailSettings: EmailSettings;
}
```

## Biomeで検知される要素への対応

### 公開API（export）の扱い

```typescript
// ❌ 未使用のexport
export function deprecatedFunction(): void {
  // どこからも参照されていない
}

// ✅ 実装での活用を検討
// 1. 本当に必要か再評価
// 2. 必要なら適切な場所で使用
// 3. 不要なら削除
```

### 内部実装（非export）の扱い

```typescript
// ❌ 未使用の内部関数
function internalHelper(data: any): any {
  // どこからも呼ばれていない
}

// 即座に削除
```

### テスト用ユーティリティの扱い

```typescript
// ✅ テスト用ユーティリティは維持
// tests/utils/testHelpers.ts
export function createMockRequest(overrides?: Partial<Request>): Request {
  return {
    method: 'GET',
    path: '/',
    headers: {},
    ...overrides,
  } as Request;
}

// 複数のテストファイルで使用
```

## コメントアウトされたコードの扱い

**方針**: すべて削除する

```typescript
// ❌ 削除対象
// function oldImplementation() {
//   // 古い実装
// }

// TODO: 後で実装
// function futureFeature() {
//   // 未実装
// }

// ✅ 必要ならissueやドキュメントに記録
// コードベースには残さない
```

## デッドコードの検出方法

### 1. Biomeの設定

```json
{
  "linter": {
    "rules": {
      "correctness": {
        "noUnusedImports": "error",
        "noUnusedVariables": "error",
        "noUnreachable": "error"
      },
      "suspicious": {
        "noExplicitAny": "error"
      }
    }
  }
}
```

### 2. TypeScriptコンパイラオプション

```json
{
  "compilerOptions": {
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "allowUnreachableCode": false
  }
}
```

### 3. 追加ツールの活用

```bash
# knipを使用した未使用エクスポートの検出
pnpm knip

# ts-pruneを使用した未使用エクスポートの検出 (必要に応じて)
pnpm dlx ts-prune

# 未使用の依存関係の検出
# tazeを使用して依存関係の更新状況を確認
pnpm package:check
```

## クリーンアップのチェックリスト

### コードレビュー時の確認事項

- [ ] 未使用の変数、関数、クラスがないか
- [ ] 未使用のインポートがないか
- [ ] 未使用の型定義、インターフェースがないか
- [ ] コメントアウトされたコードがないか
- [ ] TODOコメントが適切に管理されているか
- [ ] 「将来のため」のコードがないか

### リファクタリング時の確認事項

- [ ] 削除したコードに依存する部分がないか
- [ ] テストが全て通るか
- [ ] 型チェックが通るか
- [ ] Lintエラーがないか

## 実装完了後の期待される状態

### 1. Lintとタイプチェック

```bash
# 以下のコマンドで警告ゼロ
pnpm lint        # Biomeエラー・警告なし
pnpm typecheck   # TypeScriptエラーなし
```

### 2. テスト

```bash
# すべてのテストがグリーン
pnpm test               # 単体テスト・統合テスト全てパス
pnpm test:integration   # 統合テストの実行
```

### 3. コード品質

- **未使用コードゼロ**: Biomeで未使用変数の警告なし
- **型安全性100%**: `any`型の使用なし、型アサーションなし
- **ドキュメント整合性**: APIドキュメントと実装が完全に一致

### 4. 依存関係

```bash
# 未使用の依存関係なし
pnpm knip  # 未使用のファイル、エクスポート、依存関係を検出

# 依存関係の更新確認
pnpm package:check  # 更新可能な依存関係を確認

# package.jsonの整理
- dependencies: 本番環境で必要なもののみ
- devDependencies: 開発時のみ必要なもの
- 未使用のパッケージは削除
```

### 5. プロダクションコードの状態

```typescript
// ✅ クリーンな状態の例
export class TaskService {
  constructor(
    private readonly repository: TaskRepository,
    private readonly eventBus: EventBus
  ) {}

  async createTask(
    request: CreateTaskRequest,
    userId: string
  ): Promise<Result<Task, AppError>> {
    // 必要な処理のみ
    const validation = validateCreateTask(request);
    if (validation.type === 'err') {
      return validation;
    }

    const task = await this.repository.create({
      ...validation.value,
      createdBy: userId,
      createdAt: new Date(),
    });

    await this.eventBus.publish({
      type: 'taskCreated',
      payload: { taskId: task.id, userId },
    });

    return ok(task);
  }
}
```

## 継続的なクリーンアップ

### 定期的なメンテナンス

1. **週次**: 未使用インポートの削除
2. **月次**: 未使用コードの棚卸し
3. **四半期**: 依存関係の見直し

### 自動化

```yaml
# .github/workflows/cleanup.yml
name: Code Cleanup Check

on: [pull_request]

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
        
      - name: Check for unused exports
        run: pnpm knip
        
      - name: Check for unused dependencies
        run: pnpm package:check
        
      - name: Lint check
        run: pnpm lint
```

## まとめ

クリーンなコードベースを維持することで：

1. **可読性向上**: 必要なコードのみで構成される
2. **保守性向上**: 不要な複雑さがない
3. **パフォーマンス向上**: 不要なコードの実行を避ける
4. **開発効率向上**: 混乱を招くコードがない

「必要になったら実装する」という原則を守り、常にシンプルで明確なコードベースを維持します。