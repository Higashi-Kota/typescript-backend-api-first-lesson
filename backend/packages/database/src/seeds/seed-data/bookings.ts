import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import * as schema from '../../schema'

interface BookingSeedData {
  salonIds: string[]
  customerIds: string[]
  serviceIds: string[]
  staffIds: string[]
  vipCustomerId?: string
}

export interface BookingSeedResult {
  bookingIds: string[]
  completedBookingIds: string[]
  upcomingBookingIds: string[]
}

export async function seedBookings(
  db: PostgresJsDatabase<typeof schema>,
  data: BookingSeedData
): Promise<BookingSeedResult> {
  const { salonIds, customerIds, serviceIds, staffIds, vipCustomerId } = data

  const salonId1 = salonIds[0]
  const salonId2 = salonIds[1]

  if (
    !(salonId1 && salonId2) ||
    customerIds.length === 0 ||
    staffIds.length === 0 ||
    serviceIds.length === 0
  ) {
    throw new Error('Insufficient data for bookings seeding')
  }

  const now = new Date()
  const bookings = []

  // Past completed bookings (for history and reviews)
  for (let i = 30; i > 0; i -= 5) {
    const bookingDate = new Date(now)
    bookingDate.setDate(bookingDate.getDate() - i)
    const startTime = new Date(bookingDate)
    startTime.setHours(14, 0, 0, 0)
    const endTime = new Date(startTime)
    endTime.setHours(15, 30, 0, 0)

    const customerId =
      customerIds[Math.floor(Math.random() * customerIds.length)] ??
      customerIds[0] ??
      ''
    const staffId =
      staffIds[Math.floor(Math.random() * staffIds.length)] ?? staffIds[0] ?? ''

    bookings.push({
      bookingNumber: `BK2024${String(1000 + i).padStart(5, '0')}`,
      salonId: i % 2 === 0 ? salonId1 : salonId2,
      customerId,
      staffId,
      bookingDate: bookingDate.toISOString().split('T')[0] ?? '2024-01-01',
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      duration: 90,
      status: 'completed' as const,
      subtotal: 8000,
      discountAmount: 400,
      taxAmount: 760,
      totalAmount: 8360,
      pointsUsed: 0,
      pointsEarned: 84,
      reminderSent: true,
      reminderSentAt: new Date(
        startTime.getTime() - 24 * 60 * 60 * 1000
      ).toISOString(),
      completedAt: endTime.toISOString(),
      actualStartTime: startTime.toISOString(),
      actualEndTime: endTime.toISOString(),
      source: 'online',
    })
  }

  // Current confirmed bookings
  for (let i = 1; i <= 7; i++) {
    const bookingDate = new Date(now)
    bookingDate.setDate(bookingDate.getDate() + i)
    const startTime = new Date(bookingDate)
    startTime.setHours(10 + (i % 8), 0, 0, 0)
    const endTime = new Date(startTime)
    endTime.setHours(startTime.getHours() + 1, 30, 0, 0)

    const customerId =
      (i === 1 && vipCustomerId
        ? vipCustomerId
        : customerIds[i % customerIds.length]) ??
      customerIds[0] ??
      ''
    const staffId = staffIds[i % staffIds.length] ?? staffIds[0] ?? ''

    bookings.push({
      bookingNumber: `BK2024${String(2000 + i).padStart(5, '0')}`,
      salonId: i % 2 === 0 ? salonId1 : salonId2,
      customerId,
      staffId,
      bookingDate: bookingDate.toISOString().split('T')[0] ?? '2024-01-01',
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      duration: 90,
      status: i <= 2 ? ('confirmed' as const) : ('pending' as const),
      subtotal: 6000 + i * 500,
      discountAmount: i === 1 && vipCustomerId ? 1000 : 0,
      taxAmount: 600 + i * 50,
      totalAmount: 6600 + i * 550 - (i === 1 && vipCustomerId ? 1000 : 0),
      depositAmount: i <= 2 ? 1000 : 0,
      pointsUsed: 0,
      pointsEarned: 0,
      customerRequest: i === 1 ? 'Please prepare organic products' : undefined,
      reminderSent: false,
      source: i % 3 === 0 ? 'phone' : 'online',
    })
  }

  // One cancelled booking
  const cancelledDate = new Date(now)
  cancelledDate.setDate(cancelledDate.getDate() - 2)
  bookings.push({
    bookingNumber: 'BK2024CANCEL',
    salonId: salonId1,
    customerId: customerIds[0] ?? 'dummy-customer-id',
    staffId: staffIds[0] ?? 'dummy-staff-id',
    bookingDate: cancelledDate.toISOString().split('T')[0] ?? '2024-01-01',
    startTime: cancelledDate.toISOString(),
    endTime: new Date(cancelledDate.getTime() + 60 * 60 * 1000).toISOString(),
    duration: 60,
    status: 'cancelled' as const,
    subtotal: 5000,
    discountAmount: 0,
    taxAmount: 500,
    totalAmount: 5500,
    cancelledAt: new Date(
      cancelledDate.getTime() - 24 * 60 * 60 * 1000
    ).toISOString(),
    cancellationReason: 'Customer illness',
    cancellationFee: 0,
    source: 'online',
  })

  const insertedBookings = await db
    .insert(schema.bookings)
    .values(bookings)
    .returning({
      id: schema.bookings.id,
      status: schema.bookings.status,
      startTime: schema.bookings.startTime,
    })

  // Add services to bookings
  const bookingServices = []
  for (let index = 0; index < insertedBookings.length; index++) {
    const booking = insertedBookings[index]
    if (!booking) {
      continue
    }

    const serviceId = serviceIds[index % serviceIds.length]
    const staffId = staffIds[index % staffIds.length]

    if (!(serviceId && staffId)) {
      continue
    }

    const startTime = new Date(booking.startTime)
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000)

    bookingServices.push({
      bookingId: booking.id,
      serviceId,
      staffId,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      duration: 60,
      price: 5000 + index * 200,
      discountAmount: index === 0 ? 500 : 0,
      finalPrice: 5000 + index * 200 - (index === 0 ? 500 : 0),
      isCompleted: booking.status === 'completed',
      completedAt:
        booking.status === 'completed' ? endTime.toISOString() : undefined,
      sortOrder: 1,
    })

    // Add second service for some bookings
    if (index % 3 === 0 && serviceIds[index + 1]) {
      const secondServiceId = serviceIds[index + 1]
      if (secondServiceId) {
        bookingServices.push({
          bookingId: booking.id,
          serviceId: secondServiceId,
          staffId,
          startTime: endTime.toISOString(),
          endTime: new Date(endTime.getTime() + 30 * 60 * 1000).toISOString(),
          duration: 30,
          price: 3000,
          discountAmount: 0,
          finalPrice: 3000,
          isCompleted: booking.status === 'completed',
          completedAt:
            booking.status === 'completed'
              ? new Date(endTime.getTime() + 30 * 60 * 1000).toISOString()
              : undefined,
          sortOrder: 2,
        })
      }
    }
  }

  if (bookingServices.length > 0) {
    await db.insert(schema.bookingServices).values(bookingServices)
  }

  // Add status histories for some bookings
  const statusHistories = []
  for (const booking of insertedBookings.slice(0, 5)) {
    if (booking.status === 'completed') {
      statusHistories.push(
        {
          bookingId: booking.id,
          fromStatus: 'pending' as const,
          toStatus: 'confirmed' as const,
          reason: 'Customer confirmed',
          metadata: { confirmedVia: 'online' },
        },
        {
          bookingId: booking.id,
          fromStatus: 'confirmed' as const,
          toStatus: 'completed' as const,
          reason: 'Service completed',
          metadata: { completedBy: 'staff' },
        }
      )
    } else if (booking.status === 'confirmed') {
      statusHistories.push({
        bookingId: booking.id,
        fromStatus: 'pending' as const,
        toStatus: 'confirmed' as const,
        reason: 'Customer confirmed',
        metadata: { confirmedVia: 'phone' },
      })
    }
  }

  if (statusHistories.length > 0) {
    await db.insert(schema.bookingStatusHistories).values(statusHistories)
  }

  const completedBookingIds = insertedBookings
    .filter((b) => b.status === 'completed')
    .map((b) => b.id)

  const upcomingBookingIds = insertedBookings
    .filter((b) => b.status === 'confirmed' || b.status === 'pending')
    .map((b) => b.id)

  return {
    bookingIds: insertedBookings.map((b) => b.id),
    completedBookingIds,
    upcomingBookingIds,
  }
}
