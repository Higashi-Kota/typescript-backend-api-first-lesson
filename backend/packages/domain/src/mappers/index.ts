/**
 * @beauty-salon-backend/domain/mappers
 *
 * データ変換マッパー
 * 異なるレイヤー間でのデータ変換を担当
 *
 * ## レイヤー構造
 *
 * ### Write層（データ書き込み方向）
 * - api-to-domain: APIリクエスト → ドメインモデル
 * - domain-to-db: ドメインモデル → DBエンティティ
 *
 * ### Read層（データ読み取り方向）
 * - db-to-domain: DBエンティティ → ドメインモデル
 * - domain-to-api: ドメインモデル → APIレスポンス
 *
 * ## APIエンドポイント単位での定義
 * 各APIエンドポイントごとに、Read層またはWrite層の
 * 2つの変換レイヤーを必ず定義する
 *
 * ### 例: 顧客作成エンドポイント（POST /customers）
 * - Write層: CreateCustomerRequest → Customer → DBInsert
 *
 * ### 例: 顧客取得エンドポイント（GET /customers/:id）
 * - Read層: DBEntity → Customer → CustomerResponse
 */

// Write層マッパー
export * from './write/index'

// Read層マッパー
export * from './read/index'
