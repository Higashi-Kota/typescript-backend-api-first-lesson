# Brand型を利用したID型管理

TypeScriptバックエンド開発におけるBrand型（Nominal型）を使用した型安全なID管理の実装パターンを定義します。

## Brand型とは

Brand型は、構造的には同じ型でも異なる意味を持つ値を区別するための型システムです。例えば、`UserId`と`SalonId`は両方とも文字列ですが、誤って混同することを防ぎます。

## 基本実装

```typescript
// backend/packages/types/src/branded.ts
export declare const brand: unique symbol

export type Brand<T, TBrand extends string> = T & { [brand]: TBrand }

// ID型の定義
export type UserId = Brand<string, 'UserId'>
export type SalonId = Brand<string, 'SalonId'>
export type StaffId = Brand<string, 'StaffId'>
export type ServiceId = Brand<string, 'ServiceId'>
export type ReservationId = Brand<string, 'ReservationId'>
export type CustomerId = Brand<string, 'CustomerId'>
```

## Zodスキーマとの統合

```typescript
import { z } from 'zod'

// バリデーション付きスキーマ
export const UserIdSchema = z
  .string()
  .uuid()
  .transform((val) => val as UserId)

export const SalonIdSchema = z
  .string()
  .uuid()
  .transform((val) => val as SalonId)

// ファクトリー関数
export const createUserId = (id: string): UserId => UserIdSchema.parse(id)
export const createSalonId = (id: string): SalonId => SalonIdSchema.parse(id)
```

## 使用例

### 1. 型安全な関数シグネチャ

```typescript
// ❌ 避けるべき例：文字列IDでは混同の危険
async function assignStaffToSalon(
  staffId: string,
  salonId: string
): Promise<void> {
  // staffIdとsalonIdを逆に渡してもコンパイルエラーにならない
}

// ✅ 推奨：Brand型で型安全性を確保
async function assignStaffToSalon(
  staffId: StaffId,
  salonId: SalonId
): Promise<void> {
  // 型が異なるため、引数を逆に渡すとコンパイルエラー
}

// 使用時
const staffId = createStaffId('550e8400-e29b-41d4-a716-446655440000')
const salonId = createSalonId('6ba7b810-9dad-11d1-80b4-00c04fd430c8')

await assignStaffToSalon(staffId, salonId) // OK
await assignStaffToSalon(salonId, staffId) // ❌ コンパイルエラー
```

### 2. Sum型との組み合わせ

```typescript
type Reservation = 
  | {
      type: 'pending'
      id: ReservationId
      customerId: CustomerId
      serviceId: ServiceId
      requestedAt: Date
    }
  | {
      type: 'confirmed'
      id: ReservationId
      customerId: CustomerId
      serviceId: ServiceId
      staffId: StaffId
      salonId: SalonId
      confirmedAt: Date
      scheduledFor: Date
    }
  | {
      type: 'completed'
      id: ReservationId
      customerId: CustomerId
      serviceId: ServiceId
      staffId: StaffId
      salonId: SalonId
      completedAt: Date
      rating?: number
    }

// 型安全な予約確認関数
function confirmReservation(
  reservation: Extract<Reservation, { type: 'pending' }>,
  staffId: StaffId,
  salonId: SalonId,
  scheduledFor: Date
): Extract<Reservation, { type: 'confirmed' }> {
  return {
    type: 'confirmed',
    id: reservation.id,
    customerId: reservation.customerId,
    serviceId: reservation.serviceId,
    staffId, // 正しい型のみ受け入れる
    salonId, // 正しい型のみ受け入れる
    confirmedAt: new Date(),
    scheduledFor
  }
}
```

### 3. リポジトリパターンでの使用

```typescript
// backend/packages/domain/src/reservation/repository.ts
export interface ReservationRepository {
  findById(id: ReservationId): Promise<Reservation | null>
  findByCustomer(customerId: CustomerId): Promise<Reservation[]>
  findByStaff(staffId: StaffId): Promise<Reservation[]>
  findBySalon(salonId: SalonId): Promise<Reservation[]>
  create(data: CreateReservationData): Promise<Reservation>
  update(id: ReservationId, data: UpdateReservationData): Promise<Reservation>
  delete(id: ReservationId): Promise<void>
}

// 実装
export class PrismaReservationRepository implements ReservationRepository {
  async findById(id: ReservationId): Promise<Reservation | null> {
    const data = await this.prisma.reservation.findUnique({
      where: { id } // Brand型はstring型と互換性があるため、そのまま使用可能
    })
    
    if (!data) return null
    
    return this.toDomainModel(data)
  }
  
  async findByCustomer(customerId: CustomerId): Promise<Reservation[]> {
    const data = await this.prisma.reservation.findMany({
      where: { customerId } // 型安全なクエリ
    })
    
    return data.map(this.toDomainModel)
  }
}
```

### 4. APIハンドラーでの使用

```typescript
// backend/packages/api/src/routes/reservations.ts
import { Request, Response } from 'express'
import { ReservationIdSchema } from '@/types/branded'

export async function getReservationHandler(
  req: Request,
  res: Response
): Promise<void> {
  // パスパラメータをBrand型に変換
  const parseResult = ReservationIdSchema.safeParse(req.params.id)
  
  if (!parseResult.success) {
    res.status(400).json({
      type: 'error',
      error: {
        code: 'INVALID_ID',
        message: 'Invalid reservation ID format'
      }
    })
    return
  }
  
  const reservationId = parseResult.data // ReservationId型
  
  const reservation = await reservationService.findById(reservationId)
  
  if (!reservation) {
    res.status(404).json({
      type: 'error',
      error: {
        code: 'NOT_FOUND',
        message: 'Reservation not found'
      }
    })
    return
  }
  
  res.json({
    type: 'success',
    data: reservation
  })
}
```

