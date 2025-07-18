/**
 * Staff Repository Interface
 * CLAUDEガイドラインに準拠した例外フリーなリポジトリインターフェース
 */

import type {
  CreateStaffRequest,
  Staff,
  StaffAvailability,
  StaffId,
  StaffSearchCriteria,
  UpdateStaffRequest,
} from '../models/staff.js'
import type { SalonId } from '../models/salon.js'
import type { RepositoryError } from '../shared/errors.js'
import type { PaginatedResult, PaginationParams } from '../shared/pagination.js'
import type { Result } from '../shared/result.js'

export interface StaffRepository {
  /**
   * IDでStaffを取得
   */
  findById(id: StaffId): Promise<Result<Staff, RepositoryError>>

  /**
   * 新しいStaffを作成
   */
  create(data: CreateStaffRequest): Promise<Result<Staff, RepositoryError>>

  /**
   * Staffを更新
   */
  update(data: UpdateStaffRequest): Promise<Result<Staff, RepositoryError>>

  /**
   * Staffを非アクティブ化
   */
  deactivate(
    id: StaffId,
    reason: string,
    deactivatedBy: string
  ): Promise<Result<Staff, RepositoryError>>

  /**
   * Staffを再アクティブ化
   */
  reactivate(
    id: StaffId,
    reactivatedBy: string
  ): Promise<Result<Staff, RepositoryError>>

  /**
   * Staffを退職処理
   */
  terminate(
    id: StaffId,
    reason: string,
    terminatedBy: string
  ): Promise<Result<void, RepositoryError>>

  /**
   * 複数のStaffを検索
   */
  search(
    criteria: StaffSearchCriteria,
    pagination: PaginationParams
  ): Promise<Result<PaginatedResult<Staff>, RepositoryError>>

  /**
   * サロンのすべてのアクティブなStaffを取得
   */
  findAllActiveBySalon(
    salonId: SalonId,
    pagination: PaginationParams
  ): Promise<Result<PaginatedResult<Staff>, RepositoryError>>

  /**
   * Staffの勤務可能時間を取得
   */
  getAvailability(
    staffId: StaffId
  ): Promise<Result<StaffAvailability[], RepositoryError>>

  /**
   * Staffの勤務可能時間を設定
   */
  setAvailability(
    staffId: StaffId,
    availability: StaffAvailability[]
  ): Promise<Result<void, RepositoryError>>

  /**
   * 特定の専門分野を持つStaffを検索
   */
  findBySpecialties(
    salonId: SalonId,
    specialties: string[],
    pagination: PaginationParams
  ): Promise<Result<PaginatedResult<Staff>, RepositoryError>>
}
