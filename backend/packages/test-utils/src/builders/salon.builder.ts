/**
 * Salon Builder for Testing
 * CLAUDE.mdのテスト要件に準拠
 */

import crypto from 'node:crypto'
import type {
  Address,
  ContactInfo,
  OpeningHours,
  Salon,
  SalonId,
  ServiceId,
} from '@beauty-salon-backend/domain'
import { createSalonId, createServiceId } from '@beauty-salon-backend/domain'

export class SalonBuilder {
  private id: SalonId
  private name: string
  private description: string
  private address: Address
  private contactInfo: ContactInfo
  private openingHours: OpeningHours[]
  private imageUrls: string[]
  private features: string[]
  private rating?: number
  private reviewCount?: number
  private createdAt: Date
  private createdBy?: string
  private updatedAt: Date
  private updatedBy?: string
  private isSuspended = false
  private suspendedReason?: string

  constructor() {
    const id = crypto.randomUUID()
    const salonId = createSalonId(id)
    if (!salonId) {
      throw new Error(`Failed to create salon ID: ${id}`)
    }
    this.id = salonId
    this.name = 'Test Salon'
    this.description = 'A test salon for unit testing'
    this.address = {
      street: 'テスト1-1-1',
      city: '千代田区',
      state: '東京都',
      postalCode: '100-0001',
      country: '日本',
    }
    this.contactInfo = {
      email: 'test@example.com',
      phoneNumber: '03-1234-5678',
    }
    this.openingHours = [
      {
        dayOfWeek: 'monday',
        openTime: '09:00',
        closeTime: '18:00',
        isHoliday: false,
      },
    ]
    this.features = ['Hair', 'Beauty']
    this.imageUrls = []
    this.rating = undefined
    this.reviewCount = undefined
    this.createdAt = new Date()
    this.updatedAt = new Date()
  }

  withId(id: SalonId): this {
    this.id = id
    return this
  }

  withName(name: string): this {
    this.name = name
    return this
  }

  withDescription(description: string): this {
    this.description = description
    return this
  }

  withAddress(address: Address): this {
    this.address = address
    return this
  }

  withContactInfo(contactInfo: ContactInfo): this {
    this.contactInfo = contactInfo
    return this
  }

  withOpeningHours(openingHours: OpeningHours[]): this {
    this.openingHours = openingHours
    return this
  }

  withFeatures(features: string[]): this {
    this.features = features
    return this
  }

  withImageUrls(imageUrls: string[]): this {
    this.imageUrls = imageUrls
    return this
  }

  withRating(rating?: number): this {
    this.rating = rating
    return this
  }

  withReviewCount(count?: number): this {
    this.reviewCount = count
    return this
  }

  asActive(): this {
    this.isSuspended = false
    this.suspendedReason = undefined
    return this
  }

  asSuspended(reason: string): this {
    this.isSuspended = true
    this.suspendedReason = reason
    return this
  }

  build(): Salon {
    const salonData = {
      id: this.id,
      name: this.name,
      description: this.description,
      address: this.address,
      contactInfo: this.contactInfo,
      openingHours: this.openingHours,
      imageUrls: this.imageUrls,
      features: this.features,
      rating: this.rating,
      reviewCount: this.reviewCount,
      createdAt: this.createdAt,
      createdBy: this.createdBy,
      updatedAt: this.updatedAt,
      updatedBy: this.updatedBy,
    }

    if (this.isSuspended) {
      return {
        type: 'suspended' as const,
        data: salonData,
        suspendedAt: new Date(),
        suspendedReason: this.suspendedReason || 'Test suspension',
      }
    }

    return {
      type: 'active' as const,
      data: salonData,
    }
  }
}

// 便利なヘルパー関数
export function createTestSalon(overrides?: {
  id?: SalonId
  name?: string
  description?: string
  address?: Address
  contactInfo?: ContactInfo
  openingHours?: OpeningHours[]
  features?: string[]
  imageUrls?: string[]
  rating?: number
  reviewCount?: number
}): Salon {
  const builder = new SalonBuilder()

  if (overrides?.id) {
    builder.withId(overrides.id)
  }
  if (overrides?.name) {
    builder.withName(overrides.name)
  }
  if (overrides?.description !== undefined) {
    builder.withDescription(overrides.description)
  }
  if (overrides?.address) {
    builder.withAddress(overrides.address)
  }
  if (overrides?.contactInfo) {
    builder.withContactInfo(overrides.contactInfo)
  }
  if (overrides?.openingHours) {
    builder.withOpeningHours(overrides.openingHours)
  }
  if (overrides?.features) {
    builder.withFeatures(overrides.features)
  }
  if (overrides?.imageUrls) {
    builder.withImageUrls(overrides.imageUrls)
  }
  if (overrides?.rating !== undefined) {
    builder.withRating(overrides.rating)
  }
  if (overrides?.reviewCount !== undefined) {
    builder.withReviewCount(overrides.reviewCount)
  }

  return builder.build()
}

export function createTestSalonId(id?: string): SalonId {
  const salonId = createSalonId(id || crypto.randomUUID())
  if (!salonId) {
    throw new Error('Failed to create test salon ID')
  }
  return salonId
}

export function createTestServiceId(id?: string): ServiceId {
  const serviceId = createServiceId(id || crypto.randomUUID())
  if (!serviceId) {
    throw new Error('Failed to create test service ID')
  }
  return serviceId
}
