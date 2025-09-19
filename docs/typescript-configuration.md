# TypeScript設定ガイド

TypeScriptバックエンドおよびフロントエンド開発における設定の詳細と推奨事項を定義します。

## 基本設定（tsconfig.json）

以下の設定をフロントエンド、バックエンドの両方で使用します：

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    // 言語機能
    "lib": ["esnext"],
    "target": "ESNEXT",
    "jsx": "react-jsx",
    
    // モジュール解決
    "module": "ESNext",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "paths": {
      "@/*": ["./src/*"]
    },
    
    // 型安全性設定（厳格モード）
    "strict": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "useUnknownInCatchVariables": true,
    "alwaysStrict": true,
    "exactOptionalPropertyTypes": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true,
    
    // 未使用コードの検出
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    
    // エラー処理
    "noFallthroughCasesInSwitch": true,
    "allowUnreachableCode": false,
    "allowUnusedLabels": false,
    
    // 出力設定
    "declaration": true,
    "sourceMap": true,
    "removeComments": true,
    "newLine": "lf",
    
    // その他
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "allowJs": false,
    "incremental": true
  },
  "exclude": ["node_modules", "dist", "build", "coverage", ".next"]
}
```

## 設定の詳細解説

### 言語機能設定

#### `lib: ["esnext"]` と `target: "ESNEXT"`
- ESNEXTの最新機能を利用可能
- Array.prototype.at()、Object.hasOwn()、Error.cause などの機能が使用可能
- トップレベルawaitのサポート

#### `jsx: "react-jsx"`
- React 17以降の新しいJSX変換を使用
- `import React from 'react'` が不要

### モジュール解決設定

#### `module: "ESNext"` と `moduleResolution: "bundler"`
- 最新のESモジュール機能を使用
- バンドラー（rslib、viteなど）との互換性を確保
- package.jsonの`exports`フィールドに対応
- TypeScript 5.0以降の推奨設定

#### `paths: { "@/*": ["./src/*"] }`
- 絶対パスインポートを有効化
- `import { Task } from '@/domain/task'` のような記述が可能

### 型安全性設定（重要）

#### 必須の厳格チェック

```typescript
// strictNullChecks: true
let value: string;
value = null; // ❌ エラー: 'null' is not assignable to type 'string'
value = undefined; // ❌ エラー

// exactOptionalPropertyTypes: true
interface User {
  name?: string;
}
const user: User = { name: undefined }; // ❌ エラー

// noUncheckedIndexedAccess: true
const arr = [1, 2, 3];
const value = arr[10]; // value の型は number | undefined

// noImplicitReturns: true
function getValue(flag: boolean): number {
  if (flag) {
    return 42;
  }
  // ❌ エラー: Not all code paths return a value
}
```

#### 配列アクセスの安全性

```typescript
// noUncheckedIndexedAccess: true により
const items = ['a', 'b', 'c'];
const item = items[0]; // item: string | undefined

// 安全な使用方法
if (item !== undefined) {
  console.log(item.toUpperCase()); // OK
}

// またはnon-null assertionを慎重に使用
const firstItem = items[0]!; // 確実に存在する場合のみ
```

### プロジェクト別の拡張設定

#### バックエンド向け設定（tsconfig.backend.json）

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "types": ["node", "@types/node"],
    "lib": ["esnext"]
  },
  "include": ["src/**/*"],
  "exclude": ["src/**/*.test.ts", "src/**/*.spec.ts"]
}
```

#### フロントエンド向け設定（tsconfig.frontend.json）

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "lib": ["esnext", "dom", "dom.iterable"],
    "types": ["@types/react", "@types/react-dom"],
    "jsx": "react-jsx"
  },
  "include": ["src/**/*", "next-env.d.ts"],
  "exclude": ["node_modules", ".next", "out"]
}
```

## 型定義の配置

```
backend/packages/
├── database/
│   └── src/          # DBスキーマ定義
├── domain/
│   └── src/          # ドメイン固有の型
├── mappers/
│   └── src/          # 型変換レイヤー
├── types/
│   └── src/          # 共有型定義
│       ├── generated/    # 自動生成された型
│       ├── validators.ts # バリデーション関数
│       └── index.ts      # 型のエクスポート
└── usecase/
    └── src/
        └── {entity}/
            └── types.ts  # エンティティ固有の型
