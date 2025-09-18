/**
 * Create Customer Use Case
 * Orchestrates the business logic for creating a new customer
 */

import { getCustomerReadFlow } from '../mappers/read/get-customer.mapper'
import { createCustomerWriteFlow } from '../mappers/write/create-customer.mapper'
import type {
  CreateCustomerRequest,
  Customer,
  CustomerEvent,
  CustomerOperationResult,
} from '../models/customer'
import type { CustomerRepository } from '../repositories/customer.repository'
import type { Result } from '../shared/result'
import { err, ok } from '../shared/result'

// ============================================================================
// Use Case Implementation
// ============================================================================

export class CreateCustomerUseCase {
  constructor(
    private readonly customerRepo: CustomerRepository,
    private readonly eventPublisher?: (event: CustomerEvent) => Promise<void>
  ) {}

  /**
   * Execute the create customer use case
   */
  async execute(
    request: CreateCustomerRequest,
    options?: {
      createdBy?: string
      skipDuplicateCheck?: boolean
      generateReferralCode?: boolean
    }
  ): Promise<Result<Customer, CustomerOperationResult>> {
    try {
      // Step 1: Validate and map request to database entity
      const writeFlowResult = createCustomerWriteFlow(request)
      if (writeFlowResult.type === 'err') {
        return err(writeFlowResult.error)
      }

      const dbInsert = writeFlowResult.value

      // Step 2: Check for duplicate email if not skipped
      if (!options?.skipDuplicateCheck && dbInsert.email) {
        const existingByEmail = await this.customerRepo.findByEmail(
          dbInsert.email
        )
        if (existingByEmail.type === 'ok' && existingByEmail.value) {
          return err({
            type: 'duplicateEmail',
            email: dbInsert.email,
          })
        }
      }

      // Step 3: Check for duplicate phone if not skipped
      if (!options?.skipDuplicateCheck && dbInsert.phoneNumber) {
        const existingByPhone = await this.customerRepo.findByPhone(
          dbInsert.phoneNumber
        )
        if (existingByPhone.type === 'ok' && existingByPhone.value) {
          return err({
            type: 'duplicatePhone',
            phone: dbInsert.phoneNumber,
          })
        }
      }

      // Step 4: Generate referral code if requested
      if (options?.generateReferralCode) {
        const timestamp = Date.now().toString(36).toUpperCase()
        dbInsert.referralCode = `REF-${timestamp}`
      }

      // Step 5: Create customer in database
      const createResult = await this.customerRepo.create(dbInsert)
      if (createResult.type === 'err') {
        return err({
          type: 'systemError',
          message: `Failed to create customer: ${createResult.error}`,
        })
      }

      const createdCustomer = createResult.value

      // Step 6: Map database entity back to domain/API model
      const readFlowResult = getCustomerReadFlow(createdCustomer)
      if (readFlowResult.type === 'err') {
        return err({
          type: 'systemError',
          message: `Failed to map created customer: ${readFlowResult.error}`,
        })
      }

      // Step 7: Publish event if event publisher is available
      if (this.eventPublisher) {
        const event: CustomerEvent = {
          type: 'created',
          customer: readFlowResult.value as Customer,
          createdBy: options?.createdBy,
          timestamp: new Date().toISOString(),
        }
        await this.eventPublisher(event).catch((error) => {
          console.error('Failed to publish customer created event:', error)
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
   * Create customer with referral
   */
  async createWithReferral(
    request: CreateCustomerRequest,
    referralCode: string
  ): Promise<Result<Customer, CustomerOperationResult>> {
    try {
      // Find referrer by referral code
      const referrerResult =
        await this.customerRepo.findByReferralCode(referralCode)
      if (referrerResult.type === 'err' || !referrerResult.value) {
        return err({
          type: 'businessRuleViolation',
          rule: 'invalidReferralCode',
          message: `Referral code '${referralCode}' is not valid`,
        })
      }

      // Map request and add referrer
      const writeFlowResult = createCustomerWriteFlow(request)
      if (writeFlowResult.type === 'err') {
        return err(writeFlowResult.error)
      }

      const dbInsert = writeFlowResult.value
      dbInsert.referredBy = referrerResult.value.id

      // Execute normal creation flow with referrer
      return this.execute(request, {
        skipDuplicateCheck: false,
        generateReferralCode: true,
      })
    } catch (error) {
      return err({
        type: 'systemError',
        message: `Failed to create customer with referral: ${error}`,
      })
    }
  }

  /**
   * Bulk create customers
   */
  async bulkCreate(
    requests: CreateCustomerRequest[],
    options?: {
      stopOnError?: boolean
      createdBy?: string
    }
  ): Promise<
    Result<Customer[], { failed: number; errors: CustomerOperationResult[] }>
  > {
    const created: Customer[] = []
    const errors: CustomerOperationResult[] = []

    for (const request of requests) {
      const result = await this.execute(request, {
        createdBy: options?.createdBy,
        skipDuplicateCheck: false,
      })

      if (result.type === 'err') {
        errors.push(result.error)
        if (options?.stopOnError) {
          return err({ failed: errors.length, errors })
        }
      } else {
        created.push(result.value)
      }
    }

    if (created.length === 0 && errors.length > 0) {
      return err({ failed: errors.length, errors })
    }

    return ok(created)
  }
}

// ============================================================================
// Business Rules and Validations
// ============================================================================

/**
 * Validate customer data against business rules
 */
export const validateCustomerBusinessRules = (
  request: CreateCustomerRequest
): Result<true, CustomerOperationResult> => {
  // Age validation if birth date provided
  if (request.birthDate) {
    const birthDate = new Date(request.birthDate)
    const today = new Date()
    const age = today.getFullYear() - birthDate.getFullYear()

    if (age < 13) {
      return err({
        type: 'businessRuleViolation',
        rule: 'minimumAge',
        message: 'Customer must be at least 13 years old',
      })
    }

    if (age > 120) {
      return err({
        type: 'businessRuleViolation',
        rule: 'maximumAge',
        message: 'Invalid birth date - age cannot exceed 120 years',
      })
    }
  }

  // Tags validation
  if (request.tags && request.tags.length > 10) {
    return err({
      type: 'businessRuleViolation',
      rule: 'maxTags',
      message: 'Customer cannot have more than 10 tags',
    })
  }

  // Notes length validation
  if (request.notes && request.notes.length > 1000) {
    return err({
      type: 'validationError',
      errors: [
        {
          field: 'notes',
          message: 'Notes cannot exceed 1000 characters',
          code: 'tooLong',
        },
      ],
    })
  }

  return ok(true as const)
}

/**
 * Apply default values based on business rules
 */
export const applyBusinessDefaults = (
  request: CreateCustomerRequest
): CreateCustomerRequest => {
  return {
    ...request,
    tags: request.tags ?? [],
    preferences: request.preferences ?? '',
  }
}
