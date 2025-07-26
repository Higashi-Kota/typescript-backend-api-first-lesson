/**
 * Staff Builder
 * テスト用のStaffデータを生成するビルダー
 */

import type {
  ContactInfo,
  Result,
  SalonId,
  Staff,
  StaffAvailability,
  StaffId,
} from '@beauty-salon-backend/domain'
import {
  createSalonId,
  createStaffId,
  err,
  ok,
} from '@beauty-salon-backend/domain'

export class StaffBuilder {
  private id: string = crypto.randomUUID()
  private salonId: string = crypto.randomUUID()
  private name = 'Test Staff'
  private email = 'staff@example.com'
  private phoneNumber = '090-1234-5678'
  private specialties: string[] = ['カット', 'カラー']
  private imageUrl?: string
  private bio?: string
  private yearsOfExperience?: number
  private availability?: StaffAvailability
  private isInactive = false
  private inactivatedReason?: string
  private isTerminated = false
  private terminatedBy = 'system'
  private terminatedReason?: string
  private createdAt: Date = new Date()
  private updatedAt: Date = new Date()

  withId(id: string): this {
    this.id = id
    return this
  }

  withSalonId(salonId: string): this {
    this.salonId = salonId
    return this
  }

  withName(name: string): this {
    this.name = name
    return this
  }

  withEmail(email: string): this {
    this.email = email
    return this
  }

  withPhoneNumber(phoneNumber: string): this {
    this.phoneNumber = phoneNumber
    return this
  }

  withSpecialties(specialties: string[]): this {
    this.specialties = specialties
    return this
  }

  withImageUrl(url: string): this {
    this.imageUrl = url
    return this
  }

  withBio(bio: string): this {
    this.bio = bio
    return this
  }

  withYearsOfExperience(years: number): this {
    this.yearsOfExperience = years
    return this
  }

  withAvailability(availability: StaffAvailability): this {
    this.availability = availability
    return this
  }

  inactive(reason = 'Test deactivation'): this {
    this.isInactive = true
    this.inactivatedReason = reason
    return this
  }

  terminated(by = 'admin', reason = 'Test termination'): this {
    this.isTerminated = true
    this.terminatedBy = by
    this.terminatedReason = reason
    return this
  }

  withCreatedAt(date: Date): this {
    this.createdAt = date
    return this
  }

  withUpdatedAt(date: Date): this {
    this.updatedAt = date
    return this
  }

  build(): Result<Staff, { type: 'invalidData'; message: string }> {
    const staffId = createStaffId(this.id)
    const salonId = createSalonId(this.salonId)

    if (!staffId || !salonId) {
      return err({ type: 'invalidData', message: 'Invalid ID format' })
    }

    const contactInfo: ContactInfo = {
      email: this.email,
      phoneNumber: this.phoneNumber,
    }

    const staffData = {
      id: staffId,
      salonId,
      name: this.name,
      contactInfo,
      specialties: this.specialties,
      imageUrl: this.imageUrl,
      bio: this.bio,
      yearsOfExperience: this.yearsOfExperience,
      availability: this.availability,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    }

    if (this.isTerminated) {
      return ok({
        type: 'terminated' as const,
        data: staffData,
        terminatedAt: new Date(),
        terminatedBy: this.terminatedBy,
        terminatedReason: this.terminatedReason,
      })
    }

    if (this.isInactive) {
      return ok({
        type: 'inactive' as const,
        data: staffData,
        inactivatedAt: new Date(),
        inactivatedReason: this.inactivatedReason,
      })
    }

    return ok({
      type: 'active' as const,
      data: staffData,
    })
  }
}

// 便利なヘルパー関数
export function createTestStaff(overrides?: {
  id?: StaffId
  salonId?: SalonId
  name?: string
  contactInfo?: ContactInfo
  specialties?: string[]
  imageUrl?: string
  bio?: string
  yearsOfExperience?: number
  availability?: StaffAvailability
}): Staff {
  const builder = new StaffBuilder()

  if (overrides?.id) {
    builder.withId(overrides.id)
  }
  if (overrides?.salonId) {
    builder.withSalonId(overrides.salonId)
  }
  if (overrides?.name) {
    builder.withName(overrides.name)
  }
  if (overrides?.contactInfo) {
    builder
      .withEmail(overrides.contactInfo.email)
      .withPhoneNumber(overrides.contactInfo.phoneNumber)
  }
  if (overrides?.specialties) {
    builder.withSpecialties(overrides.specialties)
  }
  if (overrides?.imageUrl) {
    builder.withImageUrl(overrides.imageUrl)
  }
  if (overrides?.bio) {
    builder.withBio(overrides.bio)
  }
  if (overrides?.yearsOfExperience !== undefined) {
    builder.withYearsOfExperience(overrides.yearsOfExperience)
  }
  if (overrides?.availability) {
    builder.withAvailability(overrides.availability)
  }

  const result = builder.build()
  if (result.type === 'err') {
    throw new Error(`Failed to create test staff: ${result.error.message}`)
  }
  return result.value
}

export function createTestStaffId(id?: string): StaffId {
  const staffId = createStaffId(id || crypto.randomUUID())
  if (!staffId) {
    throw new Error('Failed to create test staff ID')
  }
  return staffId
}
