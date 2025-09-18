/**
 * Update Salon Use Case
 * Business logic for updating an existing salon
 */

import { mapGetSalonDbToDomain } from '../mappers/read/get-salon.mapper'
import {
  trackSalonChanges,
  updateSalonWriteFlow,
} from '../mappers/write/update-salon.mapper'
import type {
  Salon,
  SalonId,
  SalonOperationResult,
  UpdateSalonRequest,
} from '../models/salon'
import type { SalonRepository } from '../repositories/salon.repository'
import type { Result } from '../shared/result'
import { err, ok } from '../shared/result'

/**
 * Update salon use case implementation
 */
export class UpdateSalonUseCase {
  constructor(private readonly salonRepository: SalonRepository) {}

  /**
   * Execute the update salon use case
   */
  async execute(
    salonId: SalonId,
    request: UpdateSalonRequest
  ): Promise<Result<Salon, SalonOperationResult>> {
    try {
      // Step 1: Get existing salon
      const existingResult = await this.salonRepository.findById(salonId)
      if (existingResult.type === 'err') {
        return err({
          type: 'not_found',
          salonId,
        })
      }

      const existingSalonDb = existingResult.value
      if (!existingSalonDb) {
        return err({
          type: 'not_found',
          salonId,
        })
      }

      // Step 2: Map existing salon to domain
      const existingDomainResult = mapGetSalonDbToDomain(existingSalonDb)
      if (existingDomainResult.type === 'err') {
        return existingDomainResult
      }

      // Step 3: Map request through write flow
      const writeFlowResult = updateSalonWriteFlow(
        salonId,
        request,
        existingDomainResult.value
      )
      if (writeFlowResult.type === 'err') {
        return writeFlowResult
      }

      // Step 4: Check for duplicate name if name is being changed
      if (request.name && request.name !== existingDomainResult.value.name) {
        const duplicateCheck = await this.salonRepository.findByName(
          request.name
        )
        if (duplicateCheck.type === 'ok' && duplicateCheck.value) {
          return err({
            type: 'duplicate_name',
            name: request.name,
          })
        }
      }

      // Step 5: Update salon in database
      const updateResult = await this.salonRepository.update(
        salonId,
        writeFlowResult.value
      )
      if (updateResult.type === 'err') {
        return err({
          type: 'error',
          error: {
            type: 'system',
            message: `Failed to update salon: ${updateResult.error}`,
          },
        })
      }

      // Step 6: Map updated record back to domain
      const updatedDomainResult = mapGetSalonDbToDomain(updateResult.value)
      if (updatedDomainResult.type === 'err') {
        return updatedDomainResult
      }

      // Step 7: Track changes for audit
      const _changes = trackSalonChanges(
        existingDomainResult.value,
        updatedDomainResult.value
      )

      return ok(updatedDomainResult.value)
    } catch (error) {
      return err({
        type: 'error',
        error: {
          type: 'system',
          message: `Unexpected error in UpdateSalonUseCase: ${error}`,
        },
      })
    }
  }

  /**
   * Suspend a salon (placeholder - isActive not in current model)
   */
  async suspend(
    salonId: SalonId,
    _reason: string
  ): Promise<Result<Salon, SalonOperationResult>> {
    // Note: isActive field not available in current schema
    // Would need to track suspension state differently
    return this.execute(salonId, {
      // Store suspension reason in metadata or notes if needed
    })
  }

  /**
   * Activate a salon (placeholder - isActive not in current model)
   */
  async activate(
    salonId: SalonId
  ): Promise<Result<Salon, SalonOperationResult>> {
    // Note: isActive field not available in current schema
    // Would need to track activation state differently
    return this.execute(salonId, {})
  }
}

/**
 * Factory function for creating the use case
 */
export const updateSalonUseCase = (
  salonRepository: SalonRepository
): UpdateSalonUseCase => {
  return new UpdateSalonUseCase(salonRepository)
}
