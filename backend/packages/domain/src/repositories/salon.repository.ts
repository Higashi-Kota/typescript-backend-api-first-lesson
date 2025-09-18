/**
 * Salon Repository Interface
 * CLAUDEガイドラインに準拠した例外フリーなリポジトリインターフェース
 */

import type {
  CreateSalonRequest,
  Salon,
  SalonId,
  SearchSalonRequest,
  UpdateSalonRequest,
} from '../models/salon'
import type { RepositoryError } from '../shared/errors'
import type { PaginatedResult, PaginationParams } from '../shared/pagination'
import type { Result } from '../shared/result'

// Use SearchSalonRequest as search criteria
export type SalonSearchCriteria = SearchSalonRequest

export interface SalonRepository {
  /**
   * IDでSalonを取得
   */
  findById(id: SalonId): Promise<Result<Salon, RepositoryError>>

  /**
   * 名前でSalonを取得
   */
  findByName(name: string): Promise<Result<Salon | null, RepositoryError>>

  /**
   * 新しいSalonを作成
   */
  create(data: CreateSalonRequest): Promise<Result<Salon, RepositoryError>>

  /**
   * Salonを更新
   */
  update(data: UpdateSalonRequest): Promise<Result<Salon, RepositoryError>>

  /**
   * Salonを論理削除
   */
  delete(id: SalonId, deletedBy: string): Promise<Result<void, RepositoryError>>

  /**
   * 複数のSalonを検索
   */
  search(
    criteria: SalonSearchCriteria,
    pagination: PaginationParams
  ): Promise<Result<PaginatedResult<Salon>, RepositoryError>>

  /**
   * すべてのアクティブなSalonを取得
   */
  findAllActive(
    pagination: PaginationParams
  ): Promise<Result<PaginatedResult<Salon>, RepositoryError>>

  /**
   * Salonを一時停止
   */
  suspend(
    id: SalonId,
    reason: string,
    suspendedBy: string
  ): Promise<Result<Salon, RepositoryError>>

  /**
   * Salonの一時停止を解除
   */
  reactivate(
    id: SalonId,
    reactivatedBy: string
  ): Promise<Result<Salon, RepositoryError>>

  /**
   * 都市ごとのSalon数を取得
   */
  countByCity(): Promise<Result<Map<string, number>, RepositoryError>>
}
