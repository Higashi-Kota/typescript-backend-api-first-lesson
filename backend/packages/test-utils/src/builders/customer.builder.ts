import type {
  Customer,
  CustomerData,
  CustomerId,
  MembershipLevel,
} from '@beauty-salon-backend/domain'
import { createCustomerId } from '@beauty-salon-backend/domain'
import { type Result, err, ok } from '@beauty-salon-backend/domain'
import { v4 as uuidv4 } from 'uuid'

export type CustomerBuilderError =
  | { type: 'invalidEmail'; email: string }
  | { type: 'invalidPhoneNumber'; phoneNumber: string }
  | { type: 'invalidName'; name: string }
  | { type: 'invalidTags'; tags: string[] }
  | { type: 'invalidLoyaltyPoints'; points: number }
  | { type: 'invalidId'; id: string }

export class CustomerBuilder {
  private state:
    | { type: 'building'; partial: Partial<CustomerData> }
    | { type: 'built'; data: Customer }
    | { type: 'error'; error: CustomerBuilderError }

  constructor() {
    const id = createCustomerId(uuidv4())
    if (!id) {
      throw new Error('Failed to create customer ID')
    }

    const defaultData: CustomerData = {
      id,
      name: 'Test User',
      contactInfo: {
        email: 'test@example.com',
        phoneNumber: '090-1234-5678',
      },
      preferences: null,
      notes: null,
      tags: [],
      birthDate: new Date('1990-01-01'),
      loyaltyPoints: 0,
      membershipLevel: 'regular',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    this.state = {
      type: 'building',
      partial: defaultData,
    }
  }

  withId(id: string): CustomerBuilder {
    if (this.state.type !== 'building') return this
    const customerId = createCustomerId(id)
    if (!customerId) {
      this.state = { type: 'error', error: { type: 'invalidId', id } }
      return this
    }
    this.state.partial.id = customerId
    return this
  }

  withName(name: string): CustomerBuilder {
    if (this.state.type !== 'building') return this

    if (name.length === 0 || name.length > 100) {
      this.state = { type: 'error', error: { type: 'invalidName', name } }
      return this
    }

    this.state.partial.name = name
    return this
  }

  withEmail(email: string): CustomerBuilder {
    if (this.state.type !== 'building') return this

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      this.state = { type: 'error', error: { type: 'invalidEmail', email } }
      return this
    }

    if (!this.state.partial.contactInfo) {
      this.state.partial.contactInfo = {
        email: 'test@example.com',
        phoneNumber: '090-1234-5678',
      }
    }
    this.state.partial.contactInfo = {
      ...this.state.partial.contactInfo,
      email,
    }
    return this
  }

  withPhoneNumber(phoneNumber: string): CustomerBuilder {
    if (this.state.type !== 'building') return this

    const phoneRegex = /^0\d{1,4}-\d{1,4}-\d{4}$/
    if (!phoneRegex.test(phoneNumber)) {
      this.state = {
        type: 'error',
        error: { type: 'invalidPhoneNumber', phoneNumber },
      }
      return this
    }

    if (!this.state.partial.contactInfo) {
      this.state.partial.contactInfo = {
        email: 'test@example.com',
        phoneNumber: '090-1234-5678',
      }
    }
    this.state.partial.contactInfo = {
      ...this.state.partial.contactInfo,
      phoneNumber,
    }
    return this
  }

  withContactInfo(email: string, phoneNumber: string): CustomerBuilder {
    return this.withEmail(email).withPhoneNumber(phoneNumber)
  }

  withBirthDate(birthDate: Date | null): CustomerBuilder {
    if (this.state.type !== 'building') return this
    this.state.partial.birthDate = birthDate
    return this
  }

  withMembershipLevel(level: MembershipLevel): CustomerBuilder {
    if (this.state.type !== 'building') return this
    this.state.partial.membershipLevel = level
    return this
  }

  withLoyaltyPoints(points: number): CustomerBuilder {
    if (this.state.type !== 'building') return this

    if (points < 0) {
      this.state = {
        type: 'error',
        error: { type: 'invalidLoyaltyPoints', points },
      }
      return this
    }

    this.state.partial.loyaltyPoints = points
    return this
  }

  withTags(tags: string[]): CustomerBuilder {
    if (this.state.type !== 'building') return this

    const uniqueTags = Array.from(new Set(tags))
    if (uniqueTags.length > 10) {
      this.state = { type: 'error', error: { type: 'invalidTags', tags } }
      return this
    }

    this.state.partial.tags = uniqueTags
    return this
  }

  withPreferences(preferences: string | null): CustomerBuilder {
    if (this.state.type !== 'building') return this
    this.state.partial.preferences = preferences
    return this
  }

  withNotes(notes: string | null): CustomerBuilder {
    if (this.state.type !== 'building') return this
    this.state.partial.notes = notes
    return this
  }

  withDates(createdAt: Date, updatedAt: Date): CustomerBuilder {
    if (this.state.type !== 'building') return this
    this.state.partial.createdAt = createdAt
    this.state.partial.updatedAt = updatedAt
    return this
  }

  suspended(reason: string, suspendedAt: Date = new Date()): CustomerBuilder {
    if (this.state.type !== 'building') return this

    const data = this.state.partial as CustomerData
    this.state = {
      type: 'built',
      data: { type: 'suspended', data, reason, suspendedAt },
    }
    return this
  }

  deleted(deletedAt: Date = new Date()): CustomerBuilder {
    if (this.state.type !== 'building') return this

    const data = this.state.partial as CustomerData
    this.state = {
      type: 'built',
      data: { type: 'deleted', data, deletedAt },
    }
    return this
  }

  build(): Result<Customer, CustomerBuilderError> {
    switch (this.state.type) {
      case 'error':
        return err(this.state.error)

      case 'built':
        return ok(this.state.data)

      case 'building': {
        const data = this.state.partial as CustomerData

        // Validate required fields
        if (!data.name) {
          return err({ type: 'invalidName', name: '' })
        }
        if (!data.contactInfo?.email) {
          return err({ type: 'invalidEmail', email: '' })
        }
        if (!data.contactInfo?.phoneNumber) {
          return err({ type: 'invalidPhoneNumber', phoneNumber: '' })
        }

        const customer: Customer = { type: 'active', data }
        return ok(customer)
      }
    }
  }
}

export function createTestCustomer(
  overrides: Partial<CustomerData> = {}
): Customer {
  const id = overrides.id || createCustomerId(uuidv4())
  if (!id) {
    throw new Error('Failed to create customer ID')
  }

  const defaultData: CustomerData = {
    id,
    name: 'Test User',
    contactInfo: {
      email: 'test@example.com',
      phoneNumber: '090-1234-5678',
    },
    preferences: null,
    notes: null,
    tags: [],
    birthDate: new Date('1990-01-01'),
    loyaltyPoints: 0,
    membershipLevel: 'regular',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }

  return { type: 'active', data: defaultData }
}

export function createTestCustomerId(id: string): CustomerId {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(id)) {
    throw new Error(`Invalid customer ID format: ${id}`)
  }
  const customerId = createCustomerId(id)
  if (!customerId) {
    throw new Error(`Failed to create customer ID: ${id}`)
  }
  return customerId
}
