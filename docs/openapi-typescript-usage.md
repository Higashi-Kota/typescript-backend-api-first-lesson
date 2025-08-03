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

## 型生成スクリプトの場所

型生成スクリプトは `@beauty-salon-backend/types` パッケージ内に配置されています：

- **場所**: `backend/packages/types/scripts/generate-types.ts`
- **実行方法**: 
  - ルートから: `pnpm generate:backend`
  - typesパッケージから: `pnpm generate` または `pnpm generate:types`
- **依存**: OpenAPI仕様ファイル（`specs/tsp-output/@typespec/openapi3/generated/openapi.yaml`）

## 生成される型ファイル

```
backend/packages/types/
├── scripts/
│   └── generate-types.ts     # 型生成スクリプト（openapi-typescriptを使用）
└── src/
    └── generated/
        ├── api-types.ts      # OpenAPI型定義（paths, operations, components）
        ├── schemas.ts        # Zodスキーマ（後方互換性）
        └── index.ts          # エクスポート
```

### 注意事項

- `brand-helpers.ts`は生成されなくなりました（ドメインパッケージに独自のBrand実装があるため）
- 型生成前にTypeSpec仕様のコンパイル（`pnpm generate:spec`）が必要です

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

## 型マッピングフローの実装例

### 顧客作成フロー

OpenAPIからデータベースまでの完全な型マッピングの例：

```typescript
// 1. OpenAPI型（生成された型）
type CreateCustomerRequest = components['schemas']['Models.CreateCustomerRequest']
// {
//   name: string
//   contactInfo: ContactInfo
//   preferences?: string
//   notes?: string
//   tags?: string[]
//   birthDate?: string
// }

// 2. APIルートがOpenAPI型を受け取る
router.post('/', async (
  req: Request<unknown, CreateCustomerResponse, CreateCustomerRequest>,
  res: Response<CreateCustomerResponse>
) => {
  const requestData: CreateCustomerRequest = req.body
  
  // 3. UseCase入力へマッピング
  const input = mapCreateCustomerRequest(requestData)
  // Returns: CreateCustomerInput
  
  // 4. UseCase実行
  const result = await createCustomerUseCase(input, deps)
  // Returns: Result<Customer, CreateCustomerError>
  
  // 5. APIレスポンスへマッピング
  const response = mapCustomerToResponse(result.value)
  // Returns: CreateCustomerResponse (OpenAPI型)
  
  res.json(response)
})
```

### 認証フロー

```typescript
// OpenAPI型
type LoginRequest = components['schemas']['Models.LoginRequest']
// {
//   email: string
//   password: string
//   rememberMe: boolean
//   twoFactorCode?: string
// }

type LoginResponse = components['schemas']['Models.LoginResponse']
// {
//   accessToken: string
//   refreshToken: string
//   tokenType: string
//   expiresIn: number
//   user: User
// }

// APIルート
router.post('/login', async (
  req: Request<unknown, unknown, LoginRequest>,
  res: Response<LoginResponse>
) => {
  const loginData: LoginRequest = req.body
  
  // 検証と認証
  const user = await authenticateUser(loginData)
  
  // トークン生成
  const tokens = await generateTokens(user)
  
  // OpenAPI準拠のレスポンス構築
  const response: LoginResponse = {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    tokenType: 'Bearer',
    expiresIn: tokens.expiresIn,
    user: mapUserToApiResponse(user)
  }
  
  res.json(response)
})
```

### 型安全性の保証

#### コンパイル時チェック
1. **リクエスト型安全性**: TypeScriptがリクエストボディがOpenAPIスキーマと一致することを保証
2. **レスポンス型安全性**: レスポンス型がコンパイル時に強制される
3. **パスパラメータ安全性**: パスパラメータが型チェックされる
4. **クエリパラメータ安全性**: クエリパラメータが適切な型を持つ

#### ランタイム検証
1. **Zodスキーマ**: 受信リクエストが期待される型と一致することを検証
2. **Result型**: 例外なしでエラーを処理
3. **パターンマッチング**: すべてのケースの網羅的な処理

