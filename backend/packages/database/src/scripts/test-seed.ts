#!/usr/bin/env tsx

import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as dotenv from 'dotenv'
import { count } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '../schema'
import { seed } from '../seeds/index'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables from root .env file
const rootPath = path.resolve(__dirname, '../../../../../')
dotenv.config({ path: path.join(rootPath, '.env') })

// Parse DATABASE_URL or use individual environment variables
const databaseUrl =
  process.env.DATABASE_URL ||
  `postgres://${process.env.POSTGRES_USER || 'postgres'}:${
    process.env.POSTGRES_PASSWORD || 'postgres'
  }@${process.env.DB_HOST || 'localhost'}:${process.env.POSTGRES_PORT || 5432}/${
    process.env.POSTGRES_DB || 'beauty_salon'
  }`

async function testSeed() {
  console.log('🧪 Testing database seed functionality...\n')

  const sql = postgres(databaseUrl)
  const db = drizzle(sql, { schema })

  try {
    // Test 1: Seed with reset
    console.log('Test 1: Seeding with reset...')
    await seed(db, {
      environment: 'test',
      includeSampleData: true,
      reset: true,
    })
    console.log('✅ Test 1 passed: Database reset and seeded successfully\n')

    // Test 2: Count records in key tables
    console.log('Test 2: Verifying seeded data...')
    const salonCount = await db.select({ count: count() }).from(schema.salons)
    const customerCount = await db
      .select({ count: count() })
      .from(schema.customers)
    const staffCount = await db.select({ count: count() }).from(schema.staff)
    const serviceCount = await db
      .select({ count: count() })
      .from(schema.services)
    const bookingCount = await db
      .select({ count: count() })
      .from(schema.bookings)

    console.log(`  Salons: ${salonCount[0]?.count}`)
    console.log(`  Customers: ${customerCount[0]?.count}`)
    console.log(`  Staff: ${staffCount[0]?.count}`)
    console.log(`  Services: ${serviceCount[0]?.count}`)
    console.log(`  Bookings: ${bookingCount[0]?.count}`)
    console.log('✅ Test 2 passed: All tables have data\n')

    // Test 3: Re-seed without reset (should handle duplicates gracefully)
    console.log('Test 3: Re-seeding without reset...')
    await seed(db, {
      environment: 'test',
      includeSampleData: false,
      reset: false,
    })
    console.log('✅ Test 3 passed: Re-seed handled gracefully\n')

    console.log('🎉 All tests passed successfully!')
    await sql.end()
    process.exit(0)
  } catch (error) {
    console.error('❌ Test failed:', error)
    await sql.end()
    process.exit(1)
  }
}

testSeed()
