/**
 * Get Salon Use Case
 * Business logic for retrieving salon information
 */

import { mapGetSalonDbToDomain } from '../mappers/read/get-salon.mapper'
import type { Salon, SalonId, SalonOperationResult } from '../models/salon'
import type { SalonRepository } from '../repositories/salon.repository'
import type { Result } from '../shared/result'
import { err, ok } from '../shared/result'

/**
 * Get salon use case implementation
 */
export class GetSalonUseCase {
  constructor(private readonly salonRepository: SalonRepository) {}

  /**
   * Get salon by ID
   */
  async execute(
    salonId: SalonId
  ): Promise<Result<Salon, SalonOperationResult>> {
    try {
      // Step 1: Get salon from repository
      const salonResult = await this.salonRepository.findById(salonId)
      if (salonResult.type === 'err') {
        return err({
          type: 'notFound',
          salonId,
        })
      }

      if (!salonResult.value) {
        return err({
          type: 'notFound',
          salonId,
        })
      }

      // Step 2: Map DB record to domain
      const domainResult = mapGetSalonDbToDomain(salonResult.value)
      if (domainResult.type === 'err') {
        return domainResult
      }

      return ok(domainResult.value)
    } catch (error) {
      return err({
        type: 'error',
        error: {
          type: 'system',
          message: `Failed to get salon: ${error}`,
        },
      })
    }
  }

  /**
   * List all active salons
   */
  async listActive(): Promise<Result<Salon[], SalonOperationResult>> {
    try {
      const listResult = await this.salonRepository.listActive()
      if (listResult.type === 'err') {
        return err({
          type: 'error',
          error: {
            type: 'system',
            message: `Failed to list salons: ${listResult.error}`,
          },
        })
      }

      const salons: Salon[] = []
      for (const record of listResult.value) {
        const domainResult = mapGetSalonDbToDomain(record)
        if (domainResult.type === 'err') {
          return domainResult
        }
        salons.push(domainResult.value)
      }

      return ok(salons)
    } catch (error) {
      return err({
        type: 'error',
        error: {
          type: 'system',
          message: `Failed to list salons: ${error}`,
        },
      })
    }
  }

  /**
   * Search salons by criteria
   */
  async search(criteria: {
    name?: string
    tags?: string[]
    location?: string
  }): Promise<Result<Salon[], SalonOperationResult>> {
    try {
      const searchResult = await this.salonRepository.search(criteria)
      if (searchResult.type === 'err') {
        return err({
          type: 'error',
          error: {
            type: 'system',
            message: `Failed to search salons: ${searchResult.error}`,
          },
        })
      }

      const salons: Salon[] = []
      for (const record of searchResult.value) {
        const domainResult = mapGetSalonDbToDomain(record)
        if (domainResult.type === 'err') {
          return domainResult
        }
        salons.push(domainResult.value)
      }

      return ok(salons)
    } catch (error) {
      return err({
        type: 'error',
        error: {
          type: 'system',
          message: `Failed to search salons: ${error}`,
        },
      })
    }
  }
}

/**
 * Factory function for creating the use case
 */
export const getSalonUseCase = (
  salonRepository: SalonRepository
): GetSalonUseCase => {
  return new GetSalonUseCase(salonRepository)
}
