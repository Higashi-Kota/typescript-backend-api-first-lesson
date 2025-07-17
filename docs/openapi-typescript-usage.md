# OpenAPI TypeScript 型生成ガイド

このドキュメントは、TypeSpecからOpenAPIを経由してTypeScript型を生成する新しいシステムの使用方法を説明します。

## 概要

従来の野良スクリプトから、業界標準の`openapi-typescript`を使用した型生成に移行しました。

### 主な改善点

1. **正規ツールの採用**: `openapi-typescript`による信頼性の高い型生成
2. **型定義ルールの実装**:
   - 検索API入力: すべてのフィールドが`optional`
   - 通常API入力: フィールドは`nullable`（キーは必須）
   - 出力型: 必須フィールドと`nullable`フィールドの混在を許可
3. **型安全なAPI実装**: パス、クエリパラメータ、リクエスト/レスポンスの完全な型サポート

## 型生成の実行

```bash
# TypeSpecのコンパイルとバックエンド型生成
pnpm run generate:backend

# すべての型生成（フロントエンドとバックエンド）
pnpm run generate
```

## 生成される型ファイル

```
backend/packages/types/src/generated/
├── api-types.ts      # OpenAPI型定義（paths, operations, components）
├── brand-helpers.ts  # Brand型のヘルパー関数
├── schemas.ts        # Zodスキーマ（後方互換性）
└── index.ts          # エクスポート
```

## 使用例

### 1. 基本的な型のインポート

```typescript
import type { paths, operations, components } from '@beauty-salon/types/generated';

// コンポーネント型
type Customer = components['schemas']['Models.Customer'];
type CreateCustomerRequest = components['schemas']['Models.CreateCustomerRequest'];
```

### 2. 操作型の抽出

```typescript
import type { GetOperation, ExtractRequest, ExtractResponse, ExtractQuery } from '@beauty-salon/types/generated';

// 操作の型を取得
type CustomerListOperation = GetOperation<'/customers', 'get'>;

// クエリパラメータの型を抽出
type CustomerListQuery = ExtractQuery<CustomerListOperation>;
// => { search?: string; tags?: string[]; limit?: number; offset?: number; }

// レスポンスの型を抽出
type CustomerListResponse = ExtractResponse<CustomerListOperation>;
// => { data: Customer[]; total: number; limit: number; offset: number; }

// リクエストボディの型を抽出
type CustomerCreateBody = ExtractRequest<GetOperation<'/customers', 'post'>>;
// => CreateCustomerRequest
```

### 3. 検索APIの実装例

```typescript
import { Router } from 'express';
import type { ExtractQuery, ExtractResponse } from '@beauty-salon/types/generated';

const router = Router();

// 検索API（すべてのパラメータがoptional）
router.get('/customers', async (req, res) => {
  // 型安全なクエリパラメータ
  const query: ExtractQuery<paths['/customers']['get']> = req.query;
  
  // search, tagsはすべてoptional
  const { search, tags, limit = 20, offset = 0 } = query;
  
  // 型安全なレスポンス
  const response: ExtractResponse<paths['/customers']['get']> = {
    data: customers,
    total: totalCount,
    limit,
    offset
  };
  
  res.json(response);
});
```

### 4. 作成APIの実装例

```typescript
// 作成API（フィールドはnullable）
router.post('/customers', async (req, res) => {
  // 型安全なリクエストボディ
  const body: components['schemas']['Models.CreateCustomerRequest'] = req.body;
  
  // すべてのフィールドはnullableだが、キーは必須
  const { 
    name,         // string | null
    contactInfo,  // ContactInfo | null
    preferences,  // string | null
    notes,        // string | null
    tags,         // string[] | null
    birthDate     // string | null
  } = body;
  
  // nullチェックが必要
  if (name === null || contactInfo === null) {
    return res.status(400).json({
      code: 'INVALID_REQUEST',
      message: 'name and contactInfo are required'
    });
  }
  
  // 型安全なレスポンス
  const response: ExtractResponse<paths['/customers']['post'], 201> = createdCustomer;
  res.status(201).json(response);
});
```