```

## 型安全性のベストプラクティス

### 1. unknown型の適切な使用

```typescript
// ❌ 避けるべき
catch (error: any) {
  console.log(error.message);
}

// ✅ 推奨
catch (error: unknown) {
  if (error instanceof Error) {
    console.log(error.message);
  } else {
    console.log('Unknown error:', error);
  }
}
```

### 2. 型アサーションの回避

```typescript
// ❌ 避けるべき
const data = response.data as UserData;

// ✅ 推奨：実行時バリデーション
import { z } from 'zod';

const UserDataSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
});

const parseResult = UserDataSchema.safeParse(response.data);
if (parseResult.success) {
  const data = parseResult.data; // 型安全
}
```

### 3. Genericsの活用

```typescript
// 型安全なAPIクライアント
class ApiClient {
  async get<T>(
    path: string,
    schema: z.ZodSchema<T>
  ): Promise<Result<T, AppError>> {
    try {
      const response = await fetch(path);
      const data = await response.json();
      const parsed = schema.safeParse(data);
      
      if (parsed.success) {
        return ok(parsed.data);
      } else {
        return err({ type: 'validation', message: 'Invalid response' });
      }
    } catch (error) {
      return err({ type: 'network', message: 'Network error' });
    }
  }
}
```

## パフォーマンス設定

### インクリメンタルビルド

```json
{
  "compilerOptions": {
    "incremental": true,
    "tsBuildInfoFile": ".tsbuildinfo"
  }
}
```

### プロジェクト参照（モノレポ向け）

```json
// packages/database/tsconfig.json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "composite": true,
    "outDir": "./dist",
    "rootDir": "./src"
  }
}

// packages/infrastructure/tsconfig.json
{
  "extends": "../../tsconfig.json",
  "references": [
    { "path": "../database" },
    { "path": "../domain" },
    { "path": "../mappers" },
    { "path": "../types" }
  ]
}
```

## CI/CD向け設定

### 型チェック専用設定

```json
// tsconfig.typecheck.json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "noEmit": true
  },
  "include": ["src/**/*", "tests/**/*"]
}
```

### package.jsonスクリプト

```json
{
  "scripts": {
    "typecheck": "tsc --noEmit",
    "typecheck:watch": "tsc --noEmit --watch",
    "build": "tsc",
    "build:clean": "rm -rf dist && tsc"
  }
}
```

## トラブルシューティング

### よくある問題と解決策

#### 1. モジュール解決エラー

```typescript
// ❌ エラー: Cannot find module '@/domain/task'
import { Task } from '@/domain/task';

// 解決策: tsconfig.jsonのbaseUrlを確認
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

#### 2. 型定義の競合

```typescript
// 複数のパッケージで同じグローバル型が定義されている場合
{
  "compilerOptions": {
    "skipLibCheck": true, // 型定義ファイルのチェックをスキップ
    "types": ["node"] // 明示的に含める型定義を指定
  }
}
```

#### 3. ESM/CJS互換性

```typescript
// package.json
{
  "type": "module", // ESMを使用
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    }
  }
}
```

## まとめ

この設定により：

1. **型安全性**: コンパイル時に多くのエラーを検出
2. **開発効率**: 強力な型推論とエディタサポート
3. **保守性**: 厳格な型チェックによるリファクタリングの安全性
4. **互換性**: フロントエンド・バックエンド両方で使用可能

すべての新規プロジェクトでこの設定を使用し、既存プロジェクトも段階的に移行することを推奨します。