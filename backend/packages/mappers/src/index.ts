/**
 * @beauty-salon-backend/mappers
 *
 * データ変換マッパーパッケージ
 * 異なるレイヤー間でのデータ変換を担当
 *
 * ## カテゴリ
 * - api-to-domain: APIリクエストからドメインモデルへの変換
 * - db-to-domain: DBエンティティからドメインモデルへの変換
 * - domain-to-api: ドメインモデルからAPIレスポンスへの変換
 * - domain-to-db: ドメインモデルからDBエンティティへの変換
 *
 * ## 使用例
 * ```typescript
 * // API to Domain
 * import { mapCreateCustomerRequest } from '@beauty-salon-backend/mappers/api-to-domain'
 *
 * // Domain to API
 * import { mapCustomerToResponse } from '@beauty-salon-backend/mappers/domain-to-api'
 *
 * // DB to Domain
 * import { mapDbCustomerToDomain } from '@beauty-salon-backend/mappers/db-to-domain'
 *
 * // Domain to DB
 * import { mapDomainCustomerToDbInsert } from '@beauty-salon-backend/mappers/domain-to-db'
 * ```
 */

// Re-export all categories
export * from './api-to-domain/index.js'
export * from './db-to-domain/index.js'
export * from './domain-to-api/index.js'
export * from './domain-to-db/index.js'
export * from './utils/index.js'
