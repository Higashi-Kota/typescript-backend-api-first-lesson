import { createId, Result } from '@beauty-salon-backend/utility'
import { SalonReadMapper } from '../../mappers/read/salon.mapper'
import { SalonWriteMapper } from '../../mappers/write/salon.mapper'
import {
  type ApiCreateSalonRequest,
  type ApiSalon,
  toSalonID,
} from '../../models/salon'
import type { DomainError } from '../../shared'
import { DomainErrors } from '../../shared'
import { BaseSalonUseCase } from './_shared/base-salon.usecase'

export class CreateSalonUseCase extends BaseSalonUseCase {
  async execute(
    request: ApiCreateSalonRequest,
  ): Promise<Result<ApiSalon, DomainError>> {
    const validation = this.validate(request)
    if (Result.isError(validation)) {
      return validation
    }

    const emailExists = await this.repository.existsByEmail(
      request.contactInfo.email,
    )
    if (Result.isError(emailExists)) {
      return emailExists
    }

    if (emailExists.data) {
      return Result.error(
        DomainErrors.alreadyExists('Salon', 'email', request.contactInfo.email),
      )
    }

    const { salon, openingHours } = SalonWriteMapper.fromCreateRequest(request)

    const createResult = await this.repository.create(
      { ...salon, id: toSalonID(createId()) },
      openingHours,
    )
    if (Result.isError(createResult)) {
      return createResult
    }

    const openingHoursResult = await this.repository.findOpeningHours(
      toSalonID(createResult.data.id),
    )
    const apiSalon = SalonReadMapper.toApiSalon(
      createResult.data,
      Result.isSuccess(openingHoursResult) ? openingHoursResult.data : [],
    )

    return Result.success(apiSalon)
  }

  private validate(request: ApiCreateSalonRequest): Result<true, DomainError> {
    const errors: string[] = []

    errors.push(...this.validateName(request.name))
    errors.push(...this.validateDescription(request.description))
    errors.push(...this.validateAddress(request.address))
    errors.push(...this.validateContactInfo(request.contactInfo))

    if (!request.openingHours || request.openingHours.length === 0) {
      errors.push('Opening hours are required')
    }

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
