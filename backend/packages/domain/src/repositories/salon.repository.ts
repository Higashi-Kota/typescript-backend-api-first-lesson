import type { Result } from '@beauty-salon-backend/utility'
import type {
  DbNewOpeningHours,
  DbOpeningHours,
  DbSalon,
  SalonId,
  SalonSearchParams,
} from '../models/salon'
import type { DomainError, PaginatedResult, PaginationParams } from '../shared'

export interface ISalonRepository {
  create(
    salon: DbSalon,
    openingHours?: DbNewOpeningHours[],
  ): Promise<Result<DbSalon, DomainError>>
  findById(id: SalonId): Promise<Result<DbSalon | null, DomainError>>
  findByEmail(email: string): Promise<Result<DbSalon | null, DomainError>>
  findAll(
    params: PaginationParams,
  ): Promise<Result<PaginatedResult<DbSalon>, DomainError>>
  update(
    id: SalonId,
    salon: Partial<DbSalon>,
  ): Promise<Result<DbSalon, DomainError>>
  delete(id: SalonId): Promise<Result<boolean, DomainError>>
  search(
    params: SalonSearchParams,
    pagination: PaginationParams,
  ): Promise<Result<PaginatedResult<DbSalon>, DomainError>>

  findOpeningHours(
    salonId: SalonId,
  ): Promise<Result<DbOpeningHours[], DomainError>>
  createOpeningHours(
    openingHours: DbNewOpeningHours[],
  ): Promise<Result<DbOpeningHours[], DomainError>>
  updateOpeningHours(
    salonId: SalonId,
    openingHours: DbNewOpeningHours[],
  ): Promise<Result<DbOpeningHours[], DomainError>>
  deleteOpeningHours(salonId: SalonId): Promise<Result<boolean, DomainError>>

  exists(id: SalonId): Promise<Result<boolean, DomainError>>
  existsByEmail(email: string): Promise<Result<boolean, DomainError>>
  countActive(): Promise<Result<number, DomainError>>
}