### 5. テストでの使用

```typescript
// backend/packages/usecase/src/reservation/__tests__/reservation.test.ts
import { createUserId, createSalonId, createStaffId } from '@/types/branded'

describe('Reservation Service', () => {
  it('should create reservation with valid IDs', async () => {
    // Arrange
    const customerId = createCustomerId(randomUUID())
    const serviceId = createServiceId(randomUUID())
    const staffId = createStaffId(randomUUID())
    const salonId = createSalonId(randomUUID())
    
    // Act
    const result = await reservationService.createReservation({
      customerId,
      serviceId,
      staffId,
      salonId,
      scheduledFor: addDays(new Date(), 1)
    })
    
    // Assert
    expect(result.type).toBe('ok')
    if (result.type === 'ok') {
      expect(result.value.customerId).toBe(customerId)
      expect(result.value.staffId).toBe(staffId)
      expect(result.value.salonId).toBe(salonId)
    }
  })
  
  it('should reject invalid UUID format', () => {
    expect(() => createUserId('invalid-uuid')).toThrow()
    expect(() => createUserId('123')).toThrow()
  })
})
```

## パターンと慣習

### 1. ID生成ヘルパー

```typescript
// shared/utils/id.ts
import { randomUUID } from 'crypto'
import { 
  createUserId, 
  createSalonId, 
  createStaffId,
  type UserId,
  type SalonId,
  type StaffId
} from '@/types/branded'

export const generateUserId = (): UserId => createUserId(randomUUID())
export const generateSalonId = (): SalonId => createSalonId(randomUUID())
export const generateStaffId = (): StaffId => createStaffId(randomUUID())
```

### 2. 複合IDの扱い

```typescript
// 複数のIDを含む複合キー
export type StaffSalonAssignment = {
  staffId: StaffId
  salonId: SalonId
  assignedAt: Date
  role: 'owner' | 'stylist' | 'receptionist'
}

// 複合キーの型安全な比較
function isSameAssignment(
  a: StaffSalonAssignment,
  b: StaffSalonAssignment
): boolean {
  return a.staffId === b.staffId && a.salonId === b.salonId
}
```

### 3. GraphQLとの統合

```typescript
// GraphQL Resolvers
import { GraphQLScalarType } from 'graphql'

export const UserIdScalar = new GraphQLScalarType({
  name: 'UserId',
  serialize: (value: UserId) => value,
  parseValue: (value: string) => createUserId(value),
  parseLiteral: (ast) => {
    if (ast.kind === 'StringValue') {
      return createUserId(ast.value)
    }
    throw new Error('UserId must be a string')
  }
})
```

## ベストプラクティス

### 1. 早期バリデーション

```typescript
// ❌ 避けるべき：遅延バリデーション
async function processReservation(reservationId: string) {
  // 関数の深い部分でバリデーション
  const id = createReservationId(reservationId) // ここでエラーになる可能性
  // ...
}

// ✅ 推奨：境界でのバリデーション
async function processReservation(reservationId: ReservationId) {
  // 既にバリデーション済みの型安全なID
  // ...
}
```

### 2. 一貫したエラーハンドリング

```typescript
// shared/utils/validation.ts
export function parseIdParam<T>(
  param: string,
  schema: z.ZodSchema<T>,
  typeName: string
): Result<T, AppError> {
  const result = schema.safeParse(param)
  
  if (result.success) {
    return ok(result.data)
  }
  
  return err({
    type: 'validation',
    code: 'INVALID_ID_FORMAT',
    message: `Invalid ${typeName} format`,
    details: result.error.errors
  })
}

// 使用例
const userIdResult = parseIdParam(req.params.userId, UserIdSchema, 'UserId')
if (userIdResult.type === 'err') {
  return res.status(400).json({ type: 'error', error: userIdResult.error })
}
```

### 3. テストユーティリティ

```typescript
// tests/utils/factories.ts
export const idFactories = {
  user: () => createUserId(randomUUID()),
  salon: () => createSalonId(randomUUID()),
  staff: () => createStaffId(randomUUID()),
  service: () => createServiceId(randomUUID()),
  reservation: () => createReservationId(randomUUID()),
  customer: () => createCustomerId(randomUUID()),
} as const

// 使用
const testUser = {
  id: idFactories.user(),
  name: 'Test User',
  email: 'test@example.com'
}
```

## 移行ガイド

既存のstring型IDからBrand型への移行：

```typescript
// Step 1: 型定義の更新
// Before
interface User {
  id: string
  salonId?: string
}

// After
interface User {
  id: UserId
  salonId?: SalonId
}

// Step 2: バリデーション層の追加
// APIハンドラーの入口でバリデーション
router.get('/users/:id', async (req, res) => {
  const userIdResult = UserIdSchema.safeParse(req.params.id)
  if (!userIdResult.success) {
    return res.status(400).json({ error: 'Invalid user ID' })
  }
  
  const user = await userService.findById(userIdResult.data)
  // ...
})

// Step 3: 段階的な移行
// 一時的な互換性レイヤー
function toUserId(id: string): UserId {
  return createUserId(id) // 実行時バリデーション
}
```

## まとめ

Brand型を使用したID管理により：

1. **型安全性**: 異なるエンティティのIDを混同することを防ぐ
2. **実行時検証**: UUID形式の検証を型システムに統合
3. **開発効率**: IDEの補完機能により正しいID型の使用を促進
4. **保守性**: リファクタリング時の安全性向上
5. **ドキュメント性**: 関数シグネチャから期待されるID型が明確

すべての新規開発でBrand型IDを使用し、既存コードも段階的に移行することを推奨します。