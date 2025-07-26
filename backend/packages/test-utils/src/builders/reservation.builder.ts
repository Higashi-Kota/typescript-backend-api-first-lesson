/**
 * Reservation Builder for Testing
 * CLAUDE.mdのテスト要件に準拠
 */

import crypto from 'node:crypto'
import type {
  CustomerId,
  Reservation,
  ReservationId,
  SalonId,
  ServiceId,
  StaffId,
} from '@beauty-salon-backend/domain'
import { createReservationId } from '@beauty-salon-backend/domain'

export class ReservationBuilder {
  private id: ReservationId
  private salonId: SalonId
  private customerId: CustomerId
  private staffId: StaffId
  private serviceId: ServiceId
  private startTime: Date
  private endTime: Date
  private notes?: string
  private totalAmount: number
  private depositAmount: number
  private isPaid: boolean
  private createdAt: Date
  private createdBy?: string
  private updatedAt: Date
  private updatedBy?: string
  private status:
    | 'pending'
    | 'confirmed'
    | 'cancelled'
    | 'completed'
    | 'no_show' = 'pending'
  private cancelledReason?: string
  private confirmedBy?: string
  private completedBy?: string

  constructor() {
    const id = crypto.randomUUID()
    const reservationId = createReservationId(id)
    if (!reservationId) {
      throw new Error(`Failed to create reservation ID: ${id}`)
    }
    this.id = reservationId

    // Default values - these need to be set via builder methods
    // We'll create valid IDs
    const {
      createSalonId,
      createCustomerId,
      createStaffId,
      createServiceId,
    } = require('@beauty-salon-backend/domain')
    const salonId = createSalonId(crypto.randomUUID())
    const customerId = createCustomerId(crypto.randomUUID())
    const staffId = createStaffId(crypto.randomUUID())
    const serviceId = createServiceId(crypto.randomUUID())

    if (!salonId || !customerId || !staffId || !serviceId) {
      throw new Error('Failed to create default IDs for reservation builder')
    }

    this.salonId = salonId
    this.customerId = customerId
    this.staffId = staffId
    this.serviceId = serviceId
    this.startTime = new Date()
    this.endTime = new Date(this.startTime.getTime() + 60 * 60 * 1000) // 1 hour later by default
    this.notes = undefined
    this.totalAmount = 5000
    this.depositAmount = 0
    this.isPaid = false
    this.createdAt = new Date()
    this.updatedAt = new Date()
  }

  withId(id: ReservationId): this {
    this.id = id
    return this
  }

  withSalonId(salonId: SalonId): this {
    this.salonId = salonId
    return this
  }

  withCustomerId(customerId: CustomerId): this {
    this.customerId = customerId
    return this
  }

  withStaffId(staffId: StaffId): this {
    this.staffId = staffId
    return this
  }

  withServiceId(serviceId: ServiceId): this {
    this.serviceId = serviceId
    return this
  }

  withStartTime(startTime: Date): this {
    this.startTime = startTime
    return this
  }

  withEndTime(endTime: Date): this {
    this.endTime = endTime
    return this
  }

  withNotes(notes?: string): this {
    this.notes = notes
    return this
  }

  withTotalAmount(amount: number): this {
    this.totalAmount = amount
    return this
  }

  withDepositAmount(amount: number): this {
    this.depositAmount = amount
    return this
  }

  withIsPaid(isPaid: boolean): this {
    this.isPaid = isPaid
    return this
  }

  withCreatedBy(createdBy?: string): this {
    this.createdBy = createdBy
    return this
  }

  withUpdatedBy(updatedBy?: string): this {
    this.updatedBy = updatedBy
    return this
  }

  asPending(): this {
    this.status = 'pending'
    return this
  }

  asConfirmed(confirmedBy?: string): this {
    this.status = 'confirmed'
    this.confirmedBy = confirmedBy
    return this
  }

  asCancelled(reason: string): this {
    this.status = 'cancelled'
    this.cancelledReason = reason
    return this
  }

  asCompleted(completedBy?: string): this {
    this.status = 'completed'
    this.completedBy = completedBy
    return this
  }

  asNoShow(): this {
    this.status = 'no_show'
    return this
  }

