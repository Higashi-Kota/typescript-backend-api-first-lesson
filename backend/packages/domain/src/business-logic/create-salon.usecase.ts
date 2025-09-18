/**
 * Create Salon Use Case
 * Business logic for creating a new salon
 */

import { createSalonWriteFlow } from '../mappers/write/create-salon.mapper'
import type {
  CreateSalonRequest,
  Salon,
  SalonOperationResult,
} from '../models/salon'
import type { SalonRepository } from '../repositories/salon.repository'
import type { Result } from '../shared/result'
import { err, ok } from '../shared/result'

/**
 * Create salon use case implementation
 */
export class CreateSalonUseCase {
  constructor(private readonly salonRepository: SalonRepository) {}

  /**
   * Execute the create salon use case
   */
  async execute(
    request: CreateSalonRequest
  ): Promise<Result<Salon, SalonOperationResult>> {
    try {
      // Step 1: Validate request through write flow (API → Domain → DB)
      const writeFlowResult = createSalonWriteFlow(request)
      if (writeFlowResult.type === 'err') {
        return writeFlowResult
      }

      // Step 2: Check for duplicate name
      const existingCheck = await this.salonRepository.findByName(request.name)
      if (existingCheck.type === 'ok' && existingCheck.value) {
        return err({
          type: 'duplicateName',
          name: request.name,
        })
      }

      // Step 3: Create salon in database
      // Note: Repository currently expects CreateSalonRequest, not DB insert type
      const createResult = await this.salonRepository.create(request)
      if (createResult.type === 'err') {
        return err({
          type: 'systemError',
          message: `Failed to create salon: ${createResult.error}`,
        })
      }

      // Step 4: Return the created salon
      // The repository should return a domain Salon model

      return ok(createResult.value)
    } catch (error) {
      return err({
        type: 'systemError',
        message: `Unexpected error in CreateSalonUseCase: ${error}`,
      })
    }
  }
}

/**
 * Factory function for creating the use case
 */
export const createSalonUseCase = (
  salonRepository: SalonRepository
): CreateSalonUseCase => {
  return new CreateSalonUseCase(salonRepository)
}
