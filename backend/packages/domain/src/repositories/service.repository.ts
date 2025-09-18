/**
 * Service Repository Interface
 * CLAUDEガイドラインに準拠した例外フリーなリポジトリインターフェース
 */

import type { SalonId } from '../models/salon'
import type {
  CategoryId,
  CreateServiceRequest,
  Service,
  ServiceCategory,
  ServiceCategoryModel,
  ServiceId,
  UpdateServiceRequest,
} from '../models/service'
import type { RepositoryError } from '../shared/errors'
import type { PaginatedResult, PaginationParams } from '../shared/pagination'
import type { Result } from '../shared/result'

// Search criteria for services
export interface ServiceSearchCriteria {
  salonId?: SalonId
  category?: ServiceCategory
  name?: string
  minPrice?: number
  maxPrice?: number
  isActive?: boolean
}

export interface ServiceRepository {
  /**
   * IDでServiceを取得
   */
  findById(id: ServiceId): Promise<Result<Service, RepositoryError>>

  /**
   * 新しいServiceを作成
   */
  create(data: CreateServiceRequest): Promise<Result<Service, RepositoryError>>

  /**
   * Serviceを更新
   */
  update(data: UpdateServiceRequest): Promise<Result<Service, RepositoryError>>

  /**
   * Serviceを非アクティブ化
   */
  deactivate(
    id: ServiceId,
    reason: string,
    deactivatedBy: string
  ): Promise<Result<Service, RepositoryError>>

  /**
   * Serviceを再アクティブ化
   */
  reactivate(
    id: ServiceId,
    reactivatedBy: string
  ): Promise<Result<Service, RepositoryError>>

  /**
   * Serviceを廃止
   */
  discontinue(
    id: ServiceId,
    reason: string,
    discontinuedBy: string
  ): Promise<Result<void, RepositoryError>>

  /**
   * 複数のServiceを検索
   */
  search(
    criteria: ServiceSearchCriteria,
    pagination: PaginationParams
  ): Promise<Result<PaginatedResult<Service>, RepositoryError>>

  /**
   * サロンのすべてのアクティブなServiceを取得
   */
  findAllActiveBySalon(
    salonId: SalonId,
    pagination: PaginationParams
  ): Promise<Result<PaginatedResult<Service>, RepositoryError>>

  /**
   * カテゴリ別にServiceを取得
   */
  findByCategory(
    salonId: SalonId,
    category: ServiceCategory,
    pagination: PaginationParams
  ): Promise<Result<PaginatedResult<Service>, RepositoryError>>

  /**
   * 価格範囲でServiceを検索
   */
  findByPriceRange(
    salonId: SalonId,
    minPrice: number,
    maxPrice: number,
    pagination: PaginationParams
  ): Promise<Result<PaginatedResult<Service>, RepositoryError>>

  /**
   * 人気のServiceを取得（予約数ベース）
   */
  findPopularServices(
    salonId: SalonId,
    limit: number
  ): Promise<Result<Service[], RepositoryError>>

  /**
   * ServiceカテゴリをIDで取得
   */
  findCategoryById(
    id: CategoryId
  ): Promise<Result<ServiceCategoryModel, RepositoryError>>

  /**
   * すべてのアクティブなServiceカテゴリを取得
   */
  findAllActiveCategories(): Promise<
    Result<ServiceCategoryModel[], RepositoryError>
  >
}
