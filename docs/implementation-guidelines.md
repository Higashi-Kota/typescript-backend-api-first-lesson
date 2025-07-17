# 実装ガイドライン

TypeScriptバックエンド開発における実装ガイドラインです。アーキテクチャ原則、ドメイン設計、データベース設計、API設計などの実装指針を定義します。

## アーキテクチャ原則

### ディレクトリ構成（機能ベース）

```
src/
├── domain/           # 純粋なドメインロジック（Sum型、不変データ）
│   ├── task/
│   │   ├── task.ts      # Task型定義（Sum型）
│   │   ├── taskLogic.ts # タスク関連の純粋関数
│   │   └── index.ts     # パブリックAPI
│   ├── user/
│   └── shared/       # 共有型定義
├── features/         # 機能別の実装
│   ├── task-management/
│   │   ├── handlers/    # HTTPハンドラー
│   │   ├── services/    # ビジネスロジック
│   │   ├── repository/  # データアクセス
│   │   └── index.ts
│   └── authentication/
├── infrastructure/   # 技術的な実装
│   ├── database/
│   ├── http/
│   └── logging/
└── shared/          # 共有ユーティリティ
    ├── types/       # 共通型定義
    └── utils/       # ヘルパー関数
```

**原則**:
- コードは機能ごとにまとめる（技術レイヤーではなく）
- 関連するコードは近くに配置
- `utils`や`helpers`のような汎用フォルダは最小限に
- 各機能は独立して理解・変更可能に

## 1. ドメイン設計の原則

### Sum型によるドメインモデリング

すべてのエンティティ・値オブジェクトはSum型で表現し、状態遷移を型で表現します。

```typescript
// ❌ 避けるべき例
interface Task {
  id: string;
  title: string;
  status: string; // 文字列では何でも入る
  assignee?: User; // nullableでは状態が曖昧
}

// ✅ 推奨される例
type Task = 
  | { type: 'draft'; id: string; title: string }
  | { type: 'assigned'; id: string; title: string; assignee: User; dueDate: Date }
  | { type: 'inProgress'; id: string; title: string; assignee: User; startedAt: Date }
  | { type: 'completed'; id: string; title: string; assignee: User; completedAt: Date };

// 状態遷移関数
function assignTask(
  task: Extract<Task, { type: 'draft' }>, 
  assignee: User, 
  dueDate: Date
): Extract<Task, { type: 'assigned' }> {
  return {
    type: 'assigned',
    id: task.id,
    title: task.title,
    assignee,
    dueDate
  };
}
```

### ドメインロジックの純粋性

すべてのドメインロジックは純粋関数として実装し、副作用はドメイン層の外で行います。

```typescript
// domain/task/taskLogic.ts
import { Result, ok, err } from '../../shared/types/result';

export function calculateTaskPriority(
  task: Task,
  currentDate: Date
): Result<number, string> {
  return match(task)
    .with({ type: 'draft' }, () => ok(0))
    .with({ type: 'assigned' }, ({ dueDate }) => {
      const daysUntilDue = differenceInDays(dueDate, currentDate);
      if (daysUntilDue < 0) return err('Task is overdue');
      if (daysUntilDue <= 1) return ok(5);
      if (daysUntilDue <= 3) return ok(4);
      if (daysUntilDue <= 7) return ok(3);
      return ok(2);
    })
    .with({ type: 'inProgress' }, () => ok(4))
    .with({ type: 'completed' }, () => ok(0))
    .exhaustive();
}
```

## 2. 機能追加の原則

### 新機能の採用基準

1. **実用性**: 実際のユーザーニーズに基づいているか
2. **価値**: 実装コストに見合う価値を提供するか
3. **保守性**: 長期的な保守が可能か
4. **既存機能との整合性**: 既存のアーキテクチャと調和するか

### 機能の優先順位付け

- **高優先度**: 直接的なビジネス価値、ユーザー体験の大幅改善
- **中優先度**: 運用効率化、パフォーマンス改善
- **低優先度**: Nice to have、将来的な拡張性のみ

### 実装を見送る判断基準

- クライアント側で効率的に実装可能な機能
- 既存の外部サービス/ツールで代替可能な機能
- 複雑性に対して得られる価値が低い機能
- 別システムとして独立実装した方が柔軟性が高い機能

### 例：ファイルアップロード機能の判断

- ✅ 採用: 署名付きURL（サーバー負荷軽減、セキュリティ向上）
- ✅ 採用: 自動圧縮（ストレージコスト削減、実用的価値）
- ❌ 見送り: サムネイル生成（クライアント側実装が効率的）
- ❌ 見送り: ウイルススキャン（専用システムとして実装すべき）

## 3. データベース設計の原則

### 命名規則

- **テーブル名は必ず複数形**
  - `users`, `tasks`, `teams`, `organizations` など
  - ジャンクションテーブルも複数形: `team_members`, `department_members`
