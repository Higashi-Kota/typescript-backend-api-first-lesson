import { Result } from '@beauty-salon-backend/utility'
import { SalonReadMapper } from '../../mappers/read/salon.mapper'
import { SalonWriteMapper } from '../../mappers/write/salon.mapper'
import type {
  ApiSalon,
  ApiUpdateSalonRequest,
  SalonId,
} from '../../models/salon'
import type { DomainError } from '../../shared'
import { DomainErrors } from '../../shared'
import { BaseSalonUseCase } from './_shared/base-salon.usecase'

export class UpdateSalonUseCase extends BaseSalonUseCase {
  async execute(
    id: SalonId,
    request: ApiUpdateSalonRequest,
  ): Promise<Result<ApiSalon, DomainError>> {
    if (!this.isValidUuid(id)) {
      return Result.error(
        DomainErrors.validation('Invalid salon ID format', 'INVALID_SALON_ID'),
      )
    }

    const validation = this.validate(request)
    if (Result.isError(validation)) {
      return validation
    }

    const exists = await this.repository.exists(id)
    if (Result.isError(exists)) {
      return exists
    }

    if (!exists.data) {
      return Result.error(DomainErrors.notFound('Salon', id))
    }

    if (request.contactInfo?.email) {
      const currentSalon = await this.repository.findById(id)
      if (Result.isSuccess(currentSalon) && currentSalon.data) {
        if (currentSalon.data.email !== request.contactInfo.email) {
          const emailExists = await this.repository.existsByEmail(
            request.contactInfo.email,
          )
          if (Result.isSuccess(emailExists) && emailExists.data) {
            return Result.error(
              DomainErrors.alreadyExists(
                'Salon',
                'email',
                request.contactInfo.email,
              ),
            )
          }
        }
      }
    }

    const updates = SalonWriteMapper.fromUpdateRequest(request)
    const updateResult = await this.repository.update(id, updates)
    if (Result.isError(updateResult)) {
      return updateResult
    }

    if (request.openingHours !== undefined) {
      await this.repository.deleteOpeningHours(id)
      if (request.openingHours.length > 0) {
        const newOpeningHours = SalonWriteMapper.toDbOpeningHours(
          request.openingHours,
          id,
        )
        await this.repository.createOpeningHours(newOpeningHours)
      }
    }

    const openingHoursResult = await this.repository.findOpeningHours(id)
    const openingHours = Result.isSuccess(openingHoursResult)
      ? openingHoursResult.data
      : []

    const apiSalon = SalonReadMapper.toApiSalon(updateResult.data, openingHours)
    return Result.success(apiSalon)
  }

  private validate(request: ApiUpdateSalonRequest): Result<true, DomainError> {
    const errors: string[] = []

    if (request.name !== undefined) {
      if (request.name.trim().length === 0) {
        errors.push('Name cannot be empty')
      }
      if (request.name.length > 255) {
        errors.push('Name must be less than 255 characters')
      }
    }

    if (
      request.description != null &&
      request.description.trim().length === 0
    ) {
      errors.push('Description cannot be empty')
    }

    errors.push(...this.validateUpdateAddress(request.address))
    errors.push(...this.validateUpdateContactInfo(request.contactInfo))

    if (errors.length > 0) {
      return Result.error(
        DomainErrors.validation(
          'Validation failed',
          'SALON_VALIDATION_ERROR',
          errors,
        ),
      )
    }

    return Result.success(true)
  }
}
