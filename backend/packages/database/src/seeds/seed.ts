import { sql } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import * as schema from '../schema'
import { seedBookings } from './seed-data/bookings'
import { seedCustomers } from './seed-data/customers'
import { seedMembershipTiers } from './seed-data/membership-tiers'
import { seedOpeningHours } from './seed-data/opening-hours'
import { seedPaymentMethods } from './seed-data/payment-methods'
import { seedProducts } from './seed-data/products'
import { seedReviews } from './seed-data/reviews'
import { seedSalons } from './seed-data/salons'
import { seedServiceCategories } from './seed-data/service-categories'
import { seedServices } from './seed-data/services'
import { seedStaff } from './seed-data/staff'
import { seedUsers } from './seed-data/users'

export interface SeedOptions {
  /**
   * The environment to seed for
   */
  environment?: 'development' | 'test' | 'staging'
  /**
   * Whether to include sample data
   */
  includeSampleData?: boolean
  /**
   * Whether to reset the database before seeding
   */
  reset?: boolean
}

/**
 * Main seeding function
 */
export async function seed(
  db: PostgresJsDatabase<typeof schema>,
  options: SeedOptions = {}
): Promise<void> {
  const {
    environment = 'development',
    includeSampleData = true,
    reset = false,
  } = options

  console.log(`Starting seed for environment: ${environment}`)

  try {
    if (reset) {
      console.log('Resetting database...')
      await truncateAll(db)
    }

    // Seed base data in order of dependencies
    console.log('Seeding salons...')
    const salonIds = await seedSalons(db)

    console.log('Seeding users...')
    const userResult = await seedUsers(db)

    console.log('Seeding customers...')
    const customerResult = await seedCustomers(db, {
      customerUserIds: userResult.customerUserIds,
    })

    console.log('Seeding staff...')
    const staffResult = await seedStaff(db, salonIds, {
      staffUserIds: userResult.staffUserIds,
    })

    console.log('Seeding membership tiers...')
    await seedMembershipTiers(db, salonIds)

    console.log('Seeding service categories...')
    const categoryResult = await seedServiceCategories(db, salonIds)

    console.log('Seeding services...')
    const serviceResult = await seedServices(db, salonIds, categoryResult)

    console.log('Seeding opening hours...')
    await seedOpeningHours(db, salonIds)

    console.log('Seeding payment methods...')
    await seedPaymentMethods(db, salonIds)

    console.log('Seeding products and inventory...')
    await seedProducts(db, salonIds)

    if (includeSampleData) {
      console.log('Seeding bookings...')
      const bookingResult = await seedBookings(db, {
        salonIds,
        customerIds: customerResult.customerIds,
        serviceIds: serviceResult.serviceIds,
        staffIds: staffResult.staffIds,
        vipCustomerId: customerResult.vipCustomerId,
      })

      console.log('Seeding reviews...')
      await seedReviews(db, {
        salonIds,
        customerIds: customerResult.customerIds,
        completedBookingIds: bookingResult.completedBookingIds,
        staffIds: staffResult.staffIds,
      })
    }

    console.log('Seeding completed successfully!')
  } catch (error) {
    console.error('Seeding failed:', error)
    throw error
  }
}

/**
 * Utility function to truncate all tables
 */
export async function truncateAll(
  db: PostgresJsDatabase<typeof schema>
): Promise<void> {
  // Disable foreign key checks temporarily
  await db.execute(sql`SET session_replication_role = 'replica'`)

  // Truncate all tables in reverse order of dependencies
  await db.delete(schema.treatmentPhotos)
  await db.delete(schema.treatmentMaterials)
  await db.delete(schema.treatmentRecords)
  await db.delete(schema.staffSkills)
  await db.delete(schema.staffSchedules)
  await db.delete(schema.staffPerformances)
  await db.delete(schema.sessions)
  await db.delete(schema.reviews)
  await db.delete(schema.salesDetails)
  await db.delete(schema.paymentTransactions)
  await db.delete(schema.sales)
  await db.delete(schema.paymentMethods)
  await db.delete(schema.inventoryTransactions)
  await db.delete(schema.inventory)
  await db.delete(schema.products)
  await db.delete(schema.bookingStatusHistories)
  await db.delete(schema.bookingServices)
  await db.delete(schema.bookings)
  await db.delete(schema.serviceOptions)
  await db.delete(schema.services)
  await db.delete(schema.serviceCategories)
  await db.delete(schema.openingHours)
  await db.delete(schema.membershipTiers)
  await db.delete(schema.customerPreferences)
  await db.delete(schema.customerPoints)
  await db.delete(schema.customerAllergies)
  await db.delete(schema.staff)
  await db.delete(schema.users)
  await db.delete(schema.customers)
  await db.delete(schema.dailySummaries)
  await db.delete(schema.salons)
  await db.delete(schema.notificationLogs)

  // Re-enable foreign key checks
  await db.execute(sql`SET session_replication_role = 'origin'`)

  console.log('All tables truncated successfully')
}
