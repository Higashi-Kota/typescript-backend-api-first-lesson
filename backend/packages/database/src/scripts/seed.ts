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
dotenv.config({ path: path.join(rootPath, '.env') })

// Parse command line arguments
const args = process.argv.slice(2)
const envIndex = args.findIndex((arg) => arg === '--env' || arg === '-e')
const environment =
  envIndex !== -1 && args[envIndex + 1]
    ? (args[envIndex + 1] as 'development' | 'test' | 'staging')
    : 'development'

const resetIndex = args.findIndex((arg) => arg === '--reset' || arg === '-r')
const shouldReset = resetIndex !== -1

const sampleDataIndex = args.findIndex((arg) => arg === '--no-sample')
const includeSampleData = sampleDataIndex === -1

// Parse DATABASE_URL or use individual environment variables
const databaseUrl =
  process.env.DATABASE_URL ||
  `postgres://${process.env.POSTGRES_USER || 'postgres'}:${
    process.env.POSTGRES_PASSWORD || 'postgres'
  }@${process.env.DB_HOST || 'localhost'}:${process.env.POSTGRES_PORT || 5432}/${
    process.env.POSTGRES_DB || 'beauty_salon'
  }`

async function main() {
  console.log('🌱 Starting database seeding...')
  console.log(`📍 Environment: ${environment}`)
  console.log(`🔄 Reset database: ${shouldReset}`)
  console.log(`📊 Include sample data: ${includeSampleData}`)
  console.log('')

  const sql = postgres(databaseUrl)
  const db = drizzle(sql, { schema })

  try {
    await seed(db, {
      environment,
      includeSampleData,
      reset: shouldReset,
    })

    console.log('')
    console.log('✅ Database seeding completed successfully!')
    await sql.end()
    process.exit(0)
  } catch (error) {
    console.error('')
    console.error('❌ Database seeding failed:', error)
    await sql.end()
    process.exit(1)
  }
}

// Show help if requested
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Database Seeding Script

Usage: pnpm db:seed [options]

Options:
  --env, -e <env>     Environment to seed for (development, test, staging)
                      Default: development
  --reset, -r         Reset database before seeding
  --no-sample         Skip sample data (only seed essential data)
  --help, -h          Show this help message

Examples:
  pnpm db:seed                    # Seed development with sample data
  pnpm db:seed --env test --reset # Reset and seed test environment
  pnpm db:seed --no-sample        # Seed only essential data
`)
  process.exit(0)
}

main()
