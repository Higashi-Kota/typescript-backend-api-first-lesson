import { Result } from '@beauty-salon-backend/utility'
import { SalonReadMapper } from '../../mappers/read/salon.mapper'
import type { ApiSalon } from '../../models/salon'
import type { DomainError, PaginatedResult } from '../../shared'
import { Pagination } from '../../shared'
import { BaseSalonUseCase } from './_shared/base-salon.usecase'

export class ListSalonsUseCase extends BaseSalonUseCase {
  async execute(
    page = 1,
    limit = 20,
  ): Promise<Result<PaginatedResult<ApiSalon>, DomainError>> {
    const paginationParams = Pagination.create(page, limit)

    const salonsResult = await this.repository.findAll(paginationParams)
    if (Result.isError(salonsResult)) {
      return salonsResult
    }

    const apiSalons = SalonReadMapper.toApiSalonFullList(
      salonsResult.data.data,
      new Map(),
    )

    const paginatedResult: PaginatedResult<ApiSalon> = {
      data: apiSalons,
      meta: salonsResult.data.meta,
      links: salonsResult.data.links,
    }

    return Result.success(paginatedResult)
  }
}
