/**
 * Update Customer Use Case
 * Orchestrates the business logic for updating an existing customer
 */

import { getCustomerReadFlow } from '../mappers/read/get-customer.mapper'
import { updateCustomerWriteFlow } from '../mappers/write/update-customer.mapper'
import type {
  Customer,
  CustomerEvent,
  CustomerId,
  CustomerOperationResult,
  UpdateCustomerRequest,
  UpdateCustomerRequestWithReset,
} from '../models/customer'
import type { CustomerRepository } from '../repositories/customer.repository'
import type { Result } from '../shared/result'
import { err, ok } from '../shared/result'

// ============================================================================
// Use Case Implementation
// ============================================================================

export class UpdateCustomerUseCase {
  constructor(
    private readonly customerRepo: CustomerRepository,
    private readonly eventPublisher?: (event: CustomerEvent) => Promise<void>
  ) {}

  /**
   * Execute the update customer use case
   */
  async execute(
    customerId: CustomerId,
    request: UpdateCustomerRequest | UpdateCustomerRequestWithReset,
    options?: {
      updatedBy: string
      skipValidation?: boolean
      trackChanges?: boolean
    }
  ): Promise<Result<Customer, CustomerOperationResult>> {
    try {
      // Step 1: Check if customer exists
      const existingResult = await this.customerRepo.findById(customerId)
      if (existingResult.type === 'err' || !existingResult.value) {
        return err({
          type: 'notFound',
          customerId,
        })
      }

      const existing = existingResult.value

      // Step 2: Check if customer is active (can be updated)
      if (!existing.isActive) {
        return err({
          type: 'businessRuleViolation',
          rule: 'inactiveCustomer',
          message: 'Cannot update inactive customer',
        })
      }

      // Step 3: Check for email uniqueness if email is being updated
      if ('contactInfo' in request && request.contactInfo?.email) {
        const emailCheck = await this.customerRepo.findByEmail(
          request.contactInfo.email
        )
        if (
          emailCheck.type === 'ok' &&
          emailCheck.value &&
          emailCheck.value.id !== customerId
        ) {
          return err({
            type: 'duplicateEmail',
            email: request.contactInfo.email,
          })
        }
      }

      // Step 4: Check for phone uniqueness if phone is being updated
      if ('contactInfo' in request && request.contactInfo?.phoneNumber) {
        const phoneCheck = await this.customerRepo.findByPhone(
          request.contactInfo.phoneNumber
        )
        if (
          phoneCheck.type === 'ok' &&
          phoneCheck.value &&
          phoneCheck.value.id !== customerId
        ) {
          return err({
            type: 'duplicatePhone',
            phone: request.contactInfo.phoneNumber,
          })
        }
      }

      // Step 5: Validate and map request to database update
      const isResetRequest =
        'preferences' in request && request.preferences === null
      const writeFlowResult = updateCustomerWriteFlow(
        request as any,
        isResetRequest
      )
      if (writeFlowResult.type === 'err') {
        return err(writeFlowResult.error)
      }

      const dbUpdate = writeFlowResult.value

      // Step 6: Track changes if requested
      const changes: string[] = []
      if (options?.trackChanges) {
        for (const key of Object.keys(dbUpdate)) {
          if (
            key !== 'updatedAt' &&
            dbUpdate[key as keyof typeof dbUpdate] !== undefined
          ) {
            changes.push(key)
          }
        }
      }

      // Step 7: Update customer in database
      const updateResult = await this.customerRepo.update(customerId, dbUpdate)
      if (updateResult.type === 'err') {
        return err({
          type: 'systemError',
          message: `Failed to update customer: ${updateResult.error}`,
        })
      }

      const updatedCustomer = updateResult.value

      // Step 8: Map database entity back to domain/API model
      const readFlowResult = getCustomerReadFlow(updatedCustomer)
      if (readFlowResult.type === 'err') {
        return err({
          type: 'systemError',
          message: `Failed to map updated customer: ${readFlowResult.error}`,
        })
      }

      // Step 9: Publish event if event publisher is available
      if (this.eventPublisher && options?.updatedBy) {
        const event: CustomerEvent = {
          type: 'updated',
          customerId,
          changes: options.trackChanges
            ? Object.fromEntries(changes.map((c) => [c, true]))
            : {},
          updatedBy: options.updatedBy,
          timestamp: new Date().toISOString(),
        }
        await this.eventPublisher(event).catch((error) => {
          console.error('Failed to publish customer updated event:', error)
        })
      }

      return ok(readFlowResult.value as Customer)
    } catch (error) {
      return err({
        type: 'systemError',
        message: `Unexpected error: ${error}`,
      })
    }
  }

