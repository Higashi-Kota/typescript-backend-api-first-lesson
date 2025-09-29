#!/usr/bin/env tsx

import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as dotenv from 'dotenv'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '../schema'
import { seed } from '../seeds/index'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables from root .env file
const rootPath = path.resolve(__dirname, '../../../../../')
dotenv.config({ path: path.join(rootPath, '.env.localhost') })

// Parse command line arguments
const args = process.argv.slice(2)
const resetIndex = args.findIndex((arg) => arg === '--reset' || arg === '-r')
const shouldReset = resetIndex !== -1

// Parse DATABASE_URL or use individual environment variables
const databaseUrl =
  process.env.DATABASE_URL ||
  `postgres://${process.env.POSTGRES_USER || 'postgres'}:${
    process.env.POSTGRES_PASSWORD || 'postgres'
  }@${process.env.DB_HOST || 'localhost'}:${process.env.POSTGRES_PORT || 5432}/${
    process.env.POSTGRES_DB || 'beauty_salon'
  }`

async function main() {
  console.log('🌱 Populating database with seed data...')
  console.log(`🔄 Reset database: ${shouldReset}`)
  console.log('')

  const sql = postgres(databaseUrl)
  const db = drizzle(sql, { schema })

  try {
    await seed(db, {
      environment: 'development',
      includeSampleData: true,
      reset: shouldReset,
    })

    console.log('')
    console.log('📊 Collecting seeding statistics...')
    await displaySeedingStatistics(db)

    console.log('')
    console.log('✅ Database population completed successfully!')
    await sql.end()
    process.exit(0)
  } catch (error) {
    console.error('')
    console.error('❌ Database population failed:', error)
    await sql.end()
    process.exit(1)
  }
}

/**
 * Display statistics of seeded records for each table
 */
async function displaySeedingStatistics(db: ReturnType<typeof drizzle>) {
  const statistics = []

  // Count records in each table
  const counts = await Promise.all([
    db
      .select()
      .from(schema.salons)
      .then((rows) => ({ table: 'salons', count: rows.length })),
    db
      .select()
      .from(schema.users)
      .then((rows) => ({ table: 'users', count: rows.length })),
    db
      .select()
      .from(schema.customers)
      .then((rows) => ({ table: 'customers', count: rows.length })),
    db
      .select()
      .from(schema.staff)
      .then((rows) => ({ table: 'staff', count: rows.length })),
    db
      .select()
      .from(schema.membershipTiers)
      .then((rows) => ({ table: 'membership_tiers', count: rows.length })),
    db
      .select()
      .from(schema.serviceCategories)
      .then((rows) => ({ table: 'service_categories', count: rows.length })),
    db
      .select()
      .from(schema.services)
      .then((rows) => ({ table: 'services', count: rows.length })),
    db
      .select()
      .from(schema.openingHours)
      .then((rows) => ({ table: 'opening_hours', count: rows.length })),
    db
      .select()
      .from(schema.paymentMethods)
      .then((rows) => ({ table: 'payment_methods', count: rows.length })),
    db
      .select()
      .from(schema.products)
      .then((rows) => ({ table: 'products', count: rows.length })),
    db
      .select()
      .from(schema.inventory)
      .then((rows) => ({ table: 'inventory', count: rows.length })),
    db
      .select()
      .from(schema.bookings)
      .then((rows) => ({ table: 'bookings', count: rows.length })),
    db
      .select()
      .from(schema.bookingServices)
      .then((rows) => ({ table: 'booking_services', count: rows.length })),
    db
      .select()
      .from(schema.reviews)
      .then((rows) => ({ table: 'reviews', count: rows.length })),
    db
      .select()
      .from(schema.customerPoints)
      .then((rows) => ({ table: 'customer_points', count: rows.length })),
    db
      .select()
      .from(schema.customerPreferences)
      .then((rows) => ({ table: 'customer_preferences', count: rows.length })),
    db
      .select()
      .from(schema.customerAllergies)
      .then((rows) => ({ table: 'customer_allergies', count: rows.length })),
  ])

  statistics.push(...counts)

  // Sort by table name for consistent display
  statistics.sort((a, b) => a.table.localeCompare(b.table))

  // Calculate total records
  const totalRecords = statistics.reduce((sum, stat) => sum + stat.count, 0)

  // Display statistics table
  console.log('')
  console.log('┌─────────────────────────────────┬───────────┐')
  console.log('│ Table                           │ Records   │')
  console.log('├─────────────────────────────────┼───────────┤')

  for (const stat of statistics) {
    if (stat.count > 0) {
      const tableName = stat.table.padEnd(31)
      const recordCount = stat.count.toString().padStart(9)
      console.log(`│ ${tableName} │ ${recordCount} │`)
    }
  }

  console.log('├─────────────────────────────────┼───────────┤')
  const totalPadded = 'TOTAL'.padEnd(31)
  const totalCountPadded = totalRecords.toString().padStart(9)
  console.log(`│ ${totalPadded} │ ${totalCountPadded} │`)
  console.log('└─────────────────────────────────┴───────────┘')
  console.log('')
}

// Show help if requested
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Database Population Script

Usage: pnpm db:seed [options]

Options:
  --reset, -r         Reset database before seeding
  --help, -h          Show this help message

Examples:
  pnpm db:seed                    # Populate database with seed data
  pnpm db:seed --reset            # Reset and populate database
`)
  process.exit(0)
}

main()