  build(): Reservation {
    const reservationData = {
      id: this.id,
      salonId: this.salonId,
      customerId: this.customerId,
      staffId: this.staffId,
      serviceId: this.serviceId,
      startTime: this.startTime,
      endTime: this.endTime,
      notes: this.notes,
      totalAmount: this.totalAmount,
      depositAmount: this.depositAmount,
      isPaid: this.isPaid,
      createdAt: this.createdAt,
      createdBy: this.createdBy,
      updatedAt: this.updatedAt,
      updatedBy: this.updatedBy,
    }

    switch (this.status) {
      case 'pending':
        return {
          type: 'pending' as const,
          data: reservationData,
        }
      case 'confirmed':
        return {
          type: 'confirmed' as const,
          data: reservationData,
          confirmedAt: new Date(),
          confirmedBy: this.confirmedBy || 'system',
        }
      case 'cancelled':
        return {
          type: 'cancelled' as const,
          data: reservationData,
          cancelledAt: new Date(),
          cancelledBy: 'system',
          cancellationReason: this.cancelledReason || 'Cancelled',
        }
      case 'completed':
        return {
          type: 'completed' as const,
          data: reservationData,
          completedAt: new Date(),
          completedBy: this.completedBy || 'system',
        }
      case 'no_show':
        return {
          type: 'no_show' as const,
          data: reservationData,
          markedNoShowAt: new Date(),
          markedNoShowBy: 'system',
        }
    }
  }
}

// 便利なヘルパー関数
export function createTestReservation(overrides?: {
  id?: ReservationId
  salonId?: SalonId
  customerId?: CustomerId
  staffId?: StaffId
  serviceId?: ServiceId
  startTime?: Date
  endTime?: Date
  notes?: string
  totalAmount?: number
  depositAmount?: number
  isPaid?: boolean
  status?: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show'
}): Reservation {
  const builder = new ReservationBuilder()

  // Set required IDs with defaults if not provided
  if (
    !overrides?.salonId ||
    !overrides?.customerId ||
    !overrides?.staffId ||
    !overrides?.serviceId
  ) {
    // Import these from the domain package
    const {
      createSalonId,
      createCustomerId,
      createStaffId,
      createServiceId,
    } = require('@beauty-salon-backend/domain')

    if (!overrides?.salonId) {
      const salonId = createSalonId(crypto.randomUUID())
      if (salonId) builder.withSalonId(salonId)
    }
    if (!overrides?.customerId) {
      const customerId = createCustomerId(crypto.randomUUID())
      if (customerId) builder.withCustomerId(customerId)
    }
    if (!overrides?.staffId) {
      const staffId = createStaffId(crypto.randomUUID())
      if (staffId) builder.withStaffId(staffId)
    }
    if (!overrides?.serviceId) {
      const serviceId = createServiceId(crypto.randomUUID())
      if (serviceId) builder.withServiceId(serviceId)
    }
  }

  if (overrides?.id) {
    builder.withId(overrides.id)
  }
  if (overrides?.salonId) {
    builder.withSalonId(overrides.salonId)
  }
  if (overrides?.customerId) {
    builder.withCustomerId(overrides.customerId)
  }
  if (overrides?.staffId) {
    builder.withStaffId(overrides.staffId)
  }
  if (overrides?.serviceId) {
    builder.withServiceId(overrides.serviceId)
  }
  if (overrides?.startTime) {
    builder.withStartTime(overrides.startTime)
  }
  if (overrides?.endTime) {
    builder.withEndTime(overrides.endTime)
  }
  if (overrides?.notes !== undefined) {
    builder.withNotes(overrides.notes)
  }
  if (overrides?.totalAmount !== undefined) {
    builder.withTotalAmount(overrides.totalAmount)
  }
  if (overrides?.depositAmount !== undefined) {
    builder.withDepositAmount(overrides.depositAmount)
  }
  if (overrides?.isPaid !== undefined) {
    builder.withIsPaid(overrides.isPaid)
  }

  // Set status
  switch (overrides?.status) {
    case 'confirmed':
      builder.asConfirmed()
      break
    case 'cancelled':
      builder.asCancelled('Test cancellation')
      break
    case 'completed':
      builder.asCompleted()
      break
    case 'no_show':
      builder.asNoShow()
      break
    default:
      builder.asPending()
  }

  return builder.build()
}

export function createTestReservationId(id?: string): ReservationId {
  const reservationId = createReservationId(id || crypto.randomUUID())
  if (!reservationId) {
    throw new Error('Failed to create test reservation ID')
  }
  return reservationId
}
