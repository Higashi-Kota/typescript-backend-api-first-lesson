import type { ApiAddress, ApiUpdateSalonRequest } from '../../../models/salon'
import type { ISalonRepository } from '../../../repositories/salon.repository'
import { validateEmail } from '../../_shared/validators/email'
import { validatePhoneNumber } from '../../_shared/validators/phoneNumber'
import { validateUuid } from '../../_shared/validators/uuid'

export abstract class BaseSalonUseCase {
  constructor(protected readonly repository: ISalonRepository) {}

  protected isValidUuid(value: string): boolean {
    return validateUuid(value)
  }

  protected isValidEmail(email: string): boolean {
    return validateEmail(email)
  }

  protected isValidPhoneNumber(phone: string): boolean {
    return validatePhoneNumber(phone)
  }

  protected validateName(name: string | undefined): string[] {
    const errors: string[] = []

    if (!name || name.trim().length === 0) {
      errors.push('Name is required')
    } else if (name.length > 255) {
      errors.push('Name must be less than 255 characters')
    }

    return errors
  }

  protected validateDescription(
    _description: string | undefined | null,
  ): string[] {
    const errors: string[] = []

    // Description is now optional/nullable in API
    // No validation required as it can be null

    return errors
  }

  protected validateAddress(address: ApiAddress): string[] {
    const errors: string[] = []

    if (address) {
      if (!address.street) {
        errors.push('Street address is required')
      }
      if (!address.city) {
        errors.push('City is required')
      }
      if (!address.prefecture) {
        errors.push('State/Prefecture is required')
      }
    } else {
      errors.push('Address is required')
    }

    return errors
  }

  protected validateContactInfo(
    contactInfo: ApiUpdateSalonRequest['contactInfo'],
  ): string[] {
    const errors: string[] = []

    if (contactInfo) {
      if (!contactInfo.phoneNumber) {
        errors.push('Phone number is required')
      } else if (!this.isValidPhoneNumber(contactInfo.phoneNumber)) {
        errors.push('Invalid phone number format')
      }

      if (!contactInfo.email) {
        errors.push('Email is required')
      } else if (!this.isValidEmail(contactInfo.email)) {
        errors.push('Invalid email format')
      }
    } else {
      errors.push('Contact information is required')
    }

    return errors
  }

  protected validateUpdateAddress(address: ApiAddress | undefined): string[] {
    const errors: string[] = []

    if (address !== undefined) {
      if (address.street !== undefined && !address.street) {
        errors.push('Street address cannot be empty')
      }
      if (address.city !== undefined && !address.city) {
        errors.push('City cannot be empty')
      }
      if (address.prefecture !== undefined && !address.prefecture) {
        errors.push('State/Prefecture cannot be empty')
      }
    }

    return errors
  }

  protected validateUpdateContactInfo(
    contactInfo: ApiUpdateSalonRequest['contactInfo'],
  ): string[] {
    const errors: string[] = []

    if (contactInfo !== undefined) {
      if (contactInfo.phoneNumber !== undefined) {
        if (!contactInfo.phoneNumber) {
          errors.push('Phone number cannot be empty')
        } else if (!this.isValidPhoneNumber(contactInfo.phoneNumber)) {
          errors.push('Invalid phone number format')
        }
      }

      if (contactInfo.email !== undefined) {
        if (!contactInfo.email) {
          errors.push('Email cannot be empty')
        } else if (!this.isValidEmail(contactInfo.email)) {
          errors.push('Invalid email format')
        }
      }
    }

    return errors
  }
}