### 5. Brand型の使用

```typescript
import { CustomerId, createCustomerId } from '@beauty-salon/types/generated';

// Brand型の作成
const customerId: CustomerId = createCustomerId('550e8400-e29b-41d4-a716-446655440000');

// 型安全なID使用
async function getCustomer(id: CustomerId): Promise<Customer> {
  // idはCustomerId型として保証される
  return await customerRepository.findById(id);
}
```

### 6. ts-patternとの組み合わせ

```typescript
import { match } from 'ts-pattern';
import type { components } from '@beauty-salon/types/generated';

type BookingStatus = components['schemas']['Models.BookingStatus'];

function getBookingStatusLabel(status: BookingStatus): string {
  return match(status)
    .with('draft', () => '下書き')
    .with('pending', () => '保留中')
    .with('confirmed', () => '確定')
    .with('in_progress', () => '進行中')
    .with('completed', () => '完了')
    .with('cancelled', () => 'キャンセル')
    .exhaustive();
}
```

## TypeSpecでの型定義ルール

### 検索API（optional fields）

```typespec
@doc("Customer search parameters - all fields are optional")
model SearchCustomerRequest {
  @query search?: string;
  @query tags?: string[];
}
```

### 作成API（nullable fields）

```typespec
@doc("Customer creation request with nullable fields")
model CreateCustomerRequest {
  name: string | null;
  contactInfo: ContactInfo | null;
  preferences: string | null;
  notes: string | null;
  tags: string[] | null;
  birthDate: plainDate | null;
}
```

### 更新API（optional fields）

```typespec
@doc("Customer update request with optional fields for partial updates")
model UpdateCustomerRequest {
  name?: string;
  contactInfo?: ContactInfo;
  preferences?: string;
  notes?: string;
  tags?: string[];
  birthDate?: plainDate;
}
```

## 移行ガイド

### 旧型定義からの移行

```typescript
// 旧: 個別のモデル型
import { Customer, CreateCustomerRequest } from '@beauty-salon/types/generated/models';

// 新: components経由でアクセス
import type { components } from '@beauty-salon/types/generated';
type Customer = components['schemas']['Models.Customer'];
type CreateCustomerRequest = components['schemas']['Models.CreateCustomerRequest'];
```

### 操作型の活用

```typescript
// 旧: 手動で型定義
interface CustomerListParams {
  search?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
}

// 新: 自動生成された型を使用
import type { ExtractQuery } from '@beauty-salon/types/generated';
type CustomerListParams = ExtractQuery<paths['/customers']['get']>;
```

## ベストプラクティス

1. **型の一貫性**: 常に生成された型を使用し、手動での型定義を避ける
2. **null安全性**: nullable フィールドは必ずnullチェックを行う
3. **Brand型**: IDにはBrand型を使用して型安全性を高める
4. **ts-pattern**: enum型の処理にはts-patternを使用して網羅性を保証
5. **型の再生成**: TypeSpec定義を変更したら必ず型を再生成する

## トラブルシューティング

### 型が見つからない場合

```bash
# 型を再生成
pnpm run generate:backend

# TypeScriptの再起動が必要な場合
# VSCodeの場合: Cmd/Ctrl + Shift + P → "TypeScript: Restart TS Server"
```

### 型の不整合

TypeSpecの定義とOpenAPIの出力が一致していることを確認：

```bash
# OpenAPI出力を確認
cat specs/tsp-output/@typespec/openapi3/generated/openapi.yaml
```

## まとめ

新しい型生成システムにより、以下が実現されました：

1. **型安全性の向上**: パス、メソッド、パラメータ、ボディ、レスポンスすべてが型安全
2. **保守性の向上**: openapi-typescriptによる標準的な型生成
3. **開発効率の向上**: 自動補完とコンパイル時チェックの強化
4. **一貫性の確保**: TypeSpec → OpenAPI → TypeScriptの自動変換

このシステムを活用することで、より安全で保守しやすいAPIの実装が可能になります。