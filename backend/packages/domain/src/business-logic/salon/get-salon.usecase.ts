import { Result } from '@beauty-salon-backend/utility'
import { SalonReadMapper } from '../../mappers/read/salon.mapper'
import type { ApiSalon, SalonId } from '../../models/salon'
import type { DomainError } from '../../shared'
import { DomainErrors } from '../../shared'
import { BaseSalonUseCase } from './_shared/base-salon.usecase'

export class GetSalonUseCase extends BaseSalonUseCase {
  async execute(id: SalonId): Promise<Result<ApiSalon, DomainError>> {
    if (!this.isValidUuid(id)) {
      return Result.error(
        DomainErrors.validation('Invalid salon ID format', 'INVALID_SALON_ID'),
      )
    }

    const salonResult = await this.repository.findById(id)
    if (Result.isError(salonResult)) {
      return salonResult
    }

    if (!salonResult.data) {
      return Result.error(DomainErrors.notFound('Salon', id))
    }

    const openingHoursResult = await this.repository.findOpeningHours(id)
    const openingHours = Result.isSuccess(openingHoursResult)
      ? openingHoursResult.data
      : []

    const apiSalon = SalonReadMapper.toApiSalon(salonResult.data, openingHours)
    return Result.success(apiSalon)
  }
}
