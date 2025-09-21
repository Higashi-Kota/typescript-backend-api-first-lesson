import { Result } from '@beauty-salon-backend/utility'
import { SalonReadMapper } from '../../mappers/read/salon.mapper'
import type { ApiSalonSummary } from '../../models/salon'
import { Pagination } from '../../shared'
import type { DomainError, PaginatedResult } from '../../shared'
import { BaseSalonUseCase } from './_shared/base-salon.usecase'

export class ListSalonsUseCase extends BaseSalonUseCase {
  async execute(
    page = 1,
    limit = 20
  ): Promise<Result<PaginatedResult<ApiSalonSummary>, DomainError>> {
    const paginationParams = Pagination.create(page, limit)

    const salonsResult = await this.repository.findAll(paginationParams)
    if (Result.isError(salonsResult)) {
      return salonsResult
    }

    const apiSalons = SalonReadMapper.toApiSalonList(salonsResult.data.data)

    const paginatedResult: PaginatedResult<ApiSalonSummary> = {
      data: apiSalons,
      meta: salonsResult.data.meta,
      links: salonsResult.data.links,
    }

    return Result.success(paginatedResult)
  }
}
