import type { Environment } from '@beauty-salon-backend/config'
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
  environment?: Environment
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
  options: SeedOptions = {},
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
  db: PostgresJsDatabase<typeof schema>,
): Promise<void> {
  try {
    // Use TRUNCATE with CASCADE which respects foreign keys without needing special privileges
    // Group tables by dependency levels and truncate in batches

    console.log('Truncating all tables with CASCADE...')

    // Method 1: Try TRUNCATE CASCADE (fastest if permissions allow)
    try {
      await db.execute(sql`
        TRUNCATE TABLE 
          treatment_photos,
          treatment_materials,
          treatment_records,
          staff_skills,
          staff_schedules,
          staff_performances,
          sessions,
          reviews,
          sales_details,
          payment_transactions,
          sales,
          payment_methods,
          inventory_transactions,
          inventory,
          products,
          booking_status_histories,
          booking_services,
          bookings,
          service_options,
          services,
          service_categories,
          opening_hours,
          membership_tiers,
          customer_preferences,
          customer_points,
          customer_allergies,
          staff,
          users,
          customers,
          daily_summaries,
          salons,
          notification_logs
        CASCADE
      `)
      console.log('All tables truncated successfully using CASCADE')
      return
    } catch (truncateError) {
      console.log(
        'TRUNCATE CASCADE failed, falling back to DELETE method...',
        truncateError,
      )
    }

    // Method 2: Delete in dependency order (works without special privileges)
    // Delete from leaf tables first (those with foreign keys to other tables)

    // Level 1: Tables that depend on others (leaf nodes)
    await Promise.all([
      db.delete(schema.treatmentPhotos),
      db.delete(schema.treatmentMaterials),
      db.delete(schema.staffSkills),
      db.delete(schema.salesDetails),
      db.delete(schema.serviceOptions),
      db.delete(schema.customerPreferences),
      db.delete(schema.customerPoints),
      db.delete(schema.customerAllergies),
      db.delete(schema.bookingStatusHistories),
    ])

    // Level 2: Tables that Level 1 tables depend on
    await Promise.all([
      db.delete(schema.treatmentRecords),
      db.delete(schema.staffSchedules),
      db.delete(schema.staffPerformances),
      db.delete(schema.paymentTransactions),
      db.delete(schema.inventoryTransactions),
      db.delete(schema.bookingServices),
      db.delete(schema.reviews),
    ])

    // Level 3: Core transaction tables
    await Promise.all([
      db.delete(schema.sessions),
      db.delete(schema.sales),
      db.delete(schema.bookings),
      db.delete(schema.inventory),
    ])

    // Level 4: Reference data tables
    await Promise.all([
      db.delete(schema.paymentMethods),
      db.delete(schema.products),
      db.delete(schema.services),
      db.delete(schema.openingHours),
      db.delete(schema.membershipTiers),
      db.delete(schema.dailySummaries),
    ])

    // Level 5: Category and classification tables
    await db.delete(schema.serviceCategories)

    // Level 6: Entity tables
    await Promise.all([db.delete(schema.staff), db.delete(schema.customers)])

    // Level 7: User table
    await db.delete(schema.users)

    // Level 8: Root tables
    await Promise.all([
      db.delete(schema.salons),
      db.delete(schema.notificationLogs),
    ])

    console.log('All tables truncated successfully using DELETE')
  } catch (error) {
    console.error('Error during truncation:', error)
    throw new Error(
      `Failed to truncate tables: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}