- **カラム名は snake_case**
  - 外部キーは `{参照テーブル単数形}_id` 形式: `user_id`, `team_id`

### 標準カラム

すべてのテーブルに以下のカラムを含める：

```sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- 業務カラム
  title VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL,
  -- 標準カラム
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- updated_atの自動更新トリガー
CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### インデックス設計

```sql
-- 外部キーには必ずインデックス
CREATE INDEX idx_tasks_user_id ON tasks(user_id);

-- 頻繁に検索される項目
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_created_at ON tasks(created_at DESC);

-- 複合インデックス（順序を考慮）
CREATE INDEX idx_tasks_user_status ON tasks(user_id, status);
```

### マイグレーションファイル命名規則

TypeScript/Node.jsの場合：

```
migrations/
├── 20250704_000001_create_users_table.ts
├── 20250704_000002_create_tasks_table.ts
├── 20250704_000003_add_team_id_to_tasks.ts
└── 20250705_000001_create_teams_table.ts
```

- 形式: `{YYYYMMDD}_{連番6桁}_{説明}.ts`
- 連番は既存の最後のマイグレーションファイルの次の番号を使用
- 日付をまたぐ場合は `000001` から開始

## 4. APIセキュリティとルーティング規則

### 管理者専用APIの原則

センシティブな情報を提供するAPIは必ず管理者専用にします。

```typescript
// ❌ 避けるべき例
router.get('/system/info', getSystemInfo); // 誰でもアクセス可能

// ✅ 推奨される例
router.get(
  '/admin/system/info',
  requirePermission({ type: 'role', role: 'admin' }),
  getSystemInfo
);
```

### APIルーティングの統一規則

**`/api/` プレフィックスは使用しません。**

各APIは機能に応じた適切なプレフィックスを使用：

```typescript
// ルーティング設定
const routes = {
  '/admin/*': adminRouter,      // 管理者専用機能
  '/auth/*': authRouter,        // 認証関連
  '/tasks/*': taskRouter,       // タスク管理
  '/teams/*': teamRouter,       // チーム管理
  '/payments/*': paymentRouter, // 決済関連（ユーザー向け）
  '/organizations/*': orgRouter // 組織管理
};
```

パスパラメータは `:param` 形式を使用（Express.jsの仕様）：

```typescript
router.get('/tasks/:taskId', getTaskHandler);
router.put('/tasks/:taskId/members/:userId', addTaskMemberHandler);
```

### 認証・認可の設定

```typescript
// config/auth.ts
export const authConfig = {
  // 認証不要のパス（公開エンドポイント）
  skipAuthPaths: [
    '/auth/login',
    '/auth/register',
    '/health'
  ],
  
  // 管理者権限が必要なパス（/admin で統一）
  adminOnlyPaths: [
    '/admin/*'
  ],
  
  // その他のパスはユーザー認証が必要
};
```

### CORS設定

```typescript
// config/cors.ts
export const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS?.split(',') 
      || [process.env.FRONTEND_URL || 'http://localhost:3000'];
    
    // 本番環境ではワイルドカードを禁止
    if (process.env.NODE_ENV === 'production' && allowedOrigins.includes('*')) {
      throw new Error('Wildcard origin not allowed in production');
    }
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
};
```

## 5. コード品質ポリシー

### 未使用コードの管理

```json
// biome.json
{
  "linter": {
    "rules": {
      "correctness": {
        "noUnusedImports": "error",
        "noUnusedVariables": "error"
      }
    }
  }
}
```

### 新規APIの統合テスト

必須の3パターンのテスト：

```typescript
describe('POST /tasks', () => {
  it('should create task successfully', async () => {
    // 正常系: 有効なデータでタスクを作成
  });
  
  it('should return 400 for invalid data', async () => {
    // 異常系: バリデーションエラー
  });
  
  it('should return 403 for unauthorized user', async () => {
    // 権限エラー: 権限のないユーザー
  });
});
```

## 6. CI/Lint要件

### 必須のBiomeルール

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

### TypeScript設定

TypeScript設定の詳細については、[「TypeScript設定ガイド」](./typescript-configuration.md)を参照してください。

### CIコマンド

```bash
# エラー・警告が完全にゼロであること
pnpm lint      # Biome lint
pnpm format    # Biome format
pnpm typecheck # TypeScriptコンパイルチェック

# すべてのテストがパス
pnpm test
```

## まとめ

これらのガイドラインに従うことで：

1. **型安全性**: コンパイル時にエラーを検出
2. **保守性**: 明確な責任分離と再利用可能なコンポーネント
3. **拡張性**: 新機能の追加が容易
4. **セキュリティ**: 適切な認証・認可の実装
5. **品質**: 自動化されたチェックとテスト

が実現されます。