import type { components } from '@beauty-salon-backend/generated'
import { Result } from '@beauty-salon-backend/utility'
import { SalonReadMapper } from '../../mappers/read/salon.mapper'
import type { ApiSalonSummary, SalonSearchParams } from '../../models/salon'
import { Pagination } from '../../shared'
import type { DomainError, PaginatedResult } from '../../shared'
import { BaseSalonUseCase } from './_shared/base-salon.usecase'

type ServiceCategoryType = components['schemas']['Models.ServiceCategoryType']

export class SearchSalonsUseCase extends BaseSalonUseCase {
  async execute(
    keyword?: string,
    city?: string,
    category?: ServiceCategoryType,
    page = 1,
    limit = 20
  ): Promise<Result<PaginatedResult<ApiSalonSummary>, DomainError>> {
    const paginationParams = Pagination.create(page, limit)

    const searchParams: SalonSearchParams = {
      keyword,
      city,
      categories: category ? [category] : undefined,
      isActive: true,
    }

    const salonsResult = await this.repository.search(
      searchParams,
      paginationParams
    )
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
