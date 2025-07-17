# Generated Types from TypeSpec

このディレクトリには、TypeSpecから自動生成された型定義が配置されます。

## 生成方法

```bash
cd specs
pnpm compile
```

## 型のマッピング例

### TypeSpec → TypeScript

```typescript
// TypeSpec定義
scalar CustomerId extends string;

// 生成される型
export type CustomerId = string & { __brand: "CustomerId" };

// Zodスキーマも生成
export const CustomerIdSchema = z.string().brand<"CustomerId">();
```

### 既存実装との統合

```typescript
// 既存のBrand型実装を生成された型で置き換え
import { CustomerId, CustomerIdSchema } from './generated/models';

// リポジトリで使用
async findById(id: CustomerId): Promise<Customer | null> {
  // 実装
}
```