/**
 * Customer Repository Interface
 * ドメイン層で定義されるリポジトリインターフェース
 * 実装はInfrastructure層で行う
 */

import type {
  CreateCustomerInput,
  Customer,
  CustomerError,
  CustomerId,
  UpdateCustomerInput,
} from '../models/customer.js'
import type { RepositoryError } from '../shared/errors.js'
import type { PaginatedResult, PaginationParams } from '../shared/pagination.js'
import type { Result } from '../shared/result.js'

// 検索条件
export type CustomerSearchCriteria = {
  search?: string // 名前、メール、電話番号での検索
  email?: string // メールアドレスでの部分一致検索
  name?: string // 名前での部分一致検索
  tags?: string[] // タグでのフィルタリング
  membershipLevel?: string // メンバーシップレベルでのフィルタリング
  membershipLevels?: string[] // 複数のメンバーシップレベルでのフィルタリング
  isActive?: boolean // アクティブな顧客のみ
  minLoyaltyPoints?: number // 最小ロイヤリティポイント
  maxLoyaltyPoints?: number // 最大ロイヤリティポイント
  registeredFrom?: Date // 登録日の開始
  registeredTo?: Date // 登録日の終了
  includeSuspended?: boolean // 停止中の顧客を含むかどうか
}

// CustomerRepositoryインターフェース
export interface CustomerRepository {
  // 基本的なCRUD操作

  /**
   * IDで顧客を取得
   */
  findById(id: CustomerId): Promise<Result<Customer, RepositoryError>>

  /**
   * メールアドレスで顧客を取得
   */
  findByEmail(email: string): Promise<Result<Customer | null, RepositoryError>>

  /**
   * 顧客を保存（作成/更新）
   */
  save(customer: Customer): Promise<Result<Customer, RepositoryError>>

  /**
   * 顧客を削除（物理削除）
   */
  delete(id: CustomerId): Promise<Result<void, RepositoryError>>

  // 検索・一覧取得

  /**
   * 検索条件に基づいて顧客を検索
   */
  search(
    criteria: CustomerSearchCriteria,
    pagination: PaginationParams
  ): Promise<Result<PaginatedResult<Customer>, RepositoryError>>

  /**
   * すべての顧客を取得（ページネーション付き）
   */
  findAll(
    pagination: PaginationParams
  ): Promise<Result<PaginatedResult<Customer>, RepositoryError>>

  // バッチ操作

  /**
   * 複数の顧客IDで顧客を取得
   */
  findByIds(ids: CustomerId[]): Promise<Result<Customer[], RepositoryError>>

  /**
   * タグで顧客を取得
   */
  findByTags(
    tags: string[],
    pagination: PaginationParams
  ): Promise<Result<PaginatedResult<Customer>, RepositoryError>>

  // 統計・集計

  /**
   * 顧客数を取得
   */
  count(
    criteria?: CustomerSearchCriteria
  ): Promise<Result<number, RepositoryError>>

  /**
   * メンバーシップレベル別の顧客数を取得
   */
  countByMembershipLevel(): Promise<
    Result<Record<string, number>, RepositoryError>
  >

  // トランザクション

  /**
   * トランザクション内で実行
   */
  withTransaction<T>(
    fn: (
      repo: CustomerRepository
    ) => Promise<Result<T, RepositoryError | CustomerError>>
  ): Promise<Result<T, RepositoryError | CustomerError>>
}

// リポジトリで使用する型のエクスポート
export type {
  Customer,
  CreateCustomerInput,
  UpdateCustomerInput,
  CustomerError,
}