  /**
   * Merge two customer records
   */
  async merge(
    primaryId: CustomerId,
    secondaryId: CustomerId,
    options?: {
      mergedBy: string
      keepSecondaryData?: Array<'phone' | 'email' | 'address' | 'preferences'>
    }
  ): Promise<Result<Customer, CustomerOperationResult>> {
    try {
      // Get both customers
      const [primaryResult, secondaryResult] = await Promise.all([
        this.customerRepo.findById(primaryId),
        this.customerRepo.findById(secondaryId),
      ])

      if (primaryResult.type === 'err' || !primaryResult.value) {
        return err({ type: 'notFound', customerId: primaryId })
      }
      if (secondaryResult.type === 'err' || !secondaryResult.value) {
        return err({ type: 'notFound', customerId: secondaryId })
      }

      const primary = primaryResult.value
      const secondary = secondaryResult.value

      // Build merged update
      const mergedUpdate: UpdateCustomerRequest & { address?: any } = {
        name:
          primary.firstName && primary.lastName
            ? `${primary.firstName} ${primary.lastName}`
            : `${secondary.firstName} ${secondary.lastName}`,
        contactInfo: {
          email: options?.keepSecondaryData?.includes('email')
            ? secondary.email
            : primary.email,
          phoneNumber: options?.keepSecondaryData?.includes('phone')
            ? secondary.phoneNumber
            : primary.phoneNumber,
          alternativePhone:
            secondary.alternativePhone ?? primary.alternativePhone ?? undefined,
        },
        address: options?.keepSecondaryData?.includes('address')
          ? secondary.postalCode ||
            secondary.prefecture ||
            secondary.city ||
            secondary.address
            ? {
                street: secondary.address ?? '',
                city: secondary.city ?? '',
                state: secondary.prefecture ?? '',
                postalCode: secondary.postalCode ?? '',
                country: 'Japan',
              }
            : undefined
          : primary.postalCode ||
              primary.prefecture ||
              primary.city ||
              primary.address
            ? {
                street: primary.address ?? '',
                city: primary.city ?? '',
                state: primary.prefecture ?? '',
                postalCode: primary.postalCode ?? '',
                country: 'Japan',
              }
            : undefined,
        preferences: options?.keepSecondaryData?.includes('preferences')
          ? (secondary.preferences as any)?.general
          : (primary.preferences as any)?.general,
        notes:
          `${primary.notes ?? ''}\n---\nMerged from customer ${secondaryId}: ${secondary.notes ?? ''}`.trim(),
        tags: [
          ...new Set([
            ...(Array.isArray(primary.tags) ? (primary.tags as string[]) : []),
            ...(Array.isArray(secondary.tags)
              ? (secondary.tags as string[])
              : []),
          ]),
        ],
        birthDate: primary.birthDate ?? secondary.birthDate ?? undefined,
      }

      // Update primary customer
      const updateResult = await this.execute(primaryId, mergedUpdate, {
        updatedBy: options?.mergedBy ?? 'system',
        trackChanges: true,
      })

      if (updateResult.type === 'err') {
        return err(updateResult.error)
      }

      // Mark secondary as deleted
      await this.customerRepo.softDelete(secondaryId)

      // Publish merge event
      if (this.eventPublisher && options?.mergedBy) {
        const event: CustomerEvent = {
          type: 'merged',
          primaryId,
          secondaryId,
          mergedBy: options.mergedBy,
          timestamp: new Date().toISOString(),
        }
        await this.eventPublisher(event).catch((error) => {
          console.error('Failed to publish customer merged event:', error)
        })
      }

      return ok(updateResult.value)
    } catch (error) {
      return err({
        type: 'systemError',
        message: `Failed to merge customers: ${error}`,
      })
    }
  }

  /**
   * Update customer status
   */
  async updateStatus(
    customerId: CustomerId,
    status: 'active' | 'inactive' | 'suspended',
    options?: {
      reason?: string
      updatedBy: string
    }
  ): Promise<Result<Customer, CustomerOperationResult>> {
    try {
      const update = {
        isActive: status === 'active',
      }

      const result = await this.customerRepo.update(customerId, update)
      if (result.type === 'err') {
        return err({
          type: 'systemError',
          message: `Failed to update status: ${result.error}`,
        })
      }

      const readFlow = getCustomerReadFlow(result.value)
      if (readFlow.type === 'err') {
        return err({
          type: 'systemError',
          message: readFlow.error,
        })
      }

      // Publish status change event
      if (this.eventPublisher && options?.updatedBy) {
        const event: CustomerEvent = {
          type: 'statusChanged',
          customerId,
          from: 'active', // Would need to track previous status
          to: status as any,
          changedBy: options.updatedBy,
          timestamp: new Date().toISOString(),
        }
        await this.eventPublisher(event).catch((error) => {
          console.error('Failed to publish status change event:', error)
        })
      }

      return ok(readFlow.value as Customer)
    } catch (error) {
      return err({
        type: 'systemError',
        message: `Failed to update customer status: ${error}`,
      })
    }
  }
}

// ============================================================================
// Business Rules and Validations
// ============================================================================

/**
 * Validate update against business rules
 */
export const validateUpdateBusinessRules = (
  _existing: Customer,
  update: UpdateCustomerRequest
): Result<true, CustomerOperationResult> => {
  // Cannot remove required contact info
  if (
    update.contactInfo?.email === '' ||
    update.contactInfo?.phoneNumber === ''
  ) {
    return err({
      type: 'businessRuleViolation',
      rule: 'requiredContactInfo',
      message: 'Email and phone cannot be empty',
    })
  }

  // Age validation if birth date is being updated
  if (update.birthDate) {
    const birthDate = new Date(update.birthDate)
    const today = new Date()
    const age = today.getFullYear() - birthDate.getFullYear()

    if (age < 13) {
      return err({
        type: 'businessRuleViolation',
        rule: 'minimumAge',
        message: 'Customer must be at least 13 years old',
      })
    }
  }

  // Tags validation
  if (update.tags && update.tags.length > 10) {
    return err({
      type: 'businessRuleViolation',
      rule: 'maxTags',
      message: 'Customer cannot have more than 10 tags',
    })
  }

  return ok(true as const)
}

/**
 * Check if significant changes are being made
 */
export const hasSignificantChanges = (
  update: UpdateCustomerRequest
): boolean => {
  const significantFields = ['name', 'contactInfo', 'birthDate']
  return significantFields.some((field) => field in update)
}
