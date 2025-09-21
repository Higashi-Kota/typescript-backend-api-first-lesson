import { Result } from '@beauty-salon-backend/utility'
import type { SalonId } from '../../models/salon'
import { DomainErrors } from '../../shared'
import type { DomainError } from '../../shared'
import { BaseSalonUseCase } from './_shared/base-salon.usecase'

export class DeleteSalonUseCase extends BaseSalonUseCase {
  async execute(id: SalonId): Promise<Result<boolean, DomainError>> {
    if (!this.isValidUuid(id)) {
      return Result.error(
        DomainErrors.validation('Invalid salon ID format', 'INVALID_SALON_ID')
      )
    }

    const exists = await this.repository.exists(id)
    if (Result.isError(exists)) {
      return exists
    }

    if (!exists.data) {
      return Result.error(DomainErrors.notFound('Salon', id))
    }

    const deleteResult = await this.repository.delete(id)
    return deleteResult
  }
}