### ベストプラクティス

#### DO ✅
- APIルートで常にOpenAPI生成型を使用
- 適切なジェネリクスでリクエストハンドラーに型を付ける
- レイヤー遷移にマッパー関数を使用
- OpenAPI型と一致するZodスキーマでリクエストを検証
- エラーハンドリングにResult型を使用

#### DON'T ❌
- OpenAPIスキーマと重複するカスタム型を定義
- `any`や型アサーションを使用
- 「信頼できる」入力の検証をスキップ
- レイヤーの関心事を混在させる（例：APIからDBモデルを返す）

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

## フロントエンドでの使用（Orval）

### 基本的な使用例

```typescript
// 自動生成されたReact Queryフックの使用
import { useCustomerOperationsList } from '@beauty-salon-frontend/api-client/generated/endpoints/customers/customers'
import type { ModelsCustomer } from '@beauty-salon-frontend/api-client/generated/models'

function CustomerList() {
  // 型安全なAPIコール
  const { data, isLoading, error } = useCustomerOperationsList(
    {
      limit: 10,
      offset: 0,
      search: 'john'  // すべてのパラメータが型チェックされる
    },
    {
      query: {
        staleTime: 5 * 60 * 1000,  // 5分間キャッシュ
      }
    }
  )

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>

  // data.dataは完全に型付けされている
  return (
    <div>
      {data?.data.customers.map((customer: ModelsCustomer) => (
        <div key={customer.id}>{customer.name}</div>
      ))}
    </div>
  )
}
```

### ミューテーションの使用

```typescript
import { useCustomerOperationsCreate } from '@beauty-salon-frontend/api-client/generated/endpoints/customers/customers'
import type { ModelsCreateCustomerRequest } from '@beauty-salon-frontend/api-client/generated/models'

function CreateCustomerForm() {
  const { mutate, isPending } = useCustomerOperationsCreate({
    mutation: {
      onSuccess: (response) => {
        // response.dataは型安全
        console.log('Created customer:', response.data.id)
        queryClient.invalidateQueries({ queryKey: ['/api/v1/customers'] })
      }
    }
  })

  const handleSubmit = (formData: ModelsCreateCustomerRequest) => {
    mutate({ data: formData })  // 型チェックされる
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* フォームフィールド */}
    </form>
  )
}
```

### 型の再利用

```typescript
import type { 
  ModelsCustomer,
  ModelsCreateCustomerRequest,
  ModelsUpdateCustomerRequest,
  ModelsError 
} from '@beauty-salon-frontend/api-client/generated/models'

// フォームバリデーションに型を活用
const customerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
}) satisfies z.ZodType<ModelsCreateCustomerRequest>

// ストアの型定義に活用
interface CustomerStore {
  customers: ModelsCustomer[]
  selectedCustomer: ModelsCustomer | null
  createCustomer: (data: ModelsCreateCustomerRequest) => Promise<void>
  updateCustomer: (id: string, data: ModelsUpdateCustomerRequest) => Promise<void>
}
```

## まとめ

新しい型生成システムにより、以下が実現されました：

### バックエンド
1. **型安全性の向上**: パス、メソッド、パラメータ、ボディ、レスポンスすべてが型安全
2. **保守性の向上**: openapi-typescriptによる標準的な型生成
3. **開発効率の向上**: 自動補完とコンパイル時チェックの強化
4. **一貫性の確保**: TypeSpec → OpenAPI → TypeScriptの自動変換

### フロントエンド
1. **React Query統合**: データフェッチングの最適化とキャッシュ管理
2. **完全な型安全性**: APIクライアント全体で型チェック
3. **自動生成**: ボイラープレートコードの削減
4. **優れたDX**: 自動補完とインテリセンス

このシステムを活用することで、フロントエンドとバックエンドの契約を厳密に守りながら、より安全で保守しやすいAPIの実装が可能になります。